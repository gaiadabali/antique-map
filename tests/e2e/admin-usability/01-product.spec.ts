/**
 * Recipe 1 (CONTENT-OPERATIONS.md 3.3, target under 3 minutes): the owner adds a product and publishes it,
 * then puts stock at three stores. Timed from the dashboard to "published" (A) and to "stock entered" (B).
 * The product is marked REHEARSAL 10.4 and unpublished at the end; the public page must then answer 404.
 */
import { expect, test, type Page } from '@playwright/test'

import { choose, MARK, Meter, need, record, RUN, SHOP, signIn, unpublish, widthOf } from './support'

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
  await page.goto(`${SHOP}/admin`)
  await m.click(
    page.locator('.template-default__wrap a.card__click[href="/admin/collections/products"]'),
  )
  await expect(page).toHaveURL(/\/collections\/products\?/)
  await m.click(page.getByRole('link', { name: 'Create New' }).first())
  await page.locator('#field-sku').fill(SKU)
  await page.locator('#field-name').fill(NAME)
  await page
    .locator('#field-description')
    .fill('A rehearsal product from the 10.4 timed admin test. Not for sale.')
  await choose(page.locator('#field-category'), 'Prints')
  await m.click(page.getByRole('button', { name: 'Add Image' }))
  await m.click(page.getByRole('button', { name: 'Create New' }))
  const drawer = page.locator('.drawer__content, .drawer').last()
  await drawer.locator('input[type="file"]').setInputFiles({
    name: 'rehearsal-10-4.png',
    mimeType: 'image/png',
    buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 600, height: 400 } }),
  })
  await drawer.locator('#field-alt').fill('A rehearsal image for the 10.4 admin test')
  await m.shot('r1-1-image-drawer')
  await choose(drawer.locator('#field-subject'), /product/i)
  await choose(drawer.locator('#field-role'))
  await choose(drawer.locator('#field-provenance'), /photo/i)
  await m.click(drawer.getByRole('button', { name: 'Save' }))
  await expect(drawer).toBeHidden()
  await page.locator('#field-price').fill('95000')
  await m.shot('r1-2-filled')
  await m.click(page.getByRole('button', { name: 'Publish changes' }))
  const pubToast = page.locator('[data-sonner-toast]').filter({ hasNotText: 'Image' }).first()
  await expect(pubToast).toBeVisible({ timeout: 120_000 })
  const publishToast = (await pubToast.innerText()).replace(/\s+/g, ' ')
  m.stumble(`message after Publish: "${publishToast}"`)
  await expect(
    page,
    `after Publish the page stayed put; the message said: ${publishToast}`,
  ).toHaveURL(/\/admin\/collections\/products\/\d+/, { timeout: 60_000 })
  const id = Number(/products\/(\d+)/.exec(page.url())![1])
  const slug = await page.locator('#field-slug').first().inputValue()
  expect(slug, 'the slug the admin made from the name').not.toBe('')
  const published = m.seconds()
  record({ kind: 'product', id, sku: SKU, slug, name: NAME, width: widthOf(info) })
  await m.shot('r1-3-published')

  // Stock at three stores: Stock > Create New, three times.
  for (const store of ['Denpasar 004', 'Denpasar 008', 'Canggu 001']) {
    if (store === 'Denpasar 004') {
      await m.click(page.locator('a[href="/admin"]:visible').first())
      await expect(page).toHaveURL(/\/admin$/)
      await page.waitForLoadState('networkidle')
      await m.click(
        page.locator(
          '.template-default__wrap a.card__click[href="/admin/collections/stock-levels"]',
        ),
      )
    } else {
      // The saved record has no visible way to the next stock row (the sidebar is closed): back to the list by
      // address, counted as a page load, not a click.
      await page.goto(`${SHOP}/admin/collections/stock-levels`)
    }
    await expect(page).toHaveURL(/\/collections\/stock-levels\?/)
    await m.click(page.getByRole('link', { name: 'Create New' }).first())
    const storeField = page.locator('#field-store')
    await choose(storeField, store)
    const productField = page.locator('#field-product')
    await productField.locator('input').fill(SKU)
    await choose(productField, NAME)
    await page.getByLabel(/count on the shelf/i).fill('1')
    await m.click(page.getByRole('button', { name: 'Save' }))
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
    const stockId = /stock-levels\/(\d+)/.exec(page.url())?.[1]
    record({ kind: 'stock-level', id: stockId ?? null, store, product: id })
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
