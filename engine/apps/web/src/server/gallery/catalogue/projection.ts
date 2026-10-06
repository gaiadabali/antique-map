/**
 * The work card's projection (5.1.a): a Payload read, `overrideAccess: false`, drafts filtered
 * and an explicit `select` of only what a card shows. **No price and no staff field is in the
 * select** — `askingPrice`, `notes`, `rights`, `physical`'s costs and `cataloguing` never appear
 * here, in a type, or in a test's assertion; the gallery never quotes a price on its pages
 * (EXPERIENCE-GALLERY.md §4). The SQL layers (`./db`, `./facets`, `./search`) answer ids; the
 * projection stays a Payload read, so a search result is exactly a listing card.
 */
import type { Payload } from 'payload'

import type { SiteLocale } from '@engine/config/sites'

import { PUBLIC_IMAGE_SELECT, publicImageUrl } from '../../media/public-image'
import { dateTextOf } from './date-reading'
import type { CardImage, CardMaker, CardPlace, WorkCardVM } from './view-models'

/** The fields a card shows, and nothing else — no staff field, no internal note, no other site. */
export const WORK_CARD_SELECT = {
  title: true,
  originalTitle: true,
  objectType: true,
  makers: { maker: true, role: true, certainty: true },
  places: { place: true, role: true, primary: true },
  date: { precision: true, from: true, to: true, display: true },
  dimensions: { image: { height: true, width: true }, sheet: { height: true, width: true } },
  status: true,
  images: { media: PUBLIC_IMAGE_SELECT },
  publicId: true,
  workUid: true,
  stockNumber: true,
} as const

/** A projected work doc, as `WORK_CARD_SELECT` selects it. Payload's generic `select` types
 * answer `unknown` per field, so the mappers read defensively — a cast at the read's edge. */
type CardDoc = {
  id: number
  title?: unknown
  objectType?: unknown
  makers?: readonly { maker?: unknown; role?: unknown; certainty?: unknown }[] | null
  places?: readonly { place?: unknown; role?: unknown; primary?: unknown }[] | null
  date?: Record<string, unknown> | null
  dimensions?: Record<string, unknown> | null
  status?: unknown
  images?: readonly { media?: unknown }[] | null
  publicId?: unknown
  workUid?: unknown
  stockNumber?: unknown
}

const WORK_STATUSES = ['available', 'on-hold', 'sold'] as const

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const int = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : null

const mm = (group: unknown): { height: number | null; width: number | null } | null => {
  if (group === null || typeof group !== 'object') return null
  const size = group as { height?: unknown; width?: unknown }
  return { height: int(size.height), width: int(size.width) }
}

/** A card's dimensions line: the image's, else the sheet's, in cm with the inches beside —
 * "28.5 × 40 cm (11.2 × 15.7 in)". `null` when neither is measured. */
export function dimensionsLine(
  dimensions: Record<string, unknown> | null | undefined,
): string | null {
  const size = mm(dimensions?.image) ?? mm(dimensions?.sheet)
  if (size === null || size.height === null || size.width === null) return null
  const cm = (value: number) => Math.round((value / 10) * 10) / 10
  const inch = (value: number) => Math.round((value / 25.4) * 10) / 10
  const h = cm(size.height)
  const w = cm(size.width)
  return `${h} × ${w} cm (${inch(size.height)} × ${inch(size.width)} in)`
}

const mediaOf = (value: unknown): CardImage | null => {
  if (typeof value !== 'object' || value === null) return null
  const media = value as Record<string, unknown>
  // The public derivative once the media pipeline has made it, else the record's own file.
  const url = publicImageUrl(media)
  if (url === null || typeof media.alt !== 'string') return null
  return {
    url,
    alt: media.alt,
    width: int(media.width),
    height: int(media.height),
  }
}

const makerOf = (row: { maker?: unknown; certainty?: unknown }): CardMaker | null => {
  if (typeof row.maker !== 'object' || row.maker === null) return null
  const name = str((row.maker as { name?: unknown }).name)
  if (name === '') return null
  return { name, certainty: str(row.certainty) }
}

const placeOf = (row: { place?: unknown; role?: unknown; primary?: unknown }): CardPlace | null => {
  if (typeof row.place !== 'object' || row.place === null) return null
  const name = str((row.place as { name?: unknown }).name)
  if (name === '') return null
  return { name, role: str(row.role), primary: row.primary === true }
}

/** One page of works, projected to cards, in the ids' order. */
export async function projectCards(
  payload: Payload,
  ids: readonly number[],
  locale: SiteLocale,
  unknownDateText: string,
): Promise<readonly WorkCardVM[]> {
  if (ids.length === 0) return []
  const found = await payload.find({
    collection: 'works',
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { id: { in: ids } }] },
    select: WORK_CARD_SELECT,
    depth: 1,
    locale,
    limit: ids.length,
  })
  const byId = new Map((found.docs as readonly CardDoc[]).map((doc) => [doc.id, doc]))
  return ids.flatMap((id) => {
    const doc = byId.get(id)
    if (!doc) return []
    return [cardOf(doc, unknownDateText)]
  })
}

function cardOf(doc: CardDoc, unknownDateText: string): WorkCardVM {
  const makers = (doc.makers ?? []).map(makerOf).filter((m): m is CardMaker => m !== null)
  const places = (doc.places ?? []).map(placeOf).filter((p): p is CardPlace => p !== null)
  const images = (doc.images ?? [])
    .map((row) => mediaOf(row.media))
    .filter((i): i is CardImage => i !== null)
  const status = WORK_STATUSES.find((each) => each === doc.status) ?? 'available'
  return {
    id: doc.id,
    title: str(doc.title),
    maker: makers[0] ?? null,
    place: places.find((place) => place.primary) ?? places[0] ?? null,
    objectType: str(doc.objectType) || null,
    date: dateTextOf(doc.date ?? {}, unknownDateText),
    dimensions: dimensionsLine(doc.dimensions),
    status,
    image: images[0] ?? null,
    publicId: int(doc.publicId) ?? 0,
    workUid: str(doc.workUid) || null,
    stockNumber: str(doc.stockNumber) || null,
  }
}
