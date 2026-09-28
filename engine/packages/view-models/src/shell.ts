/**
 * @contract C2 — view models: the shell · owner: ARC · consumers: WEB, UXG, UXE, SEO
 *
 * The app's root layout (DESIGN-SYSTEM.md §2): header, navigation, footer, announcement
 * bar, consent banner, locale switcher, the ship-to selector (the only way the currency
 * changes — there is no free currency switcher), cart indicator and sister strip. Brand
 * identity is runtime data read from `BRAND` at request time — never baked into a build —
 * so a third brand on the same app renders its own name, assets and tokens. The analytics
 * ids are runtime values too, loaded only after marketing consent (never NEXT_PUBLIC_*).
 */
import type { LocaleCode, ModuleKey, Storefront, TokenOverrides } from '@engine/config/schema'

import type { LinkVM, SellerIdentityVM, ShipToVM, Streamed } from './common'

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
  /** Served from `/brand-assets/…` (C13); fonts load through a runtime `@font-face`. */
  assets: {
    logo: string
    mark: string | null
    favicon: string
    ogImage: string
    fonts: readonly { family: string; src: string; weight: string; style: 'normal' | 'italic' }[]
  }
  /** Validated brand overrides (C1/C3) — empty when the contrast gate rejected them. */
  tokens: TokenOverrides
  /** Capabilities, for the rare shell decision a loader cannot make (a wishlist icon). */
  modules: readonly ModuleKey[]
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
  /** The sister strip: a separate shop with its own account, and the link says so. */
  sister: { name: string; href: string; role: 'archive-origin' | 'merch-outlet' } | null
  analytics: { ga4Id: string | null; metaPixelId: string | null }
  /** From the `shipTo` cookie (defaulted from the visitor's country). */
  shipTo: Streamed<ShipToVM>
  cart: Streamed<{ count: number }>
  account: Streamed<{ signedIn: boolean; firstName: string | null }>
  consent: Streamed<{
    policyVersion: string
    /** `null` until the visitor has chosen; the beacon stays cookieless until then. */
    choice: { analytics: boolean; marketing: boolean } | null
  }>
  /** The dismissible banner offering the visitor's language; never a redirect. */
  languageSuggestion: Streamed<{ locale: LocaleCode } | null>
}
