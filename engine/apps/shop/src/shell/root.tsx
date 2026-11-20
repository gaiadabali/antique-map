/**
 * The shop's root layout and its metadata (`app/[locale]/layout.tsx` renders `ShopRoot`): `<html>`
 * in the page's locale with the shop's palette (`data-site="shop"`) and faces, and the shop's shell
 * (`ShopShell`, `@engine/storefront/shell`) — the one today's app draws for the shop, so the two
 * render the same page. The origin is read at request time, after `connection()`, so nothing under
 * the root layout prerenders at `next build`.
 *
 * Absolute URLs — `metadataBase`, Open Graph's image — are built on the canonical origin from the
 * host list (`SITE_HOSTS`), never on the request's `Host`. Icons and the manifest are linked at their
 * root URLs, which the proxy answers from the shop's own files (`public/shop/`); never Next's file
 * conventions.
 */
// The page frame's stylesheets in today's app's order: the shared primitives and semantic aliases,
// both palettes (the gallery's the `:root` default, the shop's under `[data-site='shop']`), the
// shop's layout and chat tokens, then the frame itself.
import '@engine/ui/tokens/primitives.css'
import '@engine/ui/tokens/semantic.css'
import '@engine/ui/tokens/gallery.css'
import '@engine/ui/tokens/shop.css'
import '@engine/storefront/tokens/layout.css'
import '@engine/storefront/tokens/chat.css'
import '@engine/site/site.css'
// The shared components' own styles before any page's: a page's module overrides one by order at
// equal specificity (a card's price keeps the card's size), as in today's app, whose shell loads
// the components first.
import '@engine/ui'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { SITE_ASSETS } from '@engine/http/manifest'
import type { ShellFrame } from '@engine/site/shell'
import {
  currentSite,
  shellText,
  ShopShell,
  siteAsset,
  siteHref,
  siteLocale,
} from '@engine/storefront/shell'
import { fontVariables } from '@engine/ui/fonts'

type LocaleParams = Promise<{ locale: string }>

export async function shopMetadata(params: LocaleParams): Promise<Metadata> {
  const site = await currentSite('shop')
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) return {}
  return {
    title: { default: site.name, template: `%s · ${site.name}` },
    ...(site.origin === null ? {} : { metadataBase: new URL(site.origin) }),
    icons: { icon: `/${SITE_ASSETS.favicon}`, apple: `/${SITE_ASSETS.touchIcon}` },
    manifest: `/${SITE_ASSETS.manifest}`,
    openGraph: {
      siteName: site.name,
      locale,
      images: [{ url: siteAsset('shop', SITE_ASSETS.ogImage) }],
    },
  }
}

export async function ShopRoot(props: {
  readonly params: LocaleParams
  readonly children: ReactNode
}) {
  const site = await currentSite('shop')
  const locale = siteLocale('shop', (await props.params).locale)
  if (locale === null) notFound()
  const href = siteHref('shop')
  const shell: ShellFrame = {
    site: { key: 'shop', name: site.name },
    locale,
    homeHref: href('home', {}, locale),
    locales: site.locales.supported.map((each) => ({
      locale: each,
      href: href('home', {}, each),
      current: each === locale,
    })),
    logo: siteAsset('shop', SITE_ASSETS.logo),
  }
  // Extensions and in-browser translation write attributes onto `<html>` before hydration; the
  // suppression is one level deep, so a mismatch anywhere in the body still reports.
  return (
    <html lang={locale} data-site="shop" className={fontVariables} suppressHydrationWarning>
      <body>
        <ShopShell shell={shell} t={shellText('shop', locale)}>
          {props.children}
        </ShopShell>
      </body>
    </html>
  )
}
