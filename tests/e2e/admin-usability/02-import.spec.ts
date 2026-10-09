/**
 * Recipe 2 (CONTENT-OPERATIONS.md 3.5, DATA.md 3, target 10 minutes): the owner imports a stock spreadsheet on the
 * admin's stock import screen (/admin/stock-import, 10.8.a). A new staff member finds it from the sidebar's
 * "Import stock" link (or, with the sidebar closed, the address the manual gives), uploads a one-row CSV for the
 * REHEARSAL 10.4 product's stock at DPS-004 only, reads the Preview (nothing is saved), then presses Apply.
 * A recipe that finds no screen FAILS with that reason; it is never skipped.
 */
import { expect, test } from '@playwright/test'

import { Meter, need, recorded, SHOP, signIn } from './support'

test('R2 owner: import a stock spreadsheet', async ({ page }, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const m = new Meter(page, info, 'R2 import a stock spreadsheet', 600)
  const product = recorded('product')
  const sku = String(product?.sku ?? '')
  expect(sku, 'recipe 1 recorded the REHEARSAL product (run 01 first)').not.toBe('')

  m.start()
  await page.goto(`${SHOP}/admin`)
  await page.waitForLoadState('networkidle')
  const link = page.getByRole('link', { name: /import stock|impor stok/i })
  if ((await link.count()) > 0 && (await link.first().isVisible())) {
    await m.click(link.first())
  } else {
    m.stumble('the sidebar is closed at this width, so the "Import stock" link was not visible')
    await page.goto(`${SHOP}/admin/stock-import`)
  }
  await page.waitForLoadState('networkidle')
  await expect(
    page.getByRole('heading', { name: /import stock from a spreadsheet/i }),
  ).toBeVisible()
  await m.shot('r2-1-stock-import')

  // The one row: two units at DPS-004 (recipe 1 left one), a change the preview must show.
  const csv = `store_code,sku,variant_sku,quantity\nDPS-004,${sku},,2\n`
  await page
    .locator('#stock-import-file')
    .setInputFiles({ name: 'rehearsal-stock.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await m.click(page.getByRole('button', { name: 'Preview' }))
  await expect(page.getByRole('heading', { name: /preview: nothing is saved yet/i })).toBeVisible()
  await expect(page.getByText(sku).first()).toBeVisible()
  await m.shot('r2-2-preview')

  await m.click(page.getByRole('button', { name: 'Apply' }))
  await expect(page.getByRole('heading', { name: 'Applied' })).toBeVisible()
  m.stop()
  await m.shot('r2-3-applied')
  m.finish('PASS', { product: sku, store: 'DPS-004' })
})
