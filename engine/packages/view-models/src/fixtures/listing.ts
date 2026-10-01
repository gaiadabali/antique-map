/**
 * @contract C2 — fixture `listing` · owner: ARC
 * A named facet page (`/antique-maps/contoh`) with an Indonesian ship-to, for a brand whose
 * prices are shown: price facets and presets in rupiah alone, the place tree, the status toggle,
 * chips, sort and pagination — plus the zero-results state, which never dead-ends; and the same
 * page where unique prices are on request (the gallery, D50, v1.5): no price facet, no price sort,
 * every card "Price on request", the object type's options labelled by the app (`label: null`).
 */
import type { ListingVM, SearchVM } from '../surfaces/listing'
import { card, money, price, seo } from './_shared'

const idr = (amount: number) => price(money(amount, 'IDR'))

export const listing: ListingVM = {
  surface: 'browse',
  title: 'Antique maps of Pulau Contoh',
  query: { facets: { objectType: 'map', place: 'contoh' }, sort: 'newest', page: 1 },
  results: [
    card(1001, 'The Isle of Contoh', { status: { kind: 'price', price: idr(78000000) } }),
    card(1003, 'The Isle of Contoh (another example)', {
      status: { kind: 'onHold', until: '2026-09-26T14:00:00+08:00' },
    }),
    card(1006, 'Chart of the Contoh Straits', { status: { kind: 'priceOnRequest' } }),
    card(1007, 'Plan of the Harbour', { status: { kind: 'sold' } }),
  ],
  total: 4,
  facets: [
    {
      kind: 'options',
      key: 'place',
      multiple: true,
      options: [
        {
          value: 'contoh',
          label: 'Pulau Contoh',
          count: 4,
          selected: true,
          href: '/antique-maps',
          children: [
            {
              value: 'contoh/kota-lama',
              label: 'Kota Lama',
              count: 2,
              selected: false,
              href: '/antique-maps/contoh/kota-lama',
              children: [],
            },
          ],
        },
      ],
    },
    {
      kind: 'range',
      key: 'price',
      unit: 'minor',
      currency: 'IDR',
      bounds: { min: 0, max: 1250000000 },
      selected: { min: null, max: null },
      presets: [
        { label: '< Rp 5 juta', href: '/antique-maps/contoh?price=0-5000000', selected: false },
        { label: '75 juta+', href: '/antique-maps/contoh?price=75000000-', selected: false },
      ],
      includeOnRequest: { selected: true, href: '/antique-maps/contoh?price=por-excluded' },
    },
    {
      kind: 'toggle',
      key: 'inShowroom',
      selected: false,
      count: 0,
      href: '/antique-maps/contoh?inShowroom=1',
    },
  ],
  applied: [{ key: 'place', value: 'contoh', label: 'Pulau Contoh', href: '/antique-maps' }],
  clearAll: '/browse',
  sort: [
    { key: 'newest', href: '/antique-maps/contoh?sort=newest', selected: true },
    { key: 'priceAsc', href: '/antique-maps/contoh?sort=priceAsc', selected: false },
  ],
  pagination: { page: 1, pages: 1, previous: null, next: null },
  empty: null,
  alert: { href: '/alerts?watch=%2Fantique-maps%2Fcontoh' },
  status: [
    { key: 'available', href: '/antique-maps/contoh', selected: true },
    { key: 'onHold', href: '/antique-maps/contoh?availability=onHold', selected: false },
    { key: 'sold', href: '/antique-maps/contoh?availability=sold', selected: false },
  ],
  intro: null,
  seo: seo('Antique maps of Pulau Contoh', '/antique-maps/contoh'),
  breadcrumbs: [{ label: 'Maps & Charts', href: '/antique-maps' }],
}

/** The gallery's page at launch (D50): no figure anywhere, no price facet and no price sort. */
export const listingOnRequest: ListingVM = {
  ...listing,
  results: [
    card(1001, 'The Isle of Contoh', { status: { kind: 'priceOnRequest' } }),
    card(1003, 'The Isle of Contoh (another example)', {
      status: { kind: 'onHold', until: '2026-10-09T17:00:00+08:00' },
    }),
    card(1006, 'Chart of the Contoh Straits', { status: { kind: 'priceOnRequest' } }),
    card(1007, 'Plan of the Harbour', { status: { kind: 'sold' } }),
  ],
  facets: [
    ...listing.facets.filter((facet) => facet.key !== 'price'),
    {
      kind: 'options',
      key: 'objectType',
      multiple: true,
      // A contract's list: the app words each option at `objectType.<value>` (v1.5).
      options: [
        {
          value: 'map',
          label: null,
          count: 3,
          selected: true,
          href: '/antique-maps/contoh',
          children: [],
        },
        {
          value: 'sea-chart',
          label: null,
          count: 1,
          selected: false,
          href: '/sea-charts/contoh',
          children: [],
        },
      ],
    },
  ],
  applied: [
    { key: 'objectType', value: 'map', label: null, href: '/places/contoh' },
    { key: 'place', value: 'contoh', label: 'Pulau Contoh', href: '/antique-maps' },
  ],
  sort: [
    { key: 'newest', href: '/antique-maps/contoh?sort=newest', selected: true },
    { key: 'dateAsc', href: '/antique-maps/contoh?sort=dateAsc', selected: false },
    { key: 'maker', href: '/antique-maps/contoh?sort=maker', selected: false },
  ],
}

export const listingEmpty: ListingVM = {
  ...listing,
  results: [],
  total: 0,
  empty: {
    suggestions: [{ label: 'Insula Exempli → Pulau Contoh', href: '/antique-maps/contoh' }],
    enquiry: '/enquire?topic=general&q=insula',
    alert: { href: '/alerts?watch=%2Fsearch%3Fq%3Dinsula' },
    message: { code: 'notAllOnline', params: { held: 9500 } },
  },
}

export const search: SearchVM = {
  surface: 'search',
  title: 'Search',
  q: 'insula exempli',
  expandedWith: ['Pulau Contoh'],
  query: { facets: {}, page: 1 },
  results: listing.results,
  total: listing.total,
  facets: listing.facets,
  applied: [],
  clearAll: null,
  sort: listing.sort,
  pagination: listing.pagination,
  empty: null,
  alert: { href: '/alerts?watch=%2Fsearch%3Fq%3Dinsula%2520exempli' },
  seo: { ...seo('Search', '/search'), noindex: true },
  breadcrumbs: [],
}
