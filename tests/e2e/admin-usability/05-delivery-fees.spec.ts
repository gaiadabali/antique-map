/**
 * Recipe 5 (CONTENT-OPERATIONS.md 6.3, target: every band in under 2 minutes): the owner updates the delivery
 * fees. In this build the courier fee is entered by staff per order (COMMERCE.md 5, decision 2026-10-06; timed in
 * recipe 4's set-up), and what is left in Site settings > Shop > Delivery is the distance bands (the delivery
 * reach, "Up to km" and "Fee (IDR)") and the free-delivery threshold. The recipe edits every band's fee by +1,000
 * and the threshold by +1,000 and saves. If the bands show no fields to edit, the recipe FAILS with that reason;
 * if the threshold input is there it is still edited (and put back, off the stopwatch) to exercise the save path.
 */
import { expect, test, type Page } from '@playwright/test'

import { Meter, need, record, SHOP, signIn } from './support'

const FEE = 'input[id^="field-shop__delivery__bands__"][id$="__feeIdr"]'

async function save(page: Page, m?: Meter): Promise<void> {
  const button = page.getByRole('button', { name: 'Save' }).first()
  if (m) await m.click(button)
  else await button.click()
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
}

/**
 * Scroll the shop's Delivery group into being and open its rows. Payload renders form fields
 * lazily as they near the viewport (RenderFields), so the group, far down the page, exists only
 * once scrolled to; and it keeps each person's collapsed array rows, where a collapsed row shows
 * only its header (what read as "empty" in the first proxy run): Show All opens the bands.
 */
async function openBands(page: Page, m?: Meter): Promise<void> {
  const bands = page.locator('#field-shop__delivery__bands')
  for (let n = 0; n < 20 && (await bands.count()) === 0; n += 1) {
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(300)
  }
  await bands.scrollIntoViewIfNeeded()
  const showAll = bands.getByRole('button', { name: /^(Show All|Tampilkan Semua)$/ })
  if (m) await m.click(showAll)
  else await showAll.click()
  await expect(page.locator(FEE).first()).toBeVisible()
}

test('R5 owner: edit the delivery fees (the distance bands)', async ({ page }, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const m = new Meter(page, info, 'R5 edit the delivery fees', 120)

  m.start()
  await page.goto(`${SHOP}/admin`)
  await m.click(page.locator('.template-default__wrap a[href="/admin/globals/site-settings"]'))
  await expect(page).toHaveURL(/\/admin\/globals\/site-settings/)
  await page.waitForLoadState('networkidle')
  await openBands(page, m)
  const bandInputs = await page.locator(FEE).count()
  expect(bandInputs, 'the distance bands each show a fee to edit').toBeGreaterThan(0)
  await m.shot('r5-1-settings-delivery')
  m.stumble(
    'the distance band rows may open collapsed (Payload remembers it per person): Show All opens them',
  )
  // Every band's fee +1,000, saved: the recipe as written (restored off the stopwatch).
  const fees = page.locator(FEE)
  const before = await fees.evaluateAll((inputs) =>
    inputs.map((i) => (i as HTMLInputElement).value),
  )
  for (const value of before) expect(value, 'each band has a whole-rupiah fee').toMatch(/^\d+$/)
  for (let n = 0; n < before.length; n += 1)
    await fees.nth(n).fill(String(Number(before[n]) + 1000))
  await save(page, m)
  m.stop()
  m.finish('PASS', { bandInputs })
  record({ kind: 'delivery-band-fees-original', value: before.join(',') })

  try {
    await page.reload()
    await openBands(page)
    for (let n = 0; n < before.length; n += 1) {
      await expect(fees.nth(n)).toHaveValue(String(Number(before[n]) + 1000))
    }
  } finally {
    await page.reload()
    await openBands(page)
    for (let n = 0; n < before.length; n += 1) await fees.nth(n).fill(before[n]!)
    await save(page)
    await page.reload()
    await openBands(page)
    for (let n = 0; n < before.length; n += 1) {
      await expect(fees.nth(n), 'the original fees are back').toHaveValue(before[n]!)
    }
  }
})
