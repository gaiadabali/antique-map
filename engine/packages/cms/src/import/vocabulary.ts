/**
 * Vocabulary matching (DATA.md §3): makers by name or alias, places by name or historical name
 * (accents and case ignored), terms by label within their kind. **Matched, never created by
 * guess** — an import that cannot match exactly one name holds its row, with the nearest names as
 * suggestions; the owner adds the record or the alias and reruns. The gallery seed creates what
 * its records need *before* importing (`../seed/gallery`), so its rows match.
 *
 * One index per run: the collections are read once (`../collections/…`), folded, and every row of
 * the file looks the names up locally — no query per row.
 */
import type { Payload, PayloadRequest } from 'payload'

/** Lowercase, accents folded, whitespace collapsed — how a name is matched. */
export const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export type Match<T> = { readonly id: T } | { readonly suggestions: readonly string[] }

type Doc = Record<string, unknown> & { id: number }

const namesOf = (doc: Doc): readonly string[] => {
  const rows =
    (doc.aliases as Array<{ name?: string }> | null) ??
    (doc.historicalNames as Array<{ name?: string }> | null) ??
    []
  return [doc.name as string, ...rows.map((row) => row?.name ?? '')].filter(
    (name): name is string => typeof name === 'string' && name.trim() !== '',
  )
}

/** One vocabulary, held folded: how a name is matched, and what the file may have meant. */
class FoldIndex<T> {
  readonly byFold = new Map<string, T[]>()
  readonly names: string[] = []

  add(name: string, id: T) {
    this.names.push(name)
    const folded = fold(name)
    const hits = this.byFold.get(folded) ?? []
    hits.push(id)
    this.byFold.set(folded, hits)
  }

  /** The ids whose names (or aliases) fold to `value`; more than one means ambiguous. */
  look(value: string): readonly T[] {
    return this.byFold.get(fold(value)) ?? []
  }

  /** Whether a name or alias folds to the value — used for the "exactly one" rule. */
  unique(value: string): T | null {
    const hits = this.look(value)
    return hits.length === 1 ? hits[0]! : null
  }
}

/** The nearest names a person should see in "did you mean …?" — containment, then distance. */
export const nearest = (value: string, names: readonly string[]): readonly string[] => {
  const target = fold(value)
  const score = (name: string): number => {
    const folded = fold(name)
    if (folded === target) return 0
    if (folded.includes(target) || target.includes(folded)) return 1
    return 2 + distance(target, folded)
  }
  return names.toSorted((a, b) => score(a) - score(b)).slice(0, 3)
}

/** Levenshtein distance, small enough for a suggestion list. */
function distance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let carry = previous[0]!
    previous[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j]!
      previous[j] = Math.min(
        previous[j]! + 1,
        previous[j - 1]! + 1,
        carry + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      carry = old
    }
  }
  return previous[b.length]!
}

/** All of a run's vocabularies, read once. `match(name)` answers a single id or suggestions. */
export type Vocabulary = {
  readonly makers: (value: string) => Match<number>
  readonly places: (value: string) => Match<number>
  /** A term of one kind: grade, subject, category … — labels are matched folded. */
  readonly terms: (kind: string, value: string) => Match<number>
}

export async function buildVocabulary(payload: Payload, req: PayloadRequest): Promise<Vocabulary> {
  const read = async (collection: string, where: Record<string, unknown> = {}) => {
    const { docs } = await payload.find({
      collection: collection as never,
      overrideAccess: true,
      req,
      limit: 10_000,
      depth: 0,
      where: where as never,
    })
    return docs as Doc[]
  }

  const makerIndex = new FoldIndex<number>()
  for (const doc of await read('makers'))
    for (const name of namesOf(doc)) makerIndex.add(name, doc.id)

  const placeIndex = new FoldIndex<number>()
  for (const doc of await read('places'))
    for (const name of namesOf(doc)) placeIndex.add(name, doc.id)

  // A category matches any kind's label: the shop's categories are terms, and §9's category kind
  // is the `category` column's target once it exists. Ambiguity holds the row, never guesses.
  const termIndex = new FoldIndex<number>()
  const termKind = new Map<number, string>()
  for (const doc of await read('terms')) {
    const kind = doc.kind as string
    // `label` is localised: match the default locale's string, never the whole object.
    const label = doc.label as unknown
    const name =
      typeof label === 'string' ? label : ((label as { en?: string } | undefined)?.en ?? '')
    if (name.trim() === '') continue
    termIndex.add(name, doc.id)
    termKind.set(doc.id, kind)
  }

  const resolve = <T>(value: string, index: FoldIndex<T>, all: readonly string[]): Match<T> => {
    const unique = index.unique(value)
    if (unique !== null) return { id: unique }
    return { suggestions: nearest(value, all) }
  }

  return {
    makers: (value) => resolve(value, makerIndex, makerIndex.names),
    places: (value) => resolve(value, placeIndex, placeIndex.names),
    terms: (kind, value) => {
      const id = termIndex.unique(value)
      if (id === null || (kind !== '' && termKind.get(id) !== kind)) {
        // Suggest only the labels of this kind, when a kind is given.
        const labels = termIndex.names.filter(
          (label) => kind === '' || termKind.get(termIndex.byFold.get(fold(label))![0]!) === kind,
        )
        return { suggestions: nearest(value, labels) }
      }
      return { id }
    },
  }
}
