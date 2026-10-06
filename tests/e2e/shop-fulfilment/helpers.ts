/**
 * Shared steps for the shop fulfilment gate (TASKS.md 7.4.a), extracted (not shared by import) from
 * `tests/e2e/shop/gate.spec.ts` (the buy journey: bag, pin, pay) and `tests/e2e/admin/store-panel.spec.ts`
 * (signing in and driving the store/owner panel) so this folder owns its own copies, per the
 * ticket's owned paths.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

import { API_BASE, HOST_HEADER, localDatabaseUrl, ROOT, SHOP_ORIGIN, SHOTS } from './env'

const here = dirname(fileURLToPath(import.meta.url))
const windows = process.platform === 'win32'

/** Both widths this gate checks (TASKS.md 7.4.c). */
export const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

export async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

export async function axeClean(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

/** An amount shown as rupiah (`formatRupiah`, `id-ID` currency) back to a plain integer. */
export function rupiahToNumber(text: string): number {
  const digits = text.replace(/\D/g, '')
  expect(digits, `a rupiah amount in "${text}"`).not.toBe('')
  return Number(digits)
}

// ---------------------------------------------------------------------------------------------
// The guest buy journey (`gate.spec.ts`'s own steps, copied for this folder's spec to drive).
// ---------------------------------------------------------------------------------------------

/** Adds `slug`'s product from its own page; asserts the real success status, not a guess. */
export async function addFromProductPage(page: Page, slug: string): Promise<void> {
  const response = await page.goto(`${SHOP_ORIGIN}/product/${slug}`)
  expect(response?.status(), `product page for ${slug}`).toBe(200)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByText('Added to your bag.')).toBeVisible()
}

/** Types a pin into the checkout's fallback lat/lng inputs (no Maps key needed). */
export async function typePin(page: Page, pin: { lat: number; lng: number }): Promise<void> {
  const inputs = page.locator('input[inputmode="decimal"]')
  await inputs.nth(0).fill(String(pin.lat))
  await inputs.nth(1).fill(String(pin.lng))
}

/** Whether the checkout's fee box settles on a fee (no refusal alert) for the bag and pin as they stand. */
export async function feeQuoteOk(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const [alertTexts, feeLabels] = await Promise.all([
      page.getByRole('alert').allTextContents(),
      page.getByText('Delivery', { exact: true }).count(),
    ])
    const realAlerts = alertTexts.filter((text) => text.trim() !== '')
    if (realAlerts.length === 0 && feeLabels > 0) return true
    await page.waitForTimeout(300)
  }
  return false
}

export type CheckoutContact = {
  readonly name: string
  readonly whatsapp: string
  readonly email: string
  readonly address: string
}

/** Fills the checkout's contact, delivery and pin fields; waits for the fee to quote. */
export async function fillCheckout(
  page: Page,
  contact: CheckoutContact,
  pin: { lat: number; lng: number },
): Promise<void> {
  await page.goto(`${SHOP_ORIGIN}/checkout`)
  // Type only once the form is hydrated: text typed into the server-rendered inputs before React
  // takes them over is reset (seen on staging, where hydration is slower than on a local build).
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/full name/i).fill(contact.name)
  await page.getByLabel(/whatsapp/i).fill(contact.whatsapp)
  await page.getByLabel(/email/i).fill(contact.email)
  await page.getByLabel(/address/i).fill(contact.address)
  await typePin(page, pin)
  expect(await feeQuoteOk(page), 'the fee quote resolved for the checkout pin').toBe(true)
}

export type SettledOrder = {
  readonly token: string
  /** As the storefront shows it (thousands-separated) — what the email names. */
  readonly shownNumber: string
  /** Digits only — what the admin's queue shows (`order.number`, unformatted). */
  readonly numberText: string
}

/** Continues to payment, settles the simulator, and returns the tracking token and order number. */
export async function payAndSettle(page: Page): Promise<SettledOrder> {
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page).toHaveURL(/\/order\//)
  const token = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
  expect(token.length, 'a tracking token in the redirect URL').toBeGreaterThan(10)
  const pendingHeading = await page.getByRole('heading', { name: /^Order /i }).innerText()
  const shownNumber = /Order ([\d,]+)/.exec(pendingHeading)?.[1] ?? null
  expect(shownNumber, 'the order number on the pending page').not.toBeNull()
  await page.getByRole('button', { name: /^Pay /i }).click()
  await expect(page.getByText('Test payment — no money moves.')).toBeVisible()
  await page.getByRole('button', { name: 'Settle' }).click()
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
  // The admin's queue shows the raw `order.number`, no thousands separator.
  return { token, shownNumber: shownNumber!, numberText: shownNumber!.replace(/,/g, '') }
}

export type ProductSummary = { readonly id: number; readonly slug: string }

export async function listProducts(request: APIRequestContext): Promise<ProductSummary[]> {
  const res = await request.get(`${API_BASE}/api/products?limit=200&depth=0`, {
    headers: HOST_HEADER,
  })
  expect(res.ok(), 'GET /api/products').toBeTruthy()
  const body = (await res.json()) as { docs: ProductSummary[] }
  return body.docs
}

// ---------------------------------------------------------------------------------------------
// Signing in to the admin (`admin/admin.ts`'s own `signIn`, parameterised by password — staging's
// accounts carry their own, never this worktree's fixed dev one).
// ---------------------------------------------------------------------------------------------

export async function signInAs(page: Page, email: string, password: string): Promise<void> {
  await page.context().clearCookies()
  await page.goto(`${SHOP_ORIGIN}/admin/login`)
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

/** Opens the order whose list card shows `#<numberText>`, from the queue the signed-in role sees. */
export async function openOrderByNumber(page: Page, numberText: string): Promise<void> {
  await page.goto(`${SHOP_ORIGIN}/admin/orders`)
  await page
    .getByRole('link')
    .filter({ hasText: `#${numberText}` })
    .first()
    .click()
  await page.waitForURL(`**/admin/orders/**`)
}

// ---------------------------------------------------------------------------------------------
// Database ops (`GATE_DB=local` only) — `./ops.ts`, run as its own `payload run` process.
// ---------------------------------------------------------------------------------------------

const opsScript = join(here, 'ops.ts')
const opsOutDir = join(here, '.ops-out')

function runOps(op: Record<string, unknown>): Record<string, unknown> {
  if (!existsSync(opsOutDir)) mkdirSync(opsOutDir, { recursive: true })
  const out = join(opsOutDir, `out-${randomBytes(6).toString('hex')}.json`)
  execFileSync('pnpm', ['--filter', '@engine/cms', 'payload', 'run', opsScript], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: windows,
    env: {
      ...process.env,
      DATABASE_URL: localDatabaseUrl(),
      NODE_ENV: 'development',
      SHOPFUL_OP: JSON.stringify(op),
      SHOPFUL_OUT: out,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (!existsSync(out)) throw new Error(`shop-fulfilment ops.ts (${op.op}) wrote no result file`)
  const result = JSON.parse(readFileSync(out, 'utf8')) as Record<string, unknown>
  rmSync(out, { force: true })
  return result
}

export function setupFixtureStock(
  storeAId: number,
  storeBId: number,
  pin: { lat: number; lng: number },
): ProductSummary[] {
  const result = runOps({ op: 'setup', storeAId, storeBId, pinLat: pin.lat, pinLng: pin.lng })
  return (result.products as ProductSummary[]) ?? []
}

export type OrderRow = {
  readonly found: boolean
  readonly id?: number
  readonly number?: number
  readonly status?: string
  readonly storeId?: number
}

export function orderByToken(token: string): OrderRow {
  return runOps({ op: 'order-by-token', token }) as OrderRow
}

export function cleanupOpsOut(): void {
  rmSync(opsOutDir, { recursive: true, force: true })
}
