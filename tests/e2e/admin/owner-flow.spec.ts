/**
 * Phase 3's admin **Done when**, as the owner, in the admin, the way a non-developer does it: add
 * an antique with photos (upload the photo, catalogue the antique, publish it), add a store, add a
 * product, and give the product stock in two stores. Each step is timed into `drive.json`; every
 * save is checked against the database. Names carry the run's time, so a re-run adds its own.
 *
 * The stock step is marked `test.fail`: no one can enter a shelf count in the admin (D2,
 * `docs/gates/3.6.md`). It passes while the defect stands; drop the mark once it is fixed.
 */
import { expect, test } from '@playwright/test'

import { ACCOUNTS } from './accounts'
import { choose, chooseByLabel, setLanguage, signIn } from './admin'
import { record, shot } from './evidence'
import { fixtures, sql, type Fixtures } from './local.mjs'

const RUN = Date.now().toString(36).toUpperCase()
const STORE_CODE = `E2E-${RUN}`
const SKU = `E2E-PRINT-${RUN}`
const ALT = `A hand-coloured map of Bali, run ${RUN}`

let fx: Fixtures
const timings: Record<string, number> = {}
test.beforeAll(() => {
  fx = fixtures()
})
test.afterAll(async () => {
  await record('ownerFlow', {
    run: RUN,
    secondsPerStep: timings,
    totalSeconds: Math.round(Object.values(timings).reduce((sum, each) => sum + each, 0) * 10) / 10,
  })
})

/** Signs in as the owner, in English, and times `steps` as one step of the flow. */
function step(name: string, steps: (page: import('@playwright/test').Page) => Promise<void>) {
  test(name, async ({ page }) => {
    await signIn(page, ACCOUNTS.owner.email)
    await setLanguage(page, 'en')
    const started = Date.now()
    await steps(page)
    timings[name] = Math.round((Date.now() - started) / 100) / 10
  })
}

step('the owner uploads a photograph of the antique', async (page) => {
  const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 800 } })
  await page.goto('/admin/collections/media/create')
  await page.locator('input[type="file"]').setInputFiles({
    name: `bali-${RUN}.png`,
    mimeType: 'image/png',
    buffer: photo,
  })
  await page.locator('#field-alt').fill(ALT)
  await choose(page, '#field-subject', /work/i)
  await choose(page, '#field-role', /Recto/)
  await choose(page, '#field-provenance', /Photograph/)
  await page.locator('#action-save').click()
  await page.waitForURL(/\/admin\/collections\/media\/\d+$/)
  expect(Number(sql(`SELECT count(*) FROM media WHERE filename LIKE 'bali-${RUN}%'`))).toBe(1)
})

step('the owner catalogues the antique with its photo and publishes it', async (page) => {
  await page.goto('/admin/collections/works/create')
  await page.locator('#field-title').fill(`Bali, by Valentijn — run ${RUN}`)
  await choose(page, '#field-objectType', /map/i)
  await page
    .locator('#field-makers')
    .getByRole('button', { name: /Add Credit/ })
    .click()
  await choose(page, '#field-makers__0__maker', /E2E Valentijn/)
  await choose(page, '#field-makers__0__role', /./)
  await choose(page, '#field-makers__0__certainty', /./)
  await choose(page, '#field-date__precision', /exact|year/i)
  await page.locator('#field-date__from').fill('1726')
  await page
    .locator('#field-images')
    .getByRole('button', { name: /Add Image/ })
    .click()
  await page.locator('#field-images').getByRole('button', { name: 'Choose from existing' }).click()
  const drawer = page.locator('dialog, .drawer').last()
  await drawer
    .getByRole('button', { name: new RegExp(`bali-${RUN}`) })
    .first()
    .click()
  await chooseByLabel(page, /^Grade/, /E2E Very good/)
  await page.locator('#action-save').click()
  await page.waitForURL(/\/admin\/collections\/works\/\d+$/)
  const id = page.url().split('/').pop()
  expect(sql(`SELECT _status FROM works WHERE id = ${id}`)).toBe('published')
  await page.screenshot({ path: shot('owner-antique-published-1280') })
})

step('the owner adds a store', async (page) => {
  await page.goto('/admin/collections/stores/create')
  await page.locator('#field-code').fill(STORE_CODE)
  await page.locator('#field-name').fill(`E2E store, run ${RUN}`)
  await page.locator('#action-save').click()
  await page.waitForURL(/\/admin\/collections\/stores\/\d+$/)
  expect(Number(sql(`SELECT count(*) FROM stores WHERE code = '${STORE_CODE}'`))).toBe(1)
})

step('the owner adds a product', async (page) => {
  await page.goto('/admin/collections/products/create')
  await page.locator('#field-sku').fill(SKU)
  await page.locator('#field-name').fill(`Bali map print, run ${RUN}`)
  await page.locator('#field-price').fill('250000')
  await page.locator('#action-save-draft').click()
  await page.waitForURL(/\/admin\/collections\/products\/\d+$/)
  expect(sql(`SELECT price FROM products WHERE sku = '${SKU}'`)).toBe('250000')
})

test.describe('stock', () => {
  // D2: `physicalCount` is a virtual field, which Payload makes read-only in the admin.
  test.fail(true, 'D2: no one can enter a shelf count in the admin')
  step('the owner gives the product stock in two stores', async (page) => {
    // The pickers list stores and products by name.
    const name = (code: string) => sql(`SELECT name FROM stores WHERE code = '${code}'`)
    for (const [code, count] of [
      [STORE_CODE, 5],
      [fx.stores.a.code, 3],
    ] as const) {
      await page.goto('/admin/collections/stock-levels/create')
      await chooseByLabel(page, /^Store/, name(code), name(code))
      await chooseByLabel(page, /^Product/, `run ${RUN}`, `run ${RUN}`)
      await page.screenshot({ path: shot('owner-stock-count-1280') })
      await page.locator('#field-physicalCount').fill(String(count), { timeout: 5_000 })
      await page.locator('#action-save').click()
      await page.waitForURL(/\/admin\/collections\/stock-levels\/\d+$/)
    }
    const rows = sql(
      `SELECT count(*) FROM stock_levels s JOIN products p ON p.id = s.product_id WHERE p.sku = '${SKU}'`,
    )
    expect(Number(rows)).toBe(2)
  })
})
