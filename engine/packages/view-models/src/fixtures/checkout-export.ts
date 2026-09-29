/**
 * @contract C2 — fixtures `checkout-export` and its problem states · owner: ARC
 *
 * A Netherlands destination on the gallery app, at the payment step: a one-of-one original
 * the seller charges in dollars, shown with a euro estimate ("≈ €953 — charged in USD
 * 1,035"); DHL Express with duties estimated (DAP); cards, PayPal and a bank transfer, Apple
 * Pay and Google Pay collapsing the steps; the checkout lock taken and its true countdown;
 * the order created in `pending_payment`; and the Stripe Payment Element's session. Then the
 * states the payment step must design: someone else was first, the price moved, the lock ran out.
 */
import type { CheckoutVM } from '../surfaces/checkout'
import { STRAITS, token, totals } from './_commerce'
import { card, money, price, SELLER_SG, seo, streamed } from './_shared'

const stripe = (method: 'card' | 'apple-pay' | 'google-pay') => ({
  method,
  provider: 'stripe' as const,
  confirmation: 'automatic' as const,
  refunds: 'gateway' as const,
})

export const checkoutExport: CheckoutVM = {
  surface: 'checkout',
  checkoutId: 'chk_fixture_nl',
  seller: SELLER_SG,
  market: { country: 'NL', currency: 'EUR' },
  steps: [
    { id: 'contact', state: 'done' },
    { id: 'delivery', state: 'done' },
    { id: 'shipping', state: 'done' },
    { id: 'payment', state: 'current' },
    { id: 'confirmation', state: 'todo' },
  ],
  lines: [
    {
      lineId: 'x1',
      role: { kind: 'product' },
      item: STRAITS,
      options: [],
      quantity: 1,
      unitPrice: price(money(95000, 'USD'), money(87500, 'EUR')),
      subtotal: money(95000, 'USD'),
      delivery: [{ code: 'shipsFrom', params: { city: 'Singapore' } }],
      problems: [],
    },
  ],
  totals: totals({
    currency: 'USD',
    subtotal: 95000,
    shipping: 8500,
    taxRegime: 'SG-GST',
    estimate: money(95300, 'EUR'),
  }),
  codes: [],
  contact: {
    whatsappFirst: false,
    institutionAllowed: true,
    values: {
      fullName: 'Anna Voorbeeld',
      email: 'anna@example.test',
      whatsapp: null,
      whatsappConfirmed: false,
      institution: null,
    },
    consents: ['marketingEmail'],
    signedIn: false,
  },
  delivery: {
    country: 'NL',
    addressShape: 'international',
    savedAddresses: [],
    pickup: [],
    deliverBeforeAllowed: false,
    chosen: {
      kind: 'ship',
      address: {
        shape: 'international',
        country: 'NL',
        recipientName: 'Anna Voorbeeld',
        phone: null,
        line1: 'Voorbeeldstraat 1',
        line2: null,
        city: 'Amsterdam',
        region: null,
        postalCode: '1000 AA',
      },
      deliverBefore: null,
      addressLines: ['Anna Voorbeeld', 'Voorbeeldstraat 1', '1000 AA Amsterdam', 'Netherlands'],
    },
  },
  shipping: {
    options: [
      {
        optionId: 'dhl-express-worldwide',
        kind: 'rate',
        carrier: 'DHL Express',
        service: 'Worldwide',
        price: money(8500, 'USD'),
        isEstimate: false,
        eta: { minDays: 3, maxDays: 5 },
        sameDay: false,
        cover: 'courier',
        duties: { terms: 'DAP', estimate: money(19000, 'EUR') },
      },
    ],
    selected: 'dhl-express-worldwide',
  },
  payment: {
    options: [
      stripe('card'),
      { method: 'paypal', provider: 'paypal', confirmation: 'automatic', refunds: 'gateway' },
      {
        method: 'bank-transfer',
        provider: 'bank-transfer',
        confirmation: 'manual',
        refunds: 'manual',
      },
    ],
    express: [stripe('apple-pay'), stripe('google-pay')],
    session: {
      kind: 'embedded',
      clientSecret: 'pi_fixture_secret_000',
      publishableKey: 'pk_test_fixture',
    },
  },
  lock: { expiresAt: '2026-09-25T10:45:00+08:00' },
  order: { number: 'SG-000123', status: 'pending_payment' },
  terms: { label: 'Conditions of sale', href: '/terms' },
  problem: null,
  intents: {
    continue: { checkoutId: 'chk_fixture_nl', acceptedPricing: token('tok_fixture_nl_3') },
    pay: { checkoutId: 'chk_fixture_nl', acceptedPricing: token('tok_fixture_nl_3') },
  },
  seo: { ...seo('Checkout', '/checkout'), noindex: true },
}

/** Someone else paid first: no charge, alternatives and a want-list. */
export const checkoutConflict: CheckoutVM = {
  ...checkoutExport,
  lock: null,
  order: null,
  payment: { ...checkoutExport.payment, session: null },
  problem: {
    code: 'reservation-conflict',
    state: 'sold',
    heldUntil: null,
    alternatives: streamed([card(1009, 'Chart of the Contoh Straits (another state)')]),
    wantList: { href: '/account/want-lists?like=1006' },
  },
}

/** The totals moved since the buyer saw them (a new shipping rate): shown, and confirmed again. */
export const checkoutPriceChanged: CheckoutVM = {
  ...checkoutExport,
  totals: totals({
    currency: 'USD',
    subtotal: 95000,
    shipping: 9200,
    taxRegime: 'SG-GST',
    estimate: money(95950, 'EUR'),
  }),
  payment: { ...checkoutExport.payment, session: null },
  problem: { code: 'price-changed' },
  intents: {
    continue: { checkoutId: 'chk_fixture_nl', acceptedPricing: token('tok_fixture_nl_4') },
    pay: { checkoutId: 'chk_fixture_nl', acceptedPricing: token('tok_fixture_nl_4') },
  },
}

/** The lock ran out during a 3-D Secure detour: start again from the item. */
export const checkoutLockExpired: CheckoutVM = {
  ...checkoutExport,
  lock: null,
  payment: { ...checkoutExport.payment, session: null },
  problem: { code: 'expired', restartAt: 'item', href: '/product/1006-contoh-straits' },
}
