// 2.2.d — the manifest-only invariants (ARCHITECTURE.md §11, C13): pure
// functions over `ENGINE_ROUTES`, so they are unit-testable with fixture
// routes and never need a running app or a database.

/** Payload's own reserved namespaces — shadowed regardless of any collection (ARCHITECTURE.md §11). */
export const RESERVED_SEGMENTS = ['payload-jobs', 'graphql']

/**
 * The segment Payload's REST API would read as a collection: the first one after `/api/`
 * (C13: "a first segment after `/api/` equal to a collection slug, `payload-jobs` or
 * `graphql`"). Payload's catch-all is `/api/[...slug]`, so `/api/x/media/…` is under `x`, which
 * no collection may be named, and never shadows `/api/media/…`; `/api/health` is under `health`.
 * `null` for a route outside `/api/` (`/brand-assets/…`), which cannot shadow the REST API.
 * (Not `handlerOf()`'s split, which also strips `/api/x/`: that names a handler, not a shadow.)
 */
export function firstSegment(path) {
  if (!path.startsWith('/api/')) return null
  const [segment = ''] = path.slice('/api/'.length).split('/')
  return segment === '' || segment.startsWith('[') ? null : segment
}

/** An engine route whose first segment after `/api/` is `payload-jobs`, `graphql` or a collection slug. */
export function findReservedSegmentCollisions(routes, collectionSlugs = []) {
  const reserved = new Set([...RESERVED_SEGMENTS, ...collectionSlugs])
  return routes
    .map((route) => ({ path: route.path, segment: firstSegment(route.path) }))
    .filter(({ segment }) => segment !== null && reserved.has(segment))
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
