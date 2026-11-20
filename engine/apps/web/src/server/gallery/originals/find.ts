/**
 * The gallery's reads behind its public originals API (TASKS.md 23.5.a; the contract is
 * `@engine/site/originals`). Public reads in the catalogue's style: `overrideAccess: false` (the
 * anonymous visitor), `_status: 'published'`, and a `select` of only what the answer names — the
 * title, the public id for the page's address (its slug is the title's, as the item page's), the picture's public fields. No price, no
 * note, no staff field is read, so none can be answered. The picture is the published derivative
 * alone (an absolute URL on the media bucket); the record's own file is staff-only and never sent.
 *
 * Pure apart from the Payload it is handed: `./reads` caches these and supplies the origin. Phase
 * 25 moves this folder to the gallery app as it is.
 */
import type { Payload } from 'payload'

import { createHref, SITES } from '@engine/config/sites'
import type { FeaturedOriginal, OriginalsLocale, OriginalWork } from '@engine/site/originals'
import {
  derivativeUrlOf,
  mediaPublicUrl,
  PUBLIC_IMAGE_SELECT,
} from '@engine/site/media/public-image'

import { slugOf } from '../item/view-model'

type Doc = Record<string, unknown>

export const ORIGINAL_SELECT = {
  title: true,
  stockNumber: true,
  publicId: true,
  workUid: true,
  images: { media: PUBLIC_IMAGE_SELECT },
} as const

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const size = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null

/** The work's page on the gallery's canonical origin, in `locale`. */
export function workUrl(
  origin: string,
  publicId: number,
  slug: string,
  locale: OriginalsLocale,
): string {
  return `${origin}${createHref(SITES.gallery)('item', { publicId, slug }, locale)}`
}

/** A media document's public picture: its published derivative, else nothing. */
export function publicPicture(media: unknown, base: string): OriginalWork['image'] {
  if (typeof media !== 'object' || media === null) return null
  const doc = media as Doc
  const url = derivativeUrlOf(doc, base)
  if (url === null) return null
  return { url, alt: str(doc.alt), width: size(doc.width), height: size(doc.height) }
}

export type FoundOriginal = { readonly work: OriginalWork; readonly workUid: string | null }

/** One published work by its stock number, projected; `null` when none is published. */
export async function findOriginal(
  payload: Payload,
  stockNumber: string,
  locale: OriginalsLocale,
  origin: string,
  base: string = mediaPublicUrl(),
): Promise<FoundOriginal | null> {
  const { docs } = await payload.find({
    collection: 'works',
    overrideAccess: false,
    where: {
      and: [{ _status: { equals: 'published' } }, { stockNumber: { equals: stockNumber } }],
    },
    select: ORIGINAL_SELECT,
    depth: 1,
    locale,
    limit: 1,
  })
  const doc = docs[0] as Doc | undefined
  const publicId = doc?.publicId
  const title = str(doc?.title)
  if (doc === undefined || typeof publicId !== 'number' || title === '') return null
  const images = Array.isArray(doc.images) ? (doc.images as Doc[]) : []
  const image = images.map((row) => publicPicture(row.media, base)).find((each) => each !== null)
  return {
    work: {
      stockNumber,
      title,
      url: workUrl(origin, publicId, slugOf(title), locale),
      image: image ?? null,
    },
    workUid: str(doc.workUid) || null,
  }
}

/** A home card as `load-originals` chooses it, with the public id its address needs. */
export type ChosenOriginal = {
  readonly title: string
  readonly date: string | null
  readonly maker: string | null
  readonly publicId: number
  readonly image: { readonly url: string; readonly alt: string } & Doc
}

/**
 * The featured works, as the API answers them: each chosen original whose picture is a published
 * derivative under the media bucket (`base`), linked to its page on `origin`.
 */
export function featuredOf(
  chosen: readonly ChosenOriginal[],
  locale: OriginalsLocale,
  origin: string,
  base: string = mediaPublicUrl(),
): FeaturedOriginal[] {
  if (base === '') return []
  return chosen.flatMap((card): FeaturedOriginal[] => {
    if (!card.image.url.startsWith(`${base}/`) || card.publicId <= 0) return []
    return [
      {
        title: card.title,
        date: card.date,
        maker: card.maker,
        url: workUrl(origin, card.publicId, slugOf(card.title), locale),
        image: {
          url: card.image.url,
          alt: card.image.alt,
          width: size(card.image.width),
          height: size(card.image.height),
        },
      },
    ]
  })
}
