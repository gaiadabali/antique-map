/**
 * The gallery's answers, cached in the shop's process (Cache Components, `'use cache'`; TASKS.md
 * 23.5.b–c). An answer — a work, or the gallery's "no such published work" — is kept for hours,
 * as the shop's own editorial reads are. No answer (the gallery down, slow or wrong) is kept for a
 * minute, so while the gallery is away each product page waits for it at most once a minute, and
 * draws no link. Only ever called inside a page's render, so the build never asks the gallery.
 *
 * The origins are configuration, never a request's: the gallery's from `GALLERY_ORIGIN`
 * (`sisterOrigin`), the pictures' from `MEDIA_PUBLIC_URL`, the one origin the shop's CSP lets it load.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { sisterOrigin } from '@engine/config/sites'
import { mediaOriginOf } from '@engine/http/security'
import type { FeaturedOriginal, OriginalsLocale, OriginalWork } from '@engine/site/originals'

import { fetchFeatured, fetchOriginal, type ClientOptions, type GalleryAnswer } from './client'

/** No answer from the gallery: asked again after a minute, never kept as an answer. */
const NO_ANSWER_LIFE = { stale: 30, revalidate: 60, expire: 60 } as const

function clientOptions(): ClientOptions {
  return { origin: sisterOrigin('shop'), mediaOrigin: mediaOriginOf(process.env) }
}

function lifeOf(answer: GalleryAnswer<unknown>): void {
  if (answer.kind === 'unavailable') cacheLife(NO_ANSWER_LIFE)
  else cacheLife('hours')
}

/** The published original with `stockNumber`, or `null` — not found, or no answer in time. */
export async function originalFor(
  stockNumber: string,
  locale: OriginalsLocale,
): Promise<OriginalWork | null> {
  'use cache'
  const answer = await fetchOriginal(stockNumber, locale, clientOptions())
  lifeOf(answer)
  return answer.kind === 'found' ? answer.value : null
}

/** The gallery's featured originals for the home's bridge; none without an answer. */
export async function featuredOriginals(
  locale: OriginalsLocale,
): Promise<readonly FeaturedOriginal[]> {
  'use cache'
  const answer = await fetchFeatured(locale, clientOptions())
  lifeOf(answer)
  return answer.kind === 'found' ? answer.value : []
}
