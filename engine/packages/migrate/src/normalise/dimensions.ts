/**
 * Dimensions → whole millimetres, per rectangle (image, sheet). Reads "45 by
 * 38 cm", "450 x 380 mm", "23x17cm", "36,5 by 28 cm." and a labelled pair
 * ("Full sheet 36.5 by 27 cm. - Photograph 21,5 by 15,3 cm."). Sends to
 * review: inches (the old store never used them, so one is a mistake),
 * "40 b7 22 cm." (a typo for "by", proposed but not assumed), "ca." sizes,
 * a missing or mixed unit, a qualifier it does not know ("each sheet",
 * "folded", "plate"), two rectangles it cannot tell apart, and sizes no
 * paper object has (under 2 cm or over 1.5 m — usually cm typed for mm).
 *
 * Height and width are not assigned here: see `orientation.ts`.
 */
import type { NormaliseTables } from './tables.ts'
import { clean, isBlank, key } from './text.ts'
import {
  accept,
  empty,
  review,
  type Measured,
  type MeasuredDimensions,
  type Parsed,
} from './types.ts'

type Slot = 'image' | 'sheet'

const MEASURE =
  /(?<![\d.])(\d+(?:\.\d+)?)\s*(mm|cm)?\.?\s*(by|b7|x)\s*(\d+(?:\.\d+)?)\s*(mm|cm)?\b\.?/gi
const INCHES = /\d\s*(?:in\b|ins\b|inch|inches|["”″])/i
const SMALLEST_MM = 20
const LARGEST_MM = 1500

type Reading = { slot: Slot | null; measured: Measured | null; problem: string | null }

export function parseDimensions(
  text: string | null,
  tables: NormaliseTables,
  defaultSlot: Slot = 'image',
): Parsed<MeasuredDimensions> {
  const raw = text
  if (isBlank(text)) return empty(raw)
  if (INCHES.test(text ?? '')) return review(raw, null, 'inches — the old store never used them')
  const value = (clean(text) ?? '').replace(/[×X]/g, 'x').replace(/(\d),(\d)/g, '$1.$2')
  const matches = [...value.matchAll(MEASURE)]
  if (matches.length === 0) return review(raw, null, 'no measurement in the field')

  const problems: string[] = []
  const readings: Reading[] = []
  let cursor = 0
  for (const [index, match] of matches.entries()) {
    const start = match.index
    const end = start + match[0].length
    const nextStart = matches[index + 1]?.index ?? value.length
    let prefix = value.slice(cursor, start)
    let suffix = value.slice(end, nextStart)
    const paren = /^\s*\(([^()]*)\)/.exec(suffix)
    const suffixLabel = paren ? (paren[1] ?? '') : ''
    suffix = paren ? suffix.slice(paren[0].length) : suffix
    // Text after the last measurement must be nothing but punctuation; between two, it labels the next.
    if (index === matches.length - 1 && key(suffix) !== '') {
      problems.push(`unrecognised text "${clean(suffix)}"`)
    }
    cursor = paren ? end + paren[0].length : end
    const approximate = /\b(?:ca|circa|approx)\b\.?/i.test(prefix)
    prefix = prefix.replace(/\b(?:ca|circa|approx)\b\.?/gi, ' ')
    const label = key(`${prefix} ${suffixLabel}`)
    readings.push(read(match, label, approximate, tables))
  }

  const slots: { image: Measured | null; sheet: Measured | null } = { image: null, sheet: null }
  for (const reading of readings) {
    if (reading.problem) problems.push(reading.problem)
    if (reading.measured === null) continue
    const slot = reading.slot ?? defaultSlot
    if (slots[slot] !== null) problems.push(`two measurements for the ${slot}`)
    else slots[slot] = reading.measured
  }
  const proposal = slots.image === null && slots.sheet === null ? null : slots
  if (problems.length > 0) return review(raw, proposal, [...new Set(problems)].join('; '))
  return accept(raw, slots)
}

function read(
  match: RegExpMatchArray,
  label: string,
  approximate: boolean,
  tables: NormaliseTables,
): Reading {
  const [, first = '', unitFirst, separator = '', second = '', unitSecond] = match
  const problems: string[] = []
  let slot: Slot | null = null
  if (label !== '') {
    if (tables.dimensionQualifiers.image.some((term) => key(term) === label)) slot = 'image'
    else if (tables.dimensionQualifiers.sheet.some((term) => key(term) === label)) slot = 'sheet'
    else problems.push(`unrecognised qualifier "${label}"`)
  }
  if (approximate) problems.push('an approximate ("ca.") size')
  if (separator.toLowerCase() === 'b7') problems.push('separator "b7" read as "by" (a typo)')
  const a = unitFirst?.toLowerCase()
  const b = unitSecond?.toLowerCase()
  if (a !== undefined && b !== undefined && a !== b) {
    return { slot, measured: null, problem: [...problems, 'two different units'].join('; ') }
  }
  const unit = (b ?? a) as 'mm' | 'cm' | undefined
  if (unit === undefined)
    return { slot, measured: null, problem: [...problems, 'no unit'].join('; ') }
  const firstMm = toMillimetres(first, unit)
  const secondMm = toMillimetres(second, unit)
  if (firstMm === null || secondMm === null) {
    return { slot, measured: null, problem: [...problems, 'a fraction of a millimetre'].join('; ') }
  }
  const measured: Measured = { sidesMm: [firstMm, secondMm], unit }
  if ([firstMm, secondMm].some((side) => side < SMALLEST_MM || side > LARGEST_MM)) {
    problems.push('a size no paper object has — check the unit')
  }
  return { slot, measured, problem: problems.length > 0 ? problems.join('; ') : null }
}

/** Decimal text → whole millimetres without floating-point arithmetic; `null` if not whole. */
export function toMillimetres(number: string, unit: 'mm' | 'cm'): number | null {
  const [whole = '', fraction = ''] = number.split('.')
  const places = unit === 'cm' ? 1 : 0
  if (fraction.replace(/0+$/, '').length > places) return null
  const digits = whole + fraction.padEnd(places, '0').slice(0, places)
  const mm = Number(digits)
  return Number.isSafeInteger(mm) ? mm : null
}
