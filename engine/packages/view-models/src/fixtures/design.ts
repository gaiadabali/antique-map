/**
 * @contract C2 — fixture `design` · owner: ARC
 * One artwork on the emporium app, every product made from it, and the original's status
 * at the sister gallery in the visitor's market currency (here rupiah, for Indonesia).
 */
import type { DesignVM } from '../surfaces/discovery'
import { card, image, line, money, NOW, price, seo, streamed } from './_shared'

const idr = (amount: number) => price(money(amount, 'IDR'))

export const design: DesignVM = {
  surface: 'design',
  title: 'Harbour of Contoh',
  archiveNumber: 'A-0042',
  image: image('design-a0042', 2400, 1920, 'The harbour of Contoh, the whole design'),
  story: 'A harbour drawn from an imagined survey of 1718, cleaned and colour-managed for print.',
  original: streamed({
    kind: 'original',
    sister: { name: 'Fixture Gallery', href: 'https://gallery.example.test', syncedAt: NOW },
    workUid: 'FIX-000001',
    original: {
      title: 'The Isle of Contoh by Hendrik Voorbeeld, 1718',
      href: 'https://gallery.example.test/product/1001-isle-of-contoh-voorbeeld-1718',
      image: null,
      status: 'sold',
      price: null,
      canBuy: false,
    },
  }),
  products: streamed([
    card(7001, 'Harbour of Contoh — Giclée print', {
      status: { kind: 'from', price: idr(450000) },
      isReproduction: true,
      archiveNumber: 'A-0042',
      makerLine: 'Voorbeeld, 1718',
    }),
    card(7002, 'Harbour of Contoh — Tote', {
      status: { kind: 'price', price: idr(185000) },
      isReproduction: true,
      archiveNumber: 'A-0042',
      quickAdd: line(7002),
    }),
  ]),
  printFromArchive: { href: '/designs/harbour-of-contoh?format=giclee' },
  seo: seo('Harbour of Contoh', '/designs/harbour-of-contoh'),
  breadcrumbs: [{ label: 'Designs', href: '/designs' }],
}
