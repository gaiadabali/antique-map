/**
 * The antiques row plan (CONTENT-MODEL.md §9): one row, one `works` record keyed by stock number.
 * Every controlled list is checked here with a plain problem; the vocabulary — makers, places,
 * grades, subjects — is matched, never guessed: a name with no single match holds the row and
 * suggests the nearest (DATA.md §3). Only the cells the row carries go into the data: an empty
 * cell never clears a field (`./apply` writes only these).
 */
import type { Problem } from './types'
import { CERTAINTIES } from '../collections/works/vocabulary'
import {
  COLOURINGS,
  OBJECT_TYPES,
  TECHNIQUES,
  WORK_LOCATIONS,
  WORK_STATUSES,
} from '../collections/works/vocabulary'
import { MAKER_ROLES } from '../collections/makers/roles'
import { STOCK_NUMBER_PATTERN, stockNumberError } from '../validators/work-record'
import {
  optionProblem,
  pickOption,
  type PlannedRow,
  type Row,
  holding,
  planned,
  refused,
} from './plan'
import type { Vocabulary } from './vocabulary'
import { list } from './cells'

const CURRENCY = 'USD' // The asking price is whole US dollars; there is no other currency here.

function problem(column: string, text: string): Problem {
  return { column, problem: text }
}

/** One `Name | role | certainty` credit, or the plain problem with it. */
function credit(raw: string, vocab: Vocabulary): { maker?: unknown; problem?: Problem } {
  const parts = raw.split('|').map((part) => part.trim())
  const name = parts[0] ?? ''
  const role = (parts[1] ?? '').trim()
  const certainty = (parts[2] ?? '').trim()
  const match = vocab.makers(name)
  if (!('id' in match)) {
    const suggestions = match.suggestions.join(', ')
    return {
      problem: {
        column: 'makers',
        problem: `The maker '${name}' matches no maker on record${suggestions ? ` — did you mean ${suggestions}?` : ''}.`,
        fix: 'Add the maker (or this spelling as an alias) in the CMS, then import again.',
      },
    }
  }
  if (!pickOption(MAKER_ROLES, role, 'role')) {
    return {
      problem: {
        column: 'makers',
        problem: `The role '${role}' is not one the gallery credits. Write one of: ${MAKER_ROLES.join(', ')}.`,
      },
    }
  }
  if (!pickOption(CERTAINTIES, certainty, 'certainty')) {
    return {
      problem: {
        column: 'makers',
        problem: `The certainty '${certainty}' is not one of: ${CERTAINTIES.join(', ')}. A credit never implies certain — say which it is.`,
      },
    }
  }
  return { maker: { maker: match.id, role: pickOption(MAKER_ROLES, role, ''), certainty } }
}

export function planAntiqueRow(row: Row, vocab: Vocabulary): PlannedRow {
  const c = row.cells
  const problems: Problem[] = []
  const holds: Problem[] = []

  const stockNumber = (c.stock_number ?? '').trim()
  const stockNumberProblem = stockNumberError(stockNumber, STOCK_NUMBER_PATTERN)
  if (stockNumberProblem) {
    return refused(row.row, row.key, [{ column: 'stock_number', problem: stockNumberProblem }])
  }

  const titleEn = (c.title_en ?? '').trim()
  if (titleEn === '') {
    problems.push(problem('title_en', "title_en is empty. The hook title in English is required."))
  }
  const objectType = pickOption(OBJECT_TYPES, c.object_type ?? '', 'object_type')
  if (!objectType) problems.push(optionProblem('object_type', c.object_type ?? '', OBJECT_TYPES))
  const location = pickOption(WORK_LOCATIONS, c.location ?? '', 'location')
  if (!location) problems.push(optionProblem('location', c.location ?? '', WORK_LOCATIONS))

  const title: Record<string, unknown> = { en: titleEn }
  if ((c.title_id ?? '').trim() !== '') title.id = c.title_id!.trim()
  const data: Record<string, unknown> = { stockNumber, title }
  if ((c.original_title ?? '').trim() !== '') data.originalTitle = c.original_title!.trim()
  if (objectType) data.objectType = objectType

  // The three date parts only when the row carries them; a year needs its precision said.
  const precision = (c.date_precision ?? '').trim()
  const from = (c.date_from ?? '').trim()
  const to = (c.date_to ?? '').trim()
  if (precision !== '' || from !== '' || to !== '') {
    const date: Record<string, unknown> = {}
    const precisionOption = pickOption(
      ['exact', 'circa', 'before', 'after', 'range', 'unknown'],
      precision,
      'date_precision',
    )
    if (!precisionOption) {
      problems.push(
        problem(
          'date_precision',
          `date_precision is '${precision}'. Write one of: exact, circa, before, after, range, unknown.`,
        ),
      )
    } else {
      date.precision = precisionOption
    }
    if (from !== '') date.from = Number(from)
    if (to !== '') date.to = Number(to)
    if ((c.date_display ?? '').trim() !== '') date.display = c.date_display!.trim()
    data.date = date
  }

  // Credits: matched by name or alias; a role and a certainty said, never implied.
  const makerNames = list(c.makers)
  if (makerNames && makerNames.length > 0) {
    const credits: unknown[] = []
    for (const entry of makerNames) {
      if (!entry.includes('|')) {
        problems.push(
          problem(
            'makers',
            `The makers entry is '${entry}'. Write name | role | certainty, e.g. Abraham Ortelius | cartographer | certain.`,
          ),
        )
        continue
      }
      const made = credit(entry, vocab)
      if (made.problem) holds.push(made.problem)
      else credits.push(made.maker)
    }
    if (credits.length > 0) data.makers = credits
  }

  // Places: matched by name or historical name; the first is the primary and depicts the sheet.
  const placeNames = list(c.places)
  if (placeNames && placeNames.length > 0) {
    const places: unknown[] = []
    placeNames.forEach((name, index) => {
      const match = vocab.places(name)
      if ('id' in match) {
        places.push({ place: match.id, role: 'depicts', primary: index === 0 })
      } else {
        holds.push({
          column: 'places',
          problem: `The place '${name}' matches no place on record — did you mean ${match.suggestions.join(', ')}?`,
          fix: 'Add the place (or its historical name) in the CMS, then import again.',
        })
      }
    })
    if (places.length > 0) data.places = places
  }

  for (const [column, options, field] of [
    ['technique', TECHNIQUES, 'technique'],
    ['colour', COLOURINGS, 'colour'],
    ['status', WORK_STATUSES, 'status'],
  ] as const) {
    const raw = (c[column] ?? '').trim()
    if (raw === '') continue
    const value = pickOption(options, raw, column)
    if (value) data[field] = value
    else problems.push(optionProblem(column, raw, options))
  }

  // Sizes in millimetres, height before width (a size is a pair; half comes as a problem).
  const image = sizeOf(c, 'image_h_mm', 'image_w_mm', problems, row)
  const sheet = sizeOf(c, 'sheet_h_mm', 'sheet_w_mm', problems, row)
  if (image || sheet) data.dimensions = { ...(image ? { image } : {}), ...(sheet ? { sheet } : {}) }

  const grade = (c.grade ?? '').trim()
  if (grade === '') {
    problems.push(problem('grade', 'grade is empty. The condition grade is required.'))
  } else {
    const match = vocab.terms('grade', grade)
    if ('id' in match) {
      const condition: Record<string, unknown> = { grade: match.id }
      const notes: Record<string, string> = {}
      if ((c.condition_notes_en ?? '').trim() !== '')
        notes.en = c.condition_notes_en!.trim()
      if ((c.condition_notes_id ?? '').trim() !== '')
        notes.id = c.condition_notes_id!.trim()
      if (Object.keys(notes).length > 0) condition.notes = notes
      data.condition = condition
    } else {
      holds.push({
        column: 'grade',
        problem: `The grade '${grade}' matches no grade on the gallery's scale — did you mean ${match.suggestions.join(', ')}?`,
        fix: 'Add the grade as a Condition grade term, then import again.',
      })
    }
  }

  const subjects = list(c.subjects)
  if (subjects && subjects.length > 0) {
    const ids: number[] = []
    for (const label of subjects) {
      const match = vocab.terms('subject', label)
      if ('id' in match) ids.push(match.id)
      else
        holds.push({
          column: 'subjects',
          problem: `The subject '${label}' matches no subject term — did you mean ${match.suggestions.join(', ')}?`,
        })
    }
    if (ids.length > 0) data.subjects = ids
  }

  // Asking price: whole US dollars, the owner's field. Another currency has nowhere to go.
  const askingPrice = (c.asking_price ?? '').trim()
  if (askingPrice !== '') {
    const digits = askingPrice.replace(/[.,](?=\d{3}\b)/g, '')
    if (/^\d+$/.test(digits)) data.askingPrice = Number(digits)
    else problems.push(problem('asking_price', `asking_price is '${askingPrice}'. Whole US dollars, digits only.`))
  }
  const askingCurrency = (c.asking_currency ?? '').trim().toUpperCase()
  if (askingCurrency !== '' && askingCurrency !== CURRENCY) {
    problems.push(
      problem('asking_currency', `asking_currency is '${askingCurrency}'. The asking price is in ${CURRENCY} — there is no other currency here.`),
    )
  }

  const legacy: Record<string, unknown> = {}
  if ((c.legacy_id ?? '').trim() !== '') {
    const id = c.legacy_id!.trim()
    if (/^\d+$/.test(id)) legacy.productId = Number(id)
    else problems.push(problem('legacy_id', `legacy_id is '${id}'. It is the old site's numeric product id.`))
  }
  if ((c.legacy_url ?? '').trim() !== '') legacy.url = c.legacy_url!.trim()
  if (Object.keys(legacy).length > 0) data.legacy = legacy

  if (problems.length > 0) return refused(row.row, row.key, problems)
  if (holds.length > 0) return holding(row.row, row.key, holds)
  const imageFiles = list(c.image_files)
  return planned(row.row, row.key, 'works', data, imageFiles)
}

/** A size pair in millimetres; one side without the other is refused with the column named. */
function sizeOf(
  c: Row['cells'],
  heightColumn: string,
  widthColumn: string,
  problems: Problem[],
  row: Row,
): { height: number; width: number } | null {
  const height = (c[heightColumn] ?? '').trim()
  const width = (c[widthColumn] ?? '').trim()
  if (height === '' && width === '') return null
  const asNumber = (value: string, column: string) => {
    if (value === '') return null
    if (!/^\d+(\.\d+)?$/.test(value)) {
      problems.push(problem(column, `${column} is '${value}'. Millimetres, digits only.`))
      return null
    }
    return Number(value)
  }
  const h = asNumber(height, heightColumn)
  const w = asNumber(width, widthColumn)
  if (h === null || w === null) return null
  return { height: h, width: w }
}
