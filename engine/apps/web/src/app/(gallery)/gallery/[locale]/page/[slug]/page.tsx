/**
 * The generic CMS page surface (5.4.b): the proxy rewrites any single public segment not already
 * claimed by another surface or a named facet here (`parsePublicPath()`'s own fallback,
 * `@engine/config/sites`'s `routes/parse.ts`) — so `/about`, `/guarantee`, `/certificate`,
 * `/condition`, `/shipping` and `/visit` are all one address shape, a published `pages` record
 * (`kind: 'page'`) at its own slug. `/visit` is contact-only here — no booking (the ticket's own
 * rule); `/contact` and `/sell-to-us` are not this collection's (5.3).
 */
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

type Props = PageProps<'/gallery/[locale]/page/[slug]'>

async function pageOf({ params }: Props) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('gallery', raw)
  if (locale === null) return null
  const page = await loadPage(slug, locale, 'page')
  return page === null ? null : { locale, slug, page }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [found, site] = await Promise.all([pageOf(props), currentSite('gallery')])
  if (found === null || site.origin === null) return {}
  const { page, locale, slug } = found
  return pageMetadata({
    site: 'gallery',
    locale,
    path: href('page', { slug }, locale),
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.intro ?? page.title,
    ...(page.hero !== null ? { image: { url: page.hero.url, alt: page.hero.alt } } : {}),
    origin: site.origin,
  })
}

export default async function GalleryCmsPage(props: Props) {
  await connection()
  const found = await pageOf(props)
  if (found === null) notFound()
  return <PageView page={found.page} locale={found.locale} t={cmsPageText(found.locale)} />
}
