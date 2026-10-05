/**
 * Phase 4's Checks on a production build (TASKS.md 4.1.e, 4.2.c, 4.2.d, 4.3.e; ticket 4.qa), run
 * by each host's a11y project:
 *
 * - 4.2.c: `/style-guide` holds a section for every component folder under `shared/ui`;
 * - 4.1.e: this host renders its own palette from the same component classes as the other host;
 *   no request leaves for Google Fonts and the first paint stays inside DESIGN-SYSTEM §9's font
 *   budget (≤ 3 files, < 150 KB);
 * - 4.2.d: every tabbable control on `/style-guide` is reached by Tab with a visible focus ring;
 *   the checkbox and the dialog work from the keyboard; every text/background pair of the palette
 *   meets WCAG 2.2 AA, computed from the live token values;
 * - 4.3.e: the home (and on the shop the partnership page) in each locale at 390 and 1280 px is
 *   axe clean, its partnership page ends in an enquiry call to action, never a sign-in.
 *
 * Screenshots are opt-in: with PHASE4_SHOTS naming a folder (the gate's `docs/gates/phase-4`),
 * each page is captured there at both widths. CI never sets it.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

import { SITES } from '../../../engine/packages/config/src/sites/table'
import type { SmokeMetadata } from '../../../playwright.config'

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const
const SHOTS = process.env.PHASE4_SHOTS
const UI_DIR = join(process.cwd(), 'engine/apps/web/src/shared/ui')

const meta = (testInfo: TestInfo) => testInfo.project.metadata as SmokeMetadata
const prefixOf = (m: SmokeMetadata, locale: string) =>
  locale === m.locales.default ? '' : `/${locale}`
/** The partnership page's slug in a locale, from the committed route table (`kemitraan` in id). */
const partnershipSlug = (locale: string) => SITES.shop.routes[locale as 'en' | 'id'].partnership

async function shoot(page: Page, testInfo: TestInfo, name: string) {
  if (!SHOTS) return
  await page.screenshot({
    path: join(SHOTS, `${meta(testInfo).site}-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}

async function axeClean(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

test.describe('4.2.c the style guide', () => {
  test('has a section for every shared component, at both widths', async ({ page }, testInfo) => {
    const folders = readdirSync(UI_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    expect(folders.length).toBeGreaterThan(20)
    for (const viewport of WIDTHS) {
      await page.setViewportSize(viewport)
      expect((await page.goto('/style-guide'))?.status()).toBe(200)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
      const ids = await page
        .locator('section[aria-labelledby^="sg-"]')
        .evaluateAll((all) => all.map((each) => each.getAttribute('aria-labelledby')))
      expect(ids.sort()).toEqual(folders.map((name) => `sg-${name}`).sort())
      await shoot(page, testInfo, `style-guide-${viewport.width}`)
    }
  })
})

/** The colour roles, each resolved to `rgb(…)` through a probe element on the live page. */
const ROLES = [
  'surface',
  'surface-raised',
  'surface-deep',
  'surface-dark',
  'text',
  'text-muted',
  'text-on-dark',
  'accent',
  'accent-contrast',
  'accent-secondary',
  'focus',
  'danger',
  'success',
  'caution',
] as const
type Role = (typeof ROLES)[number]

async function palette(page: Page): Promise<Record<Role, string>> {
  return page.evaluate(
    (roles) => {
      const probe = document.createElement('span')
      document.body.append(probe)
      const out: Record<string, string> = {}
      for (const role of roles) {
        probe.style.color = `var(--color-${role})`
        out[role] = getComputedStyle(probe).color
      }
      probe.remove()
      return out
    },
    ROLES as unknown as string[],
  ) as Promise<Record<Role, string>>
}

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** Every pair the components draw: foreground, background, the AA floor for its use. */
const PAIRS: readonly [Role, Role, number, string][] = [
  ['text', 'surface', 4.5, 'body text'],
  ['text', 'surface-raised', 4.5, 'text on cards'],
  ['text', 'surface-deep', 4.5, 'text on the deep band, plate captions'],
  ['text-muted', 'surface', 4.5, 'muted text, eyebrows'],
  ['text-muted', 'surface-raised', 4.5, 'muted text on cards'],
  ['text-on-dark', 'surface-dark', 4.5, 'text on the dark band'],
  ['accent', 'surface', 4.5, 'links, secondary and quiet buttons'],
  ['accent', 'surface-raised', 4.5, 'links on cards'],
  ['accent-contrast', 'accent', 4.5, 'primary button label'],
  ['danger', 'surface', 4.5, 'error message'],
  ['success', 'surface', 4.5, 'success message'],
  ['caution', 'surface', 4.5, 'caution message'],
  ['accent-secondary', 'surface-raised', 3, 'hover title (25 px, large text)'],
  ['focus', 'surface', 3, 'focus ring (non-text, 1.4.11)'],
  ['focus', 'surface-raised', 3, 'focus ring on cards'],
]

test.describe('4.1.e / 4.2.d the palette', () => {
  test('this host has its own palette, from the same components as the other', async ({
    page,
  }, testInfo) => {
    const m = meta(testInfo)
    await page.goto('/style-guide')
    const own = await palette(page)
    const ownSite = await page.locator('html').getAttribute('data-site')
    const ownButton = await page.locator('button:has-text("Open dialog")').getAttribute('class')
    await page.goto(`http://${m.otherHost}:${new URL(page.url()).port}/style-guide`)
    const other = await palette(page)
    const otherButton = await page.locator('button:has-text("Open dialog")').getAttribute('class')
    expect(ownSite).toBe(m.site)
    expect(own.surface).not.toBe(other.surface)
    expect(own.text).not.toBe(other.text)
    expect(ownButton).toBe(otherButton)
    await testInfo.attach('palette', { body: JSON.stringify({ own, other }, null, 2) })
  })

  test('every text/background pair meets WCAG 2.2 AA', async ({ page }, testInfo) => {
    await page.goto('/style-guide')
    const colours = await palette(page)
    const rows = PAIRS.map(([fg, bg, floor, use]) => ({
      fg,
      bg,
      use,
      floor,
      ratio: Math.round(ratio(colours[fg], colours[bg]) * 100) / 100,
    }))
    const table = rows
      .map((r) => `| ${r.fg} on ${r.bg} | ${r.use} | ${r.ratio}:1 | ${r.floor}:1 |`)
      .join('\n')
    console.log(`contrast ${meta(testInfo).site}\n${table}`)
    await testInfo.attach('contrast', { body: table })
    expect(rows.filter((r) => r.ratio < r.floor)).toEqual([])
  })
})

test.describe('4.1.e the fonts', () => {
  test('load self-hosted, within the first-paint budget', async ({ page }, testInfo) => {
    const external: string[] = []
    const fonts: { url: string; bytes: number }[] = []
    page.on('request', (request) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) external.push(request.url())
    })
    page.on('response', async (response) => {
      if (response.request().resourceType() !== 'font') return
      const body = await response.body().catch(() => Buffer.alloc(0))
      fonts.push({ url: new URL(response.url()).pathname, bytes: body.length })
    })
    await page.goto('/', { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const total = fonts.reduce((sum, font) => sum + font.bytes, 0)
    const list = fonts.map((font) => `${font.url} ${font.bytes} B`).join('\n')
    console.log(`fonts ${meta(testInfo).site}: ${fonts.length} files, ${total} B\n${list}`)
    await testInfo.attach('fonts', { body: `${list}\ntotal ${total} B` })
    expect(external).toEqual([])
    expect(fonts.every((font) => font.url.startsWith('/_next/static/'))).toBe(true)
    expect(fonts.length).toBeLessThanOrEqual(3)
    expect(total).toBeLessThan(150 * 1024)
  })
})

test.describe('4.2.d the keyboard', () => {
  test('Tab reaches every control on the style guide with a visible focus ring', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/style-guide')
    const tabbable = await page.evaluate(() => {
      const all = document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]',
      )
      let n = 0
      for (const el of all) {
        const style = getComputedStyle(el)
        const hidden = el.getClientRects().length === 0 || style.visibility === 'hidden'
        if (el.tabIndex < 0 || hidden || (el as HTMLButtonElement).disabled) continue
        el.dataset.qaTab = String(n++)
      }
      return n
    })
    expect(tabbable).toBeGreaterThan(20)
    const seen = new Set<string>()
    const bare: string[] = []
    for (let i = 0; i < tabbable + 10 && seen.size < tabbable; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const style = getComputedStyle(el)
        const ring =
          (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 1) ||
          style.boxShadow !== 'none'
        return { id: el.dataset.qaTab ?? '', ring, what: el.outerHTML.slice(0, 80) }
      })
      if (!focused) continue
      if (focused.id) seen.add(focused.id)
      if (!focused.ring) bare.push(focused.what)
    }
    expect(bare, 'focused with no visible ring').toEqual([])
    expect(seen.size, 'tabbable controls reached by Tab').toBe(tabbable)
  })

  test('the checkbox toggles with Space; the dialog opens with Enter, closes with Escape', async ({
    page,
  }) => {
    await page.goto('/style-guide')
    const box = page.locator('#sg-checkbox ~ * input[type="checkbox"]:not([disabled])').first()
    const checkbox = (await box.count())
      ? box
      : page.locator('input[type="checkbox"]:not([disabled])').first()
    const before = await checkbox.isChecked()
    await checkbox.focus()
    await page.keyboard.press('Space')
    expect(await checkbox.isChecked()).toBe(!before)
    await page.locator('button:has-text("Open dialog")').focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Example dialog' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

test.describe('4.3.a the header on a phone', () => {
  test('opens a menu with the nav and the language switch from the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const burger = page.locator('header button[aria-expanded]')
    await burger.focus()
    await page.keyboard.press('Enter')
    const sheet = page.locator('header [role="dialog"]')
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('a[hreflang]')).toHaveCount(2)
    await expect(sheet.locator('nav a').first()).toBeVisible()
  })
})

test.describe('4.3.e the homes and the partnership page', () => {
  for (const viewport of WIDTHS) {
    test(`are axe clean and fit the width in every locale at ${viewport.width} px`, async ({
      page,
    }, testInfo) => {
      const m = meta(testInfo)
      const pages = m.site === 'shop' ? ['home', 'partnership'] : ['home']
      await page.setViewportSize(viewport)
      for (const locale of m.locales.supported) {
        for (const name of pages) {
          const prefix = prefixOf(m, locale)
          const url = name === 'home' ? prefix || '/' : `${prefix}/${partnershipSlug(locale)}`
          expect((await page.goto(url))?.status(), url).toBe(200)
          await expect(page.locator('html')).toHaveAttribute('lang', locale)
          await page.waitForLoadState('networkidle')
          await axeClean(page, `${url} at ${viewport.width} px`)
          const scroll = await page.evaluate(() => document.documentElement.scrollWidth)
          expect(scroll, `${url} scrolls sideways at ${viewport.width} px`).toBeLessThanOrEqual(
            viewport.width,
          )
          await shoot(page, testInfo, `${name}-${locale}-${viewport.width}`)
        }
      }
    })
  }

  test('the partnership page ends in an enquiry, never a sign-in', async ({ page }, testInfo) => {
    test.skip(meta(testInfo).site !== 'shop', 'the shop alone has a partnership page')
    for (const url of ['/partnership', `/id/${partnershipSlug('id')}`]) {
      await page.goto(url)
      const main = page.locator('main')
      await expect(main.locator('input[type="password"]')).toHaveCount(0)
      const ids = await main.locator('section').evaluateAll((all) => all.map((each) => each.id))
      expect(ids.at(-1), url).toBe('enquire')
      await expect(page.locator('#enquire form')).toBeVisible()
      await expect(page.locator('#enquire form textarea')).toBeVisible()
      await expect(main).not.toContainText(/sign in|log in|masuk akun/i)
    }
  })
})
