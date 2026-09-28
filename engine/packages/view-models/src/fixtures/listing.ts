/**
 * @contract C2 — fixture `listing` · owner: ARC
 * A named facet page (`/antique-maps/contoh`) with an Indonesian ship-to: price facets and
 * presets in rupiah alone, the place tree, the status toggle, chips, sort and pagination —
 * plus the zero-results state, which never dead-ends.
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
  applied: [{ label: 'Pulau Contoh', href: '/antique-maps' }],
  clearAll: '/browse',
  sort: [
    { key: 'newest', href: '/antique-maps/contoh?sort=newest', selected: true },
    { key: 'priceAsc', href: '/antique-maps/contoh?sort=priceAsc', selected: false },
  ],
  pagination: { page: 1, pages: 1, previous: null, next: null },
  empty: null,
  alert: { href: '/account/want-lists?place=contoh&objectType=map' },
  status: [
    { key: 'available', href: '/antique-maps/contoh', selected: true },
    { key: 'onHold', href: '/antique-maps/contoh?availability=onHold', selected: false },
    { key: 'sold', href: '/antique-maps/contoh?availability=sold', selected: false },
  ],
  intro: null,
  seo: seo('Antique maps of Pulau Contoh', '/antique-maps/contoh'),
  breadcrumbs: [{ label: 'Maps & Charts', href: '/antique-maps' }],
}

export const listingEmpty: ListingVM = {
  ...listing,
  results: [],
  total: 0,
  empty: {
    suggestions: [{ label: 'Insula Exempli → Pulau Contoh', href: '/antique-maps/contoh' }],
    enquiry: '/enquire?topic=general&q=insula',
    alert: { href: '/account/want-lists?q=insula' },
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
  alert: { href: '/account/want-lists?q=insula+exempli' },
  seo: { ...seo('Search', '/search'), noindex: true },
  breadcrumbs: [],
}
