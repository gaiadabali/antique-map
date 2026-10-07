/**
 * The phase 5 DPR 3 navigation path, on staging, read-only (TASKS.md 5.5.d): on a 390 px phone at
 * three device pixels per CSS pixel, search by an old place name → click a result card → the item's
 * lead image loads → Zoom → the viewer's canvas draws. The earlier defect: a card cached the
 * derivative without CORS, the item's lead image broke and the viewer said it "cannot be opened".
 * Item 746 (P.1180, catalogued under Jakarta) is found by "Batavia" (the vocabulary's old name).
 * Run: `E2E_BASE_GALLERY=… E2E_BASE_SHOP=… pnpm exec playwright test --project=gallery-e2e <this> --workers=1`.
 */
import { expect, test } from '@playwright/test'

import en from '../../../engine/apps/web/src/sites/gallery/lexicon/en.json' with { type: 'json' }
import { createHref } from '../../../engine/packages/config/src/sites/routes/href'
import { SITES } from '../../../engine/packages/config/src/sites/table'
import { GALLERY_ORIGIN } from './support/env'

const href = createHref(SITES.gallery)
const ITEM = 746

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })

test('DPR 3: search → item → zoom draws, with no CORS, WebGL or texture error', async ({
  page,
}) => {
  const bad: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && /cors|webgl|texture|cross-origin/i.test(m.text()))
      bad.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => {
    if (/cors|webgl|texture|cross-origin|security/i.test(e.message))
      bad.push(`pageerror: ${e.message}`)
  })
  const search = href('search', { q: 'Batavia' }, 'en')
  expect((await page.goto(`${GALLERY_ORIGIN}${search}`, { waitUntil: 'load' }))?.status()).toBe(200)
  const card = page
    .locator(`main a[href="/product/${ITEM}"], main a[href^="/product/${ITEM}-"]`)
    .first()
  await expect(card, `the search lists ${ITEM}`).toBeVisible()
  await page.waitForLoadState('networkidle')
  await card.click()
  await expect(page).toHaveURL(new RegExp(`/product/${ITEM}-`))
  const lead = page.locator('main img').first()
  await expect(lead).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(
    await lead.evaluate((i: HTMLImageElement) => i.naturalWidth),
    'the lead image',
  ).toBeGreaterThan(0)

  await page.getByRole('button', { name: en['item.viewerOpen'] }).click()
  const canvas = page.locator('.openseadragon-canvas canvas').first()
  await expect(canvas).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(en['item.viewerFailed']), 'the viewer opens the image').toHaveCount(0)
  // The canvas draws: sample its pixels into a 2D canvas; a tainted or empty canvas fails here.
  const drawn = () =>
    canvas.evaluate((c: HTMLCanvasElement) => {
      const probe = document.createElement('canvas')
      probe.width = Math.min(c.width, 256)
      probe.height = Math.min(c.height, 256)
      const ctx = probe.getContext('2d')!
      ctx.drawImage(c, 0, 0, probe.width, probe.height)
      const px = ctx.getImageData(0, 0, probe.width, probe.height).data
      const seen = new Set<number>()
      for (let i = 0; i < px.length; i += 4)
        seen.add((px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!)
      return seen.size
    })
  await page.waitForTimeout(1500)
  expect(await drawn(), 'distinct colours the viewer canvas drew').toBeGreaterThan(8)
  await page.screenshot({ path: 'docs/gates/gallery/dpr3-search-to-item-zoom.png' })
  expect(bad, 'no CORS, WebGL or texture console error').toEqual([])
})
