/**
 * @contract C2 — fixtures `account` (signed out, overview, want-lists, offers, viewings, consignments) · owner: ARC
 *
 * A gallery collector's account with every conversation module on: a countered offer with
 * its true countdown, a hold about to end, a confirmed viewing with its pull list, a
 * consignment under review — and the signed-out state, which offers the claim flow.
 */
import type { AccountNavVM, AccountVM, SignedInVM } from '../surfaces/account'
import { ISLE, SHOWROOM, STRAITS } from './_commerce'
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
const signedIn = (view: SignedInVM['view']): AccountVM => ({
  surface: 'account',
  session: {
    kind: 'signedIn',
    customer: { fullName: 'Anna Voorbeeld', email: 'anna@example.test' },
    nav: nav(view.section),
    view,
  },
  seo: page,
})

export const accountSignedOut: AccountVM = {
  surface: 'account',
  session: { kind: 'signedOut', returnTo: 'offers', claim: true, email: 'anna@example.test' },
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
      payment: 'paid',
      total: money(103500, 'USD'),
      items: [STRAITS],
      href: '/orders/SG-000123',
    },
  ],
})

export const accountWishlist: AccountVM = signedIn({
  section: 'wishlist',
  items: streamed([card(1001, 'The Isle of Contoh'), card(1006, 'Chart of the Contoh Straits')]),
  pullList: { href: '/book-a-visit?pullList=wishlist' },
})

export const accountWantLists: AccountVM = signedIn({
  section: 'wantLists',
  lists: [
    {
      id: 'wl-1',
      label: 'Maps of Pulau Contoh under US$2,000',
      href: '/antique-maps/contoh?price=0-200000',
      budget: money(200000, 'USD'),
      frequency: 'instant',
      lastNotifiedAt: '2026-09-20T08:00:00+08:00',
      unsubscribe: { href: '/api/x/forms/want-lists/wl-1/unsubscribe?token=fixture' },
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
      respond: { offerToken: 'off_fixture_1' },
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
      reschedule: { href: '/book-a-visit?reschedule=apt_fixture_1' },
      cancel: { appointmentToken: 'apt_fixture_1' },
      ics: '/api/x/commerce/appointments/ics?token=apt_fixture_1',
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
