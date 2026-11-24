/**
 * Recipe 1 (CONTENT-OPERATIONS.md 3.3, target under 3 minutes): the owner adds a product and publishes it,
 * then puts stock at three stores, all on the one-screen product editor (TASKS.md 27.2). Timed from the dashboard to "published" (A) and to "stock entered" (B).
 * The product is marked REHEARSAL 10.4 and unpublished at the end; the public page must then answer 404.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  choose,
  MARK,
  Meter,
  need,
  record,
  RUN,
  SHOP,
  sidebarLink,
  signIn,
  unpublish,
  widthOf,
} from './support'

const SKU = `REH-10-4-${RUN}-${Date.now().toString(36)}`
const NAME = `${MARK} product ${SKU.slice(9)}`

async function liveStatus(
  page: Page,
  slug: string,
  want: number,
  withinMs: number,
): Promise<number> {
  const t0 = Date.now()
  let status = 0
  while (Date.now() - t0 < withinMs) {
    status = (await page.request.get(`${SHOP}/product/${slug}`)).status()
    if (status === want) break
    await page.waitForTimeout(3000)
  }
  expect(status, `public /product/${slug} within ${withinMs / 1000}s`).toBe(want)
  return Math.round((Date.now() - t0) / 1000)
}

test('R1 owner: add and publish a product, then stock at three stores', async ({ page }, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const m = new Meter(page, info, 'R1 add and publish a product', 180)

  m.start()
  // In the default content locale: Payload keeps each person's last one, and a product's English
  // fields are the required ones.
  await page.goto(`${SHOP}/admin?locale=en`)
  await m.click(await sidebarLink(page, '/admin/collections/products'))
  await expect(page).toHaveURL(/\/collections\/products\?/)
  await m.click(page.getByRole('link', { name: 'Create New' }).first())
  await page.locator('#field-sku').fill(SKU)
  await page.locator('#field-name').fill(NAME)
  await page
    .locator('#field-description')
    .fill('A rehearsal product from the 10.4 timed admin test. Not for sale.')
  await choose(page.locator('#field-category'), 'Prints')
  // The one-screen editor (TASKS.md 27.2): the photo is dropped on the product, its intake filled in.
  await page.locator('#field-images input[type="file"]').setInputFiles({
    name: 'rehearsal-10-4.png',
    mimeType: 'image/png',
    buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 600, height: 400 } }),
  })
  await expect(page.locator('.pe-photo:not(.pe-photo--pending)')).toHaveCount(1, {
    timeout: 90_000,
  })
  await m.shot('r1-1-photo')
  await page.locator('#field-price').fill('95000')
  await m.shot('r1-2-filled')
  await m.click(page.getByRole('button', { name: 'Published', exact: true }))
  await expect(
    page.getByRole('button', { name: 'Published', exact: true }),
    'the Draft / Published control shows Published',
  ).toHaveAttribute('aria-pressed', 'true', { timeout: 120_000 })
  await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+/, { timeout: 60_000 })
  const id = Number(/products\/(\d+)/.exec(page.url())![1])
  const slug = await page.locator('#field-slug').first().inputValue()
  expect(slug, 'the slug the admin made from the name').not.toBe('')
  const published = m.seconds()
  record({ kind: 'product', id, sku: SKU, slug, name: NAME, width: widthOf(info) })
  await m.shot('r1-3-published')

  // Stock at three stores, in the product's own table: find the store, type the count.
  for (const store of ['DPS-004', 'DPS-008', 'CGU-001']) {
    await page.locator('#pe-stock-find').fill(store)
    const cell = page.locator('.pe-stock tbody tr').first().locator('input').first()
    await cell.fill('1')
    await cell.press('Tab')
    await expect(page.locator('.pe-stock .pe-cell-status', { hasText: 'Saved' })).toHaveCount(1)
    record({ kind: 'stock-level', store, product: id })
  }
  await m.shot('r1-4-stock')
  m.stop()
  const stocked = m.seconds()

  const live = await liveStatus(page, slug, 200, 120_000)
  m.stumble(
    `published ${published}s, stocked ${stocked}s; the public page answered 200 ${live}s after the last save`,
  )

  // Clean-up: unpublish, then the public page must 404.
  await unpublish(page, id)
  const gone = await liveStatus(page, slug, 404, 120_000)
  record({ kind: 'product-unpublished', id, slug, goneAfterSeconds: gone })
  m.finish('PASS', { publishedSeconds: published, stockedSeconds: stocked })
})
