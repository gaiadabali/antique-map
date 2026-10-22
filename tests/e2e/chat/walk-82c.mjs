// Run from the repo root: node tests/e2e/chat/walk-82c.mjs <screenshot dir>. It uses 2 chat sessions (6 per IP per hour).
/* global console, process, document, URL */
// The 8.2.c Check on staging: one chat session per site at 390 px, from an item page.
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('playwright')
const { AxeBuilder } = require('@axe-core/playwright')
const out = process.argv[2]
const sites = [
  {
    site: 'gallery',
    url: 'https://indies-gallery.gaiada.com/product/746',
    item: /Abhimanjoe|P\.1180/i,
    en: 'Tell me about this piece.',
    id: 'Apakah karya ini masih tersedia?',
    wa: 'I would like to ask the gallery about this one on WhatsApp.',
  },
  {
    site: 'shop',
    url: 'https://old-east-indies.gaiada.com/product/balinese-legong-dancer-1925',
    item: /Legong/i,
    en: 'Tell me about this product.',
    id: 'Apakah produk ini tersedia dalam ukuran lain?',
    wa: 'Can I ask the team about this on WhatsApp?',
  },
]
const browser = await chromium.launch()
for (const s of sites) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(s.url, { waitUntil: 'networkidle' })
  // Keyboard only: Tab to the floating launcher and open it with Enter.
  const launcher = page.getByRole('button', { name: /chat with us/i })
  await launcher.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: /chat with us/i })
  await dialog.waitFor()
  const log = dialog.locator('[role="log"]')
  console.log(s.site, 'log aria-live', await log.getAttribute('aria-live'))
  const leadBefore = await dialog
    .getByText(/Leave my details|Share your details|Tinggalkan|Bagikan/i)
    .count()
  console.log(s.site, 'lead form/CTA before asking', leadBefore)
  const box = dialog.getByRole('textbox')
  async function ask(text, wait = 25000) {
    const before = await dialog.locator('[data-chat-role="assistant"]').count()
    await box.click()
    await box.fill(text)
    await page.keyboard.press('Enter')
    await page
      .waitForFunction(
        (n) => document.querySelectorAll('[role=dialog] [data-chat-role="assistant"]').length > n,
        before,
        { timeout: wait },
      )
      .catch(() => {})
    await page.waitForTimeout(6000)
    const replies = await dialog.locator('[data-chat-role="assistant"]').allInnerTexts()
    const reply = replies.slice(before).join(' ').replace(/\s+/g, ' ')
    console.log(`[${s.site}] Q: ${text}\n[${s.site}] A: ${reply.slice(0, 400)}`)
    return reply
  }
  const a1 = await ask(s.en)
  console.log(
    s.site,
    'item known:',
    s.item.test(a1) || (await dialog.locator('a', { hasText: s.item }).count()) > 0,
  )
  const a2 = await ask(s.id)
  console.log(
    s.site,
    'indonesian reply:',
    /\b(Anda|yang|tidak|ini|untuk|tersedia|kami)\b/i.test(a2),
  )
  await ask(s.wa)
  const wa = await dialog
    .locator('a[href^="https://wa.me/"]')
    .evaluateAll((as) =>
      as.map((a) => decodeURIComponent(new URL(a.href).searchParams.get('text') || '')),
    )
  console.log(s.site, 'wa.me texts in the chat:', JSON.stringify(wa.map((t) => t.slice(0, 200))))
  console.log(
    s.site,
    'wa text names the item:',
    wa.some((t) => s.item.test(t)),
  )
  const leadMid = await dialog
    .getByText(/Leave my details|Share your details|Tinggalkan|Bagikan/i)
    .count()
  console.log(s.site, 'lead form/CTA before request', leadMid)
  await ask('Please have someone from the team contact me.')
  const leadAfter = await dialog
    .getByText(/Leave my details|Share your details|Tinggalkan|Bagikan/i)
    .count()
  console.log(s.site, 'lead form/CTA after request', leadAfter)
  const axe = await new AxeBuilder({ page }).analyze()
  console.log(
    s.site,
    '390 axe (whole page, chat open)',
    axe.violations.map((v) => `${v.id}(${v.nodes.length})`).join(' ') || 'none',
  )
  await page.screenshot({ path: `${out}/walk-${s.site}-390.png`, fullPage: false })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.waitForTimeout(800)
  const axe2 = await new AxeBuilder({ page }).analyze()
  console.log(
    s.site,
    '1280 axe (whole page, chat open)',
    axe2.violations.map((v) => `${v.id}(${v.nodes.length})`).join(' ') || 'none',
  )
  await page.screenshot({ path: `${out}/walk-${s.site}-1280.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  console.log(
    s.site,
    'Escape → focus on',
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
  )
  await ctx.close()
}
await browser.close()
