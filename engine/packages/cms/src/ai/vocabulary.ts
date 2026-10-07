/**
 * The drafted place and subject names, matched against rows that already exist (TASKS.md 8.3.a;
 * AI.md §5): a place by its name or any of its historical names, a subject by a `subject` term's
 * label — case and spacing aside, never a fuzzy guess, and never a new row. Read as the requesting
 * user (`overrideAccess: false`): the rows a cataloguer could pick in the admin.
 */
import type { Payload, Where } from 'payload'

import type { VocabularyMatches } from './plan'

type Doc = Record<string, unknown>

const norm = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

function unique(names: readonly string[]): string[] {
  const seen = new Set<string>()
  return names.filter((name) => {
    const key = norm(name)
    if (key === '' || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

type Candidate = { id: number | string; names: string[] }

function placeCandidates(docs: Doc[]): Candidate[] {
  return docs.map((doc) => ({
    id: doc.id as number | string,
    names: [
      doc.name,
      ...(Array.isArray(doc.historicalNames) ? doc.historicalNames : []).map(
        (row) => (row as Doc | null)?.name,
      ),
    ].filter((name): name is string => typeof name === 'string'),
  }))
}

/** Each name's row, in the reply's order; a name with none is returned as unmatched. */
function pick(names: readonly string[], candidates: readonly Candidate[]) {
  const ids: (number | string)[] = []
  const unmatched: string[] = []
  for (const name of names) {
    const hit = candidates.find((row) => row.names.some((each) => norm(each) === norm(name)))
    if (!hit) unmatched.push(name)
    else if (!ids.includes(hit.id)) ids.push(hit.id)
  }
  return { ids, unmatched }
}

/**
 * A model-written name as a `like` term. The adapter wraps each space-separated word in `%…%`
 * without escaping, so `%`, `_` and `\` would be wildcards and an empty word (two spaces) would
 * match every row: they become spaces, and the spaces collapse.
 */
export function likeTerm(name: string): string {
  return name.replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** `like` finds the candidates (case-insensitive); the exact match is `pick()`'s. */
const anyOf = (paths: readonly string[], terms: readonly string[]): Where => ({
  or: terms.flatMap((term) => paths.map((path) => ({ [path]: { like: term } }))),
})

const termsOf = (names: readonly string[]) => names.map(likeTerm).filter((term) => term !== '')

export async function matchVocabulary(
  payload: Payload,
  user: unknown,
  placeNames: readonly string[],
  subjectNames: readonly string[],
): Promise<VocabularyMatches> {
  const places = unique(placeNames)
  const subjects = unique(subjectNames)
  const placeTerms = termsOf(places)
  const subjectTerms = termsOf(subjects)
  const common = { overrideAccess: false, user, depth: 0, limit: 50, pagination: false } as const
  const placeDocs = placeTerms.length
    ? (
        await payload.find({
          collection: 'places',
          ...common,
          locale: 'en',
          where: anyOf(['name', 'historicalNames.name'], placeTerms),
          select: { name: true, historicalNames: true },
        } as Parameters<Payload['find']>[0])
      ).docs
    : []
  const termDocs = subjectTerms.length
    ? (
        await payload.find({
          collection: 'terms',
          ...common,
          locale: 'en',
          where: { and: [{ kind: { equals: 'subject' } }, anyOf(['label'], subjectTerms)] },
          select: { label: true },
        } as Parameters<Payload['find']>[0])
      ).docs
    : []
  const placeHits = pick(places, placeCandidates(placeDocs as Doc[]))
  const subjectHits = pick(
    subjects,
    (termDocs as Doc[]).map((doc) => ({
      id: doc.id as number | string,
      names: typeof doc.label === 'string' ? [doc.label] : [],
    })),
  )
  return {
    places: placeHits.ids,
    subjects: subjectHits.ids,
    unmatchedPlaces: placeHits.unmatched,
    unmatchedSubjects: subjectHits.unmatched,
  }
}
