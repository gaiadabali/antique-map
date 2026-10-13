// Usage: node capture.mjs <gallery|shop|all> [outDir]   (outDir defaults to this script's folder)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
let pw
try { pw = require('C:/Users/Hansel/Documents/Hansel/Projects/antique-map/node_modules/playwright') }
catch { pw = require('C:/Users/Hansel/Documents/Hansel/Projects/antique-map/node_modules/@playwright/test') }
const { chromium } = pw
const here = path.dirname(fileURLToPath(import.meta.url))
const which = process.argv[2] || 'all'
const out = path.resolve(process.argv[3] || here)
fs.mkdirSync(out, { recursive: true })
const SITES = {
  gallery: { base: 'https://indies-gallery.gaiada.com', listing: '/browse', itemName: 'item', itemRe: /^\/product\/[^/?#]+/, skip: null,
    pages: [['home', '/'], ['browse', '/browse'], ['item', '@item'], ['contact', '/contact'], ['id-home', '/id']] },
  shop: { base: 'https://old-east-indies.gaiada.com', listing: '/shop', itemRe: /^\/product\/[^/?#]+/, skip: /^REHEARSAL/i,
    pages: [['home', '/'], ['shop', '/shop'], ['product', '@item'], ['collections', '/collections'], ['stores', '/stores'], ['partnership', '/partnership'], ['bag', '/bag'], ['id-home', '/id']] },
}
const WIDTHS = [[390, 844], [1280, 800]]
async function settle(page) {
  await page.evaluate(() => document.fonts.ready).catch(() => {})
  await page.evaluate(async () => {
    const h = () => document.documentElement.scrollHeight
    for (let y = 0; y < h(); y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)) }
    window.scrollTo(0, h()); await new Promise(r => setTimeout(r, 300)); window.scrollTo(0, 0)
  })
  await page.waitForTimeout(1500)
  await page.addStyleTag({ content: '[class*="chat-launcher"]{visibility:hidden !important}' })
  await page.waitForTimeout(200)
}
async function go(page, url) {
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }) }
  catch { await page.goto(url, { waitUntil: 'load', timeout: 45000 }) }
}
const browser = await chromium.launch()
const record = {}
for (const name of Object.keys(SITES)) {
  if (which !== 'all' && which !== name) continue
  const s = SITES[name]; record[name] = []
  const mk = async ([w, h]) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: 'light', locale: 'en-GB', timezoneId: 'Asia/Singapore' })
    return ctx
  }
  // resolve item url
  let ctx = await mk(WIDTHS[1]); let page = await ctx.newPage()
  let itemUrl = null
  try {
    await go(page, s.base + s.listing)
    const hrefs = await page.$$eval('a[href]', as => as.map(a => ({ h: a.getAttribute('href'), t: (a.textContent || '').trim(), alt: a.querySelector('img')?.alt || '', al: a.getAttribute('aria-label') || '' })))
    const cand = hrefs.find(x => x.h && s.itemRe.test(x.h) && x.h !== s.listing && !/^\/(shop|browse)\/?$/.test(x.h) && !(s.skip && s.skip.test(x.t || x.alt || x.al)))
    if (cand) itemUrl = new URL(cand.h, s.base).href
    console.log(name, 'candidates sample', JSON.stringify(hrefs.filter(x => x.h && s.itemRe.test(x.h)).slice(0, 5)))
  } catch (e) { console.log('listing fail', e.message) }
  await ctx.close()
  for (const [w, h] of WIDTHS) {
    ctx = await mk([w, h]); page = await ctx.newPage()
    for (const [pn, p] of s.pages) {
      const url = p === '@item' ? itemUrl : s.base + p
      const base = `${name}-${pn}-${w}`
      if (!url) { console.log('FAIL', base, 'no url'); record[name].push({ page: pn, width: w, url: null, error: 'no item url' }); continue }
      try {
        await go(page, url); await settle(page)
        await page.screenshot({ path: path.join(out, base + '.png'), fullPage: true })
        await page.screenshot({ path: path.join(out, base + '-viewport.png'), fullPage: false })
        console.log('ok', base, url); record[name].push({ page: pn, width: w, url: page.url() })
      } catch (e) { console.log('FAIL', base, e.message); record[name].push({ page: pn, width: w, url, error: e.message }) }
    }
    await ctx.close()
  }
}
await browser.close()
const pj = path.join(out, 'pages.json')
let prev = {}; try { prev = JSON.parse(fs.readFileSync(pj, 'utf8')) } catch {}
fs.writeFileSync(pj, JSON.stringify({ ...prev, ...record }, null, 2))
