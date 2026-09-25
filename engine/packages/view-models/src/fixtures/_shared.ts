/**
 * @contract C2 — fixture helpers · owner: ARC
 *
 * Builders for obviously fictional fixture data (an imaginary maker, island and
 * bibliography under `example.test`). Image URLs mirror C9's v1 derivative naming. Money
 * is integer minor units. Fixtures exist for development, the style guide and component
 * tests only — the boot check refuses `LOADERS_SOURCE=fixtures` in production.
 */
import type { CurrencyCode, LocaleCode } from '@engine/config/schema'
import type { ImageRole } from '@engine/media/contract'

import type { CardVM } from '../cards'
import type {
  DatePrecision,
  FuzzyDateVM,
  ImageVM,
  MakerCreditVM,
  Money,
  PriceVM,
  SeoVM,
  SellerIdentityVM,
  Streamed,
} from '../common'

export const MEDIA = 'https://media.example.test'
export const ORIGIN = 'https://gallery.example.test'
export const SISTER_ORIGIN = 'https://emporium.example.test'
export const NOW = '2026-09-25T10:00:00+08:00'

const LADDER = [320, 640, 1024, 1600, 2400]
const BLUR = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA='

/** A 32-hex asset id from a short seed. */
function assetIdOf(seed: string): string {
  const hex = [...seed].map((c) => c.charCodeAt(0).toString(16)).join('')
  return hex.padEnd(32, '0').slice(0, 32)
}

export function image(
  seed: string,
  width: number,
  height: number,
  alt: string,
  role: ImageRole | null = null,
): ImageVM {
  const assetId = assetIdOf(seed)
  const base = `${MEDIA}/derivatives/v1/${assetId}`
  const widths = LADDER.filter((w) => w <= Math.max(width, 320))
  const srcSet = (format: string) => widths.map((w) => `${base}/${w}.${format} ${w}w`).join(', ')
  return {
    assetId,
    alt,
    width,
    height,
    src: `${base}/1024.webp`,
    sources: [
      { format: 'avif', srcSet: srcSet('avif') },
      { format: 'webp', srcSet: srcSet('webp') },
    ],
    blurDataUrl: BLUR,
    focalPoint: null,
    role,
    caption: null,
    credit: null,
    iiif: role === null ? null : `${MEDIA}/iiif/${assetId}/info.json`,
    synthetic: false,
  }
}

export const money = (amount: number, currency: CurrencyCode): Money => ({ amount, currency })
export const price = (charge: Money, estimate: Money | null = null): PriceVM => ({
  charge,
  estimate,
})

export function date(
  from: number | null,
  precision: DatePrecision = 'exact',
  to: number | null = null,
): FuzzyDateVM {
  return { precision, from, to, display: null }
}

export function streamed<T>(value: T): Streamed<T> {
  return Promise.resolve(value)
}

/** Never settles: renders the reserved-height "Checking availability…" state. */
export function pending<T>(): Streamed<T> {
  return new Promise<T>(() => undefined)
}

export function seo(title: string, path: string, locales: readonly LocaleCode[] = ['en', 'id']) {
  const href = (locale: LocaleCode) => `${ORIGIN}${locale === 'en' ? '' : `/${locale}`}${path}`
  const vm: SeoVM = {
    title,
    description: null,
    canonical: href('en'),
    alternates: locales.map((locale) => ({ locale, href: href(locale) })),
    image: `${ORIGIN}/api/x/og${path}`,
    noindex: false,
  }
  return vm
}

export const MAKER: MakerCreditVM = {
  name: 'Hendrik Voorbeeld',
  sortName: 'VOORBEELD, Hendrik',
  role: 'cartographer',
  certainty: 'certain',
  born: date(1671, 'circa'),
  died: date(1733),
  href: '/makers/voorbeeld',
}

export const SELLER_SG: SellerIdentityVM = {
  name: 'Fixture Atlas Pte. Ltd.',
  country: 'SG',
  registration: 'UEN 000000000X',
  address: ['1 Example Quay', 'Singapore 000001'],
}

export const SELLER_ID: SellerIdentityVM = {
  name: 'PT Contoh Arsip Nusantara',
  country: 'ID',
  registration: 'NIB 0000000000000',
  address: ['Jl. Contoh No. 1', 'Denpasar 80000'],
}

export function card(id: string, title: string, overrides: Partial<CardVM> = {}): CardVM {
  return {
    id,
    href: `/product/${id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title,
    image: image(`card-${id}`, 1600, 1200, `${title}, recto`),
    secondImage: null,
    makerLine: 'Voorbeeld, 1718',
    date: date(1718),
    dimensions: { heightMm: 410, widthMm: 520 },
    status: { kind: 'price', price: price(money(180000, 'USD')) },
    badge: null,
    isReproduction: false,
    archiveNumber: null,
    swatches: [],
    quickAdd: null,
    wishlist: { productId: id, saved: false },
    sister: null,
    ...overrides,
  }
}
