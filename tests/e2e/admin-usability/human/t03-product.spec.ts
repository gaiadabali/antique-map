/**
 * T3 (the plan's §6, target 2:30) and T4 (recipe 3.3, target 5 min), at a person's pace, on the one-screen
 * product editor (TASKS.md 27.2): a product with six photos, two variants and stock at three stores, published;
 * a product with six variants from the builder. Both are REHEARSAL products, unpublished afterwards (off the
 * clock). Against a local production build, set E2E_BASE_SHOP, and USABILITY_STORES / USABILITY_CATEGORY to
 * that database's store codes and a category.
 */
import { expect, test, type Page } from '@playwright/test'

import { MARK, need, record, RUN, SHOP, sidebarLink, signIn, unpublish } from '../support'
import { Human } from './pace'
import { sixViews, stagingPhoto, type Upload } from './steps'

const stamp = () => `${RUN}-${Date.now().toString(36).slice(-4)}`
const STORES = (process.env.USABILITY_STORES ?? 'DPS-004,DPS-008,CGU-001').split(',')
const CATEGORY = process.env.USABILITY_CATEGORY ?? 'Prints'

/** A real product photograph from the admin, else a picture of the page (a local database without files). */
async function photo(page: Page): Promise<Upload> {
  try {
    return await stagingPhoto(page, 'product')
  } catch {
    const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 800 } })
    return { name: 'human-pace-product.png', mimeType: 'image/png', buffer }
  }
}

/** Name, SKU, category and description: the top of the editor. */
async function productHead(h: Human, sku: string, name: string): Promise<void> {
  const page = h.page
  await h.type(page.locator('#field-sku'), sku)
  await h.type(page.locator('#field-name'), name)
  await h.pick(page.locator('#field-category'), CATEGORY, CATEGORY.slice(0, 3))
  await h.type(
    page.locator('#field-description'),
    'A rehearsal product for the timed test. Not for sale.',
  )
}

/** The variant builder: one option per line of `options`, then Make variants. */
async function buildVariants(h: Human, options: [string, string][]): Promise<void> {
  const page = h.page
  for (const [i, [name, values]] of options.entries()) {
    if (i > 0) await h.click(page.getByRole('button', { name: 'Add an option' }))
    await h.type(page.locator(`#pe-option-name-${i}`), name)
    await h.type(page.locator(`#pe-option-values-${i}`), values)
  }
  await h.click(page.getByRole('button', { name: 'Make variants' }))
  await h.read(1.5)
}

async function saveDraft(h: Human): Promise<number> {
  const page = h.page
  await h.click(page.locator('#action-save-draft'))
  await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+/, { timeout: 60_000 })
  await h.read()
  return Number(/products\/(\d+)/.exec(page.url())![1])
}

async function publish(h: Human): Promise<void> {
  const published = h.page.getByRole('button', { name: 'Published', exact: true })
  await h.click(published)
  await expect(published).toHaveAttribute('aria-pressed', 'true', { timeout: 60_000 })
}

test.describe.serial('T3, T4 products', () => {
  test('T3 add a product, six photos, two variants, stock at three stores', async ({
    page,
  }, info) => {
    const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
    await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
    const photos = await sixViews(page, await photo(page))
    await page.goto(`${SHOP}/admin?locale=en`)
    await page.waitForLoadState('networkidle')
    const sku = `REH-H-${stamp()}`
    const name = `${MARK} human-pace product ${sku.slice(6)}`

    const h = new Human(page, info, 'T3', 'Add a product: 6 photos, 2 variants, 3 stores', 150)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/collections/products'))
    await h.read()
    await h.click(page.getByRole('link', { name: 'Create New' }).first())
    await h.read()
    await productHead(h, sku, name)
    // Six photos chosen at once in the file dialog.
    await h.file(page.locator('#field-images input[type="file"]'), photos)
    await expect(page.locator('.pe-photo:not(.pe-photo--pending)')).toHaveCount(6, {
      timeout: 90_000,
    })
    await h.read(2)
    await h.type(page.locator('#field-price'), '185000')
    await buildVariants(h, [['Size', 'A4, A3']])
    const id = await saveDraft(h)
    for (const [n, code] of STORES.entries()) {
      await h.type(page.locator('#pe-stock-find'), code, { replace: n > 0 })
      await h.read(1)
      const row = page.locator('.pe-stock tbody tr').first()
      for (const cell of await row.locator('input').all()) {
        await h.type(cell, String(n + 1))
        await page.keyboard.press('Tab')
      }
      await expect(row.locator('.pe-cell-status', { hasText: 'Saved' })).toHaveCount(2)
    }
    await publish(h)
    h.stop()
    await h.shot('t3-published')
    h.finish('unaided', { sku, id })
    record({ kind: 'human-product', id, sku })
    await unpublish(page, id)
  })

  test('T4 add a product with six variants', async ({ page }, info) => {
    const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
    await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
    const one = await photo(page)
    await page.goto(`${SHOP}/admin?locale=en`)
    await page.waitForLoadState('networkidle')
    const sku = `REH-V-${stamp()}`
    const name = `${MARK} human-pace variants ${sku.slice(6)}`
    const prices = ['150000', '175000', '220000', '250000', '320000', '360000']

    const h = new Human(page, info, 'T4', 'Add a product with six variants', 300)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/collections/products'))
    await h.read()
    await h.click(page.getByRole('link', { name: 'Create New' }).first())
    await h.read()
    await productHead(h, sku, name)
    await h.file(page.locator('#field-images input[type="file"]'), one)
    await expect(page.locator('.pe-photo:not(.pe-photo--pending)')).toHaveCount(1, {
      timeout: 60_000,
    })
    await h.type(page.locator('#field-price'), prices[0]!)
    await buildVariants(h, [
      ['Size', 'A4, A3, A2'],
      ['Paper', 'matte, cotton'],
    ])
    for (const [i, price] of prices.entries()) {
      if (i > 0) await h.type(page.locator(`#field-variants__${i}__price`), price)
    }
    await saveDraft(h)
    await publish(h)
    h.stop()
    const id = Number(/products\/(\d+)/.exec(page.url())![1])
    await h.shot('t4-published')
    h.finish('unaided', { sku, variants: prices.length })
    record({ kind: 'human-product', id, sku })
    await unpublish(page, id)
  })
})
