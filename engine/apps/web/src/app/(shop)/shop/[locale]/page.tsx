/**
 * The shop's home (ticket 4.3.b), from the design team's drawing: the composition lives in
 * `sites/shop/home`; this page hands it the locale, the shop's `href()` and the lexicon's words.
 * The sister-site bridge is absolute — the gallery lives on its own host.
 */
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { siteOrigin, type SiteLocale } from '@engine/config/sites'

import { siteLocale as resolveLocale } from '../../../../shell/messages'
import { siteHref } from '../../../../shell/site'
import { homeMetadata } from '../../../../shell/site-root'
import { ShopHome } from '../../../../sites/shop/home/shop-home'
import { homeText } from '../../../../sites/shop/home/home-messages'

export async function generateMetadata({ params }: PageProps<'/shop/[locale]'>): Promise<Metadata> {
  const [metadata, raw] = await Promise.all([homeMetadata('shop', params), params])
  const locale = resolveLocale('shop', raw.locale)
  if (locale === null) return metadata
  return { ...metadata, description: homeText(locale)('home.shop.lede') }
}

export default async function ShopHomePage({ params }: PageProps<'/shop/[locale]'>) {
  // Dynamic at request time: the home's cached loaders read the CMS, never at build — and the
  // layout's own `connection()` does not hold this page back (shell/site.ts).
  await connection()
  const { locale } = await params
  const href = siteHref('shop')
  const sister = siteHref('gallery')('home', {}, locale as SiteLocale)
  const origin = siteOrigin('gallery')
  return (
    <ShopHome
      locale={locale as 'en' | 'id'}
      href={(surface, linkParams, linkLocale) =>
        href(surface, linkParams, linkLocale as SiteLocale)
      }
      sisterHref={origin === null ? sister : `${origin}${sister}`}
      t={homeText(locale as SiteLocale)}
    />
  )
}
