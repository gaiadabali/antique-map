/**
 * The admin's home, menu and staff screens (TASKS.md 27.6.d) at 390 and 1280 px, axe clean: the
 * owner's Today home and sidebar (five shop groups, the technical records and the gallery
 * folded), the Header and the Footer as their own screens, the staff list and a new staff
 * member's form, editors whose advanced fields are folded (a discount code, an image, a page),
 * the Catalogue Wall at its new address — and a store user's sidebar of two entries, landing on
 * their orders, refused the home. What 27.6 adds (the sidebar, the Today cards) must be axe clean
 * with no exception; Payload's own markup is excused and counted (F6), as 27.2–27.4 do.
 * Screenshots go to `P27_SHOTS` (default: Playwright's output folder).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { signIn } from './admin'
import { ACCOUNTS } from './accounts'
import { sql } from './local.mjs'

test.describe.configure({ mode: 'serial' })

const WIDTHS = [390, 1280] as const
const shots = (name: string) => `${process.env.P27_SHOTS ?? test.info().outputDir}/${name}.png`

/** What this task adds: every node must be axe clean, with no exception. */
const OURS = ['nav.nav__wrap', '.collections', '.today', 'main.ix-page', '.ix-staff-bar']
/**
 * Payload's own admin markup (F6, `docs/gates/foundation.md`), excused and counted, as 27.2 — plus,
 * on the editors, Payload's array drag handle, date picker and group heading, the same widgets the
 * one "Menu and footer" global already carried (27.5).
 */
const F6 =
  /rs__|react-select|popup-button|popup__trigger|doc-tabs|doc-header|doc-controls|clickable-arrow|#select-all|collapsible__drag|^aria-command-name: div\[aria-describedby=|array-field__header|clear-indicator|live-preview-iframe|copy-to-clipboard|file-details__|upload__|dropdown-indicator|^heading-order: h3$|date-time-picker|group-field__title|^label: input\[value=|^label: #_R_|^landmark-|^region: /

async function axeClean(page: Page, label: string): Promise<void> {
  const scoped = new AxeBuilder({ page })
  for (const selector of OURS) {
    if ((await page.locator(selector).count()) > 0) scoped.include(selector)
  }
  const ours = await scoped.analyze()
  expect(
    ours.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`)),
    `${label}: what 27.6 adds`,
  ).toEqual([])
  const { violations } = await new AxeBuilder({ page }).analyze()
  const nodes = violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`))
  const excused = nodes.filter((node) => F6.test(node))
  if (excused.length) console.log(`axe ${label}: ${excused.length} F6 node(s) of Payload's own UI`)
  expect(
    nodes.filter((node) => !F6.test(node)),
    `${label}: the rest of the page`,
  ).toEqual([])
}

/** Opens the sidebar on a phone (closed there), so the screenshot shows it. */
async function openMenu(page: Page): Promise<void> {
  const open = page
    .getByRole('button', { name: /^(Open Menu|Buka Menu)$/ })
    .filter({ visible: true })
  if ((await open.count()) > 0) await open.first().click()
  await expect(
    page.getByRole('button', { name: /^(Close Menu|Tutup Menu)$/ }).filter({ visible: true }),
  ).not.toHaveCount(0)
  // The sidebar slides in: the screenshot waits for it to settle.
  await page.waitForTimeout(600)
}

async function visit(page: Page, path: string, name: string, width: number): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await axeClean(page, `${name}-${width}`)
  await page.screenshot({ path: shots(`${name}-${width}`), fullPage: true })
}

test('the owner: Today, the menu, Header, Footer, staff and folded editors', async ({ page }) => {
  test.setTimeout(300_000)
  await signIn(page, ACCOUNTS.owner.email)
  const discount = sql(`SELECT id FROM discounts ORDER BY id LIMIT 1`)
  const media = sql(`SELECT id FROM media ORDER BY id LIMIT 1`)
  const pageId = sql(`SELECT id FROM pages WHERE site = 'shop' ORDER BY id LIMIT 1`)
  const store = sql(`SELECT id FROM stores ORDER BY id LIMIT 1`)
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 800 })
    // The home: Payload's dashboard look, a card per sidebar entry, Content first (2026-11-16).
    await visit(page, '/admin', 'home-owner', width)
    await expect(page.locator('h1').first()).toHaveText('Dashboard')
    await expect(page.locator('.collections__label').first()).toHaveText('Content')
    await expect(
      page.locator('#card-nav-pages a[href="/admin/collections/pages/create"]'),
    ).toBeVisible()
    // Today's numbers, at their own address.
    await visit(page, '/admin/today', 'today-owner', width)
    await expect(page.locator('h1').first()).toHaveText('Today')
    await expect(page.locator('a.today-card[href="/admin/stock?low=1"]')).toBeVisible()
    await openMenu(page)
    await page.screenshot({ path: shots(`sidebar-owner-${width}`) })
    // The technical records and the gallery start folded; the shop's groups open.
    await expect(page.locator('nav a#nav-redirects')).toBeHidden()
    await expect(page.locator('nav a#nav-works')).toBeHidden()
    await expect(page.locator('nav a#nav-global-shop-header')).toBeVisible()
    await visit(page, '/admin/globals/shop-header', 'header', width)
    await visit(page, '/admin/globals/shop-footer', 'footer', width)
    await visit(page, '/admin/collections/users', 'staff', width)
    await visit(page, '/admin/staff/new', 'staff-add', width)
    if (discount) await visit(page, `/admin/collections/discounts/${discount}`, 'discount', width)
    else await visit(page, '/admin/collections/discounts/create', 'discount', width)
    if (media) await visit(page, `/admin/collections/media/${media}`, 'image', width)
    if (pageId) await visit(page, `/admin/collections/pages/${pageId}`, 'page', width)
    if (store) await visit(page, `/admin/collections/stores/${store}`, 'store', width)
    await visit(page, '/admin/wall', 'wall', width)
  }
})

test('a store user: two entries, their orders as home', async ({ page }) => {
  await signIn(page, ACCOUNTS.storeA.email)
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 800 })
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/orders$/)
    await page.waitForLoadState('networkidle')
    await axeClean(page, `store-orders-${width}`)
    await openMenu(page)
    const links = page.locator('nav .nav__link')
    await expect(links.filter({ visible: true })).toHaveText([
      'Orders',
      'Stock by store',
      'Bahasa Indonesia / English',
    ])
    await page.screenshot({ path: shots(`sidebar-store-${width}`) })
  }
})
