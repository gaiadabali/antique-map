/**
 * @contract C2 — fixtures `maker`, `place`, `source`, `collection`, `catalogue` · owner: ARC
 * Fictional discovery pages; the works each lists are streamed with live status.
 */
import type { WorksVM } from '../surfaces/discovery'
import type { CatalogueVM, CollectionVM, MakerVM, PlaceVM, SourceVM } from '../surfaces/discovery'
import { card, date, image, money, price, seo, streamed } from './_shared'

const works: WorksVM = {
  available: [card(1001, 'The Isle of Contoh')],
  sold: [card(1007, 'Plan of the Harbour', { status: { kind: 'sold' } })],
  totals: { available: 18, sold: 42 },
  more: { label: 'All 18 available works', href: '/browse?maker=voorbeeld' },
}

export const maker: MakerVM = {
  surface: 'maker',
  name: 'Hendrik Voorbeeld',
  sortName: 'VOORBEELD, Hendrik',
  aliases: ['Henricus Exemplius'],
  roles: ['cartographer', 'publisher'],
  born: date(1671, 'circa'),
  died: date(1733),
  nationality: 'Dutch',
  portrait: image('portrait-voorbeeld', 800, 1000, 'Engraved portrait of Hendrik Voorbeeld'),
  bio: [
    {
      type: 'prose',
      id: 'bio-1',
      content: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'A fictional surveyor.', marks: [], lang: null }],
        },
      ],
    },
  ],
  sameAs: [],
  works: streamed(works),
  stories: [{ label: 'The survey that never was', href: '/stories/survey' }],
  seo: seo('Hendrik Voorbeeld (c. 1671–1733)', '/makers/voorbeeld'),
  breadcrumbs: [{ label: 'Makers', href: '/makers' }],
}

export const place: PlaceVM = {
  surface: 'place',
  name: 'Kota Lama',
  historicalNames: [{ name: 'Oudestad', language: 'nl', period: '1650–1800' }],
  type: 'town',
  ancestors: [{ label: 'Pulau Contoh', href: '/places/contoh' }],
  children: [],
  geo: { lat: -8.41, lng: 115.12, bbox: null },
  description: [],
  works: streamed(works),
  stories: [],
  seo: seo('Kota Lama (Oudestad)', '/places/contoh/kota-lama'),
  breadcrumbs: [
    { label: 'Places', href: '/places' },
    { label: 'Pulau Contoh', href: '/places/contoh' },
  ],
}

export const source: SourceVM = {
  surface: 'source',
  shortCite: 'Fictus',
  citation: 'A. Fictus, The Charts of the Example Islands (Nowhere, 1999).',
  year: 1999,
  url: null,
  works: streamed(works),
  seo: seo('Fictus', '/sources/fictus'),
  breadcrumbs: [{ label: 'Sources', href: '/sources' }],
}

/** A price-named gift guide: the threshold follows the visitor's market (rupiah here). */
export const collection: CollectionVM = {
  surface: 'collection',
  kind: 'gift-guide',
  title: 'Gifts under',
  intro: [],
  hero: null,
  dates: null,
  threshold: streamed(price(money(500000, 'IDR'))),
  members: streamed({ items: [card(7002, 'Harbour of Contoh — Tote')], total: 1, more: null }),
  seo: seo('Gifts', '/collections/gifts'),
  breadcrumbs: [{ label: 'Collections', href: '/collections' }],
}

export const catalogue: CatalogueVM = {
  surface: 'catalogue',
  title: 'The Autumn Catalogue',
  intro: [],
  hero: image('catalogue-cover', 1600, 2000, 'Cover of the Autumn Catalogue'),
  dates: { from: '2026-10-01', to: '2026-12-31' },
  sections: [
    { title: 'Charts', body: [], entries: streamed([card(1006, 'Chart of the Straits')]) },
  ],
  pdf: null,
  seo: seo('The Autumn Catalogue', '/catalogues/autumn'),
  breadcrumbs: [{ label: 'Catalogues', href: '/catalogues' }],
}
