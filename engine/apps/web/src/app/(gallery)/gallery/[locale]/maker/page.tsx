/**
 * The makers index (5.4.a): the proxy rewrites the public `/makers` (English) and `/pembuat`
 * (Indonesian) to this internal route (`maker` — `SURFACE_ROUTES.maker.internal`,
 * `@engine/config/sites`), so this folder is named for the internal surface, never the public
 * segment.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { loadMakerIndex } from '../../../../../server/gallery/makers'
import { pageMetadata } from '../../../../../server/seo'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite } from '../../../../../shell/site'
import { makerText } from '../../../../../sites/gallery/makers/copy'
import { makerIndexHref } from '../../../../../sites/gallery/makers/links'
import { MakerIndexView } from '../../../../../sites/gallery/makers/maker-index-view'

type Props = PageProps<'/gallery/[locale]/maker'>

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = siteLocale('gallery', raw)
  const site = await currentSite('gallery')
  if (locale === null || site.origin === null) return {}
  const t = makerText(locale)
  return pageMetadata({
    site: 'gallery',
    locale,
    paths: { en: makerIndexHref('en'), id: makerIndexHref('id') },
    title: t('makerPage.indexTitle'),
    description: t('makerPage.indexDescription'),
    origin: site.origin,
  })
}

export default async function GalleryMakerIndexPage({ params }: Props) {
  await connection()
  const { locale: raw } = await params
  const locale = siteLocale('gallery', raw)
  if (locale === null) notFound()
  const items = await loadMakerIndex(locale)
  return <MakerIndexView items={items} locale={locale} t={makerText(locale)} />
}
