/**
 * The purchase on the shop app alone (TASKS.md 23.6.a; phase 23's **Done when**): product → bag →
 * checkout → order → pay on the simulator (`MIDTRANS_MODE=simulate`; COMMERCE.md §6) → paid →
 * tracking, on `shop.localhost`, its routes with no `/shop/<locale>` prefix. Twice: a pin inside
 * the owner's distance bands, priced at checkout and payable at once; and a pin past the last band
 * (Jakarta, from the Bali stores), which waits for the staff's delivery quote — sent by the owner on
 * the order's admin screen (`/api/x/orders/quote`) — before it can be paid (K2, TASKS.md 27.3).
 * Every buyer screen at 390 and 1280, axe clean, no sideways scroll.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { ACCOUNTS } from '../admin/accounts'
import { signIn } from '../admin/admin'
import {
  addOneInStock,
  DENPASAR,
  ensureBands,
  fillCheckout,
  JAKARTA,
  placeOrder,
  productSlugs,
  rupiah,
} from './checkout'
import {
  axeClean,
  listOrders,
  noOverflow,
  record,
  shot,
  SHOP_ORIGIN,
  staffApi,
  WIDTHS,
} from './support'

let owner: APIRequestContext
let slugs: string[]
test.beforeAll(async () => {
  owner = await staffApi('owner')
  await ensureBands(owner)
  slugs = await productSlugs(owner)
  expect(slugs.length, 'published products to buy').toBeGreaterThan(0)
})
test.afterAll(async () => {
  await owner.dispose()
})

/** The screen at both widths: axe clean, no sideways scroll, a screenshot each. */
async function screens(page: Page, name: string): Promise<void> {
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    await page.waitForLoadState('networkidle').catch(() => undefined)
    await noOverflow(page, `${name} at ${viewport.width}`)
    await axeClean(page, `${name} at ${viewport.width}`)
    const path = shot(`${name}-${viewport.width}`, test.info().outputDir)
    await page.screenshot({ path, fullPage: true })
  }
  await page.setViewportSize(WIDTHS[1])
}

/** The newest order the owner sees: the one this case just placed (one worker, in order). */
async function newestOrder() {
  const all = await listOrders(owner)
  return all[all.length - 1]!
}

/** Pay on the simulator, settle, and follow the paid page's link to tracking. */
async function payAndTrack(page: Page, orderPath: string, tag: string): Promise<void> {
  await page.goto(`${SHOP_ORIGIN}${orderPath}`)
  await page.getByRole('button', { name: /^Pay / }).click()
  await expect(page.getByText('Test payment — no money moves.')).toBeVisible()
  await expect(page).toHaveURL(/\/simulate$/)
  await screens(page, `${tag}-simulator`)
  await page.getByRole('button', { name: 'Settle' }).click()
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
  await screens(page, `${tag}-paid`)
  await page.getByRole('link', { name: 'Track your order' }).click()
  await expect(page).toHaveURL(/\/track\/[^/]+$/)
  await expect(page.locator('h1').first()).toBeVisible()
  await screens(page, `${tag}-tracking`)
}

test('in band: the fee from the bands at checkout, pay on the simulator, then tracking', async ({
  page,
}) => {
  const slug = await addOneInStock(page, slugs)
  expect(slug, 'a product in stock to put in the bag').not.toBeNull()
  const items = await page
    .goto(`${SHOP_ORIGIN}/checkout`)
    .then(async () =>
      rupiah(
        await page.locator('dt', { hasText: 'Items total' }).locator('xpath=../dd').innerText(),
      ),
    )
  const near = await fillCheckout(
    page,
    { name: 'Shop App In Band', email: 'e2e-shop-app-near@example.test' },
    DENPASAR,
  )
  expect(near.delivery, 'priced from the bands, not a staff quote').not.toMatch(/team confirms/i)
  const fee = /free/i.test(near.delivery) ? 0 : rupiah(near.delivery)
  expect(near.total, 'items + the fee').toBe(items + fee)
  await screens(page, 'in-band-checkout')

  const orderPath = await placeOrder(page)
  const order = await newestOrder()
  await expect(page.getByRole('heading', { name: `Order ${order.number}` })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pay / })).toBeVisible()
  expect(order.status).toBe('pending_payment')
  await screens(page, 'in-band-order')

  await payAndTrack(page, orderPath, 'in-band')
  const paid = (await listOrders(owner)).find((each) => each.id === order.id)
  expect(paid?.status).toBe('paid')
  await record('purchase.inBand', { slug, items, fee, total: near.total, status: paid?.status })
})

test('past the last band: the owner sends the delivery price, then pay and tracking', async ({
  page,
  browser,
}) => {
  const slug = await addOneInStock(page, slugs)
  expect(slug, 'a product in stock to put in the bag').not.toBeNull()
  const far = await fillCheckout(
    page,
    { name: 'Shop App Past Band', email: 'e2e-shop-app-far@example.test' },
    JAKARTA,
  )
  expect(far.delivery).toMatch(/our team confirms/i)
  await screens(page, 'past-band-checkout')

  const orderPath = await placeOrder(page)
  await expect(
    page.getByRole('heading', { name: "We're confirming your delivery price" }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pay / })).toHaveCount(0)
  const order = await newestOrder()
  expect(order.status).toBe('awaiting_quote')
  await screens(page, 'past-band-awaiting-quote')

  // The owner, in the admin, on the order's own screen: "Send price".
  const staff = await (await browser.newContext({ baseURL: SHOP_ORIGIN })).newPage()
  await signIn(staff, ACCOUNTS.owner.email)
  await staff.goto(`/admin/orders/${order.id}`)
  await staff.locator('input[name="feeIdr"]').fill('35000')
  const [answer] = await Promise.all([
    staff.waitForResponse((each) => each.url().endsWith('/api/x/orders/quote')),
    staff.locator('form[action="/api/x/orders/quote"] button[type="submit"]').click(),
  ])
  expect(answer.status(), 'the quote is accepted (a redirect back to the order)').toBe(303)
  await staff.screenshot({ path: shot('past-band-admin-quoted-1280', test.info().outputDir) })
  await staff.context().close()

  const quoted = (await listOrders(owner)).find((each) => each.id === order.id)
  expect(quoted?.status).toBe('pending_payment')
  await page.goto(`${SHOP_ORIGIN}${orderPath}`)
  await expect(page.getByRole('heading', { name: `Order ${order.number}` })).toBeVisible()
  const pay = (await page.getByRole('button', { name: /^Pay / }).innerText()).trim()
  await screens(page, 'past-band-quoted')

  await payAndTrack(page, orderPath, 'past-band')
  const paid = (await listOrders(owner)).find((each) => each.id === order.id)
  expect(paid?.status).toBe('paid')
  await record('purchase.pastBand', { slug, quoteIdr: 35000, pay, status: paid?.status })
})
