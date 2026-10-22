/**
 * 10.6.f clause 2: an item zooms on its full-size photograph. For three of the works whose lead image is
 * IIIF-tiled (507, 1237, 468), at the project's viewport (390 or 1280): open the item, no `iiif/` request
 * before Zoom; press Zoom; `info.json` and at least one tile answer 200 from one folder; the viewer canvas
 * draws (more than 8 distinct colours, the dpr3 spec's probe); no console error naming CORS, WebGL or
 * texture; the viewer reports no failure. Same assertions as tests/e2e/gallery/item.spec.ts.
 */
import { expect, test } from '@playwright/test'

import en from '../../../engine/apps/web/src/sites/gallery/lexicon/en.json' with { type: 'json' }
import { GALLERY, TILED } from './support'

for (const id of TILED.slice(0, 3)) {
  test(`item ${id} zooms on its tiled full-size photograph`, async ({ page }, testInfo) => {
    const requests: string[] = []
    const iiif: { url: string; status: number }[] = []
    const errors: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    page.on('response', (r) => {
      if (/\/iiif\//.test(r.url())) iiif.push({ url: r.url(), status: r.status() })
    })
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })

    const res = await page.goto(`${GALLERY}/product/${id}`, { waitUntil: 'load' })
    expect(res?.status()).toBe(200)
    expect(
      requests.filter((u) => /\/iiif\//.test(u)),
      'no iiif/ request before Zoom',
    ).toEqual([])

    await page.getByRole('button', { name: en['item.viewerOpen'] }).click()
    const info = () => iiif.find((r) => /\/iiif\/[^/]+\/info\.json$/.test(r.url))
    await expect.poll(() => info()?.status, { timeout: 30_000 }).toBe(200)
    const folder = info()!.url.replace(/info\.json$/, '')
    const tiles = () =>
      iiif.filter((r) => r.url.startsWith(folder) && r.url.endsWith('/default.jpg'))
    await expect.poll(() => tiles().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1)
    await page.waitForLoadState('networkidle')

    const canvas = page.locator('.openseadragon-canvas canvas').first()
    await expect(canvas).toBeVisible()
    await expect(page.getByText(en['item.viewerFailed'])).toHaveCount(0)
    await page.waitForTimeout(1500)
    const colours = await canvas.evaluate((c: HTMLCanvasElement) => {
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
    console.log(
      `[${testInfo.project.name}] item ${id}: info.json ${info()!.status} ${info()!.url}; ${tiles().length} tiles, statuses ${[...new Set(tiles().map((t) => t.status))].join(',')}; canvas ${colours} colours`,
    )
    expect(colours, 'distinct colours the viewer canvas drew').toBeGreaterThan(8)
    expect(
      tiles().filter((t) => t.status !== 200),
      'every tile 200',
    ).toEqual([])
    expect(
      requests.filter((u) => /\/uploads\/|\/api\/media\/file\//.test(u)),
      'never the private original',
    ).toEqual([])
    expect(
      errors.filter((t) => /webgl|texture|cors/i.test(t)),
      errors.join('\n'),
    ).toEqual([])
  })
}
