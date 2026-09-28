/**
 * @contract C2 — fixtures `account-retailer` (signed out, approved, terms, quotes, applied, declined) · owner: ARC
 *
 * The shop's account, where retailers are the only accounts (D31): signed out, it offers
 * partner sign-in and the way to apply, never a shopper sign-up; an approved retailer sees the
 * trade terms (D32) and their quotes, and reorders an order as a quote request. The password
 * comes with approval, so the other signed-in states are a former partner's: applied again,
 * or declined when the partnership ended — its orders kept, no reorder, nothing priced anew.
 */
import type { OrderSummaryVM } from '../commerce'
import type { AccountNavVM, AccountVM } from '../surfaces/account'
import type { ApprovedRetailerVM } from '../surfaces/account-retailer'
import { PRINT, TOTE } from './_commerce'
import { line, money, seo } from './_shared'

const page = { ...seo('Your partner area', '/account'), noindex: true }
const customer = { fullName: 'Made Contoh', email: 'made@shop.example.test' }
const nav = (
  selected: AccountNavVM['section'],
  sections: readonly AccountNavVM['section'][],
): readonly AccountNavVM[] =>
  sections.map((section) => ({
    section,
    href: section === 'overview' ? '/account' : `/account/${section}`,
    count: null,
    selected: section === selected,
  }))
const approvedSections = [
  'overview',
  'orders',
  'quotes',
  'terms',
  'addresses',
  'profile',
  'privacy',
] as const
const standingSections = ['overview', 'orders', 'addresses', 'profile', 'privacy'] as const

const approved: ApprovedRetailerVM = {
  status: 'approved',
  approvedAt: '2026-10-01T11:00:00+08:00',
  terms: {
    tier: { id: 'trade-2', label: 'Partner — tier 2', discountBps: 4000 },
    minimum: { kind: 'piecesPerDesign', pieces: 20, mixedSizes: true },
    ordering: { request: { href: '/account/quotes#new' }, payment: ['bankTransfer', 'payLink'] },
    extras: [{ label: 'Display', value: 'Counter stands and signage, on request' }],
    document: { kind: 'trade-terms', href: '/api/x/commerce/orders/documents/trade-terms' },
  },
}
const order = {
  number: 'ID-000501',
  placedAt: '2026-10-20T09:00:00+08:00',
  status: 'completed',
  payment: 'paid',
  total: money(9600000, 'IDR'),
  items: [PRINT, TOTE],
  href: '/orders/ID-000501',
  reorder: null,
} as const satisfies OrderSummaryVM<null>

export const accountRetailerSignedOut: AccountVM = {
  surface: 'account',
  session: {
    kind: 'signedOut',
    returnTo: 'overview',
    signUp: [{ audience: 'retailer', apply: { label: 'Become a partner', href: '/partnership' } }],
    claim: false,
    email: null,
  },
  seo: page,
}

export const accountRetailerApproved: AccountVM = {
  surface: 'account',
  session: {
    kind: 'signedIn',
    audience: 'retailer',
    customer,
    retailer: approved,
    nav: nav('overview', approvedSections),
    view: {
      section: 'overview',
      attention: [],
      recentOrders: [
        {
          ...order,
          reorder: {
            lines: [line(7001, 70011, null, 20), line(7002, 70021, null, 40)],
            message: null,
            neededBy: null,
            institution: null,
            contact: null,
          },
        },
      ],
    },
  },
  seo: page,
}

export const accountRetailerTerms: AccountVM = {
  ...accountRetailerApproved,
  session: {
    kind: 'signedIn',
    audience: 'retailer',
    customer,
    retailer: approved,
    nav: nav('terms', approvedSections),
    view: { section: 'terms' },
  },
}

export const accountRetailerQuotes: AccountVM = {
  ...accountRetailerApproved,
  session: {
    kind: 'signedIn',
    audience: 'retailer',
    customer,
    retailer: approved,
    nav: nav('quotes', approvedSections),
    view: {
      section: 'quotes',
      quotes: [
        {
          number: 'IDQ-000031',
          status: 'issued',
          requestedAt: '2026-10-21T08:00:00+08:00',
          validUntil: '2026-11-04T17:00:00+08:00',
          total: money(9600000, 'IDR'),
          href: '/quote/tok_trade_quote',
        },
        {
          number: null,
          status: 'requested',
          requestedAt: '2026-10-25T08:00:00+08:00',
          validUntil: null,
          total: null,
          href: '/quote/tok_trade_request',
        },
      ],
      request: { href: '/account/quotes#new' },
    },
  },
}

/** A former partner who has applied again: waiting on staff, its orders kept. */
export const accountRetailerApplied: AccountVM = {
  surface: 'account',
  session: {
    kind: 'signedIn',
    audience: 'retailer',
    customer,
    retailer: {
      status: 'applied',
      appliedAt: '2026-12-01T10:00:00+08:00',
      reply: { code: 'applicationReplyDays', params: { days: 2 } },
    },
    nav: nav('overview', standingSections),
    view: { section: 'overview', attention: [], recentOrders: [order] },
  },
  seo: page,
}

/** The partnership ended: said plainly, a person to talk to, the orders kept without a reorder. */
export const accountRetailerDeclined: AccountVM = {
  ...accountRetailerApplied,
  session: {
    kind: 'signedIn',
    audience: 'retailer',
    customer,
    retailer: {
      status: 'declined',
      decidedAt: '2026-11-15T09:00:00+08:00',
      note: null,
      contact: { label: 'Talk to us on WhatsApp', href: 'https://wa.me/6281200000001' },
    },
    nav: nav('orders', standingSections),
    view: { section: 'orders', orders: [order], pagination: null },
  },
}
