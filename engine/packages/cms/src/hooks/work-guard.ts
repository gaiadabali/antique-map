/**
 * The work guard (TASKS.md 8.2.a, 8.2.c; CONTENT-MODEL.md §9): the rules that need other records,
 * on every save, and the publish guard, on a publish — run in a hook because a hook, unlike
 * access, is never skipped: the admin, REST, the seed and the migration importer all pass it.
 *
 * - **Every save**: each image's role and provenance — read from its media record — are ones a
 *   work may show (C9 `roleAllowed()`, `provenanceAllowed()`), the book's openings, spine and cover
 *   included; the master is a capture of the recto.
 * - **Publishing** (`_status: 'published'`): `validators/work-publish`, judged on the record as it
 *   will be once this save lands, its title in the default locale.
 *
 * Every problem found is refused at once, each on its own field, in plain words. The pure rules —
 * dates, sizes, rows — are the fields' own validators, which Payload runs after this hook.
 */
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { isPublishing } from '../fields/validate'
import { hasPrimaryPlace, refId } from '../validators/work-credits'
import { imageRowErrors } from '../validators/work-images'
import { publishProblems } from '../validators/work-publish'
import {
  asLabel,
  defaultLocaleTitle,
  imageFacts,
  masterError,
  mergeOver,
  type Doc,
} from './work-facts'

/**
 * A refusal on one field: its `message`, and a `label` — a few comma-free words the admin's toast
 * lists, since Payload builds the refusal's message from the labels and the toast splits it at
 * commas (`validators/work-images` `Issue`).
 */
type FieldError = { path: string; message: string; label: string }

const rowsOf = (value: unknown): Doc[] => (Array.isArray(value) ? (value as Doc[]) : [])

/** Adds `message` on `path` — beside any message already there, so none is lost. */
function add(errors: FieldError[], path: string, message: string, label: string) {
  const there = errors.find((error) => error.path === path)
  if (!there) errors.push({ path, message, label })
  else if (!there.message.includes(message)) {
    there.message = `${there.message} ${message}`
    there.label = `${there.label} · ${label.replace(/^.* — /, '')}`
  }
}

/** The book's own images, each with the path its error is shown on. */
function bookImages(book: unknown): Array<{ path: string; value: unknown }> {
  const part = (book ?? {}) as Doc
  const openings = Array.isArray(part.openings) ? part.openings : []
  return [
    ...openings.map((value) => ({ path: 'book.openings', value })),
    ...(['spine', 'cover'] as const).map((name) => ({ path: `book.${name}`, value: part[name] })),
  ].filter((each) => refId(each.value) !== null)
}

async function saveErrors(req: PayloadRequest, merged: Doc, id: unknown) {
  const rows = rowsOf(merged.images)
  const facts = await imageFacts(
    req,
    rows.map((row) => row.media),
  )
  const errors: FieldError[] = []
  imageRowErrors(facts).forEach((issue, row) => {
    if (issue)
      add(errors, `images.${row}.media`, issue.message, `Image ${row + 1} ${issue.summary}`)
  })
  const book = bookImages(merged.book)
  const bookFacts = await imageFacts(
    req,
    book.map((each) => each.value),
  )
  imageRowErrors(bookFacts).forEach((issue, at) => {
    const { path } = book[at]!
    if (issue) add(errors, path, issue.message, `Book image ${issue.summary}`)
  })
  const master = await masterError(req, merged.master, id)
  if (master) add(errors, 'master', master, asLabel('Master', master))
  return { errors, facts }
}

export const guardWork: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const stored = operation === 'update' ? (originalDoc as Doc | undefined) : undefined
  const merged = mergeOver(stored, data as Doc)
  const id = stored?.id
  const { errors, facts } = await saveErrors(req, merged, id)
  if (isPublishing(data)) {
    const condition = (merged.condition ?? {}) as Doc
    const cataloguing = (merged.cataloguing ?? {}) as Doc
    const places = rowsOf(merged.places)
    const problems = publishProblems({
      title: await defaultLocaleTitle(req, merged, data as Doc, id),
      objectType: typeof merged.objectType === 'string' ? merged.objectType : null,
      date: (merged.date ?? null) as { precision?: string | null } | null,
      hasMaker: rowsOf(merged.makers).some((row) => refId(row.maker) !== null),
      hasPlaces: places.length > 0,
      hasPrimaryPlace: hasPrimaryPlace(places),
      images: facts,
      hasGrade: refId(condition.grade) !== null,
      aiDraft: Array.isArray(cataloguing.aiDraft) ? (cataloguing.aiDraft as string[]) : [],
    })
    for (const problem of problems) add(errors, problem.path, problem.message, problem.summary)
  }
  if (errors.length > 0) {
    throw new ValidationError(
      { collection: 'works', ...(id === undefined ? {} : { id: id as number }), errors, req },
      req.t,
    )
  }
  return data
}
