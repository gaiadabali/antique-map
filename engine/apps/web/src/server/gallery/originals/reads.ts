/**
 * The gallery's reads for its public originals API, cached (TASKS.md 23.5.a; ARCHITECTURE.md
 * §Rendering): each answer is a `'use cache'` entry for hours under the gallery catalogue's tag and
 * the work's own, so a publish or an unpublish expires it as it expires the gallery's own pages.
 * Only ever called from a request (`@engine/site/originals/route` reads the request first), so the
 * build never touches the database. The host is today's two-site allow-list's: the gallery's own
 * hosts answer, every other is a 404 (`siteFromHost`; the gallery app's proxy will do it in phase 25).
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag, workTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import { siteFromHost, siteOrigin } from '@engine/config/sites'
import type { FeaturedOriginal, OriginalsLocale, OriginalWork } from '@engine/site/originals'
import type { OriginalsReads } from '@engine/site/originals/route'

import { loadOriginals } from '../../shop/home/load-originals'
import { featuredOf, findOriginal } from './find'

async function byStockNumber(
  stockNumber: string,
  locale: OriginalsLocale,
): Promise<OriginalWork | null> {
  'use cache'
  cacheLife('hours')
  const origin = siteOrigin('gallery')
  if (origin === null) return null
  const found = await findOriginal(await cms(), stockNumber, locale, origin)
  cacheTags([catalogueTag('gallery'), ...(found?.workUid ? [workTag(found.workUid)] : [])])
  return found?.work ?? null
}

async function featured(locale: OriginalsLocale): Promise<readonly FeaturedOriginal[]> {
  const origin = siteOrigin('gallery')
  if (origin === null) return []
  // `loadOriginals` is the shop home's own choice of two pictured works, cached for hours.
  return featuredOf(await loadOriginals(locale), locale, origin)
}

export const galleryOriginals: OriginalsReads = {
  servesHost: (host) => siteFromHost(host)?.site === 'gallery',
  byStockNumber,
  featured,
}
