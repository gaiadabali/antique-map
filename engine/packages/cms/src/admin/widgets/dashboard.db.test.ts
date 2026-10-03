/**
 * The dashboard widgets' counts on a real, pushed Postgres (TASKS.md 3.6.c): a store user's
 * "orders to act on" includes only their own store's, and delivered orders — needing nobody's
 * action any more — are out; "new leads" is the owner's panel, nobody else's. The widgets are
 * the real components: the count each one renders is what it found through the Local API with
 * `overrideAccess: false`, so access, not the widget, scopes the numbers.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeOrder, makeProduct } from '../../collections/stock-levels/shop.test-support'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'

import { NewLeadsWidget, OrdersToActOnWidget } from './dashboard'

/** The number a widget rendered: the count is the numeric child of its markup. */
function countShown(element: unknown): number | undefined {
  const children = (element as { props: { children: unknown } }).props.children
  const flat = Array.isArray(children) ? children : [children]
  return flat.filter((child) => typeof child === 'number')[0]
}

/** The widget's own view: a Local-API request carrying the role's user, access enforced. */
const as = (payload: Payload, user: unknown) => ({ req: { payload, user }, locale: 'en' })

describe.skipIf(!server)('dashboard widgets, on a real database', () => {
  let stack: StaffStack
  let own: number
  let other: number

  beforeAll(async () => {
    stack = await startStaffStack('cms_dash_test', (config, key) => getPayload({ config, key }))
    own = stack.stores[0].id
    other = stack.stores[1].id
    const product = (await makeProduct(stack.payload, 'OEI-MUG')).id
    // The store user's store: one order to act on, one delivered (done with). The other
    // store: one order to act on that must never reach the store user's count.
    await makeOrder(stack.payload, { store: own, product, qty: 1, status: 'paid' })
    await makeOrder(stack.payload, { store: own, product, qty: 2, status: 'delivered' })
    await makeOrder(stack.payload, { store: other, product, qty: 1, status: 'paid' })
    await stack.payload.create({
      collection: 'leads',
      data: { kind: 'ask', site: 'shop', source: 'form', status: 'new' } as never,
    })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it("a store user's order count includes only their store", async () => {
    const user = { collection: 'users', role: 'store', store: own }
    const element = await OrdersToActOnWidget(as(stack.payload, user) as never)
    expect(countShown(element)).toBe(1)
  })

  it('an order that needs nobody any more is out of the count', async () => {
    const user = { collection: 'users', role: 'owner' }
    const element = await OrdersToActOnWidget(as(stack.payload, user) as never)
    // Both stores' paid orders, never the delivered one.
    expect(countShown(element)).toBe(2)
  })

  it('new leads are the owner panel: a store user sees none', async () => {
    const store = await NewLeadsWidget(
      as(stack.payload, { collection: 'users', role: 'store', store: own }) as never,
    )
    const editor = await NewLeadsWidget(
      as(stack.payload, { collection: 'users', role: 'editor' }) as never,
    )
    const owner = await NewLeadsWidget(
      as(stack.payload, { collection: 'users', role: 'owner' }) as never,
    )
    expect(countShown(store)).toBe(0)
    expect(countShown(editor)).toBe(0)
    expect(countShown(owner)).toBe(1)
  })
})
