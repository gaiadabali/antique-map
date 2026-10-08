// 10.2.c: axe on staging at 390 and 1280 px: gallery item, shop product, bag and checkout.
// Run from the repo root: node tests/e2e/rehearsal/axe-staging.mjs <out.json>
// The bag and checkout need a bag, so one product is added (a bag only; no order is placed).
/* global console, process */
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('playwright')
const { AxeBuilder } = require('@axe-core/playwright')

const GALLERY = 'https://indies-gallery.gaiada.com'
const SHOP = 'https://old-east-indies.gaiada.com'
const widths = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]
const results = []

async function scan(page, name, width) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const found = violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }))
  results.push({ page: name, width, violations: found })
  console.log(
    `${name} @${width}: ${found.length === 0 ? 'no findings' : found.map((f) => `${f.impact} ${f.id}(${f.nodes})`).join(', ')}`,
  )
}

const browser = await chromium.launch({
  executablePath: process.env.E2E_CHROME || undefined,
})
for (const viewport of widths) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto(`${GALLERY}/product/746`, { waitUntil: 'load' })
  await scan(page, 'gallery item 746', viewport.width)
  await page.goto(`${SHOP}/product/balinese-legong-dancer-1925`, { waitUntil: 'load' })
  await scan(page, 'shop product', viewport.width)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await page.getByText('Added to your bag.').waitFor()
  await page.goto(`${SHOP}/bag`, { waitUntil: 'load' })
  await scan(page, 'shop bag', viewport.width)
  await page.goto(`${SHOP}/checkout`, { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  await scan(page, 'shop checkout', viewport.width)
  await context.close()
}
await browser.close()
writeFileSync(process.argv[2], JSON.stringify(results, null, 2))
