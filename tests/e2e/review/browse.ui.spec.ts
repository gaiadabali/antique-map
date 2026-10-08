/** 10.6.f clause 1 at 390 and 1280 px: the browse states 1,513 works (available) and 1,709 with sold included; a card opens its item. */
import { expect, test } from '@playwright/test'

import { GALLERY } from './support'

test('browse states 1,513 works; "Include sold" states 1,709; 24 cards a page', async ({
  page,
}) => {
  await page.goto(`${GALLERY}/browse`, { waitUntil: 'load' })
  await expect(page.getByText('1,513 works').first()).toBeAttached()
  await expect(page.locator('a[href^="/product/"]')).toHaveCount(24)
  await page.goto(`${GALLERY}/browse?availability=sold`, { waitUntil: 'load' })
  await expect(page.getByText('1,709 works').first()).toBeAttached()
  await expect(page.locator('a[href^="/product/"]')).toHaveCount(24)
  // The last page of each list holds the remainder: 1,513 = 63 x 24 + 1; 1,709 = 71 x 24 + 5.
  await page.goto(`${GALLERY}/browse?page=64`, { waitUntil: 'load' })
  await expect(page.locator('a[href^="/product/"]')).toHaveCount(1)
  await page.goto(`${GALLERY}/browse?availability=sold&page=72`, { waitUntil: 'load' })
  await expect(page.locator('a[href^="/product/"]')).toHaveCount(5)
})

test('a browse card opens its item, which shows its lead photograph and a Zoom button', async ({
  page,
}) => {
  await page.goto(`${GALLERY}/browse`, { waitUntil: 'load' })
  const card = page.locator('a[href^="/product/"]').first()
  const href = await card.getAttribute('href')
  await card.click()
  await page.waitForURL(/\/product\/\d+-/)
  expect(page.url()).toContain(href!.replace('/product/', '/product/'))
  const lead = page.locator('main img').first()
  await expect
    .poll(() => lead.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth))
    .toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Zoom into the image' })).toBeVisible()
})
