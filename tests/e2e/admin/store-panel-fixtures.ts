/**
 * A fresh `paid` order at each fixture store (TASKS.md 7.2.c), for `store-panel.spec.ts`'s timed
 * drive: one at the first store (`fixtures.ts`'s store A — the one the drive moves end to end) and
 * one at the second (store B — so the isolation check has something to find none of). Not
 * idempotent: every run makes a new order, the way a real sale would, so a re-run's drive has its
 * own order to move.
 *
 * Run the way `fixtures.ts` is (`payload run`); prints `E2E_STORE_PANEL {"mine":1,"other":2}`.
 * Args: `<storeAId> <storeBId>`.
 */
import { createHash, randomBytes } from 'node:crypto'

type Doc = Record<string, unknown> & { id: number }
type Api = {
  find(args: object): Promise<{ docs: Doc[] }>
  create(args: object): Promise<Doc>
  update(args: object): Promise<Doc>
  destroy(): Promise<void>
}

async function main(): Promise<void> {
  process.env.PAYLOAD_SECRET ??= 'e2e-fixtures-dev-only-never-signs-anything'
  const [storeAId, storeBId] = process.argv.slice(2).map(Number)
  if (!Number.isInteger(storeAId) || !Number.isInteger(storeBId)) {
    throw new Error('store-panel-fixtures: usage: <storeAId> <storeBId>')
  }
  // Deferred: the config reads the environment as it loads.
  const { cms } = await import('../../../engine/packages/cms/src/instance')
  const payload = (await cms()) as unknown as Api

  const product = (await payload.find({ collection: 'products', limit: 1, depth: 0 })).docs[0]
  if (!product) throw new Error('store-panel-fixtures: no product — run fixtures.ts first')

  // Reassignment needs an active store with an address and a pin (`reassignOrder`'s
  // `store_unavailable`; the database's `stores_active_has_address_and_pin`) — the roles drive's
  // `fixtures.ts` makes its stores with none of those.
  const activated = await payload.update({
    collection: 'stores',
    where: { id: { in: [storeAId, storeBId] } },
    data: { active: true, address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
  })
  const errors = (activated as unknown as { errors?: readonly { message: string }[] }).errors ?? []
  if (errors.length > 0) {
    throw new Error(`store-panel-fixtures: activating stores failed: ${JSON.stringify(errors)}`)
  }

  // Reassigning to a store needs it to be able to fill every line (`reassignOrder`'s
  // `not_enough_stock`): a stock-levels row for the product at each store, if not already there.
  for (const storeId of [storeAId, storeBId]) {
    const existing = (
      await payload.find({
        collection: 'stock-levels',
        where: { and: [{ store: { equals: storeId } }, { product: { equals: product.id } }] },
        limit: 1,
        depth: 0,
      })
    ).docs[0]
    if (!existing) {
      await payload.create({
        collection: 'stock-levels',
        data: { store: storeId, product: product.id, physicalCount: 50 },
      })
    }
  }

  const last = (await payload.find({ collection: 'orders', sort: '-number', limit: 1 })).docs[0]
  let number = Math.max(Number(last?.number ?? 0), 900_000)

  const orderAt = async (storeId: number): Promise<Doc> => {
    number += 1
    return payload.create({
      collection: 'orders',
      data: {
        number,
        lines: [
          {
            product: product.id,
            sku: 'E2E-STORE-PANEL',
            name: 'E2E store panel line',
            unitPrice: 95_000,
            qty: 1,
            lineTotal: 95_000,
          },
        ],
        contact: {
          name: 'E2E store panel buyer',
          whatsapp: '+6281234567890',
          email: 'e2e-store-panel@example.test',
        },
        delivery: { address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
        store: storeId,
        totals: { subtotal: 95_000, discount: 0, deliveryFee: 15_000, total: 110_000 },
        status: 'paid',
        trackingTokenHash: createHash('sha256').update(randomBytes(16)).digest('hex'),
      },
    })
  }

  const mine = await orderAt(storeAId)
  const other = await orderAt(storeBId)

  console.log(`E2E_STORE_PANEL ${JSON.stringify({ mine: mine.id, other: other.id })}`)
  await payload.destroy()
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
