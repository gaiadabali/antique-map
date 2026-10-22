/**
 * The shop's home (ticket 4.3.b; the redesign of 2026-10-20): its sections are the CMS's published
 * `home` page (`pages`, site shop), or — until there is one — the built-in sections with the
 * lexicon's words (`sites/shop/blocks/defaults/home`). One renderer draws both.
 */
import type { Metadata } from 'next'
import { connection } from 'next/server'

import type { SiteLocale } from '@engine/config/sites'

import { pageMetadata, shareImageOf, trimDescription } from '../../../../server/seo'
import { siteLocale as resolveLocale } from '../../../../shell/messages'
import { currentSite, siteHref } from '../../../../shell/site'
import { defaultHomeBlocks } from '../../../../sites/shop/blocks/defaults/home'
import { pageBlocks } from '../../../../sites/shop/blocks/page-blocks'
import { ShopBlocks } from '../../../../sites/shop/blocks/shop-blocks'
import { homeText } from '../../../../sites/shop/home/home-messages'

function homeBlocks(locale: SiteLocale) {
  const href = siteHref('shop')
  return pageBlocks('home', locale, () =>
    defaultHomeBlocks(locale, (surface) => href(surface, {}, locale)),
  )
}

export async function generateMetadata({ params }: PageProps<'/shop/[locale]'>): Promise<Metadata> {
  const locale = resolveLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const page = await homeBlocks(locale)
  const t = homeText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('home', {}, 'en'), id: href('home', {}, 'id') },
    // The home names the site itself, outside the layout's " · Old East Indies".
    title: page.seoTitle ?? `${site.name} — ${t('home.shop.title')}`,
    absoluteTitle: true,
    description: trimDescription(page.seoDescription ?? t('home.shop.lede')),
    image: shareImageOf(page.seoImage),
    origin: site.origin,
  })
}

export default async function ShopHomePage({ params }: PageProps<'/shop/[locale]'>) {
  // Dynamic at request time: the home's cached loaders read the CMS, never at build — and the
  // layout's own `connection()` does not hold this page back (shell/site.ts).
  await connection()
  const locale = resolveLocale('shop', (await params).locale) ?? 'en'
  const page = await homeBlocks(locale)
  return <ShopBlocks blocks={page.blocks} locale={locale} frame="home" />
}
