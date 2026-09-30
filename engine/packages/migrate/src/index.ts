/**
 * @engine/migrate — the legacy migration package (TASKS.md 7.1.e). Source
 * adapters live under `src/sources/<source>/` and are imported by their own
 * entry, `@engine/migrate/sources/<source>`; this root entry names the sources
 * this package ships and re-exports the parts other packages build on.
 */
export const SOURCES = ['laravel-catalogue', 'public-read'] as const
export type SourceName = (typeof SOURCES)[number]

export type { PublicProductRecord } from './sources/public-read/index.ts'
