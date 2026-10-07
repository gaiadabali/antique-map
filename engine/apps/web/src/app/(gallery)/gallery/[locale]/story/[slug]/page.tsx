/** One editorial essay (5.4.b): the proxy rewrites `/stories/{slug}` (`/cerita/{slug}`) here —
 * `kind: 'story'` in the `pages` collection, never a plain page's slug. */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { createHref, SITES } from '@engine/config/sites'

import { loadPage } from '../../../../../../server/gallery/pages'
import { pageMetadata } from '../../../../../../server/seo'
import { siteLocale } from '../../../../../../shell/messages'
import { currentSite } from '../../../../../../shell/site'
import { cmsPageText } from '../../../../../../sites/gallery/pages/copy'
import { PageView } from '../../../../../../sites/gallery/pages/page-view'

const href = createHref(SITES.gallery)

type Props = PageProps<'/gallery/[locale]/story/[slug]'>

async function pageOf({ params }: Props) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('gallery', raw)
  if (locale === null) return null
  const page = await loadPage(slug, locale, 'story')
  return page === null ? null : { locale, slug, page }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [found, site] = await Promise.all([pageOf(props), currentSite('gallery')])
  if (found === null || site.origin === null) return {}
  const { page, locale, slug } = found
  return pageMetadata({
    site: 'gallery',
    locale,
    paths: { en: href('story', { slug }, 'en'), id: href('story', { slug }, 'id') },
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.intro ?? page.title,
    ...(page.hero !== null ? { image: { url: page.hero.url, alt: page.hero.alt } } : {}),
    origin: site.origin,
  })
}

export default async function GalleryStoryPage(props: Props) {
  await connection()
  const found = await pageOf(props)
  if (found === null) notFound()
  return <PageView page={found.page} locale={found.locale} t={cmsPageText(found.locale)} />
}
