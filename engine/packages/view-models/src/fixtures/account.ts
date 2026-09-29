/**
 * @contract C2 — fixtures `account` (signed out, overview, want-lists, offers, viewings, consignments) · owner: ARC
 *
 * A gallery collector's account with every conversation module on: a countered offer with
 * its true countdown, a hold about to end, a confirmed viewing with its pull list, a
 * consignment under review — and the signed-out state after a failed sign-in (one answer
 * for any email), which offers the claim flow.
 */
import type { AccountNavVM, AccountVM, BuyerSectionVM } from '../surfaces/account'
import { ISLE, SHOWROOM, STRAITS } from './_commerce'
import { signInForm } from './_forms'
import { card, image, money, price, seo, streamed } from './_shared'

const page = { ...seo('Your account', '/account'), noindex: true }
const sections: readonly AccountNavVM['section'][] = [
  'overview',
  'orders',
  'wishlist',
  'wantLists',
  'offers',
  'holds',
  'priceRequests',
  'viewings',
  'consignments',
  'addresses',
  'profile',
  'privacy',
]
const nav = (selected: AccountNavVM['section']): readonly AccountNavVM[] =>
  sections.map((section) => ({
    section,
    href: section === 'overview' ? '/account' : `/account/${section}`,
    count: section === 'offers' ? 1 : null,
    selected: section === selected,
  }))
const signedIn = (view: BuyerSectionVM): AccountVM => ({
  surface: 'account',
  session: {
    kind: 'signedIn',
    audience: 'buyer',
    customer: { fullName: 'Anna Voorbeeld', email: 'anna@example.test' },
    nav: nav(view.section),
    view,
  },
  seo: page,
})

export const accountSignedOut: AccountVM = {
  surface: 'account',
  session: {
    kind: 'signedOut',
    returnTo: 'offers',
    signIn: signInForm('/account/offers'),
    failed: { email: 'anna@example.test', error: { kind: 'invalid' } },
    signUp: [{ audience: 'buyer' }],
    claim: true,
  },
  seo: page,
}

export const accountOverview: AccountVM = signedIn({
  section: 'overview',
  attention: [
    {
      kind: 'offerCountered',
      item: ISLE,
      href: '/account/offers',
      until: '2026-09-28T10:00:00+08:00',
    },
    {
      kind: 'holdExpiring',
      item: STRAITS,
      href: '/account/holds',
      until: '2026-09-26T14:00:00+08:00',
    },
  ],
  recentOrders: [
    {
      number: 'SG-000123',
      placedAt: '2026-09-25T10:32:00+08:00',
      status: 'paid',
      total: money(103500, 'USD'),
      items: [STRAITS],
      href: '/orders/SG-000123',
      reorder: null,
    },
  ],
})

export const accountWishlist: AccountVM = signedIn({
  section: 'wishlist',
  items: streamed([card(1001, 'The Isle of Contoh'), card(1006, 'Chart of the Contoh Straits')]),
  pullList: { href: '/book-a-visit?pullList=wishlist' },
})

/** A buyer's own lists (`retention.wantList`): each stops by the session, never by a token. */
export const accountWantLists: AccountVM = signedIn({
  section: 'wantLists',
  lists: [
    {
      id: 'wl-1',
      label: 'Maps of Pulau Contoh',
      href: '/antique-maps/contoh?price=0-200000',
      budget: money(200000, 'USD'),
      frequency: 'instant',
      status: 'active',
      lastNotifiedAt: '2026-09-20T08:00:00+08:00',
      confirm: null,
      stop: { access: { kind: 'account', wantListId: 'wl-1' } },
    },
    {
      id: 'wl-2',
      label: 'Another example of the Isle of Contoh',
      href: '/product/1001-isle-of-contoh',
      budget: null,
      frequency: 'daily',
      status: 'active',
      lastNotifiedAt: null,
      confirm: null,
      stop: { access: { kind: 'account', wantListId: 'wl-2' } },
    },
  ],
})

export const accountOffers: AccountVM = signedIn({
  section: 'offers',
  offers: [
    {
      item: ISLE,
      status: 'countered',
      proposal: money(420000, 'USD'),
      counter: money(450000, 'USD'),
      expiresAt: '2026-09-28T10:00:00+08:00',
      payHref: null,
      respond: { access: { kind: 'account', offerId: '6b1f0c9e-2d4a-4c8b-9e1f-7a2b3c4d5e6f' } },
    },
  ],
})

export const accountPriceRequests: AccountVM = signedIn({
  section: 'priceRequests',
  requests: [
    {
      item: ISLE,
      askedAt: '2026-09-24T09:00:00+08:00',
      answer: { kind: 'revealed', price: price(money(480000, 'USD')) },
    },
  ],
})

export const accountViewings: AccountVM = signedIn({
  section: 'viewings',
  viewings: [
    {
      location: SHOWROOM,
      slotStart: '2026-10-03T11:00:00+08:00',
      timeZone: 'Asia/Makassar',
      purpose: 'viewing',
      status: 'confirmed',
      pullList: [ISLE, STRAITS],
      // By session and the viewing's id: a signed-in page holds no token, not even in a URL.
      reschedule: { href: '/book-a-visit?appointment=0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a' },
      cancel: {
        access: { kind: 'account', appointmentId: '0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a' },
      },
      ics: '/api/x/commerce/appointments/ics?appointment=0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a',
    },
  ],
  book: { href: '/book-a-visit' },
})

export const accountConsignments: AccountVM = signedIn({
  section: 'consignments',
  consignments: [
    {
      description: 'A hand-coloured chart of the Contoh Straits, inherited, framed',
      submittedAt: '2026-09-18T15:20:00+08:00',
      status: 'reviewing',
      timeline: [
        { status: 'received', at: '2026-09-18T15:20:00+08:00' },
        { status: 'reviewing', at: '2026-09-19T10:00:00+08:00' },
        { status: 'offer-made', at: null },
        { status: 'accepted', at: null },
      ],
      photos: [image('consign-1', 1600, 1200, 'The chart in its frame, photographed at home')],
    },
  ],
  submit: { href: '/sell-to-us' },
})
