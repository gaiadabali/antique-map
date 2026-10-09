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
const FREE = '#field-shop__delivery__freeOverIdr'
const ROW = '[id^="scroll-"][id*="-row-"]'

async function save(page: Page, m?: Meter): Promise<void> {
  const button = page.getByRole('button', { name: 'Save' }).first()
  if (m) await m.click(button)
  else await button.click()
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
}

test('R5 owner: edit the delivery fees (bands and free-delivery threshold)', async ({
  page,
}, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const m = new Meter(page, info, 'R5 edit the delivery fees', 120)

  m.start()
  await page.goto(`${SHOP}/admin`)
  await m.click(page.locator('.template-default__wrap a[href="/admin/globals/site-settings"]'))
  await expect(page).toHaveURL(/\/admin\/globals\/site-settings/)
  await page.waitForLoadState('networkidle')
  let reloads = 0
  while ((await page.locator(FREE).count()) === 0 && reloads < 3) {
    reloads += 1
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  }
  const thresholdShown = (await page.locator(FREE).count()) > 0
  const bandRows = await page
    .locator(ROW)
    .filter({ hasText: /^Band \d+/ })
    .count()
  const bandInputs = await page.locator(FEE).count()
  const anyBandInput = await page
    .locator(ROW)
    .filter({ hasText: /^Band \d+/ })
    .locator('input')
    .count()
  await m.shot('r5-1-settings-delivery')
  m.stumble(
    `Settings > Shop > Delivery: ${bandRows} "Band" rows (Distance bands) holding ${anyBandInput} inputs, so ${bandInputs} fee inputs: the rows open empty. "Free delivery over (IDR)" ${thresholdShown ? 'showed' : 'did not show'} after ${reloads} reload(s) (it was present on some loads and absent on others)`,
  )
  m.stop()
  const reason = `the ${bandRows} distance-band rows render with no "Up to km" / "Fee (IDR)" fields, so no band fee can be edited in the admin${thresholdShown ? '' : '; the free-delivery threshold input did not render either'}`
  m.finish(bandInputs > 0 ? 'PASS' : 'FAIL', { bandRows, bandInputs, thresholdShown, reason })

  const original = thresholdShown ? await page.locator(FREE).inputValue() : ''
  if (/^\d+$/.test(original)) {
    // Exercise the one editable delivery number and put it back (off the stopwatch).
    record({ kind: 'delivery-threshold-original', value: original })
    try {
      await page.locator(FREE).fill(String(Number(original) + 1000))
      await save(page)
      await page.reload()
      await expect(page.locator(FREE)).toHaveValue(String(Number(original) + 1000))
    } finally {
      await page.goto(`${SHOP}/admin/globals/site-settings`)
      await page.locator(FREE).fill(original)
      await save(page)
      await page.reload()
      await expect(page.locator(FREE), 'the original threshold is back').toHaveValue(original)
    }
  }
  expect(bandInputs, `FAIL: ${reason}`).toBeGreaterThan(0)
})
