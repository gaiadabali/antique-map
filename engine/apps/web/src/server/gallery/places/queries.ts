/**
 * The place page's reads (5.4.a): the published gazetteer tree is the catalogue's own
 * (`../catalogue/places`, reused — never rewritten) for resolving a path (`java/batavia`) and
 * listing a place's children; a place's own historical names, type and works are this module's
 * own small reads, `overrideAccess: false`, published only.
 *
 * Kept free of `'use cache'` and of `'server-only'` — see `../makers/queries.ts`'s note: no
 * cache-tag kind exists yet for a place, and pure functions over a given `Payload` let a database
 * test call them with a pushed test stack's own instance.
 */
import type { SiteLocale } from '@engine/config/sites'
import type { Payload } from 'payload'

import { loadPlaces, placeIdOfPath, type PlaceNode } from '../catalogue/places'
import { projectCards } from '../catalogue/projection'
import type { HistoricalNameVM, PlaceIndexNodeVM, PlaceVM } from './view-models'

const UNKNOWN_DATE: Record<SiteLocale, string> = {
  en: 'Date unknown',
  id: 'Tanggal tidak diketahui',
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

function historicalNamesOf(value: unknown): readonly HistoricalNameVM[] {
  if (!Array.isArray(value)) return []
  return (value as readonly { name?: unknown; language?: unknown; period?: unknown }[])
    .map((row) => ({
      name: str(row.name),
      language: str(row.language) || null,
      period: str(row.period) || null,
    }))
    .filter((row) => row.name !== '')
}

/** The ids of a place's published works in one status group, newest first. The place's own works
 * only (not its descendants' — the facet's roll-up is a browse concept, not this page's). */
async function workIdsOf(
  payload: Payload,
  placeId: number,
  locale: SiteLocale,
  statuses: readonly string[],
): Promise<readonly number[]> {
  const found = await payload.find({
    collection: 'works',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { 'places.place': { equals: placeId } },
        { status: { in: [...statuses] } },
      ],
    },
    select: { id: true },
    depth: 0,
    limit: 0,
    pagination: false,
    locale,
    sort: '-createdAt',
  })
  return (found.docs as readonly { id: number }[]).map((doc) => doc.id)
}

/** One place page's data, or `null` — the path names no published place. */
export async function loadPlaceWith(
  payload: Payload,
  path: readonly string[],
  locale: SiteLocale,
): Promise<PlaceVM | null> {
  const tree = await loadPlaces(payload, locale)
  const id = placeIdOfPath(tree, path)
  if (id === null) return null
  const found = await payload.find({
    collection: 'places',
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { id: { equals: id } }] },
    select: {
      name: true,
      historicalNames: { name: true, language: true, period: true },
      type: true,
    },
    depth: 0,
    limit: 1,
    locale,
  })
  const doc = found.docs[0] as Record<string, unknown> | undefined
  if (!doc) return null
  const children: readonly PlaceNode[] = tree.filter((place) => place.parentId === id)
  const [availableIds, soldIds] = await Promise.all([
    workIdsOf(payload, id, locale, ['available', 'on-hold']),
    workIdsOf(payload, id, locale, ['sold']),
  ])
  const [available, sold] = await Promise.all([
    projectCards(payload, availableIds, locale, UNKNOWN_DATE[locale]),
    projectCards(payload, soldIds, locale, UNKNOWN_DATE[locale]),
  ])
  return {
    id,
    name: str(doc.name),
    path,
    historicalNames: historicalNamesOf(doc.historicalNames),
    type: str(doc.type) || null,
    children: children
      .map((child) => ({ slug: child.slug, name: child.name, path: [...path, child.slug] }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    available,
    sold,
  }
}

/** The places index: the gazetteer's top-level branches (the island groups, "Beyond Indonesia"),
 * a drill-down rather than every place at once (EXPERIENCE-GALLERY.md §2). */
export async function loadPlaceIndexWith(
  payload: Payload,
  locale: SiteLocale,
): Promise<readonly PlaceIndexNodeVM[]> {
  const tree = await loadPlaces(payload, locale)
  const childCountOf = (id: number) => tree.filter((place) => place.parentId === id).length
  return tree
    .filter((place) => place.parentId === null)
    .map((place) => ({
      slug: place.slug,
      path: [place.slug],
      name: place.name,
      childCount: childCountOf(place.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
