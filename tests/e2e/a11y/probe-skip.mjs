// Diagnostic: what the skip link looks like and what covers it when it has focus.
/* global process, console, document, getComputedStyle, innerWidth, innerHeight */
import { chromium } from '@playwright/test'

const [url, width = '390'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 800 } })
await page.goto(url, { waitUntil: 'load' })
await page.keyboard.press('Tab')
const info = await page.evaluate(() => {
  const el = document.activeElement
  const box = el.getBoundingClientRect()
  const style = getComputedStyle(el)
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
  return {
    text: el.textContent,
    box: [box.left, box.top, box.width, box.height],
    position: style.position,
    zIndex: style.zIndex,
    outline: style.outline,
    hit: hit ? `${hit.tagName}.${hit.className}` : null,
    viewport: [innerWidth, innerHeight],
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({
  path: process.argv[4] ?? 'skip-probe.png',
  clip: { x: 0, y: 0, width: Number(width), height: 160 },
})
await browser.close()
