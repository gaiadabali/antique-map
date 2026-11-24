/**
 * The one-screen product editor and the product list (TASKS.md 27.2), as the owner on a production
 * build: a new product with six photos dropped at once, two variants from the builder, stock at three
 * stores in the product's own table, published from the Draft / Published control; then the list's
 * thumbnail, total stock, quick filters and bulk move, and Duplicate. Every save is checked in the
 * database; the editor and the list pass axe at 390 and 1280 px. Screenshots go to `P27_SHOTS`
 * (default: Playwright's output folder), never the repo.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS } from './accounts'
import { choose, setLanguage, signIn } from './admin'
import { sql } from './local.mjs'

const RUN = Date.now().toString(36).toUpperCase()
const SKU = `E2E-PE-${RUN}`
const NAME = `Editor print, run ${RUN}`

test.describe.configure({ mode: 'serial' })

let productId = 0
let stores: Array<{ id: number; code: string; name: string }> = []

const shots = (name: string) => `${process.env.P27_SHOTS ?? test.info().outputDir}/${name}.png`

/** What this task adds to the screen: every one must be axe clean, with no exception. */
const OURS = ['.pe-section', '.pe-status', '.pe-listbar', '.pe-doc-actions', '.pe-thumb']
/**
 * Payload's stock admin markup the foundation gate recorded as F6 (`docs/gates/foundation.md`):
 * react-select's inputs and indicators, the unnamed popup and pager buttons, the document header's
 * tabs, the list's unlabelled row checkboxes, and its missing `<main>` (every `region` and landmark
 * node). Excused here and counted in the test's output; anything else on the page fails, and the
 * parts this task adds (`OURS`) are checked on their own with no exception.
 */
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
  ).toEqual([])
  const { violations } = await new AxeBuilder({ page }).analyze()
  const nodes = violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`))
  const excused = nodes.filter((node) => F6.test(node))
  if (excused.length)
    console.log(`axe ${label}: ${excused.length} F6 node(s) of Payload's own UI excused`)
  expect(nodes.filter((node) => !F6.test(node))).toEqual([])
}

/** Six small photographs, drawn in the page: distinct pictures, real JPEGs. */
async function sixPhotos(page: Page) {
  const parts: string[] = await page.evaluate(() =>
    Array.from({ length: 6 }, (_, i) => {
      const canvas = document.createElement('canvas')
      canvas.width = 480
      canvas.height = 360
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = `hsl(${i * 55}, 45%, 55%)`
      ctx.fillRect(0, 0, 480, 360)
      ctx.fillStyle = 'white'
      ctx.font = '64px sans-serif'
      ctx.fillText(String(i + 1), 210, 200)
      return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]!
    }),
  )
  return parts.map((b64, i) => ({
    name: `editor-${RUN}-${i + 1}.jpg`,
    mimeType: 'image/jpeg',
    buffer: Buffer.from(b64, 'base64'),
  }))
}

test.beforeAll(() => {
  stores = sql(
    `SELECT id || '|' || code || '|' || name FROM stores WHERE active ORDER BY code LIMIT 3`,
  )
    .split('\n')
    .map((line) => {
      const [id, code, name] = line.split('|')
      return { id: Number(id), code: code!, name: name! }
    })
  expect(stores).toHaveLength(3)
})

test('the owner adds a product with six photos, two variants and stock at three stores', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner.email)
  await setLanguage(page, 'en')
  await page.goto('/admin/collections/products/create?locale=en')
  await page.locator('#field-sku').fill(SKU)
  await page.locator('#field-name').fill(NAME)
  await choose(page, '#field-category', /./)
  await page.locator('#field-description').fill('A print made in the 27.2 editor test.')
  await page.locator('#field-images input[type="file"]').setInputFiles(await sixPhotos(page))
  await expect(page.locator('.pe-photo:not(.pe-photo--pending)')).toHaveCount(6, {
    timeout: 60_000,
  })
  await expect(page.locator('.pe-photo').first()).toContainText('Cover')
  // Drag the last photo to the front: it becomes the cover. Once the form has taken the new rows
  // (its form-state round trip), as a person would only look up after the photos appear.
  await page.waitForLoadState('networkidle')
  const pictures = page.locator('.pe-photo img')
  const sixth = await pictures.nth(5).getAttribute('src')
  // Both rows of tiles in view, so the drop lands where the picture is let go.
  await page.setViewportSize({ width: 1280, height: 1600 })
  await page.locator('.pe-photos').scrollIntoViewIfNeeded()
  await page.locator('.pe-photo__handle').nth(5).dragTo(page.locator('.pe-photo').first())
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(pictures.first()).toHaveAttribute('src', sixth!)
  await expect(page.locator('.pe-photo').first()).toContainText('Cover')
  await page.locator('#field-price').fill('185000')
  await page.locator('#pe-option-name-0').fill('Size')
  await page.locator('#pe-option-values-0').fill('A4, A3')
  await page.getByRole('button', { name: 'Make variants' }).click()
  await expect(page.locator('#field-variants__1__sku')).toHaveValue(`${SKU}-A3`)
  await page.locator('#field-variants__1__price').fill('245000')
  await page.locator('#action-save-draft').click()
  await page.waitForURL(/\/admin\/collections\/products\/\d+/)
  productId = Number(/products\/(\d+)/.exec(page.url())![1])

  const images = sql(
    `SELECT string_agg(m.subject || ':' || m.role || ':' || m.provenance, ',' ORDER BY i._order) FROM products_images i JOIN media m ON m.id = i.image_id WHERE i._parent_id = ${productId}`,
  )
  expect(images.split(',')).toEqual(Array(6).fill('product:flat:photograph'))
  expect(
    sql(
      `SELECT m.filename FROM products_images i JOIN media m ON m.id = i.image_id WHERE i._parent_id = ${productId} ORDER BY i._order LIMIT 1`,
    ),
  ).toMatch(/-6/)
  expect(
    sql(
      `SELECT string_agg(sku || ':' || coalesce(price::text, '-'), ',' ORDER BY _order) FROM products_variants WHERE _parent_id = ${productId}`,
    ),
  ).toBe(`${SKU}-A4:-,${SKU}-A3:245000`)

  for (const [n, store] of stores.entries()) {
    await page.locator('#pe-stock-find').fill(store.code)
    for (const size of ['A4', 'A3']) {
      const cell = page.getByRole('textbox', { name: `${store.name}, ${size}` })
      await cell.fill(String(n + 2))
      await cell.press('Tab')
    }
    await expect(page.locator('.pe-stock .pe-cell-status', { hasText: 'Saved' })).toHaveCount(2)
  }
  expect(
    sql(
      `SELECT count(*) || ':' || sum(quantity) FROM stock_levels WHERE product_id = ${productId}`,
    ),
  ).toBe('6:18')

  await page.getByRole('button', { name: 'Published', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Published', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 30_000 },
  )
  expect(sql(`SELECT _status FROM products WHERE id = ${productId}`)).toBe('published')
  await page.screenshot({ path: shots('editor-published-1280'), fullPage: true })
})

test('the editor and the list pass axe at 390 and 1280 px', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/admin/collections/products/${productId}`)
    await expect(page.locator('.pe-photo')).toHaveCount(6)
    await page.screenshot({ path: shots(`editor-${width}`), fullPage: true })
    await axeClean(page, `editor-${width}`)
    const wide = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(wide, 'nothing wider than the screen').toBeLessThanOrEqual(width)
    await page.goto('/admin/collections/products')
    await expect(page.locator('.pe-listbar')).toBeVisible()
    await page.screenshot({ path: shots(`list-${width}`), fullPage: true })
    await axeClean(page, `list-${width}`)
  }
})

test('the list shows the thumbnail and total stock, filters and moves in bulk', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner.email)
  await page.goto(`/admin/collections/products?search=${SKU}`)
  const row = page.locator('tr', { hasText: SKU }).first()
  await expect(row.locator('img.pe-thumb')).toBeVisible()
  await expect(row).toContainText('18 in stock')
  await page.getByRole('link', { name: 'Drafts' }).click()
  await expect(page).toHaveURL(
    /where%5B_status%5D%5Bequals%5D=draft|where\[_status\]\[equals\]=draft/,
  )
  await expect(page.getByRole('link', { name: 'Drafts' })).toHaveAttribute('aria-current', 'page')
  await page.goto(`/admin/collections/products?search=${SKU}`)
  await row.locator('input[type="checkbox"]').first().check()
  const target = sql(
    `SELECT c.id FROM categories c WHERE c.id <> (SELECT category_id FROM products WHERE id = ${productId}) ORDER BY c.id LIMIT 1`,
  )
  await page.locator('#pe-bulk-category').selectOption(target)
  await page.getByRole('button', { name: 'Move', exact: true }).click()
  await expect(page.locator('[data-sonner-toast]').first()).toContainText('Moved 1')
  expect(sql(`SELECT category_id FROM products WHERE id = ${productId}`)).toBe(target)
})

test('Duplicate makes a draft copy with its own SKUs', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  await page.goto(`/admin/collections/products/${productId}`)
  await expect(page.getByRole('link', { name: 'View on the site' })).toHaveAttribute(
    'href',
    /\/product\//,
  )
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
  await page.waitForURL(
    (url) => !url.pathname.endsWith(`/${productId}`) && /\/products\/\d+$/.test(url.pathname),
  )
  const copy = Number(/products\/(\d+)/.exec(page.url())![1])
  expect(sql(`SELECT sku || ':' || _status FROM products WHERE id = ${copy}`)).toBe(
    `${SKU}-COPY:draft`,
  )
  await expect(page.getByRole('button', { name: 'Draft', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
