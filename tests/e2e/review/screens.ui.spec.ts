/** 10.6.f: screenshots at 390 and 1280 px (gallery browse, one zoomed item, shop listing, one Instagram product) and axe on the gallery browse and shop listing. */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import en from '../../../engine/apps/web/src/sites/gallery/lexicon/en.json' with { type: 'json' }
import { GALLERY, SHOP } from './support'

const OUT = 'tests/e2e/review/__screens__'

test('screenshots: gallery browse, a zoomed item, shop listing, an Instagram product', async ({ page }, testInfo) => {
  const w = testInfo.project.name === 'mobile' ? 390 : 1280
  const shot = (name: string) => page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: false })

  await page.goto(`${GALLERY}/browse`, { waitUntil: 'load' })
  await expect(page.getByText('1,513 works').first()).toBeAttached()
  await page.waitForLoadState('networkidle')
  await shot('gallery-browse')

  await page.goto(`${GALLERY}/product/1237`, { waitUntil: 'load' })
  await page.getByRole('button', { name: en['item.viewerOpen'] }).click()
  const canvas = page.locator('.openseadragon-canvas canvas').first()
  await expect(canvas).toBeVisible()
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await shot('gallery-item-zoomed')

  await page.goto(`${SHOP}/shop`, { waitUntil: 'load' })
  await expect(page.getByText('156 products').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await shot('shop-listing')

  await page.goto(`${SHOP}/product/exotic-bali-1930s`, { waitUntil: 'load' })
  await expect(page.getByText('Digital mockup').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await shot('shop-instagram-product')
})

for (const [name, url] of [
  ['gallery browse', `${GALLERY}/browse`],
  ['shop listing', `${SHOP}/shop`],
] as const) {
  test(`axe: ${name} has no serious or critical violation`, async ({ page }, testInfo) => {
    await page.goto(url, { waitUntil: 'load' })
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).analyze()
    const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    console.log(
      `[${testInfo.project.name}] axe ${name}: ${violations.length} violations, ${bad.length} serious/critical ${JSON.stringify(violations.map((v) => `${v.id}:${v.impact}`))}`,
    )
    expect(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
  })
}
