/**
 * One door for orders (TASKS.md 27.3.e), on a production build: the inbox and the order page at
 * 390 and 1280 px, axe clean for what this task adds (`.od-*`, the order page's cards) with
 * Payload's own F6 debt counted apart, as 27.2 does; then two timed walks at a person's pace — a
 * store user from the inbox to Delivered (≤ 0:45), and the owner's reassignment (≤ 0:30). "A
 * person's pace" is the walk with a reading pause before every decision (`PACE`, 1.5 s), so the
 * time is the screens' and the server's plus a person reading them, not a robot's clicks alone.
 *
 * The driver's photo goes to the private bucket: this needs object storage (`E2E_OBJECT_STORAGE=1`,
 * the dev stack's MinIO), as `store-panel.spec.ts`'s photo step does. Screenshots go to
 * `P27_SHOTS` (default: Playwright's output folder), never the repo.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS } from './accounts'
import { signIn } from './admin'
import { fixtures, sql, type Fixtures } from './local.mjs'
import { paidOrders } from './order-fixtures'

test.describe.configure({ mode: 'serial' })

const PACE = 1_500
const shots = (name: string) => `${process.env.P27_SHOTS ?? test.info().outputDir}/${name}.png`

/** What this task adds: every node must be axe clean, with no exception. */
const OURS = ['.od-search', '.od-tabs', '.ix-list', '.od-order', '.od-stores', '.od-slip']
/** Payload's own admin markup (F6, `docs/gates/foundation.md`), excused and counted, as 27.2. */
const F6 =
  /rs__|react-select|popup-button|popup__trigger|doc-tabs|doc-header|doc-controls|clickable-arrow|#select-all|^label: #_R_|^landmark-|^region: /

async function axeClean(page: Page, label: string): Promise<void> {
  const scoped = new AxeBuilder({ page })
  let present = 0
  for (const selector of OURS) {
    if ((await page.locator(selector).count()) === 0) continue
    scoped.include(selector)
    present += 1
  }
  expect(present, 'the parts this task adds are on the page').toBeGreaterThan(0)
  const ours = await scoped.analyze()
  expect(
    ours.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`)),
    `${label}: what 27.3 adds`,
  ).toEqual([])
  const { violations } = await new AxeBuilder({ page }).analyze()
  const nodes = violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`))
  const excused = nodes.filter((node) => F6.test(node))
  if (excused.length) console.log(`axe ${label}: ${excused.length} F6 node(s) of Payload's own UI`)
  expect(
    nodes.filter((node) => !F6.test(node)),
    `${label}: the rest of the page`,
  ).toEqual([])
}

const status = (id: number) => sql(`SELECT status FROM orders WHERE id = ${id}`)
const seconds = (since: number) => Math.round((Date.now() - since) / 100) / 10

let fx: Fixtures
let orders: { mine: number; other: number }
const timings: Record<string, number> = {}

test.beforeAll(() => {
  fx = fixtures()
  orders = paidOrders(fx.stores.a.id, fx.stores.b.id)
})
test.afterAll(() => console.log(`27.3 timings (s): ${JSON.stringify(timings)}`))

test('the inbox and the order page at 390 and 1280 px, axe clean', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto('/admin/orders')
    await expect(page.getByRole('navigation', { name: 'Orders by status' })).toBeVisible()
    await page.screenshot({ path: shots(`inbox-owner-${width}`), fullPage: true })
    await axeClean(page, `inbox-${width}`)

    await page.goto(`/admin/orders/${orders.other}`)
    await expect(page.getByRole('heading', { name: 'Next step' })).toBeVisible()
    await page.screenshot({ path: shots(`order-owner-${width}`), fullPage: true })
    await axeClean(page, `order-${width}`)

    await page.goto(`/admin/orders/${orders.other}?reassign=1`)
    await expect(page.getByText('Holds every item').first()).toBeVisible()
    await page.screenshot({ path: shots(`reassign-${width}`), fullPage: true })
    await axeClean(page, `reassign-${width}`)

    await page.goto(`/admin/orders/${orders.other}?slip=1`)
    await expect(page.getByRole('heading', { name: /Packing slip/ })).toBeVisible()
    await page.screenshot({ path: shots(`slip-${width}`), fullPage: true })
    await axeClean(page, `slip-${width}`)
  }
  await page.emulateMedia({ media: 'print' })
  await page.screenshot({ path: shots('slip-print'), fullPage: true })
  await page.emulateMedia({ media: 'screen' })

  // The raw collection is out of the sidebar, and still the owner's by its address.
  await page.goto('/admin/orders')
  await expect(page.locator('nav a[href="/admin/collections/orders"]')).toHaveCount(0)
  await page.goto('/admin/collections/orders')
  await expect(page).toHaveURL(/\/admin\/collections\/orders/)
})

test('a store user takes an order to Delivered in ≤ 0:45 at a person’s pace', async ({ page }) => {
  test.skip(process.env.E2E_OBJECT_STORAGE !== '1', 'needs object storage (E2E_OBJECT_STORAGE=1)')
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, ACCOUNTS.storeA.email)
  const number = sql(`SELECT number FROM orders WHERE id = ${orders.mine}`)
  const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } })

  const started = Date.now()
  await page.goto('/admin/orders')
  await page.waitForTimeout(PACE)
  await page.getByRole('link', { name: new RegExp(`#${number}`) }).click()
  for (const [button, to] of [
    ['Start packing', 'processing'],
    ['Packed — book a driver', 'waiting_driver'],
  ] as const) {
    await page.waitForTimeout(PACE)
    await page.getByRole('button', { name: button }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    await expect(page.getByRole('heading', { name: 'Next step' })).toBeVisible()
    expect(status(orders.mine)).toBe(to)
  }
  await page.waitForTimeout(PACE)
  await page.getByLabel('Photo for the driver').setInputFiles({
    name: 'driver.png',
    mimeType: 'image/png',
    buffer: photo,
  })
  await page.getByRole('button', { name: 'Add driver details' }).click()
  await page.waitForURL(`**/admin/orders/${orders.mine}`)
  for (const [button, to] of [
    ['Driver collected it', 'on_the_way'],
    ['Mark delivered', 'delivered'],
  ] as const) {
    await page.waitForTimeout(PACE)
    await page.getByRole('button', { name: button }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(status(orders.mine)).toBe(to)
  }
  timings.storeToDelivered = seconds(started)
  await page.screenshot({ path: shots('order-store-delivered-390'), fullPage: true })
  expect(timings.storeToDelivered).toBeLessThanOrEqual(45)

  // Their inbox is their store's alone: store B's order is not there, nor found by number.
  const theirs = sql(`SELECT number FROM orders WHERE id = ${orders.other}`)
  await page.goto(`/admin/orders?tab=delivered&q=${theirs}`)
  await expect(page.getByText(`#${theirs}`)).toHaveCount(0)
  await page.goto(`/admin/orders/${orders.other}`)
  await expect(page.getByText('There is no such order.')).toBeVisible()
})

test('the owner reassigns an order, with a reason, in ≤ 0:30 at a person’s pace', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, ACCOUNTS.owner.email)
  const fresh = paidOrders(fx.stores.a.id, fx.stores.b.id)

  const started = Date.now()
  await page.goto(`/admin/orders/${fresh.other}`)
  await page.waitForTimeout(PACE)
  await page.getByRole('link', { name: 'Reassign' }).click()
  await page.waitForTimeout(PACE)
  await page.locator(`input[name="toStoreId"][value="${fx.stores.a.id}"]`).check()
  await page.getByLabel('Why move it?').fill('Store B is closed today.')
  await page.waitForTimeout(PACE)
  await page.getByRole('button', { name: 'Confirm reassignment' }).click()
  await page.waitForURL(`**/admin/orders/${fresh.other}`)
  timings.ownerReassign = seconds(started)
  expect(sql(`SELECT store_id FROM orders WHERE id = ${fresh.other}`)).toBe(String(fx.stores.a.id))
  await page.screenshot({ path: shots('order-reassigned-390'), fullPage: true })
  expect(timings.ownerReassign).toBeLessThanOrEqual(30)
})
