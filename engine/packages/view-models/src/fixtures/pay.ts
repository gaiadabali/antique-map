/**
 * @contract C2 — fixtures `pay` and `quote` · owner: ARC
 *
 * An accepted offer's payment link (the offer hold ends on Sunday; the methods routing
 * allows for a unique item — no cash at a counter); the same link once paid; an
 * institution's proforma for two originals, each held until the due date, with its PDF and
 * PO number; a business quote staff are still preparing; and an approved retailer's reorder,
 * issued at its trade tier beside the list prices it started from (D32).
 */
import type { PayVM, QuoteVM } from '../surfaces/pay'
import { ISLE, paymentOption, PRINT, STRAITS, TOTE, token, totals } from './_commerce'
import { money, SELLER_ID, SELLER_SG, seo } from './_shared'

export const pay: PayVM = {
  surface: 'pay',
  reason: 'offer',
  status: 'open',
  seller: SELLER_SG,
  lines: [
    {
      item: ISLE,
      options: [],
      quantity: 1,
      unitPrice: money(450000, 'USD'),
      total: money(450000, 'USD'),
    },
  ],
  totals: totals({ currency: 'USD', subtotal: 450000, shipping: 12000, taxRegime: 'SG-GST' }),
  expiresAt: '2026-09-27T12:00:00+08:00',
  holdExpiresAt: '2026-09-27T14:00:00+08:00',
  note: 'As agreed, the map is held for you until Sunday.',
  terms: [
    { label: 'Terms of your accepted offer', href: '/offers/terms' },
    { label: 'Returns and the guarantee', href: '/guarantee' },
  ],
  methods: [
    paymentOption('card', 'stripe', 'card', 'embedded', 30),
    // The link's hold ends on Sunday: a transfer's window closes before it does.
    paymentOption('bank-transfer', 'bank-transfer', 'bank-transfer', 'instructions', 36 * 60, {
      confirmation: 'manual',
      refunds: 'manual',
    }),
  ],
  payment: null,
  order: null,
  intents: {
    start: { token: 'tok_pay_fixture', acceptedPricing: token('tok_pay_fixture_pricing') },
    poll: null,
  },
  seo: { ...seo('Your payment link', '/pay/tok_pay_fixture'), noindex: true },
}

export const payPaid: PayVM = {
  ...pay,
  status: 'paid',
  order: { number: 'SG-000125', href: '/orders/SG-000125' },
  intents: null,
}

/** A bank transfer started from the link: the instructions replayed, the poll on this link. */
export const payTransferPending: PayVM = {
  ...pay,
  payment: {
    attemptId: 'att_fixture_pay',
    session: {
      kind: 'instructions',
      reference: 'SG-000125-1',
      virtualAccount: null,
      bank: {
        bankName: 'Example Bank',
        accountName: 'Fixture Atlas Pte. Ltd.',
        accountNumber: '000-000000-0',
        swift: 'EXAMSGSG',
        iban: null,
      },
      expiresAt: '2026-09-27T04:00:00.000Z',
    },
    expiresAt: '2026-09-27T04:00:00.000Z',
    lockExpiresAt: '2026-09-27T06:00:00.000Z',
    dailyCapWarning: false,
  },
  order: { number: 'SG-000125', href: '/orders/SG-000125' },
  intents: {
    start: { token: 'tok_pay_fixture', acceptedPricing: token('tok_pay_fixture_pricing') },
    poll: { attemptId: 'att_fixture_pay', scope: { kind: 'pay-link', token: 'tok_pay_fixture' } },
  },
}

export const quoteProforma: QuoteVM = {
  surface: 'quote',
  kind: 'proforma',
  status: 'issued',
  number: 'SGPF-000012',
  seller: SELLER_SG,
  buyer: {
    name: 'A. Librarian',
    organisation: 'Example University Library',
    taxId: null,
    poNumber: 'PO-4471',
  },
  lines: [
    {
      item: ISLE,
      options: [],
      quantity: 1,
      unitPrice: money(480000, 'USD'),
      total: money(480000, 'USD'),
      heldUntil: '2026-10-02T17:00:00+08:00',
      retailUnitPrice: null,
    },
    {
      item: STRAITS,
      options: [],
      quantity: 1,
      unitPrice: money(95000, 'USD'),
      total: money(95000, 'USD'),
      heldUntil: '2026-10-02T17:00:00+08:00',
      retailUnitPrice: null,
    },
  ],
  totals: totals({ currency: 'USD', subtotal: 575000, shipping: 24000, taxRegime: 'SG-GST' }),
  validUntil: '2026-10-02T17:00:00+08:00',
  pdf: '/api/x/commerce/quotes/pdf?token=tok_quote_fixture',
  terms: [{ code: 'paymentBeforeCompletion' }, { code: 'bankDetailsOnPdfOnly' }],
  trade: null,
  pay: null,
  intents: {
    accept: { token: 'tok_quote_fixture', acceptedPricing: token('tok_quote_fixture_pricing') },
  },
  seo: { ...seo('Proforma SGPF-000012', '/quote/tok_quote_fixture'), noindex: true },
}

/** For Business: forty framed prints for a hotel at list price; staff are preparing the quote. */
export const quoteRequested: QuoteVM = {
  ...quoteProforma,
  kind: 'quote',
  status: 'requested',
  number: null,
  seller: SELLER_ID,
  buyer: { name: 'Made Contoh', organisation: 'Hotel Contoh', taxId: null, poNumber: null },
  lines: [
    {
      item: PRINT,
      options: [
        { axis: 'size', value: '60 cm' },
        { axis: 'frame', value: 'Dark teak' },
      ],
      quantity: 40,
      unitPrice: money(1850000, 'IDR'),
      total: money(74000000, 'IDR'),
      heldUntil: null,
      retailUnitPrice: null,
    },
  ],
  totals: null,
  validUntil: null,
  pdf: null,
  terms: [{ code: 'quoteBeingPrepared', params: { days: 2 } }],
  intents: null,
  seo: { ...seo('Your quote request', '/quote/tok_quote_request'), noindex: true },
}

/** An approved retailer's reorder, issued at its tier: trade prices beside the list's (D32). */
export const quoteTrade: QuoteVM = {
  ...quoteRequested,
  status: 'issued',
  number: 'IDQ-000031',
  buyer: { name: 'Made Contoh', organisation: 'Toko Contoh', taxId: null, poNumber: null },
  lines: [
    {
      item: PRINT,
      options: [{ axis: 'size', value: 'A3' }],
      quantity: 20,
      unitPrice: money(210000, 'IDR'),
      total: money(4200000, 'IDR'),
      heldUntil: null,
      retailUnitPrice: money(350000, 'IDR'),
    },
    {
      item: TOTE,
      options: [],
      quantity: 40,
      unitPrice: money(135000, 'IDR'),
      total: money(5400000, 'IDR'),
      heldUntil: null,
      retailUnitPrice: money(225000, 'IDR'),
    },
  ],
  totals: totals({ currency: 'IDR', subtotal: 9600000, shipping: 0, taxRegime: 'ID-PPN' }),
  validUntil: '2026-11-04T17:00:00+08:00',
  pdf: '/api/x/commerce/quotes/pdf?token=tok_trade_quote',
  terms: [{ code: 'paymentBeforeCompletion' }, { code: 'bankDetailsOnPdfOnly' }],
  trade: {
    tier: { id: 'trade-2', label: 'Partner — tier 2', discountBps: 4000 },
    minimum: { kind: 'piecesPerDesign', pieces: 20, mixedSizes: true },
    minimumWaiver: null,
  },
  intents: {
    accept: { token: 'tok_trade_quote', acceptedPricing: token('tok_trade_quote_pricing') },
  },
  seo: { ...seo('Quote IDQ-000031', '/quote/tok_trade_quote'), noindex: true },
}
