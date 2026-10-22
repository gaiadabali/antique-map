/**
 * A condition grade is a vocabulary term, not a select (CONTENT-MODEL.md §1 `condition.grade`,
 * §3): the gallery's published scale — VG+ · VG · G+ · G · Fair · As-is (D10) — lives in data,
 * each grade with its definition and its A–D equivalent, so the scale is never a fixed enum and
 * the curator can word it (D10 is the curator's). Pure.
 */

/** "A", "B+", "C-", or a span between two ("B/C"). */
export const GRADE_EQUIVALENT = /^[A-D][+-]?(?:\/[A-D][+-]?)?$/

export function gradeEquivalentError(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === '') return null
  return GRADE_EQUIVALENT.test(value.trim()) ? null : 'An A–D equivalent such as A, B+, C- or B/C.'
}
