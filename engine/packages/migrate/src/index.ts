/**
 * @engine/migrate — the legacy migration package (TASKS.md 7.1.e). Source
 * adapters live under `src/sources/<source>/` and are imported by their own
 * entry, `@engine/migrate/sources/<source>`; the normalisers (7.2) by
 * `@engine/migrate/normalise`. This root entry names the sources this package
 * ships and re-exports the parts other packages build on: the normalisers,
 * with both source adapters (`fromPublicRead`, `fromCatalogueRow`), and the
 * public read's raw record.
 */
export const SOURCES = ['laravel-catalogue', 'public-read'] as const
export type SourceName = (typeof SOURCES)[number]

export * from './normalise/index.ts'
export type { PublicProductRecord } from './sources/public-read/index.ts'
