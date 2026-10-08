// Diagnostic: which elements compute to italic on a page (they pull the italic face in).
/* global process, console, document, getComputedStyle */
import { chromium } from '@playwright/test'

const url = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(url, { waitUntil: 'load' })
const found = await page.evaluate(() =>
  [...document.querySelectorAll('body *')]
    .filter((el) => getComputedStyle(el).fontStyle === 'italic' && el.textContent?.trim())
    .slice(0, 12)
    .map(
      (el) =>
        `${el.tagName.toLowerCase()}.${el.className} :: ${el.textContent.trim().slice(0, 50)}`,
    ),
)
console.log(found.join('\n') || 'none')
await browser.close()
