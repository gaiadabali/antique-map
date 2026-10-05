/**
 * The places index (5.4.a): the proxy rewrites the public `/places` (`/tempat`) to this internal
 * route (`place` — `SURFACE_ROUTES.place.internal`, `@engine/config/sites`).
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { loadPlaceIndex } from '../../../../../server/gallery/places'
import { pageMetadata } from '../../../../../server/seo'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite } from '../../../../../shell/site'
import { placeText } from '../../../../../sites/gallery/places/copy'
import { placeIndexHref } from '../../../../../sites/gallery/places/links'
import { PlaceIndexView } from '../../../../../sites/gallery/places/place-index-view'

type Props = PageProps<'/gallery/[locale]/place'>

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = siteLocale('gallery', raw)
  const site = await currentSite('gallery')
  if (locale === null || site.origin === null) return {}
  const t = placeText(locale)
  return pageMetadata({
    site: 'gallery',
    locale,
    path: placeIndexHref(locale),
    title: t('placePage.indexTitle'),
    description: t('placePage.indexDescription'),
    origin: site.origin,
  })
}

export default async function GalleryPlaceIndexPage({ params }: Props) {
  await connection()
  const { locale: raw } = await params
  const locale = siteLocale('gallery', raw)
  if (locale === null) notFound()
  const items = await loadPlaceIndex(locale)
  return <PlaceIndexView items={items} locale={locale} t={placeText(locale)} />
}
