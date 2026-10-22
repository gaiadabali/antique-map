/**
 * Inline references in a description — "( Ref: Tooley, R.V. (Australia)
 * 1268. )", "(Ref: Tiele 1234)", "Ref. Tooley 670; Suarez p. 209" — →
 * structured `{ source, ref }`, only where the pattern is unambiguous: every
 * item an author (a surname, optional particles and initials, an optional
 * bracketed volume) followed by a catalogue number, page or plate code. A
 * book title, a bare name ("Ref: Shirley"), an annotation ("2780 note") or a
 * label in running prose goes to review with the raw citation; nothing is
 * split on a guess. The description itself is left as it is.
 */
import type { NormaliseTables } from './tables.ts'
import { clean, escapeRegExp, htmlToText, isBlank } from './text.ts'
import { accept, empty, review, type Parsed, type Reference } from './types.ts'

const SURNAME = String.raw`[A-Z][A-Za-z'’\-]+`
const PARTICLE = String.raw`(?:van|de|der|den|von|la|le|du|ten|ter)`
const INITIALS = String.raw`(?:[A-Z]\.\s?){1,3}`
const AUTHOR = String.raw`${SURNAME}(?:\s+(?:${PARTICLE}\s+)*${SURNAME})?(?:,\s*${INITIALS})?(?:\s*\([A-Z][^()]*\))?`
const NUMBER = String.raw`(?:(?:no\.?|nr\.?|#)\s*)?\d+[A-Za-z]?(?:\.\d+)?|p{1,2}\.?\s?\d+(?:-\d+)?|pl\.?\s?\d+|[A-Z][a-z]?\d+[A-Za-z]?`
const ITEM = new RegExp(`^(${AUTHOR})\\s*,?\\s+(${NUMBER})$`)

export function parseReferences(html: string | null, tables: NormaliseTables): Parsed<Reference[]> {
  if (isBlank(html)) return empty(null)
  const spans = referenceSpans(html ?? '', tables.referenceLabels)
  if (spans.length === 0) return empty(null)
  const raw = spans.map((span) => span.text).join(' | ')
  const references: Reference[] = []
  const failures: string[] = []
  for (const span of spans) {
    const items = span.body
      .split(';')
      .map((item) => clean(item.replace(/[.\s]+$/, '')) ?? '')
      .filter((item) => item !== '')
    if (items.length === 0) failures.push(`an empty reference "${span.text}"`)
    for (const item of items) {
      const match = ITEM.exec(item)
      if (match === null) failures.push(`"${item}" is not in "Author number" form`)
      else references.push({ source: clean(match[1]) ?? '', ref: match[2] ?? '' })
    }
  }
  if (failures.length > 0)
    return review(raw, references.length > 0 ? references : null, failures.join('; '))
  return accept(raw, references)
}

type Span = { text: string; body: string }

/**
 * Every labelled citation: a label ("Ref", "Reference" …) followed by "." or
 * ":" — so prose like "a reference to Argus" is not one. In brackets, the
 * citation runs to the matching bracket; otherwise to the end of the paragraph.
 */
function referenceSpans(html: string, labels: readonly string[]): Span[] {
  const alternatives = [...labels]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  const label = new RegExp(String.raw`\b(?:${alternatives})\b\s*[.:](?:\s*[.:])?\s*`, 'gi')
  const spans: Span[] = []
  for (const paragraph of html.split(/<\/p>|<br\s*\/?>|\n/i)) {
    const text = htmlToText(paragraph)
    for (const match of text.matchAll(label)) {
      const start = match.index
      // "… a separate reference. Graffiti …": a label straight after a word is prose, not a citation.
      if (/[\p{L},]$/u.test(text.slice(0, start).trimEnd())) continue
      const opening = /\(\s*$/.exec(text.slice(0, start))
      const bodyStart = start + match[0].length
      if (opening === null) {
        spans.push({ text: text.slice(start).trim(), body: text.slice(bodyStart) })
        continue
      }
      const close = matchingBracket(text, bodyStart)
      const end = close === -1 ? text.length : close
      spans.push({
        text: text.slice(opening.index, close === -1 ? text.length : close + 1).trim(),
        body: text.slice(bodyStart, end),
      })
    }
  }
  return spans
}

/** The index of the ")" closing a bracket opened before `from`, skipping nested pairs; -1 if none. */
function matchingBracket(text: string, from: number): number {
  let depth = 0
  for (let index = from; index < text.length; index++) {
    const char = text[index]
    if (char === '(') depth++
    else if (char === ')') {
      if (depth === 0) return index
      depth--
    }
  }
  return -1
}
