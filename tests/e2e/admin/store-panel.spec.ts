/**
 * The store staff's order screens (TASKS.md 7.2.c, 27.3; CONTENT-OPERATIONS.md §5.1), driven at
 * 390 px on a production build: a store user moves a fresh `paid` order from the inbox's "Needs
 * action" with the order page's one next-step button — `paid → processing → waiting_driver`,
 * the driver's photo, `on_the_way → delivered` — each step timed; another store's user sees an
 * empty inbox; as the owner, reassigning one order to a store that holds every item, with a reason. Accounts and stores
 * are `fixtures.ts`'s; the orders are `store-panel-fixtures.ts`'s own, fresh every run.
 */
import { expect, test } from '@playwright/test'

import { ACCOUNTS } from './accounts'
import { signIn } from './admin'
import { record, shot } from './evidence-72'
import { fixtures, sql, type Fixtures } from './local.mjs'
import { paidOrders } from './order-fixtures'

/** A fresh `paid` order at each fixture store (`./order-fixtures`). */
const storePanelOrders = paidOrders

test.use({ viewport: { width: 390, height: 844 } })

// beforeAll makes this file's own orders and their stock rows (not idempotent: a second worker
// doing it at once collides on the stock row's unique key), and the cases share them. So the file
// runs in one worker, in order, even under `fullyParallel`.
test.describe.configure({ mode: 'default' })

let fx: Fixtures
let orders: { mine: number; other: number }
test.beforeAll(() => {
  fx = fixtures()
  orders = storePanelOrders(fx.stores.a.id, fx.stores.b.id)
})

const timings: Record<string, number> = {}
test.afterAll(async () => {
  await record('storePanel', {
    secondsPerStep: timings,
    totalSeconds: Math.round(Object.values(timings).reduce((sum, each) => sum + each, 0) * 10) / 10,
  })
})

function timed(name: string, run: (page: import('@playwright/test').Page) => Promise<void>) {
  test(name, async ({ page }) => {
    const started = Date.now()
    await run(page)
    timings[name] = Math.round((Date.now() - started) / 100) / 10
  })
}

test.describe.serial('the store panel, at 390 px', () => {
  timed('a store user sees the fresh order as new, and accepts it', async (page) => {
    await signIn(page, ACCOUNTS.storeA.email)
    await page.goto('/admin/orders')
    await expect(
      page.getByText(`#${sql(`SELECT number FROM orders WHERE id = ${orders.mine}`)}`),
    ).toBeVisible()
    await page.screenshot({ path: shot('store-panel-queue-390') })
    await page.goto(`/admin/orders/${orders.mine}`)
    await page.getByRole('button', { name: /^Start packing$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('processing')
  })

  timed('the store user books the driver', async (page) => {
    await signIn(page, ACCOUNTS.storeA.email)
    await page.goto(`/admin/orders/${orders.mine}`)
    await page.getByRole('button', { name: /^Packed — book a driver$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('waiting_driver')
  })

  timed('the store user uploads the driver’s details', async (page) => {
    // The picture is stored in the private bucket (`?error=storage_unavailable` without one):
    // CI's server has no object storage, so this runs where it has (`E2E_OBJECT_STORAGE=1`, the
    // dev stack's MinIO or staging); staging's rehearsal covers the same step.
    test.skip(process.env.E2E_OBJECT_STORAGE !== '1', 'needs object storage (E2E_OBJECT_STORAGE=1)')
    await signIn(page, ACCOUNTS.storeA.email)
    await page.goto(`/admin/orders/${orders.mine}`)
    const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } })
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'driver.png', mimeType: 'image/png', buffer: photo })
    await page.getByRole('button', { name: /Add driver details/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT driver_image_key FROM orders WHERE id = ${orders.mine}`)).not.toBe('')
    await page.screenshot({ path: shot('store-panel-driver-image-390') })
  })

  timed('the store user marks it on the way, then delivered', async (page) => {
    // "On the way" needs the driver's details the step above stores (private bucket): same gate.
    test.skip(process.env.E2E_OBJECT_STORAGE !== '1', 'needs object storage (E2E_OBJECT_STORAGE=1)')
    await signIn(page, ACCOUNTS.storeA.email)
    await page.goto(`/admin/orders/${orders.mine}`)
    await page.getByRole('button', { name: /^Driver collected it$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('on_the_way')

    await page.getByRole('button', { name: /^Mark delivered$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('delivered')
    await page.screenshot({ path: shot('store-panel-delivered-390') })
  })
})

test('another store’s user sees an empty list for this order', async ({ page }) => {
  await signIn(page, ACCOUNTS.storeB.email)
  const number = sql(`SELECT number FROM orders WHERE id = ${orders.mine}`)
  await page.goto('/admin/orders')
  await expect(page.getByText(`#${number}`)).toHaveCount(0)
  // Not even by its exact number: the search runs as the store user too.
  await page.goto(`/admin/orders?q=${number}`)
  await expect(page.getByText(`#${number}`)).toHaveCount(0)
  await page.screenshot({ path: shot('store-panel-other-store-empty-390') })
})

test('the owner reassigns an order to another store', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  await page.goto(`/admin/orders/${orders.other}`)
  await page.getByRole('link', { name: /^Reassign$/ }).click()
  await page.locator(`input[name="toStoreId"][value="${fx.stores.a.id}"]`).check()
  await page.getByLabel(/Why move it?/).fill('Store B is closed today.')
  await page.getByRole('button', { name: /^Confirm reassignment$/ }).click()
  await page.waitForURL(`**/admin/orders/${orders.other}`)
  expect(sql(`SELECT store_id FROM orders WHERE id = ${orders.other}`)).toBe(String(fx.stores.a.id))
  await page.screenshot({ path: shot('owner-reassign-390') })
})
