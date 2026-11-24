/**
 * What every collection factory here takes: the admin sidebar group the CMS files it under, and —
 * for today's one CMS only — the `site` field.
 *
 * The one CMS keeps both sites' records in one table, told apart by a `site` select (PLAN-V2.md
 * §4.1). A factory given `site` puts that field where it always stood, lists it in the admin's
 * columns, and leads the collection's indexes with it (`(site, slug)` unique, say). A CMS for one
 * site passes none, and the same index is on the other columns alone. Phase 26 drops the option.
 */
import type { Field } from 'payload'

/** A sidebar group's label in both admin languages — each CMS names its own groups. */
export type AdminGroup = { readonly en: string; readonly id: string }

export type SharedCollectionOptions = {
  /** The admin sidebar group this collection sits in. */
  readonly group: AdminGroup
  /** The one CMS's `site` field (until phase 26), exactly as the collection declares it. */
  readonly site?: Field
}

/** `fields`, led by `site` when there is one: an index's columns. */
export function siteKeyed(site: Field | undefined, fields: readonly string[]): string[] {
  return site ? ['site', ...fields] : [...fields]
}

/** `items` with `extra` inserted at `at` when `extra` is given: a column list, or fields. */
export function insertedAt<T>(items: readonly T[], at: number, extra: T | undefined): T[] {
  return extra === undefined ? [...items] : [...items.slice(0, at), extra, ...items.slice(at)]
}

/** The admin list's `columns`, with `site` at `at` while there is a `site` field. */
export function withSiteColumn(
  columns: readonly string[],
  at: number,
  site: Field | undefined,
): string[] {
  return insertedAt(columns, at, site ? 'site' : undefined)
}
