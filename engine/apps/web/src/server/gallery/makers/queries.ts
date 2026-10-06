/**
 * The maker page's reads (5.4.a): `overrideAccess: false`, published only, an explicit `select` —
 * never `notes` or a staff field. A maker's works come through the catalogue's own card projection
 * (`../catalogue/projection`), so a maker's card is exactly a browse card; which ids to project is
 * this module's own small query (the catalogue's listing is a facet state, which a maker or place
 * is not one of — the ticket's thin-loader allowance).
 *
 * Kept free of `'use cache'` and of `'server-only'`: the cache is `./index.ts`'s, under the gallery
 * catalogue's tag, which every published maker, place, term or work change expires. Pure functions
 * over a given `Payload`, so a database test can call them with a pushed test stack's own instance
 * (`./index.ts`'s split, mirroring `server/shop/tracking`'s own).
 */
import type { SiteLocale } from '@engine/config/sites'
import type { Payload } from 'payload'

import { poolOf } from '../catalogue/db'
import { projectCards } from '../catalogue/projection'
import type { CardImage } from '../catalogue/view-models'
import type { MakerIndexItemVM, MakerVM } from './view-models'

/** The date a card shows when a work's date was left unknown, said on purpose (mirrors
 * `catalogue.ts`'s own `UNKNOWN_DATE`: not exported, so this is its own small copy). */
const UNKNOWN_DATE: Record<SiteLocale, string> = {
  en: 'Date unknown',
  id: 'Tanggal tidak diketahui',
}

const MAKER_SELECT = {
  name: true,
  sortName: true,
  slug: true,
  roles: true,
  born: { precision: true, from: true, to: true, display: true },
  died: { precision: true, from: true, to: true, display: true },
  nationality: true,
  portrait: { url: true, alt: true, width: true, height: true },
  sameAs: { url: true },
} as const

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const isString = (value: unknown): value is string => typeof value === 'string'

function mediaOf(value: unknown): CardImage | null {
  if (typeof value !== 'object' || value === null) return null
  const media = value as { url?: unknown; alt?: unknown; width?: unknown; height?: unknown }
  if (typeof media.url !== 'string' || typeof media.alt !== 'string') return null
  const int = (n: unknown) => (typeof n === 'number' && Number.isSafeInteger(n) ? n : null)
  return { url: media.url, alt: media.alt, width: int(media.width), height: int(media.height) }
}

/** A life date group's own words ("1666", "c. 1750"), or `null` when it names no year. */
function lifeDateText(group: unknown): string | null {
  if (typeof group !== 'object' || group === null) return null
  const g = group as { precision?: unknown; from?: unknown; to?: unknown; display?: unknown }
  if (typeof g.display === 'string' && g.display.trim() !== '') return g.display
  const from = typeof g.from === 'number' ? g.from : null
  if (from === null) return null
  switch (g.precision) {
    case 'exact':
      return String(from)
    case 'circa':
      return `c. ${from}`
    case 'before':
      return `before ${from}`
    case 'after':
      return `after ${from}`
    case 'range':
      return typeof g.to === 'number' && g.to !== from ? `${from}–${g.to}` : String(from)
    default:
      return null
  }
}

/** The ids of a maker's published works in one status group, newest first. */
async function workIdsOf(
  payload: Payload,
  makerId: number,
  locale: SiteLocale,
  statuses: readonly string[],
): Promise<readonly number[]> {
  const found = await payload.find({
    collection: 'works',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { 'makers.maker': { equals: makerId } },
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

/** One maker page's data, or `null` — no published maker has this slug. */
export async function loadMakerWith(
  payload: Payload,
  slug: string,
  locale: SiteLocale,
): Promise<MakerVM | null> {
  const found = await payload.find({
    collection: 'makers',
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
    select: MAKER_SELECT,
    depth: 1,
    limit: 1,
    locale,
  })
  const doc = found.docs[0] as Record<string, unknown> | undefined
  if (!doc) return null
  const id = Number((doc as { id: unknown }).id)
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
    sortName: str(doc.sortName),
    slug: str(doc.slug) || slug,
    roles: Array.isArray(doc.roles) ? doc.roles.filter(isString) : [],
    bornText: lifeDateText(doc.born),
    diedText: lifeDateText(doc.died),
    nationality: str(doc.nationality) || null,
    portrait: mediaOf(doc.portrait),
    sameAs: Array.isArray(doc.sameAs)
      ? (doc.sameAs as readonly { url?: unknown }[])
          .map((row) => str(row.url))
          .filter((u) => u !== '')
      : [],
    available,
    sold,
  }
}

/** The makers index: every published maker, A–Z by sort name, with its life dates and a count of
 * its published works (every status: the index does not filter sold). */
export async function loadMakerIndexWith(
  payload: Payload,
  locale: SiteLocale,
): Promise<readonly MakerIndexItemVM[]> {
  const found = await payload.find({
    collection: 'makers',
    overrideAccess: false,
    where: { _status: { equals: 'published' } },
    select: {
      sortName: true,
      name: true,
      slug: true,
      born: { precision: true, from: true, to: true, display: true },
      died: { precision: true, from: true, to: true, display: true },
    },
    depth: 0,
    limit: 0,
    pagination: false,
    locale,
    sort: 'sortName',
  })
  const docs = found.docs as readonly Record<string, unknown>[]
  if (docs.length === 0) return []
  const pool = poolOf(payload)
  const { rows } = await pool.query(
    // DISTINCT: a work crediting one maker twice (cartographer and engraver) is one work.
    `SELECT wm.maker_id, COUNT(DISTINCT wm._parent_id) AS n
       FROM works_makers wm
       JOIN works w ON w.id = wm._parent_id
      WHERE w._status = 'published'
      GROUP BY wm.maker_id`,
  )
  const counts = new Map<number, number>(
    rows.map((row) => [Number(row.maker_id), Number(row.n)] as const),
  )
  return docs.map((doc) => {
    const id = Number((doc as { id: unknown }).id)
    return {
      slug: str(doc.slug),
      name: str(doc.name),
      bornText: lifeDateText(doc.born),
      diedText: lifeDateText(doc.died),
      workCount: counts.get(id) ?? 0,
    }
  })
}
