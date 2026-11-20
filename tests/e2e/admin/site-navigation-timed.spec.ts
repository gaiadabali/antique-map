/**
 * The shop's menu and announcement edited at a person's pace (TASKS.md 27.5.e): a menu item added
 * in ≤ 0:30 and a dated announcement in ≤ 0:45, through the admin's "Header" screen (its own
 * sidebar entry under Content since TASKS.md 27.6, the menu rows opening unfolded), each then seen
 * on the site. The clock is `admin-usability/human/pace.ts`'s model (a
 * first-timer's pauses before each click, four characters a second, a glance at each new page),
 * from the admin's home to the saved state, the server's own time included; screenshots are left
 * out of it. Each run writes its times to `test-results/site-navigation-timed.json` and puts the
 * navigation back as it was.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { Human } from '../admin-usability/human/pace'
import { signIn } from './admin'
import { ACCOUNTS } from './accounts'

const SHOTS = process.env.SITE_SHOTS
const RESULTS = 'test-results/site-navigation-timed.json'
const NAV = '/api/globals/shop-header'
const times: Record<string, { seconds: number; target: number; clicks: number; keys: number }> = {}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
}

/**
 * The admin's REST, from inside the signed-in page (its cookie, its origin): Node's resolver, which
 * `page.request` uses, may not know `*.localhost`.
 */
const rest = (page: Page, method: 'GET' | 'POST', path: string, body?: unknown) =>
  page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, {
        method,
        credentials: 'include',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: res.status, json: (await res.json()) as Record<string, unknown> }
    },
    { method, path, body },
  )

/** The navigation as saved, per language, to put back once the tasks are done. */
async function snapshot(page: Page): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {}
  for (const locale of ['en', 'id']) {
    const res = await rest(page, 'GET', `${NAV}?depth=0&locale=${locale}`)
    expect(res.status).toBe(200)
    const { id: _id, globalType: _g, createdAt: _c, updatedAt: _u, ...kept } = res.json
    out[locale] = kept
  }
  return out
}

/** The admin's "Header", found from the admin's home as a person finds it: Content › Header. */
async function openNavigation(h: Human, page: Page): Promise<void> {
  await page.goto('/admin')
  await h.start()
  const link = page.locator('nav a#nav-global-shop-header')
  if (await link.isVisible().catch(() => false)) await h.click(link)
  else await page.goto('/admin/globals/shop-header')
  await expect(page.getByRole('heading', { name: 'Header', exact: true })).toBeVisible()
  await h.read()
}

async function save(h: Human, page: Page): Promise<void> {
  await h.click(page.getByRole('button', { name: 'Save', exact: true }).first())
  await expect(page.getByText(/updated successfully|saved/i).first()).toBeVisible({
    timeout: 20_000,
  })
}

/** A date as the admin's picker shows it: "Nov 9, 2026 9:00 AM". */
const pickerDate = (at: Date) =>
  at.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

// In order, one worker (both save the one global); a missed target skips no other task.
test.describe.configure({ mode: 'default' })

test.describe('the shop’s menu and announcement at a person’s pace (27.5.e)', () => {
  let before: Record<string, Record<string, unknown>> = {}

  test.beforeEach(async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await signIn(page, ACCOUNTS.owner.email)
    before = await snapshot(page)
    // The admin keeps the content language a person last used: these tasks are in English.
    await page.goto(`${NAV.replace('/api', '/admin')}?locale=en`)
    await expect(page.getByRole('heading', { name: 'Header', exact: true })).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    for (const locale of ['en', 'id']) {
      await rest(page, 'POST', `${NAV}?locale=${locale}`, before[locale])
    }
  })

  test.afterAll(() => {
    mkdirSync('test-results', { recursive: true })
    writeFileSync(RESULTS, `${JSON.stringify(times, null, 2)}\n`)
  })

  test('a menu item added in ≤ 0:30', async ({ page }, info) => {
    const h = new Human(page, info, 'nav-menu', 'Add a menu item', 30)
    await openNavigation(h, page)
    // One screen (TASKS.md 27.6): the menu is under the announcement, no tab to open.
    const toggles = page.locator('#field-mainMenu').getByRole('button', { name: 'Toggle block' })
    const index = await toggles.count()
    await h.click(page.getByRole('button', { name: 'Add Link' }))
    // A new row opens unfolded (no `initCollapsed`, TASKS.md 27.6); a fold is a stumble.
    const label = page.locator(`#field-mainMenu__${index}__label`)
    const opened = await label
      .waitFor({ state: 'visible', timeout: 4_000 })
      .then(() => true)
      .catch(() => false)
    if (!opened) {
      h.stumble('the new row opened folded: one click to unfold it')
      await h.click(toggles.nth(index))
    }
    await h.type(page.locator(`#field-mainMenu__${index}__label`), 'Privacy')
    // "Goes to" starts at "A page": the person opens the short list of pages and picks it.
    await h.pick(page.locator(`[id="field-mainMenu__${index}__page"]`), /^Privacy$/)
    await save(h, page)
    h.stop()
    const seconds = h.seconds()
    times.menuItem = { seconds, target: 30, clicks: h.clicks, keys: h.keys }
    console.log(`TIMED menu item: ${seconds} s (target 30 s), ${h.clicks} clicks, ${h.keys} keys`)
    await shot(page, 'admin-menu-item-1280')
    expect(seconds).toBeLessThanOrEqual(30)

    // On the site: the new link in the header (a save expires `settings:shop`).
    const site = await page.context().browser()!.newPage()
    const origin = new URL(page.url()).origin
    await site.setViewportSize({ width: 1280, height: 800 })
    await expect
      .poll(
        async () => {
          await site.goto(`${origin}/`)
          return site.getByRole('banner').getByRole('link', { name: 'Privacy' }).count()
        },
        { timeout: 60_000 },
      )
      .toBeGreaterThan(0)
    await shot(site, 'site-menu-item-1280')
    await site.close()
  })

  test('a dated announcement in ≤ 0:45', async ({ page }, info) => {
    const h = new Human(page, info, 'nav-announcement', 'Schedule an announcement', 45)
    // A promotion from now until a date a week away: "From" empty means from now.
    const text = `Weekend sale: 20% off framed prints ${Date.now() % 100}`
    const until = new Date(Date.now() + 7 * 24 * 60 * 60_000)
    await openNavigation(h, page)
    // The announcement is the Header's first block (TASKS.md 27.6): no tab to open.
    const show = page.locator('input#field-announcement__enabled')
    if (!(await show.isChecked())) await h.click(page.getByText('Show the announcement').first())
    await expect(show).toBeChecked()
    // The form settles after the switch (its server round trip) before the person types on.
    await page.waitForLoadState('networkidle')
    const words = page.locator('#field-announcement__text')
    await h.type(words, text, { replace: true })
    await expect(words).toHaveValue(text)
    const from = page.locator('#field-announcement__startsAt input').first()
    if ((await from.inputValue()) !== '') {
      // An earlier start is still set: the person clears it (its ✕).
      await h.click(page.locator('#field-announcement__startsAt button').first())
      await expect(from).toHaveValue('')
    }
    await h.type(page.locator('#field-announcement__endsAt input').first(), pickerDate(until), {
      replace: true,
    })
    await page.keyboard.press('Escape')
    await save(h, page)
    h.stop()
    const seconds = h.seconds()
    times.announcement = { seconds, target: 45, clicks: h.clicks, keys: h.keys }
    console.log(
      `TIMED announcement: ${seconds} s (target 45 s), ${h.clicks} clicks, ${h.keys} keys`,
    )
    await shot(page, 'admin-announcement-1280')
    const saved = await rest(page, 'GET', `${NAV}?depth=0&locale=en`)
    console.log(`SAVED announcement: ${JSON.stringify(saved.json.announcement)}`)
    expect(seconds).toBeLessThanOrEqual(45)

    const site = await page.context().browser()!.newPage()
    const origin = new URL(page.url()).origin
    for (const width of [390, 1280]) {
      await site.setViewportSize({ width, height: width < 600 ? 844 : 800 })
      await expect
        .poll(
          async () => {
            await site.goto(`${origin}/`)
            // A page served from before the save may have no announcement at all: read it only
            // when there is one, or `textContent` waits for it past the poll (TASKS.md 27.6).
            const bar = site.locator('aside').first()
            return (await bar.count()) > 0 ? ((await bar.textContent()) ?? '') : ''
          },
          { timeout: 60_000 },
        )
        .toContain(text)
      await shot(site, `site-announcement-${width}`)
    }
    await site.close()
  })
})
