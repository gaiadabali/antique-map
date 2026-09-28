/**
 * @contract C2 — fixtures `account-retailer` (signed out, approved, terms, quotes) · owner: ARC
 *
 * The shop's account, where partners are the only accounts (D31): signed out, it offers
 * partner sign-in and the way to apply, never a shopper sign-up. Signed in, it is always an
 * approved partner's (D34): the trade terms (D32), its quotes and a brief for a new one, and a
 * reorder that names the order — the server rebuilds its lines.
 */
import type { AccountNavVM, AccountVM } from '../surfaces/account'
import type { ApprovedRetailerVM } from '../surfaces/account-retailer'
import { PRINT, TOTE } from './_commerce'
import { entry, hidden, optional, signInForm } from './_forms'
import { money, seo } from './_shared'

const page = { ...seo('Your partner area', '/account'), noindex: true }
const customer = { fullName: 'Made Contoh', email: 'made@shop.example.test' }
const sections = [
  'overview',
  'orders',
  'quotes',
  'terms',
  'addresses',
  'profile',
  'privacy',
] as const
const nav = (selected: AccountNavVM['section']): readonly AccountNavVM[] =>
  sections.map((section) => ({
    section,
    href: section === 'overview' ? '/account' : `/account/${section}`,
    count: null,
    selected: section === selected,
  }))

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
const partner = (selected: AccountNavVM['section']) =>
  ({
    kind: 'signedIn',
    audience: 'retailer',
    customer,
    retailer: approved,
    nav: nav(selected),
  }) as const

export const accountRetailerSignedOut: AccountVM = {
  surface: 'account',
  session: {
    kind: 'signedOut',
    returnTo: 'overview',
    signIn: signInForm('/account'),
    failed: null,
    signUp: [{ audience: 'retailer', apply: { label: 'Become a partner', href: '/partnership' } }],
    claim: false,
  },
  seo: page,
}

export const accountRetailerApproved: AccountVM = {
  surface: 'account',
  session: {
    ...partner('overview'),
    view: {
      section: 'overview',
      attention: [],
      recentOrders: [
        {
          number: 'ID-000501',
          placedAt: '2026-10-20T09:00:00+08:00',
          status: 'completed',
          payment: 'paid',
          total: money(9600000, 'IDR'),
          items: [PRINT, TOTE],
          href: '/orders/ID-000501',
          reorder: { fromOrder: 'ID-000501' },
        },
      ],
    },
  },
  seo: page,
}

export const accountRetailerTerms: AccountVM = {
  ...accountRetailerApproved,
  session: { ...partner('terms'), view: { section: 'terms' } },
}

export const accountRetailerQuotes: AccountVM = {
  ...accountRetailerApproved,
  session: {
    ...partner('quotes'),
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
      request: {
        fields: [
          entry('message', 'textarea'),
          optional('neededBy', 'date'),
          hidden('returnTo', '/account/quotes'),
        ],
        action: '/api/x/commerce/quotes',
      },
    },
  },
}
