/**
 * The shop's partnership page (ticket 4.3.c; the redesign of 2026-10-20; TASKS.md 27.5.b): its
 * sections are the CMS's `partnership` page — published, or a staff member's draft in preview. No
 * page, no built-in words: a 404. The enquiry form makes a `partnership` lead (9.1.c); its block
 * reads the site-settings contact and Turnstile's public site key at request time
 * (`sites/shop/partnership/enquiry-sections`).
 *
 * The partners' sign-in is not promoted (TASKS.md 28.2, the owner's F3: no retailer sign-up on the
 * page): a link to it (`#signin`) is left out of every section, while the sign-in itself stays
 * where the page places it, at its foot, for the existing accounts.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { pageMetadata, shareImageOf, trimDescription } from '@engine/site/seo'
import { siteLocale } from '../shell/messages'
import { currentSite, siteHref } from '../shell/site'
import { firstPicture, firstWords, readShopPage } from '../sites/shop/blocks/page-blocks'
import { ShopBlocks } from '../sites/shop/blocks/shop-blocks'
import type { BlockLink, ShopBlockVM } from '../server/shop/pages/blocks'
import type { LocaleProps } from './props'

const SIGN_IN = '#signin'

const unpromoted = (link: BlockLink | null): BlockLink | null =>
  link !== null && link.href === SIGN_IN ? null : link

/** The page's sections without a link to the partners' sign-in. */
export function withoutSignInLinks(blocks: readonly ShopBlockVM[]): readonly ShopBlockVM[] {
  return blocks.map((block) => {
    if (block.type === 'pageHero') {
      return {
        ...block,
        primary: unpromoted(block.primary),
        secondary: unpromoted(block.secondary),
      }
    }
    if (block.type === 'offer' || block.type === 'story' || block.type === 'imageText') {
      return { ...block, link: unpromoted(block.link) }
    }
    return block
  })
}

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const { page } = await readShopPage('partnership', locale)
  if (page === null) return {}
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('partnership', {}, 'en'), id: href('partnership', {}, 'id') },
    title: page.seoTitle ?? page.title,
    description: trimDescription(page.seoDescription ?? firstWords(page) ?? page.title),
    image: shareImageOf(page.seoImage ?? firstPicture(page)),
    origin: site.origin,
  })
}

export default async function PartnershipPage({ params }: LocaleProps) {
  // Dynamic at request time: the reads are cached by tag, never at build — and the layout's own
  // `connection()` does not hold this page back (shell/site.ts).
  await connection()
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()
  const { page } = await readShopPage('partnership', locale)
  if (page === null) notFound()
  return (
    <ShopBlocks
      blocks={withoutSignInLinks(page.blocks)}
      locale={locale}
      frame="page"
      title={page.title}
    />
  )
}
