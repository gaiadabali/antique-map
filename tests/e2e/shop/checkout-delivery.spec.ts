/**
 * The checkout shows delivery before paying (the plan's K2; TASKS.md 27.3), at 390 and 1280 px on
 * a production build: before a pin, the delivery line asks for one and the total is the items
 * total; with a pin in Bali the server's fee from the distance bands and the total to pay —
 * items + fee, the figure the pay button echoes — or, if the owner's table cannot price it, the
 * staff's promise; with a pin past the last band (Jakarta, from the Bali stores) the staff's
 * promise and the items total. Nothing is ordered: the preview takes no stock and writes nothing.
 * Axe clean at both widths. Screenshots go to `P27_SHOTS` (default: Playwright's output folder).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const PORT = process.env.E2E_PORT ?? process.env.PORT ?? '4200'
const SHOP_ORIGIN = `http://shop.localhost:${PORT}`
const API_BASE = `http://127.0.0.1:${PORT}`
const HOST_HEADER = { Host: `shop.localhost:${PORT}` }
const shots = (name: string) => `${process.env.P27_SHOTS ?? test.info().outputDir}/${name}.png`

const DENPASAR = { lat: -8.6705, lng: 115.2126 }
const JAKARTA = { lat: -6.2088, lng: 106.8456 }

const rupiah = (text: string): number => Number(text.replace(/\D/g, ''))

/** Product pages that may be in stock: an enabled add button, or options (one may be in stock). */
async function candidateProducts(request: APIRequestContext): Promise<string[]> {
  const res = await request.get(`${API_BASE}/api/products?limit=100&depth=0`, {
    headers: HOST_HEADER,
  })
  expect(res.ok(), 'GET /api/products').toBeTruthy()
  const { docs } = (await res.json()) as { docs: Array<{ slug: string; sku?: string }> }
  const found: string[] = []
  for (const product of docs.filter((p) => !(p.sku ?? '').startsWith('E2E-'))) {
    const page = await request.get(`${API_BASE}/product/${product.slug}`, { headers: HOST_HEADER })
    if (page.status() !== 200) continue
    const html = await page.text()
    if (/type="radio"[^>]*value="/.test(html) || !/__addButton"\s+disabled/.test(html)) {
      found.push(product.slug)
    }
    if (found.length >= 10) break
  }
  return found
}

/** Adds the first product (and option) whose add button is enabled; false when none is. */
async function addOneInStock(page: Page, slugs: readonly string[]): Promise<boolean> {
  const add = page.getByRole('button', { name: 'Add to bag' })
  for (const slug of slugs) {
    await page.goto(`${SHOP_ORIGIN}/product/${slug}`)
    const radios = page.getByRole('radio')
    const options = await radios.count()
    for (let i = 0; i < Math.max(options, 1); i++) {
      if (options > 0) await radios.nth(i).check({ force: true })
      if (await add.isEnabled()) {
        await add.click()
        await expect(page.getByText('Added to your bag.')).toBeVisible()
        return true
      }
    }
  }
  return false
}

async function typePin(page: Page, pin: { lat: number; lng: number }): Promise<void> {
  const inputs = page.locator('input[inputmode="decimal"]')
  await inputs.nth(0).fill(String(pin.lat))
  await inputs.nth(1).fill(String(pin.lng))
}

const preview = (page: Page) => page.getByTestId('delivery-preview')

async function settled(page: Page): Promise<{ delivery: string; total: number }> {
  await expect(preview(page)).not.toContainText(/Checking…/)
  const delivery = (await preview(page).locator('dd').first().innerText()).trim()
  const total = rupiah(await page.getByTestId('total-to-pay').innerText())
  return { delivery, total }
}

test('the checkout shows the delivery fee and the total to pay before paying', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const added = await addOneInStock(page, await candidateProducts(request))
  expect(added, 'a product in stock to put in the bag').toBe(true)
  await page.goto(`${SHOP_ORIGIN}/checkout`)

  const items = rupiah(
    await page.locator('dt', { hasText: 'Items total' }).locator('xpath=../dd').innerText(),
  )
  await expect(preview(page)).toContainText('Pin your spot to see the delivery price')
  expect(rupiah(await page.getByTestId('total-to-pay').innerText())).toBe(items)

  await typePin(page, DENPASAR)
  const near = await settled(page)
  if (/our team confirms/i.test(near.delivery)) {
    expect(near.total, 'no table to price it: the items total').toBe(items)
  } else {
    const fee = /free/i.test(near.delivery) ? 0 : rupiah(near.delivery)
    expect(near.total, 'items + the fee from the bands').toBe(items + fee)
  }
  expect(await page.locator('input[name="expectedTotalIdr"]').inputValue()).toBe(String(near.total))
  await page.screenshot({ path: shots('checkout-delivery-390'), fullPage: true })

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join()}`)).toEqual([])
  }
  await page.screenshot({ path: shots('checkout-delivery-1280'), fullPage: true })

  await typePin(page, JAKARTA)
  const far = await settled(page)
  expect(far.delivery).toMatch(/our team confirms/i)
  expect(far.total).toBe(items)
  expect(await page.locator('input[name="expectedTotalIdr"]').inputValue()).toBe(String(items))
  await page.screenshot({ path: shots('checkout-staff-quote-1280'), fullPage: true })
})
