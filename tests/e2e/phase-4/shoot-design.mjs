/**
 * Phase 4 gate helper (ticket 4.qa, 4.3.e): screenshots the design team's three drawings at 390
 * and 1280 px beside the built pages, and prints each one's section outline (h1/h2 in order) for
 * the structure table in docs/gates/phase-4.md. Not a test — run by hand against a production
 * server:
 *
 *   node tests/e2e/phase-4/shoot-design.mjs <port> [out-dir]
 *
 * The drawings load Google Fonts themselves; that is the drawing, not the app.
 */
/* global process, console, document */
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'

const port = process.argv[2] ?? '4216'
const out = process.argv[3] ?? 'docs/gates/phase-4'
const design = resolve('docs/design/input/claude-design-2026-09')
const PAIRS = [
  {
    name: 'gallery-home',
    drawing: join(design, 'Home - Antique Maps Indonesia.dc.html'),
    built: `http://gallery.localhost:${port}/`,
  },
  {
    name: 'shop-home',
    drawing: join(design, 'Home - Old East Indies.dc.html'),
    built: `http://shop.localhost:${port}/`,
  },
  {
    name: 'shop-partnership',
    drawing: join(design, 'Old East Indies', 'Partnership.dc.html'),
    built: `http://shop.localhost:${port}/partnership`,
  },
]

const outline = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main h1, main h2, body > * h1, body > * h2')]
      .filter((el, at, all) => all.indexOf(el) === at)
      .map((el) => `${el.tagName.toLowerCase()} ${el.textContent.replace(/\s+/g, ' ').trim()}`),
  )

mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  for (const pair of PAIRS) {
    await page.goto(pathToFileURL(pair.drawing).href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: join(out, `design-${pair.name}-${width}.png`), fullPage: true })
    const drawn = await outline(page)
    await page.goto(pair.built, { waitUntil: 'networkidle' })
    const built = await outline(page)
    if (width === 1280) {
      console.log(
        `\n## ${pair.name}\n-- drawing --\n${drawn.join('\n')}\n-- built --\n${built.join('\n')}`,
      )
    }
  }
  await page.close()
}
await browser.close()
