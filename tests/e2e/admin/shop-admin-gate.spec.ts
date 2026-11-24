/**
 * The shop admin's screens for the gate (TASKS.md 27.7.c, `docs/gates/shop-admin.md`): every screen
 * phase 27 touches, as the owner, an editor and a store user, at 390 and 1280 px, axe-checked —
 * Payload's own widgets excused exactly as the 27.x specs excuse them (`F6`, listed per screen in
 * `test-results/shop-admin-axe.json`), everything else must be clean. Also the three defects 27.7
 * fixed: a video's or PDF's edit header names it, the Live Preview frame has a title, and the staff
 * list's sort buttons name their column. Screenshots go to `SHOP_ADMIN_SHOTS` when set (the gate's
 * `docs/gates/shop-admin/`), else Playwright's output folder.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS } from './accounts'
import { signIn } from './admin'
import { sql } from './local.mjs'

const WIDTHS = [390, 1280] as const
/**
 * Payload's own admin markup (F6, `docs/gates/foundation.md`), excused and counted exactly as
 * `admin-home-menu.spec.ts` (27.6) excuses it on the same screens — the array drag handle, the date
 * picker, the group heading, the upload widget — less its `live-preview-iframe` excuse: 27.7 titles
 * that frame, so axe's `frame-title` is held here.
 */
const F6 =
  /rs__|react-select|popup-button|popup__trigger|doc-tabs|doc-header|doc-controls|clickable-arrow|#select-all|collapsible__drag|^aria-command-name: div\[aria-describedby=|array-field__header|clear-indicator|copy-to-clipboard|file-details__|upload__|dropdown-indicator|^heading-order: h3$|date-time-picker|group-field__title|^label: input\[value=|^label: #_R_|^landmark-|^region: /
const axeLog: Record<string, { excused: string[] }> = {}

const dir = () => process.env.SHOP_ADMIN_SHOTS ?? test.info().outputDir
async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(dir(), { recursive: true })
  await page.screenshot({ path: join(dir(), `${name}.png`), fullPage: true })
}

async function axe(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const nodes = violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`))
  axeLog[label] = { excused: nodes.filter((node) => F6.test(node)) }
  expect(
    nodes.filter((node) => !F6.test(node)),
    `${label}: axe`,
  ).toEqual([])
}

/**
 * The network gone quiet, bounded: the live preview frames the shop's home, whose newsletter
 * pop-up holds Turnstile's iframe open, so that page never goes network-idle (an unbounded wait
 * ate the 10-minute test timeout).
 */
const settle = (page: Page) =>
  page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)

/** Opens `path` at each width, waits for `ready`, screenshots and checks it. */
async function screen(page: Page, name: string, path: string, ready?: (p: Page) => Promise<void>) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto(path)
    await settle(page)
    if (ready) await ready(page)
    await shoot(page, `${name}-${width}`)
    await axe(page, `${name}-${width}`)
  }
}

/** The sidebar opened (a phone's ☰), screenshotted at each width, its links read at 1280. */
async function sidebarShots(page: Page, who: string): Promise<string[]> {
  let links: string[] = []
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto(who === 'store' ? '/admin/orders' : '/admin')
    await settle(page)
    const open = page
      .getByRole('button', { name: /^(Open Menu|Buka Menu)$/ })
      .filter({ visible: true })
    if ((await open.count()) > 0) await open.first().click()
    const nav = page.locator('nav.nav__wrap, aside nav').first()
    await expect(nav).toBeVisible()
    await shoot(page, `sidebar-${who}-${width}`)
    links = (await nav.getByRole('link').allTextContents())
      .map((each) => each.trim())
      .filter((each) => each !== '' && each !== 'Bahasa Indonesia / English')
  }
  return links
}

test.describe.configure({ mode: 'default' })
test.afterAll(() => {
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/shop-admin-axe.json', `${JSON.stringify(axeLog, null, 2)}\n`)
})

test('the sign-in page', async ({ page }) => {
  await page.context().clearCookies()
  await screen(page, 'login', '/admin/login', async (p) => {
    await expect(p.locator('#field-email')).toBeVisible()
  })
})

test('the owner’s screens', async ({ page }) => {
  test.setTimeout(600_000)
  await signIn(page, ACCOUNTS.owner.email)
  const product = sql("SELECT id FROM products WHERE _status = 'published' ORDER BY id LIMIT 1")
  const home = sql("SELECT id FROM pages WHERE slug = 'home' AND site = 'shop'")
  const shots: [string, string, ((p: Page) => Promise<void>)?][] = [
    [
      'dashboard-owner',
      '/admin',
      async (p) => void (await expect(p.locator('main')).toBeVisible()),
    ],
    ['product-editor', `/admin/collections/products/${product}`],
    ['products-list', '/admin/collections/products'],
    ['orders-door', '/admin/orders'],
    ['stock-matrix', '/admin/stock'],
    ['import', '/admin/stock-import'],
    ['header', '/admin/globals/shop-header'],
    ['footer', '/admin/globals/shop-footer'],
    ['media-list', '/admin/collections/media'],
    ['staff-list', '/admin/collections/users'],
    ['staff-add', '/admin/staff/new'],
    ['site-settings', '/admin/globals/site-settings'],
    ['stores-list', '/admin/collections/stores'],
  ]
  for (const [name, path, ready] of shots) await screen(page, name, path, ready)
  await screen(page, 'page-live-preview', `/admin/collections/pages/${home}`, async (p) => {
    const frame = p.locator('iframe#live-preview-iframe')
    if (!(await frame.isVisible().catch(() => false)))
      await p.locator('#live-preview-toggler').click()
    await expect(frame).toBeVisible()
    // 27.7: Payload gives the frame no title; the admin names it (`admin/preview/frame-title.jsx`).
    await expect(frame).toHaveAttribute('title', 'Preview of the page as the site shows it')
    await settle(p)
  })
  const owner = await sidebarShots(page, 'owner')
  // Phase 28 put Articles under Pages.
  expect(owner.slice(0, 7)).toEqual([
    'Today',
    'Pages',
    'Articles',
    'Header',
    'Footer',
    'Media',
    'Orders',
  ])
})

test('27.7’s fixes: a file’s header, the staff list’s sort buttons', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  await page.setViewportSize({ width: 1280, height: 900 })
  const file = sql(
    "SELECT m.id || '|' || l.label FROM media m JOIN media_locales l ON l._parent_id = m.id AND l._locale = 'en' WHERE m.kind::text IN ('video', 'pdf') ORDER BY m.id LIMIT 1",
  )
  test.skip(file === '', 'no video or PDF in this database')
  const [id, label] = file.split('|') as [string, string]
  await page.goto(`/admin/collections/media/${id}`)
  await expect(page.locator('h1').first()).toHaveText(label)
  await expect(page.locator('h1').first()).not.toHaveText(id)
  await shoot(page, 'media-file-header-1280')

  await page.goto('/admin/collections/users')
  // The names are mended in the browser once the admin hydrates (`cms-core`'s `a11y/mends.jsx`):
  // read them until they settle, for seconds, not at the first paint.
  const buttons = page.locator('.sort-column__buttons button')
  await expect(buttons.first()).toBeVisible({ timeout: 15_000 })
  const read = () =>
    buttons.evaluateAll((all) => all.map((each) => each.getAttribute('aria-label') ?? ''))
  await expect
    .poll(async () => (await read()).filter((each) => each.includes('[object Object]')), {
      timeout: 10_000,
    })
    .toEqual([])
  expect(await read()).toContain('Sort by Role Ascending')
})

test('the editor’s menu', async ({ page }) => {
  await signIn(page, ACCOUNTS.editor.email)
  const editor = await sidebarShots(page, 'editor')
  // "Staff" lists only their own account (`users` access: self or owner). Phase 28 added
  // Articles and Themes.
  expect(editor).toEqual([
    'Today',
    'Pages',
    'Articles',
    'Header',
    'Footer',
    'Media',
    'Orders',
    'Products',
    'Categories',
    'Themes',
    'Stores',
    'Stock by store',
    'Staff',
  ])
})

test('a store user: the dashboard is their orders; their menu, their stock', async ({ page }) => {
  await signIn(page, ACCOUNTS.storeA.email)
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto('/admin')
    await page.waitForURL(/\/admin\/orders$/)
    await settle(page)
    await shoot(page, `dashboard-store-${width}`)
    await axe(page, `dashboard-store-${width}`)
  }
  await screen(page, 'stock-matrix-store', '/admin/stock')
  const store = await sidebarShots(page, 'store')
  expect(store).toEqual(['Orders', 'Stock by store'])
})
