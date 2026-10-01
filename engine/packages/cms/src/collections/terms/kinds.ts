/**
 * The editable vocabularies (CONTENT-MODEL.md §3 `terms`): subject, mood, room, occasion,
 * recipient — and grade, each grade with its definition and its A–D equivalent, which a work's
 * `condition.grade` points at (8.2.a). Each kind is a C1 facet key, so a term's slug is the value
 * its facet carries (`?subject=batik`, `?room=living-room`); `satisfies` keeps the two in step.
 *
 * Object type and technique are not here: behaviour depends on them, so they are controlled
 * selects (CONTENT-MODEL.md §3, C1 `OBJECT_TYPES`).
 */
import type { FacetKey } from '@engine/config/schema'

export const TERM_KINDS = [
  'subject',
  'mood',
  'room',
  'occasion',
  'recipient',
  'grade',
] as const satisfies readonly FacetKey[]
export type TermKind = (typeof TERM_KINDS)[number]

export const TERM_KIND_LABELS: Record<TermKind, string> = {
  subject: 'Subject',
  mood: 'Mood',
  room: 'Room',
  occasion: 'Occasion',
  recipient: 'Recipient',
  grade: 'Condition grade',
}
