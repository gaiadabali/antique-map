/**
 * Condition typed freehand against an unpublished scale → a grade of the
 * brand's published scale (D10 by default) plus the notes that followed it.
 * "G+ / Study images carefully" and "G+ / Study image carefully" are the same
 * grade with the same stock phrase; the stock phrases are data
 * (`conditionBoilerplate`) and are dropped from the notes, everything else is
 * kept word for word. A grade the scale does not have ("G-", "VG-") or text
 * with no grade at all goes to review — it is never rounded to a neighbour.
 */
import type { GradeTerm, NormaliseTables } from './tables.ts'
import { clean, escapeRegExp, isBlank, key } from './text.ts'
import { accept, empty, review, type ConditionValue, type Parsed } from './types.ts'

/** What may follow a grade: the end, a space, or punctuation — never "+" or "-" (those make another grade). */
const AFTER_GRADE = String.raw`(?=$|\s|[/,;:(.])`

export function parseCondition(
  text: string | null,
  tables: NormaliseTables,
): Parsed<ConditionValue> {
  const raw = text
  if (isBlank(text)) return empty(raw)
  const value = clean(text) ?? ''
  const found = leadingGrade(value, tables.grades)
  if (found === null) {
    const token = /^([A-Za-z]{1,2}[+-]?)(?=$|\s|[/,(])/.exec(value)?.[1]
    return review(
      raw,
      null,
      token !== undefined && token.length <= 3 && /[A-Z]/.test(token)
        ? `"${token}" is not a grade on the scale`
        : 'no grade on the scale',
    )
  }
  const notes = stripBoilerplate(value.slice(found.length), tables.conditionBoilerplate)
  return accept(raw, { grade: found.term.code, notes })
}

function leadingGrade(
  value: string,
  grades: readonly GradeTerm[],
): { term: GradeTerm; length: number } | null {
  const spellings = grades
    .flatMap((term) => [term.code, ...term.aliases].map((spelling) => ({ term, spelling })))
    .sort((a, b) => b.spelling.length - a.spelling.length)
  for (const { term, spelling } of spellings) {
    const match = new RegExp(`^${escapeRegExp(spelling)}${AFTER_GRADE}`, 'i').exec(value)
    if (match) return { term, length: match[0].length }
  }
  return null
}

/** The words after the grade, without separators, wrapping brackets or the store's stock phrases. */
function stripBoilerplate(rest: string, boilerplate: readonly string[]): string | null {
  let notes = rest
  for (const phrase of boilerplate) {
    const words = key(phrase)
      .split(' ')
      .map(escapeRegExp)
      .join(String.raw`[\s.,]+`)
    notes = notes.replace(new RegExp(String.raw`\b${words}\b\.?`, 'gi'), ' ')
  }
  notes = notes.trim()
  const wrapped = /^\(\s*([^()]*?)\s*\)$/.exec(notes)
  if (wrapped) notes = wrapped[1] ?? ''
  notes = notes
    .replace(/^[\s/,;:\-–—.]+/, '')
    .replace(/[\s/,;:\-–—]+$/, '')
    .replace(/\(\s*\)/g, '')
  const cleaned = clean(notes)
  return cleaned === null || key(cleaned) === '' ? null : cleaned
}
