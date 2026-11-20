/**
 * The buyer's steps the purchase specs share (TASKS.md 23.6.a): a product in stock into the bag,
 * the checkout's contact and delivery filled in as a person would, the pin typed, and the owner's
 * distance bands made sure of — the seeded settings have none, which would send every order to a
 * staff quote (COMMERCE.md K2), so the in-band case could not exist.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test'

import { SHOP_ORIGIN } from './support'

export const DENPASAR = { lat: -8.6705, lng: 115.2126 }
export const JAKARTA = { lat: -6.2088, lng: 106.8456 }

/** One band reaching across Bali from any store: Denpasar is in it, Jakarta past it. */
export const BANDS = [
  { upToKm: 25, feeIdr: 20000 },
  { upToKm: 150, feeIdr: 45000 },
] as const

export const rupiah = (text: string): number => Number(text.replace(/\D/g, ''))

type Settings = { shop?: { delivery?: { bands?: { upToKm: number; feeIdr: number }[] } } }

/** Sets the bands through the owner's REST when they are not already these. */
export async function ensureBands(owner: APIRequestContext): Promise<void> {
  const now = (await (await owner.get('/api/globals/site-settings?depth=0')).json()) as Settings
  const bands = (now.shop?.delivery?.bands ?? []).map(({ upToKm, feeIdr }) => ({ upToKm, feeIdr }))
  if (JSON.stringify(bands) === JSON.stringify(BANDS)) return
  const answer = await owner.post('/api/globals/site-settings', {
    data: { shop: { delivery: { bands: BANDS } } },
  })
  expect(answer.status(), 'the owner saves the distance bands').toBe(200)
}

/** Published products, cheapest first (under the free-delivery line, so a fee shows). */
export async function productSlugs(owner: APIRequestContext): Promise<string[]> {
  const answer = await owner.get(
    '/api/products?limit=60&depth=0&sort=price&where[_status][equals]=published',
  )
  expect(answer.status(), 'GET /api/products').toBe(200)
  const { docs } = (await answer.json()) as { docs: { slug: string; sku?: string }[] }
  return docs.filter((each) => !(each.sku ?? '').startsWith('E2E-')).map((each) => each.slug)
}

/** Adds the first product (and option) whose add button is enabled; its slug, or null. */
export async function addOneInStock(page: Page, slugs: readonly string[]): Promise<string | null> {
  const add = page.getByRole('button', { name: 'Add to bag' })
  for (const slug of slugs) {
    const answer = await page.goto(`${SHOP_ORIGIN}/product/${slug}`)
    if (answer?.status() !== 200) continue
    const radios = page.getByRole('radio')
    const options = await radios.count()
    for (let i = 0; i < Math.max(options, 1); i++) {
      if (options > 0) await radios.nth(i).check({ force: true })
      if (await add.isEnabled()) {
        await add.click()
        await expect(page.getByText('Added to your bag.')).toBeVisible()
        return slug
      }
    }
  }
  return null
}

/** The checkout's contact and delivery, then the pin; waits for the delivery line to settle. */
export async function fillCheckout(
  page: Page,
  buyer: { name: string; email: string },
  pin: { lat: number; lng: number },
): Promise<{ delivery: string; total: number }> {
  await page.goto(`${SHOP_ORIGIN}/checkout`)
  await page.getByLabel('Full name').fill(buyer.name)
  await page.getByLabel('WhatsApp number').fill('0812 3456 7890')
  // Exact: the contact bar's "Email …" link is labelled too (TASKS.md 28.2).
  await page.getByLabel('Email', { exact: true }).fill(buyer.email)
  await page.getByLabel('Address', { exact: true }).fill('Jl. Teuku Umar 1')
  const inputs = page.locator('input[inputmode="decimal"]')
  await inputs.nth(0).fill(String(pin.lat))
  await inputs.nth(1).fill(String(pin.lng))
  const preview = page.getByTestId('delivery-preview')
  await expect(preview).not.toContainText(/Checking…|Pin your spot/)
  const delivery = (await preview.locator('dd').first().innerText()).trim()
  const total = rupiah(await page.getByTestId('total-to-pay').innerText())
  return { delivery, total }
}

/** Places the order; answers the order page's path (`/order/<token>`). */
export async function placeOrder(page: Page): Promise<string> {
  await page.getByRole('button', { name: /^(Continue to payment|Place|Continue)/ }).click()
  await page.waitForURL(/\/order\/[^/]+$/, { timeout: 60_000 })
  return new URL(page.url()).pathname
}
