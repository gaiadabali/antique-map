/**
 * Database setup and reads for the shop fulfilment gate (TASKS.md 7.4.a), `GATE_DB=local` only —
 * `./helpers.ts`'s `runOps` spawns this with `payload run`, the op in `SHOPFUL_OP` (JSON) and the
 * answer written to `SHOPFUL_OUT` (`tests/e2e/shop/gate.spec.ts`'s own pattern for a child
 * process, since importing the CMS core straight into Playwright's Node process pulls in Next-only
 * subpath exports).
 *
 * `setup`: activates the two fixture stores at the given pin (so both are always in delivery
 * reach, whatever `E2E_PIN` is), picks two sellable, unvarianted, published products, empties
 * every other active store's stock of them, and stocks both fixture stores generously — so the
 * nearest-store pick (`assign.ts`) always lands on the fixture stores, and a reassignment between
 * them always has stock to move. Also sets the shop's WhatsApp number, so the tracking page's
 * link always renders.
 *
 * `order-by-token`: the order a tracking token names, read the way a store or owner would (no
 * price tampering risk here — this is test setup, not a request path).
 */
import { writeFileSync } from 'node:fs'

process.env.PAYLOAD_SECRET ??= 'e2e-shop-fulfilment-dev-only-never-signs-anything'

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
type Op = SetupOp | OrderByTokenOp

const storeIdOf = (value: unknown): number =>
  typeof value === 'object' && value !== null ? (value as Doc).id : (value as number)

async function sellableProducts(payload: Api, count: number): Promise<Doc[]> {
  const { docs } = await payload.find({
    collection: 'products',
    where: { _status: { equals: 'published' } },
    sort: 'id',
    limit: 200,
    depth: 0,
  })
  const plain = docs.filter((doc) => !Array.isArray(doc.variants) || doc.variants.length === 0)
  if (plain.length < count) {
    throw new Error(
      `shop-fulfilment ops: need ${count} unvarianted published products, found ${plain.length}`,
    )
  }
  return plain.slice(0, count)
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

async function main(): Promise<void> {
  // Deferred: the config reads the environment as it loads.
  const { cms } = await import('../../../engine/packages/cms/src/instance')
  const payload = (await cms()) as unknown as Api
  const op = JSON.parse(process.env.SHOPFUL_OP ?? '{}') as Op

  const result =
    op.op === 'setup'
      ? await setup(payload, op)
      : op.op === 'order-by-token'
        ? await orderByToken(payload, op)
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
