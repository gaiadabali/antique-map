/**
 * @contract C2 — fixture base: an original on the gallery app · owner: ARC
 *
 * A fictional one-of-one map every item fixture varies: its content is shared, and each
 * fixture swaps the streamed purchase state it exists to show.
 */
import type { LinkVM } from '../common'
import type { ItemVM } from '../surfaces/item'
import type { NoBuyActionVM, PurchaseVM, UniqueBaseVM } from '../surfaces/purchase'
import { card, date, image, MAKER, ORIGIN, pending, seo, streamed } from './_shared'

export const whatsapp: NoBuyActionVM = {
  action: 'whatsapp',
  href: 'https://wa.me/6281200000000?text=M.0001%20The%20Isle%20of%20Contoh',
}
export const enquire: NoBuyActionVM = { action: 'enquire', href: '/enquire?item=1001' }
export const reassurance: readonly LinkVM[] = [
  { label: 'Lifetime authenticity guarantee', href: '/guarantee' },
  { label: 'The certificate', href: '/certificate' },
  { label: 'Returns', href: '/returns' },
  { label: 'Shipping and insurance', href: '/shipping' },
]

/** What a pending panel resolves to, an hour on: the honest fallback. */
const unverified: PurchaseVM = {
  kind: 'enquiryOnly',
  reason: 'unverified',
  price: null,
  actions: { primary: enquire, secondary: [] },
  analytics: { priceBand: 'none', status: null },
}

/** Shared by the unique fixtures; each adds its `state` with the `price` and `actions` it allows. */
export const uniqueBase: UniqueBaseVM = {
  kind: 'unique',
  delivery: { kind: 'deliverable' },
  edition: null,
  shipsFrom: 'Singapore',
  insuredShipping: null,
  reassurance,
  alert: { href: '/account/want-lists?like=1001' },
  analytics: { priceBand: 'tier-2', status: 'available' },
}

export function originalItem(purchase: PurchaseVM | 'pending'): ItemVM {
  const recto = image('recto-1001', 3543, 2840, 'Engraved map of the Isle of Contoh, 1718, recto')
  return {
    surface: 'item',
    id: 'prod-1001',
    publicId: 1001,
    slug: 'isle-of-contoh-voorbeeld-1718',
    kind: 'original',
    inventoryModel: 'unique',
    objectType: 'map',
    title: 'The Isle of Contoh by Hendrik Voorbeeld, 1718 — an imagined survey',
    hasHookTitle: true,
    originalTitle: { text: 'Nieuwe Kaart van het Eyland Contoh', lang: 'nl' },
    stockNumber: 'M.0001',
    archiveNumber: null,
    isReproduction: false,
    badges: [],
    makers: [MAKER, { ...MAKER, name: 'Jan Proef', sortName: 'PROEF, Jan', role: 'engraver' }],
    date: date(1718),
    media: {
      primary: recto,
      images: [
        recto,
        image('verso-1001', 3543, 2840, 'The Isle of Contoh, verso: blank', 'verso'),
        image('cartouche-1001', 2400, 1800, 'Detail of the title cartouche', 'detail'),
      ],
      manifest: `${ORIGIN}/api/x/media/manifest/FIX-000001`,
      scale: { widthMm: 520, heightMm: 410 },
    },
    record: {
      objectType: { key: 'map', label: 'Map' },
      publication: {
        place: 'Amsterdam',
        publisher: 'Weduwe Proef',
        sourceWork: 'Beschryving der Voorbeeld-Eilanden, 1716–18',
        edition: 'First edition',
        state: 'Second state, with the compass rose',
        textLanguage: { label: 'Dutch', lang: 'nl' },
        verso: 'Verso: blank',
      },
      firstEdition: date(1716),
      dateOnPlate: date(1718),
      technique: { key: 'copperplate-engraving', label: 'Copperplate engraving' },
      colour: { key: 'original-hand', label: 'Original hand colour' },
      dimensions: {
        image: { heightMm: 380, widthMm: 490 },
        sheet: { heightMm: 410, widthMm: 520 },
        framed: null,
      },
    },
    book: null,
    condition: {
      grade: {
        label: 'VG',
        definition: 'Very good: light toning, margins complete.',
        equivalent: 'B',
        scaleHref: '/condition-grades',
      },
      notes: 'A short, closed tear in the lower margin, well away from the image.',
      defects: ['Closed marginal tear (8 mm)', 'Faint offsetting'],
      restoration: null,
    },
    references: [
      { shortCite: 'Fictus', ref: '101', href: '/sources/fictus', note: 'State 2 of 3' },
    ],
    provenance: [{ holder: 'A private collection', period: '1920s–2024', note: null }],
    description: [
      {
        type: 'prose',
        id: 'essay-1',
        content: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'The first map to give the island its whole coastline.',
                marks: [],
                lang: null,
              },
              {
                type: 'note',
                id: 'n1',
                number: 1,
                body: [{ type: 'text', text: 'See the survey notes.', marks: [], lang: null }],
                citation: { shortCite: 'Fictus', ref: '101', href: '/sources/fictus' },
              },
            ],
          },
        ],
      },
    ],
    story: null,
    places: [
      {
        name: 'Pulau Contoh',
        historicalNames: ['Insula Exempli'],
        role: 'depicts',
        primary: true,
        href: '/places/contoh',
        geo: { lat: -8.4, lng: 115.1 },
      },
    ],
    maker: {
      name: MAKER.name,
      excerpt: 'A fictional surveyor whose charts exist only in these fixtures.',
      href: '/makers/voorbeeld',
      available: streamed(18),
    },
    specifications: [],
    purchase: purchase === 'pending' ? pending(unverified) : streamed(purchase),
    sister: streamed(null),
    related: streamed([
      {
        kind: 'sameMaker',
        title: 'More by Voorbeeld',
        items: [card(1002, 'Chart of the Straits')],
        more: null,
      },
    ]),
    reviews: streamed(null),
    utilities: {
      share: {
        url: `${ORIGIN}/product/1001-isle-of-contoh-voorbeeld-1718`,
        whatsapp: 'https://wa.me/?text=…',
      },
      factsheet: null,
      consign: '/sell-to-us',
      framingQuote: '/enquire?item=1001&topic=framing',
    },
    seo: seo('The Isle of Contoh – Voorbeeld, 1718', '/product/1001-isle-of-contoh-voorbeeld-1718'),
    breadcrumbs: [
      { label: 'Maps & Charts', href: '/antique-maps' },
      { label: 'Pulau Contoh', href: '/antique-maps/contoh' },
    ],
  }
}
