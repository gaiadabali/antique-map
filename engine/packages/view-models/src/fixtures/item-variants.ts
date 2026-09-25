/**
 * @contract C2 — fixture `item-variants` · owner: ARC
 * A giclée print on the emporium app, seen with an Indonesian ship-to (IDR only): the
 * configurator with a partial selection, a disabled option with its reason, a delivery
 * promise, gift wrap, and "the original" from the sister gallery.
 */
import type { ItemVM } from '../surfaces/item'
import type { VariantsPurchaseVM } from '../surfaces/purchase'
import { originalItem } from './_item'
import { image, money, NOW, price, seo, streamed } from './_shared'

const idr = (amount: number) => price(money(amount, 'IDR'))

const purchase: VariantsPurchaseVM = {
  kind: 'variants',
  from: idr(95000),
  axes: [
    {
      axis: 'format',
      options: [
        { value: 'poster', label: 'Poster', swatch: null, from: idr(95000), disabled: null },
        { value: 'giclee', label: 'Giclée', swatch: null, from: idr(450000), disabled: null },
        { value: 'framed', label: 'Framed', swatch: null, from: idr(1250000), disabled: null },
      ],
    },
    {
      axis: 'glazing',
      options: [
        { value: 'acrylic', label: 'Acrylic', swatch: null, from: null, disabled: null },
        {
          value: 'glass',
          label: 'Glass',
          swatch: null,
          from: null,
          disabled: { code: 'glassBaliOnly' },
        },
      ],
    },
  ],
  selection: { format: 'giclee' },
  selected: null,
  priceTable: [
    { options: { format: 'poster', size: '30x40' }, price: idr(95000) },
    { options: { format: 'giclee', size: '45' }, price: idr(450000) },
  ],
  rules: [
    {
      when: { frame: ['none'] },
      disables: { axis: 'mount', values: ['4', '6', '8'] },
      reason: { code: 'mountNeedsFrame' },
    },
  ],
  delivery: {
    lines: [{ code: 'readyAtShowroom', params: { hours: 2 } }, { code: 'noCashOnDelivery' }],
    shippingEstimate: idr(25000),
    duties: null,
    holiday: null,
  },
  giftWrap: { productId: 'prod-wrap', price: idr(45000) },
  actions: {
    addToBag: true,
    whatsapp: 'https://wa.me/6281200000001?text=A-0042',
    quote: '/trade?design=A-0042',
  },
  preview: {
    flat: image('flat-7001', 1200, 960, 'The harbour of Contoh, flat'),
    frames: { none: '', 'slim-black': 'https://media.example.test/frames/slim-black.svg' },
    rooms: [{ wall: 'white', image: image('room-7001', 1600, 1067, 'The print on a white wall') }],
    scale: { widthMm: 450, heightMm: 360 },
  },
  showroom: false,
}

const base = originalItem('pending')

export const itemVariants: ItemVM = {
  ...base,
  id: 'prod-7001',
  publicId: 7001,
  slug: 'harbour-of-contoh-giclee',
  kind: 'reproduction',
  inventoryModel: 'made-to-order',
  title: 'Harbour of Contoh — Giclée print',
  hasHookTitle: true,
  originalTitle: null,
  stockNumber: null,
  archiveNumber: 'A-0042',
  isReproduction: true,
  badges: ['printed-in-bali'],
  media: {
    primary: image('wall-7001', 1600, 1067, 'The giclée print framed on a white wall', 'in-room'),
    images: [
      image('wall-7001', 1600, 1067, 'The giclée print framed on a white wall', 'in-room'),
      image('flat-7001', 1200, 960, 'The harbour of Contoh, flat', 'primary'),
      image('detail-7001', 1600, 1600, 'Detail of the harbour mouth', 'detail'),
    ],
    manifest: null,
    scale: { widthMm: 450, heightMm: 360 },
  },
  record: null,
  condition: null,
  references: [],
  provenance: [],
  story: {
    text: 'A harbour drawn from an imagined survey, reprinted on cotton rag.',
    href: '/stories/harbour',
  },
  specifications: [{ label: 'Paper', value: 'Smooth cotton rag, 308 gsm' }],
  purchase: streamed(purchase),
  sister: streamed({
    kind: 'original',
    sister: { name: 'Fixture Gallery', href: 'https://gallery.example.test', syncedAt: NOW },
    original: {
      title: 'The Isle of Contoh by Hendrik Voorbeeld, 1718',
      href: 'https://gallery.example.test/product/1001-isle-of-contoh-voorbeeld-1718',
      image: null,
      status: 'available',
      price: idr(78000000),
      canBuy: true,
    },
  }),
  utilities: { ...base.utilities, consign: null, framingQuote: null },
  seo: seo('Harbour of Contoh — Giclée print', '/product/7001-harbour-of-contoh-giclee'),
}
