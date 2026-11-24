/**
 * The shop's home (ticket 4.3.b; the redesign of 2026-10-20; TASKS.md 27.5.b): its sections are the
 * CMS's `home` page (`pages`, site shop) — published, or a staff member's draft in preview. There
 * are no built-in sections behind it: while the CMS publishes no home, the page is the shell alone
 * — the menu, the site's name and the footer — never words the admin does not show. Beside the
 * blocks it places the owner's feedback of 2026-11-19 (TASKS.md 28.2): the same-day promise, Wall
 * Decor, the latest articles and the stores (`ShopBlocks`' home order), and the newsletter pop-up.
 */
import type { Metadata } from 'next'
import { connection } from 'next/server'

import type { SiteLocale } from '@engine/config/sites'

import { pageMetadata, shareImageOf, trimDescription } from '@engine/site/seo'
import { siteLocale as resolveLocale } from '../shell/messages'
import { currentSite, siteHref } from '../shell/site'
import { firstPicture, firstWords, readShopPage } from '../sites/shop/blocks/page-blocks'
import { ShopBlocks } from '../sites/shop/blocks/shop-blocks'
import { NewsletterPopup } from '../sites/shop/newsletter/newsletter-popup'
import type { LocaleProps } from './props'

/** The home's page; a failed read is the empty home for this request, never an error page. */
async function homePage(locale: SiteLocale) {
  try {
    return (await readShopPage('home', locale)).page
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const locale = resolveLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const page = await homePage(locale)
  const href = siteHref('shop')
  const hero = page?.blocks.find((block) => block.type === 'homeHero')
  const description = page ? (page.seoDescription ?? firstWords(page)) : null
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('home', {}, 'en'), id: href('home', {}, 'id') },
    // The home names the site itself, outside the layout's " · Old East Indies".
    title: page?.seoTitle ?? (hero ? `${site.name} — ${hero.title}` : site.name),
    absoluteTitle: true,
    description: trimDescription(description ?? site.name),
    image: shareImageOf(page ? (page.seoImage ?? firstPicture(page)) : null),
    origin: site.origin,
  })
}

export default async function ShopHomePage({ params }: LocaleProps) {
  // Dynamic at request time: the home's cached loaders read the CMS, never at build — and the
  // layout's own `connection()` does not hold this page back (shell/site.ts).
  await connection()
  const locale = resolveLocale('shop', (await params).locale) ?? 'en'
  const page = await homePage(locale)
  if (page === null) {
    // No published home: the shell and the site's name as the page's heading, nothing invented.
    const site = await currentSite('shop')
    return <ShopBlocks blocks={[]} locale={locale} frame="page" title={site.name} />
  }
  return (
    <>
      <ShopBlocks blocks={page.blocks} locale={locale} frame="home" title={page.title} />
      {/* The newsletter pop-up, on the landing page alone (TASKS.md 28.2). */}
      <NewsletterPopup locale={locale} />
    </>
  )
}
