/**
 * @contract C2 — fixture helpers for the commerce surfaces · owner: ARC
 *
 * Totals that add up, item references and a fictional showroom. Money is integer minor
 * units (IDR exponent 0, USD and EUR 2). A pricing token is opaque and server-issued; a
 * fixture mints a placeholder with a cast, which no application code may do.
 */
import type { CurrencyCode, PaymentMethodFamily, TaxRegime } from '@engine/config/schema'
import type { PaymentPresentation } from '@engine/domain/api'
import type { PaymentMethodId, PaymentProviderId } from '@engine/domain/machines/payment'

import type { Money } from '../common'
import type { ItemRefVM, PaymentOptionVM, PricingToken, TotalsVM } from '../commerce'
import type { LocationSummaryVM } from '../surfaces/editorial'
import { image, money, price } from './_shared'

export const token = (value: string) => value as PricingToken

type Settled = { confirmation?: 'automatic' | 'manual'; refunds?: 'gateway' | 'manual' }

/** A method as routing offers it (C6 `PaymentOptionView`): what it opens, and for how long. */
export function paymentOption(
  method: PaymentMethodId,
  provider: PaymentProviderId,
  family: PaymentMethodFamily,
  presentation: PaymentPresentation,
  minutes: number,
  settled: Settled = {},
): PaymentOptionVM {
  return {
    method,
    provider,
    family,
    presentation,
    sessionTtl: { seconds: minutes * 60 },
    confirmation: settled.confirmation ?? 'automatic',
    refunds: settled.refunds ?? 'gateway',
  }
}

type TotalsInput = {
  currency: CurrencyCode
  subtotal: number
  orderDiscount?: number
  shipping?: number | null
  giftCard?: number
  taxRegime: TaxRegime
  /** The display estimate of the grand total, when the market's currency differs. */
  estimate?: Money
}

/** Tax is included and zero (no registered seller in the fixtures), so the figures add up plainly. */
export function totals(input: TotalsInput): TotalsVM {
  const { currency, subtotal, orderDiscount = 0, shipping = null, giftCard = 0 } = input
  const grand = subtotal - orderDiscount + (shipping ?? 0) - giftCard
  const zero = money(0, currency)
  return {
    currency,
    subtotal: money(subtotal, currency),
    lineDiscount: zero,
    orderDiscount: money(orderDiscount, currency),
    shipping: shipping === null ? null : money(shipping, currency),
    shippingDiscount: zero,
    tax: zero,
    giftCard: money(giftCard, currency),
    grandTotal: price(money(grand, currency), input.estimate ?? null),
    taxRegime: input.taxRegime,
  }
}

export function ref(title: string, href: string | null, overrides: Partial<ItemRefVM> = {}) {
  const item: ItemRefVM = {
    title,
    href,
    image: image(`ref-${title}`, 1200, 900, title),
    stockNumber: null,
    isReproduction: false,
    ...overrides,
  }
  return item
}

export const PRINT = ref('Harbour of Contoh — Giclée print', '/product/7001-harbour-giclee', {
  isReproduction: true,
})
export const TOTE = ref('Harbour of Contoh — Tote', '/product/7002-harbour-tote', {
  isReproduction: true,
})
export const WRAP = ref('Gift wrap — archive map cloth', null, { image: null })
export const ISLE = ref('The Isle of Contoh, 1718', '/product/1001-isle-of-contoh', {
  stockNumber: 'M.0001',
})
export const STRAITS = ref('Chart of the Contoh Straits, 1722', '/product/1006-contoh-straits', {
  stockNumber: 'M.0006',
})

export const SHOWROOM: LocationSummaryVM = {
  name: 'The Showroom',
  href: '/visit/showroom',
  address: ['Jl. Contoh No. 1', 'Denpasar'],
  hours: {
    timeZone: 'Asia/Makassar',
    weekly: [{ days: 'Mon–Sat', opens: '10:00', closes: '18:00' }],
    byAppointment: false,
    closure: null,
  },
  map: { lat: -8.65, lng: 115.21, href: 'https://maps.example.test/?q=showroom' },
  whatsapp: 'https://wa.me/6281200000001',
}
