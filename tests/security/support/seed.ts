/**
 * The records the security suite probes (`./stack.ts`): one in every collection, a second of the
 * store-scoped ones, written through the Local API (access overridden: the server's own hand) and
 * the two upload collections straight through the adapter (their files and buckets are 8.3's).
 */
import type { Payload } from 'payload'

import {
  makeOrder,
  makeProduct,
} from '../../../engine/packages/cms/src/collections/stock-levels/shop.test-support'
import {
  vocabulary,
  type Api,
} from '../../../engine/packages/cms/src/collections/works/works.test-support'

export type Doc = { id: number } & Record<string, unknown>

export async function seedRecords(input: {
  raw: Payload
  api: Api
  make: (collection: string, data: Record<string, unknown>) => Promise<Doc>
  stores: { A: Doc; B: Doc }
  password: string
}) {
  const { raw, api, make, stores, password } = input
  const seeded: Record<string, Doc> = {}
  seeded.stores = stores.A
  // A bystander no role of the suite is: the row a refused write is aimed at.
  seeded.users = await make('users', {
    email: 'bystander@security.test',
    password,
    name: 'Bystander',
    role: 'store',
    store: stores.B.id,
  })

  // The catalogue: a vocabulary, a published work (asking price and acquisition set) and a draft.
  const vocab = await vocabulary(api)
  seeded.makers = { id: vocab.maker }
  seeded.places = { id: vocab.place }
  seeded.terms = { id: vocab.grade }
  const media = (await raw.db.create({
    collection: 'media',
    data: {
      alt: { en: 'A recto' },
      altSource: { en: 'cataloguer' },
      subject: 'work',
      role: 'recto',
      provenance: 'photograph',
      filename: 'recto-security.jpg',
      mimeType: 'image/jpeg',
    },
  })) as unknown as Doc
  seeded.media = media
  seeded.masters = (await raw.db.create({
    collection: 'masters',
    data: {
      kind: 'capture',
      storageKey: 'masters/intake/batch/security.tif',
      checksum: '9'.repeat(64),
      role: 'recto',
      provenance: 'photograph',
      intake: { verdict: 'pass' },
    },
  })) as unknown as Doc
  const published = await make('works', {
    title: 'Bali by François Valentijn, c. 1726',
    objectType: 'map',
    date: { precision: 'circa', from: 1726 },
    makers: [{ maker: vocab.maker, role: 'cartographer', certainty: 'certain' }],
    condition: { grade: vocab.grade },
    images: [{ media: media.id }],
    askingPrice: 18_000,
    physical: {
      exportStatus: 'domestic-only',
      coaIssued: true,
      acquisition: { source: 'Estate sale', cost: { amount: 1_500_000, currency: 'IDR' } },
    },
    _status: 'published',
  })
  const draft = await make('works', { title: 'Unpublished drawer find' })
  seeded.works = published
  const work = { published, draft }

  // The shop: a product, a stock row and an order at each store.
  const product = await makeProduct(raw, 'SEC-MUG')
  seeded.products = product
  const stock = {
    A: await make('stock-levels', { store: stores.A.id, product: product.id, quantity: 5 }),
    B: await make('stock-levels', { store: stores.B.id, product: product.id, quantity: 7 }),
  }
  seeded['stock-levels'] = stock.A
  const orders = {
    A: await makeOrder(raw, { store: stores.A.id, product: product.id, qty: 1 }),
    B: await makeOrder(raw, { store: stores.B.id, product: product.id, qty: 1 }),
  }
  seeded.orders = orders.A
  seeded['payment-events'] = await make('payment-events', {
    dedupeKey: 'b'.repeat(64),
    source: 'simulate',
    transactionStatus: 'settlement',
    grossAmount: 110000,
    outcome: 'paid',
    receivedAt: new Date().toISOString(),
  })

  // The owner's own records and the site's pages.
  seeded.leads = await make('leads', {
    kind: 'ask',
    site: 'gallery',
    source: 'form',
    payload: { name: 'A. Visitor', whatsapp: '+6281234567890' },
  })
  seeded.partners = await make('partners', { name: 'Hotel Test', kind: 'hotel', site: 'shop' })
  seeded.discounts = await make('discounts', { code: 'SEC10', kind: 'percent', value: 10 })
  seeded.events = await make('events', {
    site: 'shop',
    name: 'page.viewed',
    at: new Date().toISOString(),
    day: '2026-10-03',
    source: 'server',
    path: '/',
  })
  seeded['chat-sessions'] = await make('chat-sessions', {
    site: 'gallery',
    locale: 'en',
    startedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
  })
  seeded.pages = await make('pages', {
    site: 'gallery',
    kind: 'page',
    title: 'About',
    slug: 'about',
    _status: 'published',
  })
  seeded.redirects = await make('redirects', {
    site: 'gallery',
    from: '/old-security',
    to: '/new-security',
    code: '301',
    source: 'editor',
  })
  return { seeded, work, stock, orders }
}
