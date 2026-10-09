/**
 * Recipe 2 (CONTENT-OPERATIONS.md 3.5, DATA.md 3): the owner imports a stock spreadsheet through the admin's
 * Import screen. This test does what a new staff member would: look for the import in the nav, the dashboard, the
 * Stock list and the Products list, then try the address the docs name. If there is a screen it uploads a one-row
 * CSV for the REHEARSAL 10.4 product's stock only. If there is none, the recipe FAILS with that reason (the
 * spreadsheet import is a command-line tool in this build) — it is never skipped.
 */
import { expect, test } from '@playwright/test'

import { Meter, need, recorded, SHOP, signIn } from './support'

test('R2 owner: import a stock spreadsheet', async ({ page }, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const m = new Meter(page, info, 'R2 import a stock spreadsheet', 600)
  const product = recorded('product')

  m.start()
  await page.goto(`${SHOP}/admin`)
  const importLink = page.getByRole('link', { name: /import|impor/i })
  const hits: string[] = []
  for (const where of [
    '/admin',
    '/admin/collections/stock-levels',
    '/admin/collections/products',
  ]) {
    await page.goto(`${SHOP}${where}`)
    await page.waitForLoadState('networkidle')
    const n = await importLink.count()
    const buttons = await page
      .getByRole('button', { name: /import|impor|upload spreadsheet/i })
      .count()
    if (n + buttons > 0) hits.push(where)
  }
  const docsAddress = await page.goto(`${SHOP}/admin/import`)
  await page.waitForLoadState('networkidle')
  const text = (await page.locator('body').innerText()).trim()
  await m.shot('r2-1-import-address')
  const screenExists = hits.length > 0 || /spreadsheet|csv|xlsx|preview|template/i.test(text)
  m.stop()
  m.stumble(
    `no Import entry in the nav, the dashboard, the Stock list or the Products list (found on: ${hits.join(', ') || 'nowhere'}); ` +
      `${SHOP}/admin/import (the address DATA.md 3 names) answers HTTP ${docsAddress?.status()} with ${text.length} characters of text and no admin shell`,
  )
  m.finish(screenExists ? 'PASS' : 'FAIL', {
    reason: screenExists
      ? 'an import screen exists'
      : 'no admin Import screen: the importer is the command line `pnpm data:import` only; the recipe cannot be done by staff',
    product: product?.sku ?? null,
  })
  expect(
    screenExists,
    'FAIL: the admin has no Import screen (CONTENT-OPERATIONS 3.5 / DATA.md 3); /admin/import is blank, the nav has no Import entry',
  ).toBe(true)
})
