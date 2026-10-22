/**
 * The shop's partnership page (ticket 4.3.c; the redesign of 2026-10-20): its sections are the
 * CMS's published `partnership` page, or — until there is one — the built-in sections with the
 * lexicon's words (`sites/shop/blocks/defaults/partnership`). The enquiry form makes a
 * `partnership` lead (9.1.c); its block reads the site-settings contact and Turnstile's public site
 * key at request time (`sites/shop/partnership/enquiry-sections`).
 */
import type { Metadata } from 'next'
import { connection } from 'next/server'

import type { SiteLocale } from '@engine/config/sites'

import { pageMetadata, shareImageOf, trimDescription } from '../../../../../server/seo'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite, siteHref } from '../../../../../shell/site'
import { defaultPartnershipBlocks } from '../../../../../sites/shop/blocks/defaults/partnership'
import { pageBlocks } from '../../../../../sites/shop/blocks/page-blocks'
import { ShopBlocks } from '../../../../../sites/shop/blocks/shop-blocks'
import { partnershipText } from '../../../../../sites/shop/partnership/page-messages'

const partnershipBlocks = (locale: SiteLocale) =>
  pageBlocks('partnership', locale, () => defaultPartnershipBlocks(locale))

export async function generateMetadata({
  params,
}: PageProps<'/shop/[locale]/partnership'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const t = partnershipText(locale)
  const page = await partnershipBlocks(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('partnership', {}, 'en'), id: href('partnership', {}, 'id') },
    title: page.seoTitle ?? t('partnership.eyebrow'),
    description: trimDescription(page.seoDescription ?? t('partnership.lede')),
    image: shareImageOf(page.seoImage),
    origin: site.origin,
  })
}

export default async function PartnershipPage({ params }: PageProps<'/shop/[locale]/partnership'>) {
  // Dynamic at request time: the reads are cached by tag, never at build — and the layout's own
  // `connection()` does not hold this page back (shell/site.ts).
  await connection()
  const locale = siteLocale('shop', (await params).locale) ?? 'en'
  const page = await partnershipBlocks(locale)
  return <ShopBlocks blocks={page.blocks} locale={locale} frame="page" />
}
