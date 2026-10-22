/**
 * A work's rows that point at the discovery vocabulary (TASKS.md 8.2.a; CONTENT-MODEL.md §1):
 * makers credited with a role and a certainty, places with a role and at most one primary, and
 * references to the bibliography. Every save, drafts included. Pure: each answers, row by row,
 * what is wrong — `null` for a row that is fine — so a field validator can report on its own row.
 */

/** A relationship value as Payload hands it over: an id, or the populated document. */
export function refId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (typeof value === 'object' && 'id' in value) return refId((value as { id: unknown }).id)
  return null
}

export type CreditRow = { readonly maker?: unknown; readonly role?: unknown }

/** A maker credited twice in one role is a duplicate; once as engraver and once as publisher is not. */
export function creditRowErrors(
  rows: readonly (CreditRow | null | undefined)[],
): (string | null)[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    const maker = refId(row?.maker)
    if (maker === null || typeof row?.role !== 'string') return null
    const key = `${maker}:${row.role}`
    if (seen.has(key)) return 'This maker is already credited in this role: remove one of the two.'
    seen.add(key)
    return null
  })
}

export type PlaceRow = {
  readonly place?: unknown
  readonly role?: unknown
  readonly primary?: unknown
}

/** At most one primary place, and no place twice in one role. */
export function placeRowErrors(rows: readonly (PlaceRow | null | undefined)[]): {
  place: (string | null)[]
  primary: (string | null)[]
} {
  const seen = new Set<string>()
  let primaryAt = -1
  const place: (string | null)[] = []
  const primary: (string | null)[] = []
  rows.forEach((row, index) => {
    const id = refId(row?.place)
    const key = id === null ? null : `${id}:${String(row?.role)}`
    if (key !== null && seen.has(key)) {
      place.push('This place is already listed in this role: remove one of the two.')
    } else {
      if (key !== null) seen.add(key)
      place.push(null)
    }
    if (row?.primary === true && primaryAt !== -1) {
      primary.push('Only one place is primary: untick the other first.')
    } else {
      if (row?.primary === true) primaryAt = index
      primary.push(null)
    }
  })
  return { place, primary }
}

/** Whether a row marks a place as the work's primary. */
export function hasPrimaryPlace(rows: readonly (PlaceRow | null | undefined)[] | null | undefined) {
  return (rows ?? []).some((row) => row?.primary === true && refId(row.place) !== null)
}

export type ReferenceRow = { readonly source?: unknown; readonly ref?: unknown }

/** "Tooley (Australia) 1268" once: the same source and number twice is a duplicate. */
export function referenceRowErrors(
  rows: readonly (ReferenceRow | null | undefined)[],
): (string | null)[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    const source = refId(row?.source)
    const ref = typeof row?.ref === 'string' ? row.ref.trim().toLowerCase() : ''
    if (source === null || ref === '') return null
    const key = `${source}:${ref}`
    if (seen.has(key)) return 'This reference is already listed: remove one of the two.'
    seen.add(key)
    return null
  })
}
