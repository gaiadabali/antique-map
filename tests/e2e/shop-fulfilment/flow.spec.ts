/**
 * The shop fulfilment gate (TASKS.md 7.4.a; phase 6 and phase 7's **Done when**): one e2e across
 * roles, at 390 px, on a production build — a guest buys two in-stock products and pays; the
 * nearest store fulfils, uploading the driver's image; the buyer tracks the order; another store's
 * user sees none of it; the owner reassigns a second order to another store that has stock.
 *
 * Runs locally (`E2E_PORT`, this worktree's own database, `GATE_DB=local` making its own fixtures)
 * and, unchanged, against staging (`E2E_BASE_URL`, the orchestrator's own accounts by environment
 * variable — `./accounts.ts`). Screenshots land under `docs/gates/shop/`.
 */
import { expect, test } from '@playwright/test'

import { gateAccounts, type GateAccounts } from './accounts'
import { GATE_DB, MAILPIT_URL, PIN, SHOP_ORIGIN } from './env'
import {
  addFromProductPage,
  axeClean,
  cleanupOpsOut,
  fillCheckout,
  listProducts,
  openOrderByNumber,
  orderByToken,
  payAndSettle,
  type ProductSummary,
  type SettledOrder,
  setupFixtureStock,
  shoot,
  signInAs,
  WIDTHS,
} from './helpers'

/** Staging fallback: any two sellable (add button enabled), unvarianted products, undiscovered by
 * a pin probe — on staging the given accounts' own store is trusted to be near `E2E_PIN` already
 * (the orchestrator's setup, not this spec's). */
async function discoverTwoSellableProducts(
  request: Parameters<typeof listProducts>[0],
): Promise<ProductSummary[]> {
  const candidates = await listProducts(request)
  expect(candidates.length, 'seeded, published products').toBeGreaterThan(0)
  const found: ProductSummary[] = []
  for (const product of candidates) {
    const res = await request.get(`${SHOP_ORIGIN}/product/${product.slug}`)
    if (res.status() !== 200) continue
    const html = await res.text()
    const hasVariant = /type="radio"[^>]*value="/.test(html)
    const addDisabled = /__addButton"\s+disabled/.test(html)
    if (!hasVariant && !addDisabled) found.push(product)
    if (found.length >= 2) break
  }
  expect(found.length, 'two sellable, unvarianted products').toBeGreaterThanOrEqual(2)
  return found
}

async function findOrderEmail(
  request: Parameters<typeof listProducts>[0],
  to: string,
): Promise<{ text: string; subject: string } | null> {
  if (MAILPIT_URL === 'none') return null
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await request.get(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    )
    if (res.ok()) {
      const body = (await res.json()) as { messages?: { ID: string }[] }
      const found = body.messages?.[0]
      if (found) {
        const message = await request.get(`${MAILPIT_URL}/api/v1/message/${found.ID}`)
        const parsed = (await message.json()) as { Text: string; Subject: string }
        return { text: parsed.Text, subject: parsed.Subject }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

test.describe.serial('the shop fulfilment gate (7.4.a)', () => {
  test.describe.configure({ timeout: 240_000 })

  let accounts: GateAccounts
  let products: ProductSummary[]
  let order1: SettledOrder
  let order2: SettledOrder

  test.beforeAll(async ({ browser }) => {
    accounts = gateAccounts()
    if (GATE_DB) {
      products = setupFixtureStock(accounts.storeAId, accounts.storeBId, PIN)
    } else {
      const context = await browser.newContext()
      products = await discoverTwoSellableProducts(context.request)
      await context.close()
    }
    expect(products.length, 'two fixture products').toBeGreaterThanOrEqual(2)
  })

  test.afterAll(() => {
    if (GATE_DB) cleanupOpsOut()
  })

  test('a guest buys two in-stock products, pays, and reaches the order page', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(WIDTHS[0])
    await addFromProductPage(page, products[0]!.slug)
    await addFromProductPage(page, products[1]!.slug)
    await page.goto(`${SHOP_ORIGIN}/bag`)
    await expect(page.locator('main').getByRole('listitem')).toHaveCount(2)
    await shoot(page, 'buyer-bag-390')

    await fillCheckout(
      page,
      {
        name: 'E2E Fulfilment Buyer',
        whatsapp: '0812 3456 7890',
        email: 'e2e-fulfilment-buyer@example.test',
        address: 'Jl. Teuku Umar, Denpasar',
      },
      PIN,
    )
    await shoot(page, 'buyer-checkout-390')

    order1 = await payAndSettle(page)
    const trackingLink = page.getByRole('link', { name: 'Track your order' })
    await expect(trackingLink).toBeVisible()
    await shoot(page, 'buyer-order-paid-390')
    await axeClean(page, 'order page, paid, at 390px')

    const email = await findOrderEmail(request, 'e2e-fulfilment-buyer@example.test')
    if (email) {
      expect(email.subject, 'the order email names the same order').toContain(order1.shownNumber)
    } else {
      console.log('SKIPPED: email (MAILPIT_URL=none)')
    }
  })

  test('the nearest store fulfils: processing → waiting for driver → image → on the way → delivered', async ({
    page,
  }) => {
    const started = Date.now()
    await page.setViewportSize(WIDTHS[0])
    await signInAs(page, accounts.storeA.email, accounts.storeA.password)
    await openOrderByNumber(page, order1.numberText)
    await shoot(page, 'store-order-new-390')

    await page.getByRole('link', { name: /^Processing$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL('**/admin/orders/**')

    await page.getByRole('link', { name: /^Waiting for driver$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL('**/admin/orders/**')

    const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } })
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'driver.png', mimeType: 'image/png', buffer: photo })
    await page.getByRole('button', { name: /Add driver details/ }).click()
    await page.waitForURL('**/admin/orders/**')
    await shoot(page, 'store-driver-image-390')

    await page.getByRole('link', { name: /^On the way$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL('**/admin/orders/**')

    await page.getByRole('link', { name: /^Delivered$/ }).click()
    await page.getByRole('button', { name: /^Confirm$/ }).click()
    await page.waitForURL('**/admin/orders/**')
    await shoot(page, 'store-delivered-390')

    const seconds = Math.round(((Date.now() - started) / 1000) * 10) / 10
    console.log(`fulfilment drive (paid → delivered): ${seconds}s`)

    if (GATE_DB) {
      const order = orderByToken(order1.token)
      expect(order.found, 'the fulfilled order').toBe(true)
      expect(order.status).toBe('delivered')
      expect(order.storeId).toBe(accounts.storeAId)
    }
  })

  test('the buyer tracks the order: timeline, driver image, store name and WhatsApp', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.setViewportSize(WIDTHS[0])
    await page.goto(`${SHOP_ORIGIN}/track/${encodeURIComponent(order1.token)}`)
    const trackingHeading = page.getByRole('heading', { name: /^Order #/i })
    await expect(trackingHeading).toBeVisible()
    const headingDigits = (await trackingHeading.innerText()).replace(/\D/g, '')
    expect(headingDigits, 'the tracking page names the same order').toBe(order1.numberText)
    await expect(page.getByText('Delivered').first()).toBeVisible()
    await expect(page.getByRole('img', { name: 'Your driver' })).toBeVisible()
    const storeHeading = page.getByRole('heading', { name: 'Sending from' })
    await expect(storeHeading).toBeVisible()
    const storeLine = await storeHeading.locator('xpath=following-sibling::p[1]').innerText()
    expect(storeLine.trim().length, 'the store name shown on tracking').toBeGreaterThan(0)
    // Scoped to `main` — the footer carries its own, generic "Ask on WhatsApp" link.
    await expect(page.locator('main').getByRole('link', { name: 'Ask on WhatsApp' })).toBeVisible()
    await shoot(page, 'tracking-delivered-390')
    await axeClean(page, 'tracking page, delivered, at 390px')
    await page.setViewportSize(WIDTHS[1])
    await axeClean(page, 'tracking page, delivered, at 1280px')
    await context.close()
  })

  test("another store's user sees no such order", async ({ page }) => {
    await page.setViewportSize(WIDTHS[0])
    await signInAs(page, accounts.storeB.email, accounts.storeB.password)
    await page.goto(`${SHOP_ORIGIN}/admin/orders`)
    await expect(page.getByRole('link').filter({ hasText: `#${order1.numberText}` })).toHaveCount(0)
    await shoot(page, 'store-b-empty-390')
  })

  test('the owner reassigns a second order to another store with stock', async ({
    page,
    browser,
  }) => {
    await page.setViewportSize(WIDTHS[0])

    const guestContext = await browser.newContext()
    const guestPage = await guestContext.newPage()
    await guestPage.setViewportSize(WIDTHS[0])
    await addFromProductPage(guestPage, products[0]!.slug)
    await fillCheckout(
      guestPage,
      {
        name: 'E2E Fulfilment Second Buyer',
        whatsapp: '0812 0000 1111',
        email: 'e2e-fulfilment-buyer-2@example.test',
        address: 'Jl. Teuku Umar, Denpasar',
      },
      PIN,
    )
    order2 = await payAndSettle(guestPage)
    await shoot(guestPage, 'buyer-second-order-paid-390')
    await guestContext.close()

    await signInAs(page, accounts.owner.email, accounts.owner.password)
    await openOrderByNumber(page, order2.numberText)
    // The order view has no `main` landmark — the first paragraph after the "#<number>" heading
    // names the store.
    const orderHeading = page.getByRole('heading', { name: /^#/ })
    const storeLineBefore = await orderHeading.locator('xpath=following::p[1]').innerText()

    await page.getByRole('link', { name: /^Reassign$/ }).click()
    const select = page.getByLabel(/Send to store/)
    if (GATE_DB) {
      await select.selectOption({ value: String(accounts.storeBId) })
    } else {
      await select.selectOption({ index: 0 })
    }
    await page.getByRole('button', { name: /^Confirm reassignment$/ }).click()
    await page.waitForURL('**/admin/orders/**')
    await shoot(page, 'owner-reassigned-390')

    if (GATE_DB) {
      const after = orderByToken(order2.token)
      expect(after.found, 'the reassigned order').toBe(true)
      expect(after.storeId, 'the order now points at the other store').toBe(accounts.storeBId)
      expect(after.storeId, 'the order no longer points at the first store').not.toBe(
        accounts.storeAId,
      )
    } else {
      await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0)
      const storeLineAfter = await orderHeading.locator('xpath=following::p[1]').innerText()
      expect(storeLineAfter, 'the store shown on the order changed').not.toBe(storeLineBefore)
    }
  })
})
