/**
 * The plan's §6 targets at a person's pace (TASKS.md 27.7.b; `old-east-indies-cms.md` §6), on a
 * production build: a product with six photos, two variants and stock at three stores published
 * (≤ 2:30); one count at one store (≤ 0:20, a store user on a phone); the home's hero picture and
 * title changed with the preview open (≤ 1:00); an order taken to Delivered by a store user on a
 * phone (≤ 0:45); an order reassigned with a reason (≤ 0:30). The menu item, the announcement and
 * the store user added are `site-navigation-timed.spec.ts` and `staff-timed.spec.ts`.
 *
 * NOT real people: every action waits as `admin-usability/human/pace.ts`'s model of a first-timer
 * does (reading before each click, four characters a second, a glance at each new page), the clock
 * from the task's start to the saved state, the server's own time included, screenshots left out.
 * The owner's people's run (OA9) is still to come. Times go to `test-results/shop-admin-timed.json`;
 * screenshots to `SITE_SHOTS` when set. What a task makes is put back or removed afterwards.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { Human } from '../admin-usability/human/pace'
import { sixViews } from '../admin-usability/human/steps'
import { ACCOUNTS } from './accounts'
import { signIn } from './admin'
import { fixtures, sql, type Fixtures } from './local.mjs'
import { paidOrders } from './order-fixtures'
import { heroTask } from './shop-admin-timed-hero'

const RESULTS = 'test-results/shop-admin-timed.json'
type Row = { seconds: number; target: number; clicks: number; keys: number; width: number }
const times: Record<string, Row> = {}

async function shot(page: Page, name: string): Promise<void> {
  if (!process.env.SITE_SHOTS) return
  mkdirSync(process.env.SITE_SHOTS, { recursive: true })
  await page.screenshot({ path: join(process.env.SITE_SHOTS, `${name}.png`), fullPage: true })
}

function keep(name: string, h: Human, width: number): number {
  const seconds = h.seconds()
  times[name] = { seconds, target: h.targetSeconds, clicks: h.clicks, keys: h.keys, width }
  console.log(`TIMED ${name}: ${seconds} s (target ${h.targetSeconds} s), ${h.clicks} clicks`)
  return seconds
}

/** The admin's REST from inside the signed-in page (its cookie and origin). */
const rest = (page: Page, method: string, path: string) =>
  page.evaluate(
    async ({ method, path }) => (await fetch(path, { method, credentials: 'include' })).status,
    { method, path },
  )

test.describe.configure({ mode: 'default' })

let fx: Fixtures
test.beforeAll(() => {
  fx = fixtures()
})
test.afterAll(() => {
  mkdirSync('test-results', { recursive: true })
  writeFileSync(RESULTS, `${JSON.stringify(times, null, 2)}\n`)
})

test.describe('at a desk, 1280 px', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('a product with six photos, two variants and stock at three stores, published in ≤ 2:30', async ({
    page,
  }, info) => {
    test.setTimeout(400_000)
    // The photos are stored in the media bucket: the dev stack's MinIO (as the orders door's).
    test.skip(process.env.E2E_OBJECT_STORAGE !== '1', 'needs object storage (E2E_OBJECT_STORAGE=1)')
    const category = sql(
      "SELECT l.label FROM categories c JOIN categories_locales l ON l._parent_id = c.id AND l._locale = 'en' WHERE c._status = 'published' ORDER BY c.id LIMIT 1",
    )
    const codes = sql('SELECT code FROM stores WHERE active ORDER BY code LIMIT 3').split('\n')
    expect(codes).toHaveLength(3)
    await signIn(page, ACCOUNTS.owner.email)
    await page.goto('/admin')
    // A picture of this run's own (the media library refuses the same file twice): a colour wash
    // and a stamp over the page, cut into six views as a phone's six shots of one product would be.
    await page.evaluate((stamp) => {
      const wash = document.createElement('div')
      const hue = Number(stamp) % 360
      wash.style.cssText = `position:fixed;inset:0;z-index:99999;display:grid;place-items:center;font:700 96px serif;background:linear-gradient(135deg,hsl(${hue} 60% 70%),hsl(${(hue + 120) % 360} 60% 40%))`
      wash.textContent = stamp
      document.body.append(wash)
    }, String(Date.now()))
    const shots = await sixViews(page, {
      name: 'timed-product.png',
      mimeType: 'image/png',
      buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 800 } }),
    })
    const sku = `TIMED-${Date.now().toString(36).slice(-5).toUpperCase()}`
    // Six files named as a phone exports them, the same names every run: the library renames each
    // (`photo-7.jpg`, …) as it is stored, several at once (`photos-client.jsx`).
    const photos = shots.map((each, n) => ({
      ...each,
      name: `photo-${n + 1}.jpg`,
    }))
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const h = new Human(page, info, 'product', 'Add a product: 6 photos, 2 variants, 3 stores', 150)
    await h.start()
    await h.click(page.locator('nav a#nav-products'))
    await h.read()
    await h.click(page.getByRole('link', { name: /^Create new/i }).first())
    await h.read()
    await h.type(page.locator('#field-name'), 'Batik tote bag')
    await h.type(page.locator('#field-sku'), sku)
    await h.pick(page.locator('#field-category'), category, category.slice(0, 3))
    await h.type(page.locator('#field-description'), 'Hand-stamped batik on heavy cotton.')
    await h.file(page.locator('#field-images input[type="file"]'), photos)
    await expect(page.locator('.pe-photo:not(.pe-photo--pending)')).toHaveCount(6, {
      timeout: 90_000,
    })
    await h.read()
    await h.type(page.locator('#field-price'), '185000')
    await h.type(page.locator('#pe-option-name-0'), 'Colour')
    await h.type(page.locator('#pe-option-values-0'), 'Indigo, Black')
    await h.click(page.getByRole('button', { name: 'Make variants' }))
    await h.read(1.5)
    await h.click(page.locator('#action-save-draft'))
    await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+/, { timeout: 60_000 })
    await h.read()
    const id = Number(/products\/(\d+)/.exec(page.url())![1])
    for (const [n, code] of codes.entries()) {
      await h.type(page.locator('#pe-stock-find'), code, { replace: n > 0 })
      await h.read(1)
      const row = page.locator('.pe-stock tbody tr').first()
      for (const cell of await row.locator('input').all()) {
        await h.type(cell, String(n + 2))
        await page.keyboard.press('Tab')
      }
      await expect(row.locator('.pe-cell-status', { hasText: 'Saved' })).toHaveCount(2)
    }
    const published = page.getByRole('button', { name: 'Published', exact: true })
    await h.click(published)
    await expect(published).toHaveAttribute('aria-pressed', 'true', { timeout: 60_000 })
    h.stop()
    const seconds = keep('product', h, 1280)
    await shot(page, 'timed-product-1280')
    expect(sql(`SELECT _status FROM products WHERE id = ${id}`)).toBe('published')
    expect(Number(sql(`SELECT count(*) FROM stock_levels WHERE product_id = ${id}`))).toBe(6)
    sql(`DELETE FROM stock_levels WHERE product_id = ${id}`)
    expect([200, 404]).toContain(await rest(page, 'DELETE', `/api/products/${id}`))
    expect(seconds).toBeLessThanOrEqual(150)
  })

  test('the home’s hero picture and title changed, with the preview, in ≤ 1:00', async ({
    page,
  }, info) => {
    test.setTimeout(240_000)
    await signIn(page, ACCOUNTS.owner.email)
    const h = await heroTask(page, info, shot)
    expect(keep('hero', h, 1280)).toBeLessThanOrEqual(60)
  })
})

test.describe('on a phone, 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('a store user updates one count in ≤ 0:20', async ({ page }, info) => {
    test.setTimeout(180_000)
    const row = sql(
      `SELECT sl.id, sl.quantity, p.sku, sl.variant_sku FROM stock_levels sl JOIN products p ON p.id = sl.product_id WHERE sl.store_id = ${fx.stores.a.id} AND sl.variant_sku <> '' ORDER BY sl.id LIMIT 1`,
    ).split('|')
    const [levelId, quantity, productSku, variantSku] = row as [string, string, string, string]
    await signIn(page, ACCOUNTS.storeA.email)
    await page.waitForLoadState('networkidle')
    const h = new Human(page, info, 'stock-count', 'Update one count at one store', 20, {
      phone: true,
    })
    await h.start()
    const open = page
      .getByRole('button', { name: /^(Open Menu|Buka Menu)$/ })
      .filter({ visible: true })
    if ((await open.count()) > 0) await h.click(open.first())
    await h.click(page.locator('nav a.nav__link[href="/admin/stock"]').first())
    await page.waitForURL(/\/admin\/stock$/)
    await h.read()
    // The part of the SKU that tells the product apart (the screen's hint), as stores-stock.spec.
    await h.type(page.locator('#sm-q'), productSku.split('-').slice(1).join('-') || productSku)
    await page.waitForURL(/\/admin\/stock\?q=/)
    const cell = page.locator(`input[data-sku="${variantSku}"]`).first()
    await expect(cell).toBeVisible()
    await h.read(1)
    await h.type(cell, String(Number(quantity) + 2), { replace: true })
    await page.keyboard.press('Enter')
    await expect(cell.locator('xpath=..').locator('.sm-status')).toBeVisible()
    h.stop()
    const seconds = keep('stockCount', h, 390)
    await shot(page, 'timed-stock-count-390')
    expect(Number(sql(`SELECT quantity FROM stock_levels WHERE id = ${levelId}`))).toBeGreaterThan(
      Number(quantity),
    )
    sql(`UPDATE stock_levels SET quantity = ${quantity} WHERE id = ${levelId}`)
    expect(seconds).toBeLessThanOrEqual(20)
  })

  test('a store user takes an order to Delivered in ≤ 0:45', async ({ page }, info) => {
    test.setTimeout(240_000)
    test.skip(process.env.E2E_OBJECT_STORAGE !== '1', 'needs object storage (E2E_OBJECT_STORAGE=1)')
    const orders = paidOrders(fx.stores.a.id, fx.stores.b.id)
    const number = sql(`SELECT number FROM orders WHERE id = ${orders.mine}`)
    await signIn(page, ACCOUNTS.storeA.email)
    await page.waitForURL(/\/admin\/orders$/)
    const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } })
    await page.reload()
    await page.waitForLoadState('networkidle')
    const h = new Human(page, info, 'order-delivered', 'Take an order to Delivered', 45, {
      phone: true,
    })
    await h.start()
    await h.click(page.getByRole('link', { name: new RegExp(`#${number}`) }))
    await h.read()
    for (const button of ['Start packing', 'Packed — book a driver']) {
      await h.click(page.getByRole('button', { name: button }))
      await expect(page.getByRole('heading', { name: 'Next step' })).toBeVisible()
      await h.read(1)
    }
    await h.file(page.getByLabel('Photo for the driver'), {
      name: 'driver.png',
      mimeType: 'image/png',
      buffer: photo,
    })
    await h.click(page.getByRole('button', { name: 'Add driver details' }))
    await h.read(1)
    for (const [button, to] of [
      ['Driver collected it', 'on_the_way'],
      ['Mark delivered', 'delivered'],
    ] as const) {
      await h.click(page.getByRole('button', { name: button }))
      await expect.poll(() => sql(`SELECT status FROM orders WHERE id = ${orders.mine}`)).toBe(to)
      await h.read(1)
    }
    h.stop()
    const seconds = keep('orderDelivered', h, 390)
    await shot(page, 'timed-order-delivered-390')
    expect(seconds).toBeLessThanOrEqual(45)
  })

  test('the owner reassigns an order with a reason in ≤ 0:30', async ({ page }, info) => {
    test.setTimeout(240_000)
    const orders = paidOrders(fx.stores.a.id, fx.stores.b.id)
    await signIn(page, ACCOUNTS.owner.email)
    // The owner arrives from the order's email link or the inbox: the order is open.
    await page.goto(`/admin/orders/${orders.other}`)
    await page.waitForLoadState('networkidle')
    const h = new Human(page, info, 'reassign', 'Reassign an order with a reason', 30, {
      phone: true,
    })
    await h.start()
    await h.click(page.getByRole('link', { name: 'Reassign' }))
    await h.read()
    await h.click(page.locator(`input[name="toStoreId"][value="${fx.stores.a.id}"]`))
    await h.type(page.getByLabel('Why move it?'), 'Store closed today')
    await h.click(page.getByRole('button', { name: 'Confirm reassignment' }))
    await page.waitForURL(`**/admin/orders/${orders.other}`)
    await expect
      .poll(() => sql(`SELECT store_id FROM orders WHERE id = ${orders.other}`))
      .toBe(String(fx.stores.a.id))
    h.stop()
    const seconds = keep('reassign', h, 390)
    await shot(page, 'timed-reassign-390')
    expect(seconds).toBeLessThanOrEqual(30)
  })
})
