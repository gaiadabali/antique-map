/**
 * The store staff panel (TASKS.md 7.2.c; CONTENT-OPERATIONS.md §5.1), driven at 390 px on a
 * production build: a store user moves a fresh `paid` order `paid → processing → waiting_driver`,
 * uploads the driver's details, `on_the_way → delivered`, each step timed; another store's user
 * sees an empty list; as the owner, reassigning one order to another store. Accounts and stores
 * are `fixtures.ts`'s; the orders are `store-panel-fixtures.ts`'s own, fresh every run.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { readEnvFile } from '../../../engine/tooling/worktree/env-file.mjs'
import { ACCOUNTS } from './accounts'
import { signIn } from './admin'
import { record, shot } from './evidence-72'
import { fixtures, localPort, sql, type Fixtures } from './local.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
const windows = process.platform === 'win32'

/** A fresh `paid` order at each fixture store — `store-panel-fixtures.ts`, run the way `fixtures.ts` is. */
function storePanelOrders(storeAId: number, storeBId: number): { mine: number; other: number } {
  const script = join(here, 'store-panel-fixtures.ts')
  const port = localPort()
  const envFile = join(root, '.env.local')
  const local = existsSync(envFile) ? readEnvFile(envFile) : new Map<string, string>()
  const suffix = process.env.DB_SUFFIX ?? local.get('DB_SUFFIX')
  const url =
    process.env.E2E_DATABASE_URL ??
    `postgres://postgres:postgres@127.0.0.1:5432/indies_${suffix ?? ''}`
  const out = execFileSync(
    'pnpm',
    ['--filter', '@engine/cms', 'payload', 'run', script, String(storeAId), String(storeBId)],
    {
      cwd: root,
      encoding: 'utf8',
      shell: windows,
      env: { ...process.env, DATABASE_URL: url, NODE_ENV: 'development', E2E_PORT: port },
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  )
  const line = out.split('\n').find((each) => each.startsWith('E2E_STORE_PANEL '))
  if (!line) throw new Error(`store-panel-fixtures.ts printed no result:\n${out}`)
  return JSON.parse(line.slice('E2E_STORE_PANEL '.length)) as { mine: number; other: number }
}

test.use({ viewport: { width: 390, height: 844 } })

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
    await expect(page.getByText(`#${sql(`SELECT number FROM orders WHERE id = ${orders.mine}`)}`)).toBeVisible()
    await page.screenshot({ path: shot('store-panel-queue-390') })
    await page.goto(`/admin/orders/${orders.mine}`)
    await page.getByRole('link', { name: /^Processing$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('processing')
  })

  timed('the store user books the driver', async (page) => {
    await signIn(page, ACCOUNTS.storeA.email)
    await page.goto(`/admin/orders/${orders.mine}`)
    await page.getByRole('link', { name: /^Waiting for driver$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('waiting_driver')
  })

  timed('the store user uploads the driver’s details', async (page) => {
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
    await signIn(page, ACCOUNTS.storeA.email)
    await page.goto(`/admin/orders/${orders.mine}`)
    await page.getByRole('link', { name: /^On the way$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('on_the_way')

    await page.getByRole('link', { name: /^Delivered$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL(`**/admin/orders/${orders.mine}`)
    expect(sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe('delivered')
    await page.screenshot({ path: shot('store-panel-delivered-390') })
  })
})

test('another store’s user sees an empty list for this order', async ({ page }) => {
  await signIn(page, ACCOUNTS.storeB.email)
  await page.goto('/admin/orders')
  await expect(
    page.getByText(`#${sql(`SELECT number FROM orders WHERE id = ${orders.mine}`)}`),
  ).toHaveCount(0)
  await page.screenshot({ path: shot('store-panel-other-store-empty-390') })
})

test('the owner reassigns an order to another store', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  await page.goto(`/admin/orders/${orders.other}`)
  await page.getByRole('link', { name: /^Reassign$/ }).click()
  await page.getByLabel(/Send to store/).selectOption({ value: String(fx.stores.a.id) })
  await page.getByRole('button', { name: /^Confirm reassignment$/ }).click()
  await page.waitForURL(`**/admin/orders/${orders.other}`)
  expect(sql(`SELECT store_id FROM orders WHERE id = ${orders.other}`)).toBe(String(fx.stores.a.id))
  await page.screenshot({ path: shot('owner-reassign-390') })
})
