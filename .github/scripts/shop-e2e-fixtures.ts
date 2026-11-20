/**
 * The shop app's e2e records (TASKS.md 24.3.b), written into the shop's own database through
 * cms-shop's Local API after `shop-e2e-db.sh seed` has run the shop's seed layers — what
 * `docs/gates/v2-shop.md` §How it was run lists, and what `tests/e2e/shop-app/**` reads:
 *
 * - the four staff accounts of `tests/e2e/admin/accounts.ts`, the two store users on the first
 *   two stores by code;
 * - three paid orders across those two stores (the store-scoping spec);
 * - one picture (a committed seed image) on every draft product, which then publishes (a product
 *   with no picture cannot), so the storefront has a catalogue;
 * - the first two published products made from an original — `M.0232` (the gallery publishes it)
 *   and `M.9999` (it does not) — for the originals spec;
 * - the first mock product's slug fixed, so `lighthouserc.shop.json` names its page.
 *
 * Idempotent: a second run finds what the first made. Run with `payload run` from cms-shop:
 *
 *   pnpm --filter @engine/cms-shop exec payload run "$PWD/.github/scripts/shop-e2e-fixtures.ts"
 *
 * The database is `DATABASE_URL`, else `indies_shop_<DB_SUFFIX>` (cms-shop's `seed/env`).
 */
import { createHash, randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const at = (path: string) => `file:///${resolve(ROOT, path).replace(/\\/g, '/')}`

/** The product the Lighthouse config audits (`lighthouserc.shop.json`). */
const LIGHTHOUSE = { sku: 'SEED-SHOP-001', slug: 'greeting-card-set-frangipani' }
const PICTURE = 'engine/packages/cms/src/seed/gallery/data/images/2-5.jpg'
const ORIGINALS = ['M.0232', 'M.9999']

type Doc = Record<string, unknown> & { id: number }

const { seedEnv } = await import(at('engine/packages/cms-shop/src/seed/env.ts'))
seedEnv(process.env, 'shop')
const { shopCms } = await import(at('engine/packages/cms-shop/src/instance.ts'))
const { cliInvalidation } = await import(at('engine/packages/cms-core/src/import/cli-cache.ts'))
const { ACCOUNTS, PASSWORD } = await import(at('tests/e2e/admin/accounts.ts'))

const payload = await shopCms()
// Outside a request the cache hooks hand their tags to the CLI's collector; nothing serves yet.
const context = cliInvalidation().context()
const write = { overrideAccess: true, context }
const first = async (collection: string, where: object): Promise<Doc | undefined> =>
  (await payload.find({ collection, where, limit: 1, depth: 0, draft: true, overrideAccess: true }))
    .docs[0] as Doc | undefined

// Stores and staff.
let stores = (await payload.find({ collection: 'stores', sort: 'code', limit: 2, depth: 0 }))
  .docs as Doc[]
for (const code of ['E2E-A', 'E2E-B'].slice(stores.length)) {
  stores = [
    ...stores,
    await payload.create({ collection: 'stores', data: { code, name: code }, ...write }),
  ]
}
const [storeA, storeB] = stores as [Doc, Doc]
for (const [key, account] of Object.entries(ACCOUNTS) as [string, Record<string, string>][]) {
  if (await first('users', { email: { equals: account.email } })) continue
  const store = key === 'storeA' ? storeA.id : key === 'storeB' ? storeB.id : undefined
  await payload.create({
    collection: 'users',
    data: { ...account, password: PASSWORD, ...(store ? { store } : {}) },
    ...write,
  })
}

// One picture on every draft product but the orders' own (`E2E-` SKUs stay drafts), published.
// Found again by its alt text: Payload renames an upload whose name is already on the disk.
const ALT = 'South East Asia — the whole sheet (e2e)'
let picture = await first('media', { alt: { equals: ALT } })
picture ??= (await payload.create({
  collection: 'media',
  data: {
    alt: ALT,
    subject: 'product',
    role: 'flat',
    provenance: 'photograph',
  },
  filePath: resolve(ROOT, PICTURE),
  ...write,
})) as Doc
const drafts = await payload.find({
  collection: 'products',
  where: { _status: { equals: 'draft' } },
  draft: true,
  limit: 500,
  depth: 0,
  overrideAccess: true,
})
for (const product of (drafts.docs as Doc[]).filter(
  (each) => !String(each.sku).startsWith('E2E-'),
)) {
  const slug = product.sku === LIGHTHOUSE.sku ? { slug: LIGHTHOUSE.slug } : {}
  await payload.update({
    collection: 'products',
    id: product.id,
    data: { images: [{ image: picture.id }], ...slug, _status: 'published' },
    ...write,
  })
}

// Two products made from an original.
if (!(await first('products', { originalStockNumber: { exists: true } }))) {
  const two = await payload.find({
    collection: 'products',
    where: { _status: { equals: 'published' }, sku: { not_equals: LIGHTHOUSE.sku } },
    sort: 'id',
    limit: 2,
    depth: 0,
    overrideAccess: true,
  })
  for (const [index, product] of (two.docs as Doc[]).entries()) {
    const data = { originalStockNumber: ORIGINALS[index] }
    await payload.update({ collection: 'products', id: product.id, data, ...write })
  }
}

// Three paid orders over the two stores, on a draft product of their own (`E2E-` SKUs are skipped
// by the purchase spec's product list).
const line = { sku: 'E2E-PRINT', name: 'E2E print', unitPrice: 95000, qty: 1, lineTotal: 95000 }
let product = await first('products', { sku: { equals: line.sku } })
product ??= (await payload.create({
  collection: 'products',
  data: { sku: line.sku, name: line.name, price: line.unitPrice, _status: 'draft' },
  draft: true,
  ...write,
})) as Doc
if ((await payload.count({ collection: 'orders', overrideAccess: true })).totalDocs === 0) {
  let number = 100001
  for (const store of [storeA, storeB, storeA]) {
    await payload.create({
      collection: 'orders',
      data: {
        number: number++,
        lines: [{ product: product.id, ...line }],
        contact: {
          name: `Buyer at ${String(store.code)}`,
          whatsapp: '+6281234567890',
          email: 'e2e-fixture@example.test',
          locale: 'en',
        },
        delivery: { address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
        store: store.id,
        totals: { subtotal: 95000, discount: 0, deliveryFee: 15000, total: 110000 },
        status: 'paid',
        trackingTokenHash: createHash('sha256').update(randomBytes(16)).digest('hex'),
      },
      ...write,
    })
  }
}
// The orders above carry their own numbers, so the sequence a checkout draws from must start past
// them, or the first purchase collides on `orders_number_idx`.
await (payload.db as unknown as { pool: { query: (text: string) => Promise<unknown> } }).pool.query(
  "SELECT setval('orders_number_seq', GREATEST((SELECT COALESCE(MAX(number), 0) FROM orders), 100000))",
)

const count = async (collection: string, where?: object) =>
  (await payload.count({ collection, where, overrideAccess: true })).totalDocs
console.log(
  JSON.stringify({
    users: await count('users'),
    stores: await count('stores'),
    published: await count('products', { _status: { equals: 'published' } }),
    originals: await count('products', { originalStockNumber: { exists: true } }),
    orders: await count('orders'),
    lighthouse: (await first('products', { sku: { equals: LIGHTHOUSE.sku } }))?.slug,
  }),
)
process.exit(0)
