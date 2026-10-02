/**
 * @contract C2 — view models: the shell · owner: ARC · consumers: WEB, UXG, UXE, SEO
 *
 * The app's root layout (DESIGN-SYSTEM.md §2): header, navigation, footer, announcement
 * bar, consent banner, locale switcher, cart indicator. Which site it is comes from the host
 * the request named (`SITES`, TASKS.md 2.2), never from the build.
 *
 * `SiteShellVM` is the placeholder shell both sites render today (the site's name and files,
 * the locale switcher). `ShellVM` is the full shell phase 4 builds; it still carries the old
 * multi-brand fields (`brand`, `modules`, `tokens`, `sellers`, `sister`) its fixtures hold, as
 * plain local types, until those fixtures are trimmed with it.
 */
import type { LocaleCode } from '@engine/config/constants'

import type { LinkVM, SellerIdentityVM, ShipToVM, Streamed } from './common'

/** The site a shell belongs to; `emporium` is the shop's old name, which the fixtures still use. */
export type Storefront = 'gallery' | 'shop' | 'emporium'

/** The placeholder shell (TASKS.md 2.2.b): what a site's root layout renders around its page. */
export type SiteShellVM = {
  site: {
    key: 'gallery' | 'shop'
    name: string
    /** The site's canonical origin, from the host allow-list — never the request's `Host`. */
    origin: string | null
  }
  locale: LocaleCode
  /** The site's home in this locale, built by `href()`. */
  homeHref: string
  /** The locale switcher: each locale the site serves, at its own home. */
  locales: readonly { locale: LocaleCode; href: string; current: boolean }[]
  /** The site's logo, at `/<site>/logo.svg` (`@engine/http/manifest` `SITE_ASSETS`). */
  logo: string
}

export type NavItemVM = LinkVM & {
  /** A mega-menu column or a drill-down level (the place tree on a phone). */
  children: readonly NavItemVM[]
  /** A feature tile in a mega menu (the hero line). */
  feature: { title: string; href: string; image: string | null } | null
}

export type ShellVM = {
  brand: {
    name: string
    storefront: Storefront
    /** The staging or production origin, absolute, for canonical URLs and share links. */
    origin: string
  }
  locale: LocaleCode
  defaultLocale: LocaleCode
  /** The switcher's choices; each page's own alternates come from its `SeoVM`. */
  locales: readonly LocaleCode[]
  /**
   * Every site file a page links — `/<site>/<file>` in `public/` (`@engine/http/manifest`
   * `SITE_ASSETS`), built where the shell's view model is built and never written by a template.
   * A page links its icons and manifest through its metadata (`icons`, `manifest`), never Next's
   * file conventions, which are one build's; fonts load through a runtime `@font-face`.
   */
  assets: {
    logo: string
    mark: string | null
    favicon: string
    /**
     * The home-screen icon (C13 `BRAND_ROOT_ASSETS.touchIcon`), for the metadata's `icons.apple`;
     * `null` when the brand ships none, so no page links a 404 (v1.3). Absent only in the apps'
     * interim shell of TASKS.md 4.1, which links it by itself; the shell's loader (11.3) sets it.
     * Both fields become required at 4.6's merge, once 4.6.e's apps set them (a minor change,
     * producers only: 4.3's reviews, senior-be #14 and senior-fe #9).
     */
    touchIcon?: string | null
    /** The web manifest (C13 `BRAND_ROOT_ASSETS.manifest`), for the metadata's `manifest`; as `touchIcon`. */
    manifest?: string | null
    ogImage: string
    fonts: readonly { family: string; src: string; weight: string; style: 'normal' | 'italic' }[]
  }
  /** Token overrides (custom property → value); a site's palette is its own token file. */
  tokens: Readonly<Record<string, string>>
  /** The old module flags the fixtures list; nothing switches on them any more. */
  modules: readonly string[]
  nav: { header: readonly NavItemVM[]; footer: readonly NavItemVM[] }
  announcement: string | null
  contact: {
    email: string
    whatsapp: { href: string; display: string; replyHours: string | null } | null
    phone: string | null
  }
  social: readonly { network: 'instagram' | 'facebook' | 'tiktok' | 'youtube'; href: string }[]
  /** The legal identities the footer names — every seller of record the brand has. */
  sellers: readonly SellerIdentityVM[]
  /** The sister strip: a separate business that sells its own way, and the link says so. */
  sister: { name: string; href: string; role: 'archive-origin' | 'merch-outlet' } | null
  /**
   * Third-party tag ids — both `null` for every brand at launch: the analytics are first-party
   * only (G12, v1.5). With neither set, the consent banner offers no marketing-tag category.
   */
  analytics: { ga4Id: string | null; metaPixelId: string | null }
  /** From the `shipTo` cookie (defaulted from the visitor's country). */
  shipTo: Streamed<ShipToVM>
  /**
   * The header's bag: its count, or `null` without `purchase.checkout` — the gallery, which has
   * no bag (D50, C1 v1.5), so its header shows none (v1.5).
   */
  cart: Streamed<{ count: number } | null>
  /**
   * The header's saved items: the device's count and the Wishlist page with
   * `retention.deviceWishlist` (D35), the account's wishlist with `retention.wishlist`; `null`
   * with neither.
   */
  wishlist: Streamed<{ count: number; href: string } | null>
  /**
   * The header's account entry — `null` where this visitor has none to see: a brand with no
   * accounts at all (the gallery, D54), or a shop whose only accounts are retailers', to anyone
   * not signed in as one (the Partnership item is the way in, D31).
   */
  account: Streamed<{
    audience: 'buyer' | 'retailer'
    signedIn: boolean
    firstName: string | null
    href: string
  } | null>
  consent: Streamed<{
    policyVersion: string
    /**
     * `null` until the visitor has chosen; the beacon stays cookieless until then. `marketing`
     * is asked only where `analytics` names a tag id — nowhere at launch (G12), so it stays
     * `false` there.
     */
    choice: { analytics: boolean; marketing: boolean } | null
  }>
  /** The dismissible banner offering the visitor's language; never a redirect. */
  languageSuggestion: Streamed<{ locale: LocaleCode } | null>
}
