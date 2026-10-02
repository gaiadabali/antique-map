/**
 * A provenance copy's synced fields (TASKS.md 8.2.d; requirement 3.7; BRANDS.md §5; CONTENT-MODEL.md
 * §9 "synced fields on a provenance copy are unchanged"). A copy is a sister's work, copied with
 * provenance (`origin`); what the origin's snapshot carries (C12 `WorkSnapshot`) is the origin's to
 * change, and reaches the copy only through the sister importer. Everything else on a copy — its
 * images, its description, its SEO, the outlet's own notes — is the outlet's.
 *
 * Pure: which synced paths an update changes, compared value for value after the noise Payload
 * and the admin add is taken out (array-row ids, a populated relation in place of its id, an
 * absent value beside a null one).
 */

/**
 * The paths a sister snapshot carries (C12 `WorkSnapshot`, its private keys excepted), as this
 * collection stores them. The copy's own `workUid` is its own; `origin` is guarded on its own.
 */
export const SYNCED_PATHS = [
  'stockNumber',
  'title',
  'originalTitle',
  'objectType',
  'makers',
  'date',
  'publication.place',
  'publication.publisher',
  'publication.sourceWork',
  'publication.edition',
  'technique',
  'colour',
  'dimensions.image',
  'dimensions.sheet',
  'places',
  'subjects',
  'references',
  'rights.status',
  'rights.holder',
  'rights.printAllowed',
  'rights.territories',
  'rights.expires',
  'master',
] as const
export type SyncedPath = (typeof SYNCED_PATHS)[number]

type Lookup = { found: boolean; value: unknown }

function lookup(source: unknown, path: string): Lookup {
  let current: unknown = source
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || !(segment in current)) {
      return { found: false, value: undefined }
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return { found: true, value: current }
}

/** A document — populated in place of its id — has timestamps; an array row never does. */
const isDocument = (value: Record<string, unknown>) =>
  'id' in value && ('createdAt' in value || 'updatedAt' in value)

/**
 * A value as the comparison sees it: blanks are `null`, a populated relation its id, an id in
 * decimal its number, a date its instant, an array row without its row id, an object without
 * its blank keys.
 */
export function comparable(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string' && /^[0-9]{1,15}$/.test(value)) return Number(value)
  // A date the admin sends as a day and Payload stores as an instant are one date.
  if (typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:T[0-9:.]+Z?)?$/.test(value)) {
    const time = Date.parse(value)
    return Number.isNaN(time) ? value : new Date(time).toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.length === 0 ? null : value.map(comparable)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (isDocument(record)) return comparable(record.id)
    const entries = Object.entries(record)
      .filter(([key]) => key !== 'id')
      .map(([key, each]) => [key, comparable(each)] as const)
      .filter(([, each]) => each !== null)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return entries.length === 0 ? null : Object.fromEntries(entries)
  }
  return value
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(comparable(a)) === JSON.stringify(comparable(b))

/** The synced paths `data` sets to something other than what `stored` holds. */
export function changedSyncedPaths(
  data: Readonly<Record<string, unknown>>,
  stored: Readonly<Record<string, unknown>> | null | undefined,
): SyncedPath[] {
  return SYNCED_PATHS.filter((path) => {
    const sent = lookup(data, path)
    return sent.found && !same(sent.value, lookup(stored ?? {}, path).value)
  })
}

export type Origin = {
  readonly brand?: string | null
  readonly workUid?: string | null
  readonly syncedAt?: string | null
}

/** Whether a stored or sent `origin` makes the work a provenance copy. */
export function isProvenanceCopy(origin: Origin | null | undefined): boolean {
  return typeof origin?.workUid === 'string' && origin.workUid.length > 0
}

/** Whether `data` changes `origin` from what `stored` holds. */
export function originChanged(
  data: Readonly<Record<string, unknown>>,
  stored: Readonly<Record<string, unknown>> | null | undefined,
): boolean {
  return 'origin' in data && !same(data.origin, stored?.origin)
}

/** Whether a value holds anything at all: some leaf neither blank nor an unticked box. */
export function holdsAny(value: unknown): boolean {
  if (value === false) return false
  const flat = comparable(value)
  if (flat === null) return false
  if (Array.isArray(flat)) return flat.some(holdsAny)
  if (typeof flat === 'object') return Object.values(flat as object).some(holdsAny)
  return true
}
