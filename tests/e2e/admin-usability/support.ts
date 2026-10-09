/**
 * 10.4 proxy run: the owner's timed admin recipes, driven by the qa agent through the admin UI only.
 * Shared pieces: staging origins, the timing meter (wall clock, clicks, page loads, stumbles), the staff
 * sign-in, screenshots and the ledger of what the run created on staging. Credentials come from the
 * environment (`run.sh` loads them from Helios) and are never printed or written anywhere.
 */
import { createHash } from 'node:crypto'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Locator, Page, Response, TestInfo } from '@playwright/test'

export const SHOP = (process.env.E2E_BASE_SHOP ?? 'https://old-east-indies.gaiada.com').replace(
  /\/$/,
  '',
)
export const GALLERY = (
  process.env.E2E_BASE_GALLERY ?? 'https://indies-gallery.gaiada.com'
).replace(/\/$/, '')
export const OUT = process.env.USABILITY_OUT ?? 'docs/gates/admin-usability'
export const SHOTS = `${OUT}/shots`
/** One tag per process: the ledger and the rehearsal records tell the two runs apart. */
export const RUN =
  process.env.USABILITY_RUN ?? new Date().toISOString().replace(/\D/g, '').slice(0, 12)
/** The mark on everything this run writes to staging. */
export const MARK = 'REHEARSAL 10.4'
/** The buyer's pin: exactly on DPS-004 (Denpasar), the store of the E2E_STORE_A_* user. */
export const PIN = { lat: -8.690738, lng: 115.185504 }
/** A published design DPS-004 stocks (4 on 2026-10-09 per variant; the draft designs with more stock cannot be bought). */
export const BUY_SLUG = process.env.USABILITY_PRODUCT ?? 'orchid-tree-1863'

export const widthOf = (info: TestInfo): number => (info.project.name === 'mobile' ? 390 : 1280)

export function need(...names: string[]): Record<string, string> {
  const missing = names.filter((n) => !process.env[n])
  if (missing.length > 0)
    throw new Error(`BLOCKED: this step needs ${missing.join(', ')} in the environment`)
  return Object.fromEntries(names.map((n) => [n, process.env[n]!]))
}

/**
 * The staging login is rate limited (HTTP 429 with Retry-After after a handful of sign-ins), so a session is kept
 * per account in the OS temp folder (never in the repo) and reused for up to 90 minutes; a 429 is waited out.
 * Sign-in time is not part of any recipe's stopwatch.
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  const file = join(
    tmpdir(),
    `admin-usability-session-${createHash('sha1').update(email).digest('hex').slice(0, 10)}.json`,
  )
  await page.context().clearCookies()
  if (existsSync(file) && Date.now() - statSync(file).mtimeMs < 90 * 60_000) {
    await page.context().addCookies(JSON.parse(readFileSync(file, 'utf8')))
    await page.goto(`${SHOP}/admin`)
    await page.waitForLoadState('networkidle')
    if (!new URL(page.url()).pathname.includes('/login')) return
    await page.context().clearCookies()
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let wait = 0
    const onResponse = (r: Response): void => {
      if (r.status() === 429 && r.url().includes('/login'))
        wait = Number(r.headers()['retry-after'] ?? 300) + 5
    }
    page.on('response', onResponse)
    await page.goto(`${SHOP}/admin/login`)
    await page.locator('#field-email').fill(email)
    await page.locator('#field-password').fill(password)
    await page.locator('button[type="submit"]').click()
    try {
      await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 })
    } catch {
      page.off('response', onResponse)
      if (wait === 0) throw new Error('sign-in did not complete and was not rate limited')
      await page.waitForTimeout(wait * 1000)
      continue
    }
    page.off('response', onResponse)
    await page.waitForLoadState('networkidle')
    writeFileSync(file, JSON.stringify(await page.context().cookies()))
    return
  }
  throw new Error('sign-in still rate limited after waiting')
}

export async function shoot(page: Page, info: TestInfo, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({
    path: `${SHOTS}/${name}-${widthOf(info)}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}

/** What the run created on staging, one JSON line each (read back by later recipes and by the report). */
export function record(entry: Record<string, unknown>): void {
  mkdirSync(OUT, { recursive: true })
  appendFileSync(`${OUT}/created.ndjson`, `${JSON.stringify({ run: RUN, ...entry })}\n`)
}

export function recorded(
  kind: string,
  where: Record<string, unknown> = {},
): Record<string, unknown> | undefined {
  const file = `${OUT}/created.ndjson`
  if (!existsSync(file)) return undefined
  const rows = readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>)
    .filter(
      (r) =>
        r.run === RUN && r.kind === kind && Object.entries(where).every(([k, v]) => r[k] === v),
    )
  return rows.at(-1)
}

export type Verdict = 'PASS' | 'FAIL'

/**
 * The stopwatch of one recipe: it starts at the recipe's start page and stops at its done state. Every click goes
 * through `click` (so the count is honest) and every top-level page load is counted. `stumble` notes anything a
 * new staff member would trip on; the notes land in the results file the report is built from.
 */
export class Meter {
  private t0 = 0
  private t1 = 0
  private skipped = 0
  private clicks = 0
  private pages = 0
  private readonly notes: string[] = []
  constructor(
    private readonly page: Page,
    private readonly info: TestInfo,
    private readonly recipe: string,
    private readonly targetSeconds: number,
  ) {
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame() && this.t0 > 0) this.pages += 1
    })
  }
  start(): void {
    this.t0 = Date.now()
  }
  /** A screenshot taken during the recipe: the time it takes is not the staff member's, so it is left out. */
  async shot(name: string): Promise<void> {
    const s = Date.now()
    await shoot(this.page, this.info, name)
    this.skipped += Date.now() - s
  }
  /** Milliseconds spent on the stopwatch so far (screenshots left out). */
  elapsed(): number {
    return (this.t1 || Date.now()) - this.t0 - this.skipped
  }
  stop(): void {
    this.t1 = Date.now()
  }
  seconds(): number {
    return Math.round(((this.t1 || Date.now()) - this.t0 - this.skipped) / 100) / 10
  }
  async click(target: Locator): Promise<void> {
    this.clicks += 1
    await target.click()
  }
  stumble(text: string): void {
    this.notes.push(text)
  }
  finish(verdict: Verdict, extra: Record<string, unknown> = {}): void {
    const row = {
      run: RUN,
      recipe: this.recipe,
      width: widthOf(this.info),
      seconds: this.seconds(),
      target: this.targetSeconds,
      withinTarget: this.targetSeconds > 0 ? this.seconds() <= this.targetSeconds : null,
      clicks: this.clicks,
      pages: this.pages,
      verdict,
      stumbles: this.notes,
      ...extra,
    }
    mkdirSync(OUT, { recursive: true })
    appendFileSync(`${OUT}/results.ndjson`, `${JSON.stringify(row)}\n`)
    console.log(`RESULT ${JSON.stringify(row)}`)
  }
}

/** Picks an option of a Payload select or relationship field (react-select), by text or the first one. */
export async function choose(field: Locator, text?: string | RegExp): Promise<string> {
  await field.locator('.rs__control, [class*="react-select"]').first().click()
  if (typeof text === 'string') await field.locator('input').first().fill(text)
  const options = field.page().locator('.rs__option, [role="option"]')
  const option = text === undefined ? options.first() : options.filter({ hasText: text }).first()
  await option.waitFor({ timeout: 15_000 })
  const label = (await option.innerText()).trim()
  await option.click()
  return label
}

/** Unpublishes a product the way the admin offers it: the record's three-dot menu, then Confirm (not on any stopwatch). */
export async function unpublish(page: Page, id: number): Promise<void> {
  await page.goto(`${SHOP}/admin/collections/products/${id}`)
  await page.waitForLoadState('networkidle')
  // A published product with no stock also answers 404 on the site, so the admin's own status decides.
  const published = await page
    .locator('.doc-controls')
    .getByText(/Status:\s*Published/)
    .count()
  if (published === 0) return
  await page.locator('.doc-controls__popup .popup-button').first().click()
  await page.getByText('Unpublish', { exact: true }).click()
  await page
    .locator('.confirmation-modal')
    .getByRole('button', { name: /confirm|unpublish/i })
    .last()
    .click()
  await page.locator('[data-sonner-toast]').first().waitFor()
}
