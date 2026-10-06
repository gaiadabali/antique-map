/**
 * Shared steps for the shop fulfilment gate (TASKS.md 7.4.a), extracted (not shared by import) from
 * `tests/e2e/shop/gate.spec.ts` (the buy journey: bag, pin, pay) and `tests/e2e/admin/store-panel.spec.ts`
 * (signing in and driving the store/owner panel) so this folder owns its own copies, per the
 * ticket's owned paths.
 */
import { mkdirSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

import { gateAccounts } from './accounts'
import { API_BASE, GATE_DB, HOST_HEADER, MAILPIT_URL, SHOP_ORIGIN, SHOTS } from './env'
import { cleanupOpsOut as cleanupOpsOutImpl, runOps } from './run-ops'

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

export type CheckoutContact = {
  readonly name: string
  readonly whatsapp: string
  readonly email: string
  readonly address: string
}

/**
 * Fills the checkout's contact, delivery and pin fields. No fee to wait for any more — staff
 * quote delivery after the order is placed (TASKS.md 6.6, 7.4-r2), so the checkout page itself
 * never prices it.
 */
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
}

export type PlacedOrder = {
  readonly token: string
  /** `subtotal − discount`, read off the awaiting-quote page — nothing prices delivery yet. */
  readonly itemsTotalIdr: number
}

/** Submits the checkout; the order lands `awaiting_quote` (6.6) — nothing to pay yet. */
export async function submitCheckout(page: Page): Promise<PlacedOrder> {
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page).toHaveURL(/\/order\//)
  const token = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
  expect(token.length, 'a tracking token in the redirect URL').toBeGreaterThan(10)
  await expect(
    page.getByRole('heading', { name: "We're confirming your delivery price" }),
  ).toBeVisible()
  const itemsTotalIdr = rupiahToNumber(await page.locator('dl').locator('dd').last().innerText())
  return { token, itemsTotalIdr }
}

export type SettledOrder = {
  readonly token: string
  /** As the storefront shows it (thousands-separated) — what the email names. */
  readonly shownNumber: string
  /** Digits only — what the admin's queue shows (`order.number`, unformatted). */
  readonly numberText: string
}

/**
 * Waits for the buyer's order page to switch to its priced, `pending_payment` state (staff just
 * quoted it — `quoteAsStaff`), asserts the total is `expectedTotalIdr`, settles the simulator, and
 * returns the tracking token and order number.
 */
export async function payAndSettle(page: Page, expectedTotalIdr: number): Promise<SettledOrder> {
  let payButton = page.getByRole('button', { name: /^Pay /i })
  for (let attempt = 0; attempt < 20; attempt++) {
    if ((await payButton.count()) > 0) break
    await page.waitForTimeout(500)
    await page.reload()
    payButton = page.getByRole('button', { name: /^Pay /i })
  }
  await expect(payButton, 'the priced Pay button appeared').toBeVisible()
  const shownTotal = rupiahToNumber(await payButton.innerText())
  expect(shownTotal, 'the priced total (subtotal − discount + fee)').toBe(expectedTotalIdr)

  const pendingHeading = await page.getByRole('heading', { name: /^Order /i }).innerText()
  const shownNumber = /Order ([\d,]+)/.exec(pendingHeading)?.[1] ?? null
  expect(shownNumber, 'the order number on the pending page').not.toBeNull()

  await payButton.click()
  await expect(page.getByText('Test payment — no money moves.')).toBeVisible()
  await page.getByRole('button', { name: 'Settle' }).click()
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
  const token = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
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

/**
 * Staff enter the courier fee and press "Send price" (TASKS.md 6.6.c, 7.4-r2) — the admin UI, so
 * this works unchanged against staging, where there is no Local API. Signs in as the owner: the
 * store queue lists only `paid` and later statuses (`./data.ts`'s `ACTIVE_STATUSES`), so an
 * `awaiting_quote` order never appears there — the owner/editor list has no such filter.
 */
export async function quoteAsStaff(page: Page, orderNumber: string, feeIdr: number): Promise<void> {
  const accounts = gateAccounts()
  await signInAs(page, accounts.owner.email, accounts.owner.password)
  await openOrderByNumber(page, orderNumber)
  await page.locator('input[name="feeIdr"]').fill(String(feeIdr))
  await page.getByRole('button', { name: 'Send price' }).click()
  await page.waitForURL('**/admin/orders/**')
  // The panel confirms: the order left `awaiting_quote` (its "Send the delivery price" form is
  // gone) and now shows the status the quote moved it to.
  await expect(page.getByText('Awaiting payment')).toBeVisible()
}

// ---------------------------------------------------------------------------------------------
// Database ops (`GATE_DB=local` only) — `./ops.ts`, run as its own `payload run` process
// (`./run-ops.ts`'s `runOps`, shared with `./accounts.ts`).
// ---------------------------------------------------------------------------------------------

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

export const cleanupOpsOut = cleanupOpsOutImpl

// ---------------------------------------------------------------------------------------------
// The order number before a quote exists: the `awaiting_quote` order page never shows it (its
// heading is only "We're confirming your delivery price"), so `quoteAsStaff` needs another way to
// find the order it must open. `GATE_DB=local` reads it straight from the row; staging reads the
// order-confirmation email `createOrder` sends on placement (`shop/notify`'s own subject,
// `Order #<n> — update`) through Mailpit, same as `tests/e2e/shop/gate.spec.ts`'s own pattern.
// ---------------------------------------------------------------------------------------------

export type OrderEmail = { readonly text: string; readonly subject: string }

/** The newest email Mailpit has for `to`, or `null` after ten tries (`MAILPIT_URL=none` skips). */
export async function orderConfirmationEmail(
  request: APIRequestContext,
  to: string,
): Promise<OrderEmail | null> {
  if (MAILPIT_URL === 'none') return null
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await request.get(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    )
    if (res.ok()) {
      const body = (await res.json()) as { messages?: { ID: string }[] }
      const found = body.messages?.[0]
      if (found) {
        const message = await request.get(`${MAILPIT_URL}/api/v1/message/${found.ID}`)
        const parsed = (await message.json()) as { Text: string; Subject: string }
        return { text: parsed.Text, subject: parsed.Subject }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

/** `order.number` as digits (the admin's queue shape) for the order just placed. */
export async function orderNumberAfterCheckout(
  request: APIRequestContext,
  token: string,
  buyerEmail: string,
): Promise<string> {
  if (GATE_DB) {
    const row = orderByToken(token)
    expect(row.found, 'the just-placed order').toBe(true)
    return String(row.number)
  }
  const email = await orderConfirmationEmail(request, buyerEmail)
  expect(email, 'the order confirmation email (MAILPIT_URL)').not.toBeNull()
  const match = /#(\d+)/.exec(email!.subject)
  expect(match, 'an order number in the confirmation email subject').not.toBeNull()
  return match![1]!
}
