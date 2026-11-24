/**
 * Stores and stock (TASKS.md 27.4) on a production build: the stock matrix (a store user counts one
 * product at a person's pace and sees only their store's column; the owner's columns, the low-stock
 * filter and the pages), the import screen (an Excel stock file previewed — the rejected rows first
 * — and applied) and the store location field (a pasted pin, a nudge, the Google Maps check, and
 * the keyless address search). Every save is checked in the database and put back; each new screen
 * passes axe at 390 and 1280 px. Screenshots go to `P27_SHOTS` (default: Playwright's output
 * folder), never the repo.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { makeXlsx } from '../../../engine/packages/cms-core/src/import/xlsx.test-support'
import { ACCOUNTS } from './accounts'
import { setLanguage, signIn } from './admin'
import { sql } from './local.mjs'

test.describe.configure({ mode: 'serial' })

const shots = (name: string) => `${process.env.P27_SHOTS ?? test.info().outputDir}/${name}.png`
const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 800 }

/** What this task adds to the screen: every one must be axe clean, with no exception. */
const OURS = ['.sm-scroll', '.ix-filter', '.ix-tabs', '.ix-pager', '.si-kinds', '.lc-finder']
/**
 * Payload's own admin markup recorded as F6 (`docs/gates/foundation.md`), as `product-editor.spec`;
 * the select's indicators since phase 28 gave a store its region (a Payload select field), as
 * `shop-admin-gate.spec` already excuses them.
 */
const F6 =
  /rs__|react-select|popup-button|popup__trigger|doc-tabs|doc-header|doc-controls|clickable-arrow|#select-all|dropdown-indicator|clear-indicator|^label: #_R_|^landmark-|^region: /

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

/**
 * A person's pace, the timed test's model (`tests/e2e/admin-usability/human/pace.ts` PACE): reading
 * the task first, a glance at each page that loads, finding each control before a tap, about four
 * typed characters a second. Means, not jittered: the measured time is the model's plus the server's.
 */
const PACE = { start: 6, tapThink: 1.5, read: 2, fieldThink: 1.2, charMs: 250 }
const pause = (page: Page, seconds: number) => page.waitForTimeout(seconds * 1000)
async function typeAtPace(page: Page, text: string) {
  for (const ch of text) {
    await page.keyboard.type(ch)
    await page.waitForTimeout(PACE.charMs)
  }
}

/**
 * The phone width, as a person on a phone has it. Payload keeps its sidebar drawn open when a
 * desktop window is narrowed, so a page reached by its address is loaded again at the phone width
 * (a form mid-way is driven at the phone width from the start instead); then nothing on the page
 * may be wider than the screen.
 */
async function toPhone(page: Page, reload = true) {
  await page.setViewportSize(PHONE)
  if (reload) await page.reload()
  await page.waitForLoadState('networkidle')
  const wide = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(wide, 'no horizontal scroll at 390 px').toBeLessThanOrEqual(PHONE.width)
}

type Target = {
  id: number
  /** The line's SKU: the variant's, or the product's own. */
  sku: string
  productSku: string
  variantSku: string
  quantity: number
  store: string
}
let target: Target

test.beforeAll(() => {
  // A line on a later page of store A's stock (as T5 picked one): its row, its SKU, its count.
  const line = sql(
    `SELECT sl.id || '|' || coalesce(nullif(sl.variant_sku, ''), p.sku) || '|' || p.sku || '|' ||
            coalesce(sl.variant_sku, '') || '|' || sl.quantity || '|' || s.code
       FROM stock_levels sl JOIN products p ON p.id = sl.product_id JOIN stores s ON s.id = sl.store_id
       JOIN users u ON u.store_id = sl.store_id
      WHERE u.email = '${ACCOUNTS.storeA.email}' ORDER BY p.sku, sl.variant_sku OFFSET 60 LIMIT 1`,
  )
  const [id, sku, productSku, variantSku, quantity, store] = line.split('|')
  target = {
    id: Number(id),
    sku: sku!,
    productSku: productSku!,
    variantSku: variantSku ?? '',
    quantity: Number(quantity),
    store: store!,
  }
  expect(target.sku).toBeTruthy()
})

test('a store user updates one count at a person’s pace, on a phone, in their column alone', async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await signIn(page, ACCOUNTS.storeA.email)
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  const next = String(target.quantity + 3)

  const t0 = Date.now()
  await pause(page, PACE.start)
  const open = page
    .getByRole('button', { name: /^(Open Menu|Buka Menu)$/ })
    .filter({ visible: true })
  if ((await open.count()) > 0) {
    await pause(page, PACE.tapThink)
    await open.first().click()
  }
  await pause(page, PACE.tapThink)
  await page.locator('nav a.nav__link[href="/admin/stock"]').first().click()
  await page.waitForURL(/\/admin\/stock$/)
  await page.waitForLoadState('networkidle')
  await pause(page, PACE.read)
  await pause(page, PACE.fieldThink)
  await page.locator('#sm-q').click()
  // The part of the SKU that tells the product apart, as the screen's hint says ("search by part
  // of the SKU"): every catalogue SKU shares its first segment (`SEED-`, `OEI-`), so a person
  // types the rest of the product's SKU — e.g. `MP.085` — and taps their variant's row.
  const typed = target.productSku.split('-').slice(1).join('-') || target.productSku
  await typeAtPace(page, typed)
  // The list narrows as they type: no Enter, no page load; they glance at the rows that remain.
  await page.waitForURL(/\/admin\/stock\?q=/)
  await expect(page.locator(`input[data-sku="${target.sku}"]`)).toBeVisible()
  await pause(page, PACE.read)
  const cell = page.locator(`input[data-sku="${target.sku}"][data-store="${target.store}"]`)
  await pause(page, PACE.tapThink)
  await cell.click()
  await page.keyboard.press('Control+A')
  await typeAtPace(page, next)
  await page.keyboard.press('Enter')
  await expect(cell.locator('xpath=..').locator('.sm-status')).toBeVisible()
  const seconds = (Date.now() - t0) / 1000
  console.log(
    `27.4 timed count: ${seconds.toFixed(1)} s (store user, 390 px, typed "${typed}", pace model ${JSON.stringify(PACE)})`,
  )
  expect(seconds).toBeLessThanOrEqual(20)

  // Their store's column alone, and the count stored less the units held (none on this row).
  await expect(page.locator('thead .sm-store')).toHaveCount(1)
  await expect(page.locator('thead .sm-store')).toContainText(target.store)
  const stored = Number(sql(`SELECT quantity FROM stock_levels WHERE id = ${target.id}`))
  expect(stored).toBeGreaterThan(target.quantity)
  expect(stored).toBeLessThanOrEqual(target.quantity + 3)
  await page.screenshot({ path: shots('matrix-store-390'), fullPage: true })
  await axeClean(page, 'matrix store 390')
  await page.setViewportSize(DESKTOP)
  await page.screenshot({ path: shots('matrix-store-1280'), fullPage: true })
  await axeClean(page, 'matrix store 1280')
  sql(`UPDATE stock_levels SET quantity = ${target.quantity} WHERE id = ${target.id}`)
})

test('the owner sees every open store, a low-stock filter at the threshold, and pages', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP)
  await signIn(page, ACCOUNTS.owner.email)
  await setLanguage(page, 'en')
  await page.goto('/admin/stock')
  const open = Number(sql(`SELECT count(*) FROM stores WHERE active`))
  // Ten store columns a page, with their own pager; the products 25 a page.
  await expect(page.locator('thead .sm-store')).toHaveCount(Math.min(open, 10))
  if (open > 10) {
    await expect(page.locator('.sm-store-pager')).toContainText(`Stores 1–10 of ${open}`)
  }
  await expect(page.locator('.ix-pager:not(.sm-store-pager)')).toContainText(/Page 1 of \d+/)
  await page.screenshot({ path: shots('matrix-owner-1280') })
  await axeClean(page, 'matrix owner 1280')

  // One store picked, then the low filter: every line shown has a low count, named in words.
  await page
    .locator('#sm-store')
    .selectOption(sql(`SELECT id FROM stores WHERE code = '${target.store}'`))
  await page.getByRole('button', { name: 'Find' }).click()
  await page.waitForURL(/store=/)
  await expect(page.locator('thead .sm-store')).toHaveCount(1)
  await page.getByRole('link', { name: /Low stock \(at or below \d+\)/ }).click()
  await page.waitForURL(/low=1/)
  const rows = page.locator('.sm-table tbody tr')
  const count = await rows.count()
  if (count > 0) {
    for (let i = 0; i < Math.min(count, 10); i += 1) {
      await expect(rows.nth(i).locator('.sm-low').first()).toBeVisible()
    }
  }
  await toPhone(page)
  await page.screenshot({ path: shots('matrix-owner-low-390'), fullPage: true })
  await axeClean(page, 'matrix owner low 390')
})

test('the owner imports an Excel stock file: previewed, rejected rows first, applied', async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await signIn(page, ACCOUNTS.owner.email)
  await page.goto('/admin/stock-import')
  const workbook = makeXlsx([
    ['store_code', 'sku', 'variant_sku', 'quantity'],
    [target.store, target.productSku, target.variantSku || null, target.quantity + 5],
    [target.store, 'NO-SUCH-SKU-274', null, 1],
    [target.store, 'ALSO-BAD', null, 'lima'],
  ])
  await expect(page.getByRole('radio', { name: 'Stock counts' })).toBeChecked()
  await page.locator('#stock-import-file').setInputFiles({
    name: 'stock-27-4.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(workbook),
  })
  await page.getByRole('button', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: /preview: nothing is saved yet/i })).toBeVisible()
  // The rows that cannot be used come first, each with its reason; then the one change.
  const headings = await page.locator('.ix-card h3').allTextContents()
  expect(headings[0]).toMatch(/cannot be used/i)
  expect(headings[1]).toMatch(/change/i)
  await expect(page.locator('.ix-rows--problem li').first()).toContainText(/quantity/i)
  await toPhone(page, false)
  await page.screenshot({ path: shots('import-xlsx-preview-390'), fullPage: true })
  await axeClean(page, 'import preview 390')
  await page.setViewportSize(DESKTOP)
  await page.screenshot({ path: shots('import-xlsx-preview-1280'), fullPage: true })
  await axeClean(page, 'import preview 1280')

  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('heading', { name: 'Applied' })).toBeVisible()
  expect(Number(sql(`SELECT quantity FROM stock_levels WHERE id = ${target.id}`))).toBeGreaterThan(
    target.quantity,
  )
  await page.screenshot({ path: shots('import-xlsx-applied-390'), fullPage: true })
  sql(`UPDATE stock_levels SET quantity = ${target.quantity} WHERE id = ${target.id}`)
})

test('a store’s location from a pasted pin, nudged, checked on Google Maps', async ({ page }) => {
  await page.setViewportSize(PHONE)
  await signIn(page, ACCOUNTS.owner.email)
  const id = sql(`SELECT id FROM stores WHERE code = '${target.store}'`)
  await page.goto(`/admin/collections/stores/${id}`)
  await page.getByRole('button', { name: 'Location', exact: true }).click()
  const finder = page.locator('.lc-finder')
  await expect(finder).toBeVisible()

  // No Maps key on a local build: an address finds nothing and says so, without calling out.
  await page.locator('#lc-query').fill('Jl. Raya Ubud')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(finder.locator('.lc-notice')).toContainText(/no Maps key/i)

  // A pasted "lat, lng" sets the pin; the number fields show it; North moves it 10 m.
  await page.locator('#lc-query').fill('-8.650000, 115.216000')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('#field-lat')).toHaveValue('-8.65')
  await expect(page.locator('#field-lng')).toHaveValue('115.216')
  await page.getByRole('button', { name: /Move the pin 10 m north/ }).click()
  await expect(page.locator('#field-lat')).toHaveValue('-8.64991')
  const link = finder.getByRole('link', { name: /Check on Google Maps/ })
  await expect(link).toHaveAttribute(
    'href',
    'https://www.google.com/maps/search/?api=1&query=-8.64991,115.216',
  )
  await expect(link).toHaveAttribute('target', '_blank')
  await toPhone(page, false)
  await finder.scrollIntoViewIfNeeded()
  await page.screenshot({ path: shots('store-location-390'), fullPage: true })
  await axeClean(page, 'store location 390')
  await page.setViewportSize(DESKTOP)
  await finder.scrollIntoViewIfNeeded()
  await page.screenshot({ path: shots('store-location-1280'), fullPage: true })
  await axeClean(page, 'store location 1280')
  // Nothing was saved: the form is left without pressing Save.
})
