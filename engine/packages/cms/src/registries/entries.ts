/**
 * The shape every registry entry takes (PARALLEL-TRACKS.md §1): what it is called, which lane
 * owns it, and the value Payload receives. A lane adds entries to its own package's barrel; the
 * SCH lead adds the one line that imports a package's barrel the first time it has something.
 * Two entries with one name fail the config — a job, a view or a plugin silently replaced by
 * another lane's is the collision this prevents.
 */

/** The lanes of PARALLEL-TRACKS.md §1 that can own a CMS registry entry. */
export type Lane =
  'SCH' | 'ADM' | 'DOM' | 'PAY' | 'LOG' | 'MED' | 'SRC' | 'NTF' | 'SIS' | 'MIG' | 'SEO'

export type RegistryEntry<T> = {
  /** A task's slug, a view's key, a plugin's name — unique within its registry. */
  readonly name: string
  readonly owner: Lane
  readonly value: T
}

export class DuplicateRegistryEntry extends Error {
  override readonly name = 'DuplicateRegistryEntry'
}

/** The values, in order, after refusing any name registered twice (naming both owners). */
export function uniqueEntries<T>(registry: string, entries: readonly RegistryEntry<T>[]): T[] {
  const seen = new Map<string, Lane>()
  for (const entry of entries) {
    const first = seen.get(entry.name)
    if (first !== undefined) {
      throw new DuplicateRegistryEntry(
        `${registry}: "${entry.name}" is registered twice (by ${first} and by ${entry.owner}); a name is unique within a registry`,
      )
    }
    seen.set(entry.name, entry.owner)
  }
  return entries.map((entry) => entry.value)
}
