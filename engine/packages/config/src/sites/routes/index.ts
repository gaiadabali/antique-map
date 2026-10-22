/**
 * Each site's public URLs (ARCHITECTURE.md §5): the surfaces, a site's route map, `href()` and its
 * inverse `parsePublicPath()`, the old site's URLs and the root files the proxy answers first.
 * Nothing builds a URL by hand.
 */
export { routeIssues } from './check'
export * from './href'
export { legacyTarget, type LegacyRoutes } from './legacy'
export * from './parse'
export * from './root-files'
export { decodeSegments } from './segments'
export * from './surfaces'
export type * from './types'
