/**
 * @contract C2 — fixture `shell` · owner: ARC
 * The root layout for a fictional gallery brand: runtime identity, assets, validated token
 * overrides, analytics ids (loaded only after consent), the ship-to selector, the sister strip.
 */
import type { ShellVM } from '../shell'
import { ORIGIN, SELLER_ID, SELLER_SG, SISTER_ORIGIN, streamed } from './_shared'

export const shell: ShellVM = {
  brand: { name: 'Fixture Gallery', storefront: 'gallery', origin: ORIGIN },
  locale: 'en',
  defaultLocale: 'en',
  locales: ['en', 'id'],
  assets: {
    logo: '/brand-assets/logo.svg',
    mark: '/brand-assets/mark.svg',
    favicon: '/brand-assets/favicon.ico',
    ogImage: '/brand-assets/og.png',
    fonts: [
      {
        family: 'Fixture Serif',
        src: '/brand-assets/fonts/fixture-serif.woff2',
        weight: '400',
        style: 'normal',
      },
    ],
  },
  tokens: { '--c-accent': '#8a5a1f' },
  modules: ['catalogue.unique', 'purchase.offers', 'retention.wishlist', 'sister.links'],
  nav: {
    header: [
      { label: 'Maps & Charts', href: '/antique-maps', children: [], feature: null },
      { label: 'Places', href: '/places', children: [], feature: null },
      { label: 'Makers', href: '/makers', children: [], feature: null },
    ],
    footer: [
      {
        label: 'Visit',
        href: '/visit',
        children: [{ label: 'Sell to us', href: '/sell-to-us', children: [], feature: null }],
        feature: null,
      },
    ],
  },
  announcement: null,
  contact: {
    email: 'desk@gallery.example.test',
    whatsapp: {
      href: 'https://wa.me/6281200000000',
      display: '+62 812 0000 0000',
      replyHours: '09–21 WITA',
    },
    phone: null,
  },
  social: [{ network: 'instagram', href: 'https://instagram.example/fixture' }],
  sellers: [SELLER_SG, SELLER_ID],
  sister: { name: 'Sample Emporium', href: SISTER_ORIGIN, role: 'merch-outlet' },
  analytics: { ga4Id: null, metaPixelId: null },
  shipTo: streamed({
    country: 'SG',
    currency: 'SGD',
    options: [
      { country: 'ID', currency: 'IDR' },
      { country: 'SG', currency: 'SGD' },
      { country: 'NL', currency: 'EUR' },
    ],
  }),
  cart: streamed({ count: 1 }),
  account: streamed({ signedIn: false, firstName: null }),
  consent: streamed({ policyVersion: '2026-09', choice: null }),
  languageSuggestion: streamed({ locale: 'id' }),
}
