/**
 * The editable vocabularies (CONTENT-MODEL.md §3 `terms`): subject, mood, room, occasion,
 * recipient — and grade, each grade with its definition and its A–D equivalent, which a work's
 * `condition.grade` points at (8.2.a). A term's slug is the value its facet carries
 * (`?subject=batik`, `?room=living-room`). The kinds were held to the brand schema's facet keys
 * (`@engine/config/schema`), which TASKS.md 2.2 deletes; TASKS.md 3.2.a reshapes them to
 * CONTENT-MODEL.md §3's four (subject, technique, grade, category).
 *
 * Object type and technique are not here: behaviour depends on them, so they are controlled
 * selects (`../works/vocabulary`).
 */

export const TERM_KINDS = ['subject', 'mood', 'room', 'occasion', 'recipient', 'grade'] as const
export type TermKind = (typeof TERM_KINDS)[number]

export const TERM_KIND_LABELS: Record<TermKind, string> = {
  subject: 'Subject',
  mood: 'Mood',
  room: 'Room',
  occasion: 'Occasion',
  recipient: 'Recipient',
  grade: 'Condition grade',
}
