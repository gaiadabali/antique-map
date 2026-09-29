// 2.2.d — the manifest-only invariants (ARCHITECTURE.md §11, C13): pure
// functions over `ENGINE_ROUTES`, so they are unit-testable with fixture
// routes and never need a running app or a database.

/** Payload's own reserved namespaces — shadowed regardless of any collection (ARCHITECTURE.md §11). */
export const RESERVED_SEGMENTS = ['payload-jobs', 'graphql']

/** The first segment after `/api/x/`, `/api/` or `/` — mirrors `handlerOf()`'s own split. */
export function firstSegment(path) {
  const rest = path.replace(/^\/api\/x\/|^\/api\/|^\//, '')
  const segment = rest.split('/').find((s) => s !== '' && !s.startsWith('['))
  return segment ?? ''
}

/** An engine route whose first segment is `payload-jobs`, `graphql`, or (once discoverable) a collection slug. */
export function findReservedSegmentCollisions(routes, collectionSlugs = []) {
  const reserved = new Set([...RESERVED_SEGMENTS, ...collectionSlugs])
  return routes
    .filter((route) => reserved.has(firstSegment(route.path)))
    .map((route) => ({ path: route.path, segment: firstSegment(route.path) }))
}

/** Two engine routes that mount the same literal path — a manifest authoring error, not a per-app one. */
export function findDuplicateMounts(routes) {
  const seen = new Map()
  const dupes = []
  for (const route of routes) {
    if (seen.has(route.path)) dupes.push(route.path)
    seen.set(route.path, true)
  }
  return [...new Set(dupes)]
}

/**
 * Every `HttpMethod` the manifest lists for `path`, compared against what an
 * app's route file actually exports (`present`, the export names of its
 * `route.ts`). Returns the missing and the extra — an app may not answer for
 * a method the manifest does not list, and must answer for every one it does.
 */
export function diffMethods(expected, present) {
  const expectedSet = new Set(expected)
  const presentSet = new Set(present)
  return {
    missing: expected.filter((m) => !presentSet.has(m)),
    extra: present.filter(
      (m) => !expectedSet.has(m) && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(m),
    ),
  }
}

/** `true` when two matcher arrays are the same literal list, in order. */
export function matchersEqual(a, b) {
  return (
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])
  )
}
