/**
 * Database setup and reads for the shop fulfilment gate (TASKS.md 7.4.a), `GATE_DB=local` only —
 * `./helpers.ts`'s `runOps` spawns this with `payload run`, the op in `SHOPFUL_OP` (JSON) and the
 * answer written to `SHOPFUL_OUT` (`tests/e2e/shop/gate.spec.ts`'s own pattern for a child
 * process, since importing the CMS core straight into Playwright's Node process pulls in Next-only
 * subpath exports).
 *
 * `setup`: activates the two fixture stores at the given pin (so both are always in delivery
 * reach, whatever `E2E_PIN` is), picks two sellable, unvarianted, published products — making them
 * (7.4-r2) when the mock seed (`seed/shop/data/products.csv`) has fewer than two: every row there
 * carries an empty `image_files` (no real photography yet, AGENTS.md D19), so `--publish` rejects
 * every one of them ("Add at least one image before publishing") and a fresh worktree has none to
 * find. `ensureFixtureProducts` makes up the shortfall with a tiny generated image, through the
 * Local API exactly as a real catalogue row would be — the ticket's "use the fixture route
 * instead" (7.4.md's Verify). Then empties every other active store's stock of the two products
 * and stocks both fixture stores generously — so the nearest-store pick (`assign.ts`) always lands
 * on the fixture stores, and a reassignment between them always has stock to move. Also sets the
 * shop's WhatsApp number, so the tracking page's link always renders.
 *
 * `order-by-token`: the order a tracking token names, read the way a store or owner would (no
 * price tampering risk here — this is test setup, not a request path).
 *
 * `accounts`: the owner, editor, and two store users (`tests/e2e/admin/accounts.ts`'s own four) on
 * two fixture stores — found or made, idempotent. Its own op (7.4-r2) rather than
 * `tests/e2e/admin/fixtures.ts`'s `fixtures()`: that script also creates `terms` and `makers` rows,
 * which (since `291f012`, `vocabulary-invalidate.ts`) expire a cache tag with `after()` — and
 * `after()` throws outside a Next request, which every plain `payload run` is. `stores` and `users`
 * carry no such hook, so this op only ever touches those two.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ACCOUNTS, PASSWORD } from '../admin/accounts'

process.env.PAYLOAD_SECRET ??= 'e2e-shop-fulfilment-dev-only-never-signs-anything'

const here = dirname(fileURLToPath(import.meta.url))

/** The smallest valid PNG: a single transparent pixel — plenty for a product's required image. */
const FIXTURE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

type Doc = Record<string, unknown> & { id: number }
type FindResult = { docs: Doc[] }
type Api = {
  find(args: object): Promise<FindResult>
  create(args: object): Promise<Doc>
  update(args: object): Promise<Doc | FindResult>
  findGlobal(args: object): Promise<Record<string, unknown>>
  updateGlobal(args: object): Promise<unknown>
  destroy(): Promise<void>
}

type SetupOp = {
  readonly op: 'setup'
  readonly storeAId: number
  readonly storeBId: number
  readonly pinLat: number
  readonly pinLng: number
}
type OrderByTokenOp = { readonly op: 'order-by-token'; readonly token: string }
type AccountsOp = { readonly op: 'accounts' }
type Op = SetupOp | OrderByTokenOp | AccountsOp

const storeIdOf = (value: unknown): number =>
  typeof value === 'object' && value !== null ? (value as Doc).id : (value as number)

/** Writes the fixture pixel to disk once; `media`'s Local API create wants a real `filePath`. */
function fixtureImagePath(): string {
  const dir = join(here, '.ops-out')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'fixture.png')
  writeFileSync(path, Buffer.from(FIXTURE_PNG_BASE64, 'base64'))
  return path
}

/** The one `media` row every fixture product's `images` points at — found or made, never twice. */
async function ensureFixtureImage(payload: Api): Promise<number> {
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { equals: 'fixture.png' } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0].id
  const created = await payload.create({
    collection: 'media',
    data: {
      alt: 'Shop fulfilment gate fixture image',
      subject: 'product',
      role: 'flat',
      provenance: 'photograph',
    },
    filePath: fixtureImagePath(),
  })
  return created.id
}

/** Makes `need` more published, unvarianted, sellable products — see the file header. */
async function ensureFixtureProducts(payload: Api, need: number): Promise<Doc[]> {
  const { docs: terms } = await payload.find({ collection: 'terms', limit: 1, depth: 0 })
  const category = terms[0]?.id
  if (category === undefined) {
    throw new Error('shop-fulfilment ops: no term on record for a fixture product’s category')
  }
  const image = await ensureFixtureImage(payload)
  const made: Doc[] = []
  for (let i = 1; made.length < need; i++) {
    const sku = `E2E-FULFIL-${i}`
    const { docs: existing } = await payload.find({
      collection: 'products',
      where: { sku: { equals: sku } },
      limit: 1,
      depth: 0,
    })
    made.push(
      existing[0] ??
        (await payload.create({
          collection: 'products',
          data: {
            sku,
            name: `E2E fulfilment fixture ${i}`,
            category,
            price: 150_000,
            images: [{ image }],
            _status: 'published',
          },
        })),
    )
  }
  return made
}

async function sellableProducts(payload: Api, count: number): Promise<Doc[]> {
  const { docs } = await payload.find({
    collection: 'products',
    where: { _status: { equals: 'published' } },
    sort: 'id',
    limit: 200,
    depth: 0,
  })
  const plain = docs.filter((doc) => !Array.isArray(doc.variants) || doc.variants.length === 0)
  if (plain.length >= count) return plain.slice(0, count)
  return [...plain, ...(await ensureFixtureProducts(payload, count - plain.length))]
}

async function zeroElsewhere(
  payload: Api,
  productId: number,
  keepStoreIds: readonly number[],
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'stock-levels',
    where: { and: [{ product: { equals: productId } }, { variantSku: { equals: null } }] },
    limit: 1000,
    depth: 0,
  })
  for (const row of docs) {
    if (!keepStoreIds.includes(storeIdOf(row.store))) {
      await payload.update({ collection: 'stock-levels', id: row.id, data: { physicalCount: 0 } })
    }
  }
}

async function stockFor(
  payload: Api,
  storeId: number,
  productId: number,
  physicalCount: number,
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'stock-levels',
    where: {
      and: [
        { store: { equals: storeId } },
        { product: { equals: productId } },
        { variantSku: { equals: null } },
      ],
    },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) {
    await payload.update({ collection: 'stock-levels', id: docs[0].id, data: { physicalCount } })
  } else {
    await payload.create({
      collection: 'stock-levels',
      data: { store: storeId, product: productId, physicalCount },
    })
  }
}

async function setup(payload: Api, op: SetupOp): Promise<Record<string, unknown>> {
  await payload.update({
    collection: 'stores',
    where: { id: { in: [op.storeAId, op.storeBId] } },
    data: {
      active: true,
      address: 'Jl. Raya Ubud 1 (e2e fixture)',
      lat: op.pinLat,
      lng: op.pinLng,
    },
  })
  const products = await sellableProducts(payload, 2)
  for (const product of products) {
    await zeroElsewhere(payload, product.id, [op.storeAId, op.storeBId])
    await stockFor(payload, op.storeAId, product.id, 999)
    await stockFor(payload, op.storeBId, product.id, 999)
  }
  // The owner's delivery table: `deliveryFeeFor` refuses every checkout (`no_delivery_table`)
  // without at least one band — a fresh worktree's seed leaves it empty (`seed/vocabulary/seed.ts`'s
  // `SETTINGS_DEFAULTS`), so this fixture sets a working one rather than hand-editing the database
  // out of band. Reach (30 km) and threshold (Rp 500.000) match the 6.5.c gate's own worktree.
  const settings = (await payload.findGlobal({ slug: 'site-settings' })) as {
    shop?: Record<string, unknown> & {
      contact?: Record<string, unknown>
      delivery?: { bands?: unknown[]; freeOverIdr?: number | null }
    }
  }
  const shop = settings.shop ?? {}
  const hasBands = Array.isArray(shop.delivery?.bands) && shop.delivery!.bands!.length > 0
  // Outside a request: the settings hook's cache tags go to a collector (`@engine/cache`).
  const { invalidationBatch } = await import('../../../engine/packages/cache/src/index')
  await invalidationBatch().operation((context) =>
    payload.updateGlobal({
      slug: 'site-settings',
      context,
      data: {
        shop: {
          ...shop,
          contact: { ...shop.contact, whatsapp: '+6281234567890' },
          delivery: hasBands
            ? shop.delivery
            : {
                bands: [
                  { upToKm: 5, feeIdr: 10_000 },
                  { upToKm: 15, feeIdr: 15_000 },
                  { upToKm: 30, feeIdr: 20_000 },
                ],
                freeOverIdr: 500_000,
              },
        },
      },
    }),
  )
  return { products: products.map((product) => ({ id: product.id, slug: String(product.slug) })) }
}

async function orderByToken(payload: Api, op: OrderByTokenOp): Promise<Record<string, unknown>> {
  const { trackingTokenHash } = await import('../../../engine/packages/cms/src/shop/orders')
  const hash = trackingTokenHash(op.token)
  const { docs } = await payload.find({
    collection: 'orders',
    where: { trackingTokenHash: { equals: hash } },
    limit: 1,
    depth: 0,
  })
  const order = docs[0]
  if (!order) return { found: false }
  return {
    found: true,
    id: order.id,
    number: order.number,
    status: order.status,
    storeId: storeIdOf(order.store),
  }
}

async function ensureAccounts(payload: Api): Promise<Record<string, unknown>> {
  const one = async (collection: string, where: object): Promise<Doc | undefined> =>
    (await payload.find({ collection, where, limit: 1, depth: 0 })).docs[0]

  const codes = ['E2E-A', 'E2E-B'] as const
  const stores: Record<string, Doc> = {}
  for (const code of codes) {
    stores[code] =
      (await one('stores', { code: { equals: code } })) ??
      (await payload.create({ collection: 'stores', data: { code, name: code } }))
  }
  const storeA = stores['E2E-A']!
  const storeB = stores['E2E-B']!

  const users: Record<string, number> = {}
  for (const [key, account] of Object.entries(ACCOUNTS)) {
    const store = key === 'storeA' ? storeA.id : key === 'storeB' ? storeB.id : undefined
    const existing = await one('users', { email: { equals: account.email } })
    const user =
      existing ??
      (await payload.create({
        collection: 'users',
        data: { ...account, password: PASSWORD, ...(store ? { store } : {}) },
      }))
    users[key] = user.id
  }

  return {
    stores: { a: { id: storeA.id, code: storeA.code }, b: { id: storeB.id, code: storeB.code } },
    users,
  }
}

async function main(): Promise<void> {
  // `runOps` spawns this with only `DATABASE_URL` and the op itself set — the worktree's own S3
  // (media storage, `ensureFixtureImage`) and other `.env.local` values are never passed through,
  // the same gap the seed CLI closes for itself (`seed/env.ts`'s own header).
  const { seedEnv } = await import('../../../engine/packages/cms/src/seed/env')
  seedEnv()
  // Deferred: the config reads the environment as it loads.
  const { cms } = await import('../../../engine/packages/cms/src/instance')
  const payload = (await cms()) as unknown as Api
  const op = JSON.parse(process.env.SHOPFUL_OP ?? '{}') as Op

  const result =
    op.op === 'setup'
      ? await setup(payload, op)
      : op.op === 'order-by-token'
        ? await orderByToken(payload, op)
        : op.op === 'accounts'
          ? await ensureAccounts(payload)
          : (() => {
              throw new Error(`shop-fulfilment ops: unknown op ${JSON.stringify(op)}`)
            })()

  writeFileSync(process.env.SHOPFUL_OUT!, JSON.stringify(result))
  await payload.destroy()
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
