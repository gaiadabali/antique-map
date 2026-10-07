/**
 * From a checked reply to the write (TASKS.md 8.3.a–b; AI.md §5). Pure.
 *
 * - **Only empty fields are filled.** A field staff already wrote is reported `filled` and left as
 *   it is; so is anything the reply leaves blank (`empty`).
 * - **Only the allow-list is written** — title, object type, date, places, subjects, dimensions —
 *   and every write passes through `allowListed()`, whatever the reply or a future change to it
 *   holds: grade, provenance, the asking price, status, stock, location and every internal field
 *   are out of reach of the model by construction, not by the prompt.
 * - **Places and subjects are existing rows only**, matched by the server (`./vocabulary`); a name
 *   with no row is a suggestion for a person to create, never created here (`no_match`).
 * - **Dimensions only from a visible scale** (`no_scale` otherwise), the date and sizes only when
 *   the work's own validators accept them (`invalid` otherwise).
 * - **The description is suggested, not written**: the work's essay field is 9.3's C4 blocks and
 *   does not exist yet (`no_field`); the run record and the result keep the text.
 */
import { AI_DRAFTABLE_FIELDS, type AiDraftableField } from '../collections/works/vocabulary'
import { dimensionErrors } from '../validators/work-dimensions'
import { workDateErrors } from '../validators/work-dates'
import type { DraftReply } from './reply'

/** The only work fields a draft may write. */
export const DRAFT_WRITABLE = [
  'title',
  'objectType',
  'date',
  'places',
  'subjects',
  'dimensions',
] as const satisfies readonly AiDraftableField[]
export type DraftWritable = (typeof DRAFT_WRITABLE)[number]

export type SkipReason = 'filled' | 'empty' | 'no_field' | 'no_match' | 'no_scale' | 'invalid'

/** The work as it stands (its latest draft), reduced to what the plan reads. */
export type CurrentWork = {
  readonly title: string | null
  readonly objectType: string | null
  readonly date: { precision?: unknown; from?: unknown; to?: unknown } | null
  readonly places: readonly unknown[]
  readonly subjects: readonly unknown[]
  readonly dimensions: Record<string, unknown> | null
}

export type VocabularyMatches = {
  readonly places: readonly (number | string)[]
  readonly subjects: readonly (number | string)[]
  readonly unmatchedPlaces: readonly string[]
  readonly unmatchedSubjects: readonly string[]
}

export type DraftPlan = {
  /** The write, allow-listed. */
  readonly patch: Partial<Record<DraftWritable, unknown>>
  readonly filled: readonly AiDraftableField[]
  readonly skipped: readonly { readonly field: AiDraftableField; readonly reason: SkipReason }[]
  readonly suggestions: {
    readonly description: { readonly en: string | null; readonly id: string | null } | null
    readonly unmatchedPlaces: readonly string[]
    readonly unmatchedSubjects: readonly string[]
  }
}

/** Keeps the allow-listed keys of `patch` and nothing else. */
export function allowListed(patch: Record<string, unknown>): Partial<Record<DraftWritable, unknown>> {
  const out: Partial<Record<DraftWritable, unknown>> = {}
  for (const key of DRAFT_WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) out[key] = patch[key]
  }
  return out
}

const blank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

function sizesEmpty(dimensions: Record<string, unknown> | null): boolean {
  if (!dimensions) return true
  return ['image', 'sheet', 'framed'].every((name) => {
    const size = dimensions[name]
    if (size === null || typeof size !== 'object') return true
    return Object.values(size as Record<string, unknown>).every(blank)
  })
}

function dateEmpty(date: CurrentWork['date']): boolean {
  return !date || (blank(date.precision) && blank(date.from) && blank(date.to))
}

type Step = { value: unknown } | { skip: SkipReason }

function titleStep(reply: DraftReply, work: CurrentWork): Step {
  if (!blank(work.title)) return { skip: 'filled' }
  return reply.title.value ? { value: reply.title.value } : { skip: 'empty' }
}

function objectTypeStep(reply: DraftReply, work: CurrentWork): Step {
  if (!blank(work.objectType)) return { skip: 'filled' }
  return reply.objectType.value ? { value: reply.objectType.value } : { skip: 'empty' }
}

function dateStep(reply: DraftReply, work: CurrentWork): Step {
  if (!dateEmpty(work.date)) return { skip: 'filled' }
  const { precision, from, to } = reply.date
  if (!precision) return { skip: 'empty' }
  const date =
    precision === 'unknown'
      ? { precision, from: null, to: null }
      : { precision, from, to: precision === 'range' ? to : null }
  return Object.keys(workDateErrors({ date })).length > 0 ? { skip: 'invalid' } : { value: date }
}

function listStep(
  current: readonly unknown[],
  names: readonly string[],
  ids: readonly (number | string)[],
  rows: (ids: readonly (number | string)[]) => unknown,
): Step {
  if (current.length > 0) return { skip: 'filled' }
  if (names.length === 0) return { skip: 'empty' }
  return ids.length === 0 ? { skip: 'no_match' } : { value: rows(ids) }
}

function dimensionsStep(reply: DraftReply, work: CurrentWork): Step {
  if (!sizesEmpty(work.dimensions)) return { skip: 'filled' }
  const { scaleVisible, image, sheet } = reply.dimensions
  if (!scaleVisible) return { skip: 'no_scale' }
  if (!image && !sheet) return { skip: 'empty' }
  const dimensions = { image: image ?? null, sheet: sheet ?? null }
  return Object.keys(dimensionErrors(dimensions)).length > 0
    ? { skip: 'invalid' }
    : { value: dimensions }
}

export function planDraft(
  reply: DraftReply,
  work: CurrentWork,
  matches: VocabularyMatches,
): DraftPlan {
  const steps: Record<AiDraftableField, Step> = {
    title: titleStep(reply, work),
    description: { skip: 'no_field' },
    objectType: objectTypeStep(reply, work),
    date: dateStep(reply, work),
    places: listStep(work.places, reply.places.names, matches.places, (ids) =>
      ids.map((place, index) => ({ place, role: 'depicts', primary: index === 0 })),
    ),
    subjects: listStep(work.subjects, reply.subjects.names, matches.subjects, (ids) => [...ids]),
    dimensions: dimensionsStep(reply, work),
  }
  const patch: Record<string, unknown> = {}
  const filled: AiDraftableField[] = []
  const skipped: { field: AiDraftableField; reason: SkipReason }[] = []
  for (const field of AI_DRAFTABLE_FIELDS) {
    const step = steps[field]
    if ('value' in step) {
      patch[field] = step.value
      filled.push(field)
    } else skipped.push({ field, reason: step.skip })
  }
  const description = reply.description
  return {
    patch: allowListed(patch),
    filled: filled.filter((field) => (DRAFT_WRITABLE as readonly string[]).includes(field)),
    skipped,
    suggestions: {
      description: description.en || description.id ? { en: description.en, id: description.id } : null,
      unmatchedPlaces: matches.unmatchedPlaces,
      unmatchedSubjects: matches.unmatchedSubjects,
    },
  }
}
