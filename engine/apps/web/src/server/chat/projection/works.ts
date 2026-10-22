/**
 * The gallery's antiques as the chat's tools return them (AI.md §2.4 `search_catalogue`,
 * `get_item`). Three layers, any one of which would be enough:
 *
 * 1. the read `select`s only the public fields named below (`WORK_SUMMARY_SELECT`,
 *    `WORK_DETAIL_SELECT`) — never `askingPrice`, `notes`, `aiDraft`, `legacy`, `physical`,
 *    `rights`, `cataloguing` or anything 3.2 adds later — published only, `overrideAccess: false`;
 * 2. the mapper builds the result field by field from that allow-list, ignoring whatever else a
 *    document holds;
 * 3. every string has any amount removed, and `assertPublicProjection()` throws on a forbidden key.
 *
 * Until the item page's own loader lands, this is the chat's copy of the item page's projection.
 */
import 'server-only'

import { createHref, siteOrigin, SITES } from '@engine/config/sites'

import type { ChatCopy } from '../lexicon'
import type { CatalogueFind, CatalogueReader } from '../ports'
import type { SiteLocale } from '../types'
import { assertPublicProjection } from './forbidden'
import { asDoc, list, mediaUrl, num, plainText, redactStrings, relField, str } from './read'

export const PUBLISHED = { _status: { equals: 'published' } } as const

export const WORK_SUMMARY_SELECT = {
  publicId: true,
  slug: true,
  title: true,
  objectType: true,
  status: true,
  date: { display: true },
  makers: { maker: true, role: true },
  images: { media: true },
} as const

export const WORK_DETAIL_SELECT = {
  ...WORK_SUMMARY_SELECT,
  stockNumber: true,
  originalTitle: true,
  date: { display: true, from: true, to: true, precision: true },
  places: { place: true, role: true },
  technique: true,
  colour: true,
  condition: { grade: true },
  dimensions: { image: { h: true, w: true }, sheet: { h: true, w: true } },
  description: true,
} as const

/** What a populated relation may show: names and labels, the media's URL and alt. */
export const WORK_POPULATE = {
  makers: { name: true },
  places: { name: true },
  terms: { label: true },
  media: { url: true, alt: true },
} as const

export type WorkSummary = {
  readonly id: string
  readonly title: string
  readonly summary: string | null
  readonly url: string
  readonly image: string | null
  readonly statusLabel: string | null
}

export type WorkDetail = WorkSummary & {
  readonly stockNumber: string | null
  readonly originalTitle: string | null
  readonly objectType: string | null
  readonly date: string | null
  readonly makers: readonly { readonly name: string; readonly role: string | null }[]
  readonly places: readonly string[]
  readonly technique: string | null
  readonly colour: string | null
  readonly conditionGrade: string | null
  readonly dimensions: string | null
  readonly description: string | null
}

export type GalleryFilters = {
  readonly place?: string | undefined
  readonly maker?: string | undefined
  readonly period?: string | undefined
  readonly objectType?: string | undefined
}

const href = createHref(SITES.gallery)
const STATUS_KEYS = {
  available: 'work.available',
  'on-hold': 'work.on-hold',
  sold: 'work.sold',
} as const

function workUrl(publicId: number, slug: string | null, locale: SiteLocale): string {
  const path = href('item', { publicId, slug: slug ?? 'item' }, locale)
  return `${siteOrigin('gallery') ?? ''}${path}`
}

function humanise(value: string | null): string | null {
  return value === null ? null : value.replace(/-/g, ' ')
}

function size(group: unknown): string | null {
  const h = num(asDoc(group)?.h)
  const w = num(asDoc(group)?.w)
  return h !== null && w !== null ? `${h} × ${w} mm` : null
}

function summaryOf(raw: unknown, locale: SiteLocale, t: ChatCopy): WorkSummary | null {
  const doc = asDoc(raw)
  const publicId = num(doc?.publicId)
  const title = str(doc?.title, 240)
  if (doc === null || publicId === null || title === null) return null
  const status = str(doc.status, 20)
  const firstMaker = relField(asDoc(list(doc.makers)[0])?.maker, 'name')
  const date = str(asDoc(doc.date)?.display, 60)
  const line = [humanise(str(doc.objectType, 40)), date, firstMaker].filter(Boolean).join(' · ')
  return {
    id: String(publicId),
    title,
    summary: line === '' ? null : line,
    url: workUrl(publicId, str(doc.slug, 200), locale),
    image: mediaUrl(asDoc(list(doc.images)[0])?.media),
    statusLabel:
      status !== null && status in STATUS_KEYS
        ? t(STATUS_KEYS[status as keyof typeof STATUS_KEYS])
        : null,
  }
}

function detailOf(raw: unknown, locale: SiteLocale, t: ChatCopy): WorkDetail | null {
  const summary = summaryOf(raw, locale, t)
  const doc = asDoc(raw)
  if (summary === null || doc === null) return null
  const dims = asDoc(doc.dimensions)
  const image = size(dims?.image)
  const sheet = size(dims?.sheet)
  return {
    ...summary,
    stockNumber: str(doc.stockNumber, 40),
    originalTitle: str(doc.originalTitle, 300),
    objectType: humanise(str(doc.objectType, 40)),
    date: str(asDoc(doc.date)?.display, 60),
    makers: list(doc.makers).flatMap((row) => {
      const name = relField(asDoc(row)?.maker, 'name')
      return name === null ? [] : [{ name, role: str(asDoc(row)?.role, 40) }]
    }),
    places: list(doc.places).flatMap((row) => relField(asDoc(row)?.place, 'name') ?? []),
    technique: humanise(str(doc.technique, 60)),
    colour: humanise(str(doc.colour, 60)),
    conditionGrade:
      relField(asDoc(doc.condition)?.grade, 'label') ?? str(asDoc(doc.condition)?.grade, 20),
    dimensions:
      [image && `image ${image}`, sheet && `sheet ${sheet}`].filter(Boolean).join('; ') || null,
    description: plainText(doc.description),
  }
}

/** The finished result: amounts out of every string, then the forbidden-key guard. */
function seal<T>(value: T): T {
  return assertPublicProjection(redactStrings(value), 'gallery')
}

/** A visitor's words for a `like`: wildcard and escape characters dropped, at most 80 characters. */
export const literal = (text: string) =>
  text
    .replace(/[%_\\]/g, ' ')
    .trim()
    .slice(0, 80)

export function workSearchQuery(
  query: string,
  filters: GalleryFilters,
  limit: number,
  locale: SiteLocale,
): CatalogueFind {
  const and: Record<string, unknown>[] = [PUBLISHED]
  const words = literal(query.trim())
  if (words !== '') {
    and.push({
      or: [
        { title: { like: words } },
        { originalTitle: { like: words } },
        { stockNumber: { like: words } },
      ],
    })
  }
  if (filters.objectType) and.push({ objectType: { equals: filters.objectType } })
  if (filters.maker) and.push({ 'makers.maker.name': { like: literal(filters.maker) } })
  if (filters.place) and.push({ 'places.place.name': { like: literal(filters.place) } })
  if (filters.period) and.push({ 'date.display': { like: literal(filters.period) } })
  return {
    collection: 'works',
    where: { and },
    select: WORK_SUMMARY_SELECT,
    populate: WORK_POPULATE,
    limit,
    locale,
    depth: 1,
  }
}

export async function searchWorks(
  reader: CatalogueReader,
  args: { query: string; filters: GalleryFilters; limit: number },
  locale: SiteLocale,
  t: ChatCopy,
): Promise<readonly WorkSummary[]> {
  const docs = await reader.find(workSearchQuery(args.query, args.filters, args.limit, locale))
  return seal(docs.flatMap((doc) => summaryOf(doc, locale, t) ?? []))
}

export function workByIdQuery(publicId: number, locale: SiteLocale): CatalogueFind {
  return {
    collection: 'works',
    where: { and: [PUBLISHED, { publicId: { equals: publicId } }] },
    select: WORK_DETAIL_SELECT,
    populate: WORK_POPULATE,
    limit: 1,
    locale,
    depth: 1,
  }
}

export async function getWork(
  reader: CatalogueReader,
  id: string,
  locale: SiteLocale,
  t: ChatCopy,
): Promise<WorkDetail | null> {
  const publicId = /^[1-9]\d{0,9}$/.test(id) ? Number(id) : null
  if (publicId === null) return null
  const [doc] = await reader.find(workByIdQuery(publicId, locale))
  const detail = doc === undefined ? null : detailOf(doc, locale, t)
  return detail === null ? null : seal(detail)
}
