/** One maker page (5.4.a): the proxy rewrites `/makers/{slug}` (`/pembuat/{slug}`) here. */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { loadMaker } from '../../../../../../server/gallery/makers'
import { pageMetadata } from '../../../../../../server/seo'
import { siteLocale } from '../../../../../../shell/messages'
import { currentSite } from '../../../../../../shell/site'
import { makerText } from '../../../../../../sites/gallery/makers/copy'
import { makerHref } from '../../../../../../sites/gallery/makers/links'
import { MakerView } from '../../../../../../sites/gallery/makers/maker-view'

type Props = PageProps<'/gallery/[locale]/maker/[slug]'>

async function pageOf({ params }: Props) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('gallery', raw)
  if (locale === null) return null
  const maker = await loadMaker(slug, locale)
  return maker === null ? null : { locale, maker }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [page, site] = await Promise.all([pageOf(props), currentSite('gallery')])
  if (page === null || site.origin === null) return {}
  return pageMetadata({
    site: 'gallery',
    locale: page.locale,
    path: makerHref(page.maker.slug, page.locale),
    title: page.maker.name,
    description: page.maker.name,
    ...(page.maker.portrait !== null
      ? { image: { url: page.maker.portrait.url, alt: page.maker.portrait.alt } }
      : {}),
    origin: site.origin,
  })
}

export default async function GalleryMakerPage(props: Props) {
  await connection()
  const page = await pageOf(props)
  if (page === null) notFound()
  return <MakerView maker={page.maker} locale={page.locale} t={makerText(page.locale)} />
}
