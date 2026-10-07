/** One place page (5.4.a): the proxy rewrites `/places/{...path}` (`/tempat/{...path}`) here, the
 * gazetteer path ancestors-first (`java/batavia`). */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { loadPlace } from '../../../../../../server/gallery/places'
import { pageMetadata } from '../../../../../../server/seo'
import { siteLocale } from '../../../../../../shell/messages'
import { currentSite } from '../../../../../../shell/site'
import { placeText } from '../../../../../../sites/gallery/places/copy'
import { placeHref } from '../../../../../../sites/gallery/places/links'
import { PlaceView } from '../../../../../../sites/gallery/places/place-view'

type Props = PageProps<'/gallery/[locale]/place/[...path]'>

async function pageOf({ params }: Props) {
  const { locale: raw, path } = await params
  const locale = siteLocale('gallery', raw)
  if (locale === null) return null
  const place = await loadPlace(path, locale)
  return place === null ? null : { locale, place }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [page, site] = await Promise.all([pageOf(props), currentSite('gallery')])
  if (page === null || site.origin === null) return {}
  return pageMetadata({
    site: 'gallery',
    locale: page.locale,
    paths: { en: placeHref(page.place.path, 'en'), id: placeHref(page.place.path, 'id') },
    title: page.place.name,
    description: page.place.name,
    origin: site.origin,
  })
}

export default async function GalleryPlacePage(props: Props) {
  await connection()
  const page = await pageOf(props)
  if (page === null) notFound()
  return <PlaceView place={page.place} locale={page.locale} t={placeText(page.locale)} />
}
