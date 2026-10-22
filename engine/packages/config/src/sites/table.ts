/**
 * The two sites (PLAN.md, DR-1): the facts that are the same in every environment, committed here
 * and typed, so nothing reads a site from a file at runtime. Which hostnames a process answers is
 * the environment's (`GALLERY_HOSTS`, `SHOP_HOSTS`, `./hosts`); the hostnames below are the ones
 * the boot check knows, to judge staging from production (DEPLOYMENT.md §7). Harvested from the
 * old brand configs (CARRY-OVER.md §2.6) and ARCHITECTURE.md §5's route table.
 *
 * Each site's tree is `app/(<key>)/<key>/[locale]/…`; the proxy rewrites into it.
 */
import type { LocaleCode } from '../constants'
import type { RouteMap } from './routes/types'

export const SITE_KEYS = ['gallery', 'shop'] as const
export type SiteKey = (typeof SITE_KEYS)[number]

/** The locales every site serves (DR-12): English unprefixed, Indonesian at `/id`. */
export const SITE_LOCALES = ['en', 'id'] as const satisfies readonly LocaleCode[]
export type SiteLocale = (typeof SITE_LOCALES)[number]

export type SiteDefinition = {
  readonly key: SiteKey
  readonly name: string
  /** The hostnames the boot check judges an environment by; the first of each list canonical. */
  readonly hostnames: {
    readonly production: readonly [string, ...string[]]
    readonly staging: readonly [string, ...string[]]
    /** A workstation's and CI's (`*.localhost` resolves to loopback in every browser). */
    readonly local: readonly [string, ...string[]]
  }
  readonly locales: { readonly default: SiteLocale; readonly supported: readonly SiteLocale[] }
  readonly routes: RouteMap
  /** The gallery's antiques (`works`): their uid prefix and stock-number pattern. */
  readonly works?: { readonly uidPrefix: string; readonly stockNumberPattern: string | null }
  /** The gallery's deep zoom: public tiles stop at this long edge. */
  readonly media?: { readonly publicZoomMaxPx: number }
}

const LOCALES = { default: 'en', supported: SITE_LOCALES } as const

const gallery = {
  key: 'gallery',
  name: 'Indies Gallery',
  hostnames: {
    production: ['antiquemapsindonesia.com'],
    staging: ['indies-gallery.gaiada.com'],
    local: ['gallery.localhost'],
  },
  locales: LOCALES,
  routes: {
    en: {
      browse: 'browse',
      search: 'search',
      item: 'product',
      maker: 'makers',
      place: 'places',
      story: 'stories',
      sellToUs: 'sell-to-us',
      contact: 'contact',
    },
    id: {
      browse: 'jelajah',
      search: 'cari',
      item: 'produk',
      maker: 'pembuat',
      place: 'tempat',
      story: 'cerita',
      sellToUs: 'jual-ke-kami',
      contact: 'kontak',
    },
    facets: {
      path: ['objectType', 'place'],
      vocabularies: {
        objectType: {
          en: {
            map: 'antique-maps',
            'sea-chart': 'sea-charts',
            'city-plan': 'city-plans',
            view: 'views',
            print: 'antique-prints',
            photograph: 'photographs',
            book: 'books',
            atlas: 'atlases',
          },
          id: {
            map: 'peta-antik',
            'sea-chart': 'peta-laut',
            'city-plan': 'peta-kota',
            view: 'pemandangan',
            print: 'cetakan-antik',
            photograph: 'foto',
            book: 'buku',
            atlas: 'atlas',
          },
        },
      },
    },
    defaultSort: { browse: 'newest', search: 'relevance' },
    // The old Laravel site's (DATA.md §6): its product URLs stay live at `/product/…`.
    legacyPrefixes: ['/category/', '/storage/products/', '/account/'],
    legacyPaths: ['/account'],
  },
  /** Works get `IG-000123` (CONTENT-MODEL.md §3 `workUid`); stock numbers look like `M.0500`. */
  works: { uidPrefix: 'IG', stockNumberPattern: '^[MPF]\\.[A-Za-z0-9]+$' },
  /** Public deep-zoom tiles stop at this long edge; the full pyramid stays private (Open). */
  media: { publicZoomMaxPx: 4096 },
} as const satisfies SiteDefinition

const shop = {
  key: 'shop',
  name: 'Old East Indies',
  hostnames: {
    production: ['oldeastindies.com'],
    staging: ['old-east-indies.gaiada.com'],
    local: ['shop.localhost'],
  },
  locales: LOCALES,
  routes: {
    en: {
      browse: 'shop',
      search: 'search',
      product: 'product',
      collection: 'collections',
      cart: 'bag',
      checkout: 'checkout',
      tracking: 'track',
      order: 'order',
      partnership: 'partnership',
      stores: 'stores',
    },
    id: {
      browse: 'belanja',
      search: 'cari',
      product: 'produk',
      collection: 'koleksi',
      cart: 'keranjang',
      checkout: 'checkout',
      tracking: 'lacak',
      order: 'pesanan',
      partnership: 'kemitraan',
      stores: 'toko',
    },
    facets: { path: [], vocabularies: {} },
    defaultSort: { browse: 'featured', search: 'relevance' },
    // The old shop's account pages: the new shop has no accounts, so the builder marks them gone (410).
    legacyPrefixes: ['/our-collection/', '/account/'],
    legacyPaths: ['/account'],
  },
} as const satisfies SiteDefinition

export const SITES = { gallery, shop } as const satisfies Record<SiteKey, SiteDefinition>
export type Sites = typeof SITES

export function isSiteKey(value: unknown): value is SiteKey {
  return (SITE_KEYS as readonly unknown[]).includes(value)
}
