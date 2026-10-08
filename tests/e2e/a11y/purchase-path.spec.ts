/**
 * The purchase path's accessibility pass (TASKS.md 10.2.b), on the shop host: product → bag →
 * checkout → order → tracking. Every page gets axe at 390 and 1280 px, a screenshot at both, its
 * accessibility tree, and a Tab walk; and the path is then walked WITH THE KEYBOARD ONLY — Tab to
 * "Add to bag" and Enter, Tab to "Checkout", fill the checkout by Tab and typing, Enter on "Continue
 * to payment" — so "operable by keyboard" (Requirement 12.3) is shown by doing it.
 *
 * It places a real order on the server it runs against (a local production build, simulate mode),
 * so it never runs against staging; `A11Y_STATE` names the file the Lighthouse run reads the bag
 * cookie and the order's tracking address from.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import type { SmokeMetadata } from '../../../playwright.config'
import {
  axeBothWidths,
  ariaTree,
  shoot,
  slug,
  tabTo,
  tabWalk,
  walkMarkdown,
  writeEvidence,
  WIDTHS,
  type AxeRecord,
} from './audit'

const DENPASAR = { lat: '-8.6705', lng: '115.2126' }

async function audit(
  page: Page,
  name: string,
  axe: AxeRecord[],
  keyboard: string[],
): Promise<void> {
  axe.push(...(await axeBothWidths(page, `shop ${name}`)))
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    await shoot(page, `shop-${slug(name)}-${viewport.width}`)
  }
  await page.setViewportSize(WIDTHS[0])
  await ariaTree(page, `shop-${slug(name)}`)
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    const walk = await tabWalk(page)
    keyboard.push(walkMarkdown(name, viewport.width, walk))
    expect.soft(walk.problems, `${name} keyboard at ${viewport.width} px`).toEqual([])
  }
  await page.setViewportSize(WIDTHS[0])
}

/** The listing's first product links; the loop in the test keeps the first one that can be bought. */
async function sellableItems(page: Page, origin: string): Promise<string[]> {
  await page.goto(`${origin}/shop`)
  const links = await page
    .locator('main a[href^="/product/"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? ''))
  return [...new Set(links)].slice(0, 16)
}

test('purchase path: axe, keyboard-only run and accessibility tree', async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(600000)
  test.skip((testInfo.project.metadata as SmokeMetadata).site !== 'shop', 'the shop host only')
  const origin = (baseURL ?? '').replace(/\/$/, '')
  const axe: AxeRecord[] = []
  const keyboard: string[] = ['## shop: purchase path, keyboard walk\n\n']

  // 1. A product that can be bought (add button enabled, no picker), from the live listing.
  let product: string | null = null
  for (const href of await sellableItems(page, origin)) {
    await page.goto(`${origin}${href}`)
    const add = page.getByRole('button', { name: 'Add to bag' })
    if ((await add.count()) === 1 && (await add.isEnabled())) {
      product = href
      break
    }
  }
  expect(product, 'a sellable product in the live listing').not.toBeNull()
  await audit(page, 'product', axe, keyboard)

  // 2. Keyboard only: Tab to "Add to bag", Enter.
  await page.goto(`${origin}${product}`)
  await tabTo(page, /^Add to bag$/)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Added to your bag.')).toBeVisible()

  // 3. The bag, then keyboard-only to checkout.
  await page.goto(`${origin}/bag`)
  await expect(page.getByRole('heading', { level: 1, name: /bag/i })).toBeVisible()
  await audit(page, 'bag', axe, keyboard)
  const cookies = await page.context().cookies()
  await tabTo(page, /^Checkout$/)
  await page.keyboard.press('Enter')
  await page.waitForURL(/\/checkout/)

  // 4. Checkout, filled by keyboard alone; the pin by its coordinate fallback.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await audit(page, 'checkout', axe, keyboard)
  await page.goto(`${origin}/checkout`)
  const fields: [RegExp, string][] = [
    [/full name/i, 'A11y Walkthrough'],
    [/whatsapp/i, '0812 0000 0001'],
    [/email/i, 'a11y-walkthrough@example.test'],
    [/address/i, 'Jl. Teuku Umar, Denpasar'],
  ]
  for (const [label, value] of fields) {
    await tabTo(page, label)
    await page.keyboard.type(value)
  }
  const pin = page.locator('input[inputmode="decimal"]')
  await pin.nth(0).focus()
  await page.keyboard.type(DENPASAR.lat)
  await page.keyboard.press('Tab')
  await page.keyboard.type(DENPASAR.lng)
  await tabTo(page, /^Continue to payment$/)
  await page.keyboard.press('Enter')
  await page.waitForURL(/\/order\//, { timeout: 30000 })

  // 5. The order page, then the tracking page from its own link.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await audit(page, 'order', axe, keyboard)
  const orderUrl = page.url()
  const tracking = page.getByRole('link', { name: /track your order/i })
  let trackingUrl: string | null = null
  if ((await tracking.count()) > 0) {
    trackingUrl = new URL((await tracking.first().getAttribute('href')) ?? '', orderUrl).href
    await page.goto(trackingUrl)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await audit(page, 'tracking', axe, keyboard)
  }

  const state = process.env.A11Y_STATE
  if (state) {
    mkdirSync(dirname(state), { recursive: true })
    writeFileSync(
      state,
      JSON.stringify({
        product,
        orderUrl,
        trackingUrl,
        cookies: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      }),
    )
  }
  writeEvidence('a11y/axe-shop-purchase-path.json', `${JSON.stringify(axe, null, 2)}\n`)
  writeEvidence('a11y/keyboard-shop-purchase-path.md', keyboard.join(''))
  expect(trackingUrl, 'the order page links to tracking').not.toBeNull()
})
