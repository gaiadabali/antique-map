/**
 * The admin roles drive's accounts and records (TASKS.md 3.6.d), written through the Local API the
 * way the server's own code writes them — orders and leads have no public create. Run by
 * `roles.spec.ts` (and by hand) with `payload run`, from the cms package, against the database
 * `DATABASE_URL` names; it prints one JSON line the spec reads. Idempotent: a second run finds
 * what the first made and adds nothing.
 *
 * - four accounts: the owner (the `hosts` spec's, so both specs share one), an editor, and two
 *   `store` users, each on a different store (the first two stores by code);
 * - five orders, marked by the buyer email `FIXTURE_EMAIL`: the first store's paid, processing and
 *   delivered ones, the second store's paid and awaiting-payment ones;
 * - three leads (two new, one closed), two draft antiques, and a condition grade and a maker for
 *   the owner's antique to be published with.
 */
import { createHash, randomBytes } from 'node:crypto'

import { ACCOUNTS, FIXTURE_EMAIL, PASSWORD } from './accounts'

type Doc = Record<string, unknown> & { id: number }
type Api = {
  find(args: object): Promise<{ docs: Doc[]; totalDocs: number }>
  create(args: object): Promise<Doc>
  destroy(): Promise<void>
}

async function main(): Promise<void> {
  process.env.PAYLOAD_SECRET ??= 'e2e-fixtures-dev-only-never-signs-anything'
  // Deferred: the config reads the environment as it loads.
  const { cms } = await import('../../../engine/packages/cms/src/instance')
  const payload = (await cms()) as unknown as Api
  const one = async (collection: string, where: object) =>
    (await payload.find({ collection, where, limit: 1, depth: 0, draft: true })).docs[0]

  let stores = (await payload.find({ collection: 'stores', sort: 'code', limit: 2, depth: 0 })).docs
  for (const code of ['E2E-A', 'E2E-B'].slice(stores.length)) {
    stores = [...stores, await payload.create({ collection: 'stores', data: { code, name: code } })]
  }
  const [storeA, storeB] = stores as [Doc, Doc]

  const users: Record<string, Doc> = {}
  for (const [key, account] of Object.entries(ACCOUNTS)) {
    const store = key === 'storeA' ? storeA.id : key === 'storeB' ? storeB.id : undefined
    users[key] =
      (await one('users', { email: { equals: account.email } })) ??
      (await payload.create({
        collection: 'users',
        data: { ...account, password: PASSWORD, ...(store ? { store } : {}) },
      }))
  }

  const product =
    (await one('products', {})) ??
    (await payload.create({
      collection: 'products',
      data: { sku: 'E2E-PRINT', name: 'E2E print', price: 95000, _status: 'draft' },
    }))

  if (!(await one('orders', { 'contact.email': { equals: FIXTURE_EMAIL } }))) {
    const last = (await payload.find({ collection: 'orders', sort: '-number', limit: 1 })).docs[0]
    let number = Math.max(Number(last?.number ?? 0), 900_000)
    const plan: [Doc, string][] = [
      [storeA, 'paid'],
      [storeA, 'processing'],
      [storeA, 'delivered'],
      [storeB, 'paid'],
      [storeB, 'pending_payment'],
    ]
    for (const [store, status] of plan) {
      number += 1
      await payload.create({
        collection: 'orders',
        data: {
          number,
          lines: [
            {
              product: product.id,
              sku: String(product.sku ?? 'E2E'),
              name: 'E2E line',
              unitPrice: 95000,
              qty: 1,
              lineTotal: 95000,
            },
          ],
          contact: { name: 'E2E buyer', whatsapp: '+6281234567890', email: FIXTURE_EMAIL },
          delivery: { address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
          store: store.id,
          totals: { subtotal: 95000, discount: 0, deliveryFee: 15000, total: 110000 },
          status,
          trackingTokenHash: createHash('sha256').update(randomBytes(16)).digest('hex'),
        },
      })
    }
  }

  if (!(await one('leads', { 'payload.email': { equals: FIXTURE_EMAIL } }))) {
    for (const status of ['new', 'new', 'closed']) {
      await payload.create({
        collection: 'leads',
        data: {
          kind: 'ask',
          site: 'shop',
          source: 'form',
          status,
          payload: { name: 'E2E visitor', email: FIXTURE_EMAIL, message: 'Is this available?' },
        },
      })
    }
  }

  // The vocabulary an antique is published with: a condition grade and a maker to credit.
  if (
    !(await one('terms', { and: [{ kind: { equals: 'grade' } }, { slug: { equals: 'e2e-vg' } }] }))
  ) {
    await payload.create({
      collection: 'terms',
      data: {
        kind: 'grade',
        label: 'E2E Very good',
        slug: 'e2e-vg',
        definition: 'Light toning, no tears.',
        equivalent: 'B+',
        _status: 'published',
      },
    })
  }
  if (!(await one('makers', { name: { equals: 'E2E Valentijn' } }))) {
    await payload.create({
      collection: 'makers',
      data: { name: 'E2E Valentijn', sortName: 'Valentijn, E2E', _status: 'published' },
    })
  }

  for (const title of ['E2E fixture: a chart of Java', 'E2E fixture: a view of Batavia']) {
    if (!(await one('works', { title: { equals: title } }))) {
      await payload.create({ collection: 'works', data: { title } })
    }
  }

  console.log(
    `E2E_FIXTURES ${JSON.stringify({
      stores: { a: { id: storeA.id, code: storeA.code }, b: { id: storeB.id, code: storeB.code } },
      users: Object.fromEntries(Object.entries(users).map(([key, user]) => [key, user.id])),
    })}`,
  )
  await payload.destroy()
}

// Awaited at the top: `payload run` ends the process once the module has evaluated.
try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
