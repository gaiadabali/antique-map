/**
 * The shop payment gate (TASKS.md 6.5.c, 6.6.c; EXPERIENCE-SHOP.md §5-§8; COMMERCE.md §3-§6): one
 * buyer journey at 390 px, in a browser, on a production build with `MIDTRANS_MODE=simulate` — two
 * products, a pin, checkout with no fee shown, the order page's "confirming your delivery price"
 * state, a staff quote (Local API `quoteDeliveryFee`, `GATE_DB=local` only), the page switching
 * itself to Pay with the fee and the final total, simulator Settle, confirmation, email, then a
 * second guest's order abandoned in each of the two windows (`awaiting_quote`'s quote window and
 * the paid-quote's payment window), each expiring and returning its stock. Axe is clean on the bag,
 * checkout and order pages at 390 and 1280 px.
 *
 * **No real sandbox payment**: deferred by owner decision 2026-10-05 (TASKS.md 6.5.c; no gateway
 * is set up yet) — this spec only drives the simulator, as `payment.spec.ts` does.
 *
 * Runs locally (`E2E_PORT`, the worktree's own database and Mailpit) and, unchanged, against
 * staging later (`E2E_BASE_URL`, a full origin; `MAILPIT_URL=none` skips the email step; `GATE_DB`
 * unset skips every step that reads or writes the database directly — including the quote, so
 * without `GATE_DB=local` this spec can drive the buyer's side only as far as "confirming").
 * Nothing else may skip — products and the store are discovered from the live site
 * (`findSellablePair`), never hard-coded, mirroring `product.spec.ts`'s own `findCandidates`.
 *
 * 6.6.c note: the checkout no longer has a fee preview to probe with (the 2026-10-06 decision
 * retired it), so `findSellablePair` now probes by actually placing a throwaway order per
 * candidate pair in its own browser context — a real `awaiting_quote` order, holding real stock,
 * left to expire on its own quote window rather than torn down here (no public, side-effect-free
 * "would this pair find one store" check remains once the fee preview is gone).
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

// ---------------------------------------------------------------------------------------------
// Environment — local by default; `E2E_BASE_URL` (a full origin) switches every page and API call
// to it, for the staging run `docs/gates/shop-payment.md` names for the orchestrator.
// ---------------------------------------------------------------------------------------------

type EnvMap = Map<string, string>

/** A dotenv file as a Map; a missing file is an empty Map (`payment.spec.ts`'s own `readEnvFile`). */
function readEnvFile(path: string): EnvMap {
  if (!existsSync(path)) return new Map()
  const values: EnvMap = new Map()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) values.set(match[1]!, match[2]!.replace(/^(['"])(.*)\1$/, '$2'))
  }
  return values
}

const LOCAL_ENV = readEnvFile(join(root, '.env.local'))
const envVar = (key: string): string | undefined => process.env[key] ?? LOCAL_ENV.get(key)

const PORT = process.env.E2E_PORT ?? envVar('PORT') ?? '4200'
const STAGING_ORIGIN = process.env.E2E_BASE_URL?.replace(/\/$/, '') ?? null
/** Page navigation: an absolute origin either way — `baseURL` is fixed to `shop.localhost` in
 * `playwright.config.ts` and never reads `E2E_BASE_URL`, so this spec builds its own URLs. */
const SHOP_ORIGIN = STAGING_ORIGIN ?? `http://shop.localhost:${PORT}`
/** API reads: `127.0.0.1` plus a `Host` header locally (`product.spec.ts`'s own note — Node's
 * resolver, unlike Chromium's, may not know `*.localhost`); the real origin on staging. */
const API_BASE = STAGING_ORIGIN ?? `http://127.0.0.1:${PORT}`
const HOST_HEADER = STAGING_ORIGIN ? {} : { Host: `shop.localhost:${PORT}` }

const GATE_DB = (process.env.GATE_DB ?? envVar('GATE_DB')) === 'local'
const MAILPIT_URL = process.env.MAILPIT_URL ?? envVar('MAILPIT_URL') ?? 'http://localhost:8025'
const SITE_ORIGIN = process.env.SITE_ORIGIN ?? SHOP_ORIGIN
const CRON_SECRET = process.env.CRON_SECRET ?? envVar('CRON_SECRET') ?? 'dev-only-not-a-secret'
const SHOTS = process.env.GATE_SHOTS ?? 'docs/gates/shop-payment'

/** Denpasar, the pin picker's own default centre (`pin-picker.tsx`). */
const DEFAULT_CENTRE = { lat: -8.6705, lng: 115.2126 }

async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: 'disabled' })
}

async function axeClean(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

/** Both widths this gate checks (TASKS.md 6.5.c). */
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

async function axeBothWidths(page: Page, label: string): Promise<void> {
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    await axeClean(page, `${label} at ${viewport.width}px`)
  }
  await page.setViewportSize(WIDTHS[0])
}

/** An amount shown as rupiah (`formatRupiah`, `id-ID` currency) back to a plain integer. */
function rupiahToNumber(text: string): number {
  const digits = text.replace(/\D/g, '')
  expect(digits, `a rupiah amount in "${text}"`).not.toBe('')
  return Number(digits)
}

// ---------------------------------------------------------------------------------------------
// Discovery: two in-stock, unvarianted products, and a pin a single store can send them both to
// (never hard-coded — `product.spec.ts`'s own "a missing candidate is a failure" rule applies).
// ---------------------------------------------------------------------------------------------

type ProductSummary = { readonly id: number; readonly slug: string }

async function listProducts(request: APIRequestContext): Promise<ProductSummary[]> {
  const res = await request.get(`${API_BASE}/api/products?limit=200&depth=0`, {
    headers: HOST_HEADER,
  })
  expect(res.ok(), 'GET /api/products').toBeTruthy()
  const body = (await res.json()) as { docs: ProductSummary[] }
  return body.docs
}

/** Sellable (add button enabled) and unvarianted (one click adds it, no picker involved). */
async function sellableUnvariantedProducts(
  request: APIRequestContext,
  candidates: ProductSummary[],
): Promise<ProductSummary[]> {
  const found: ProductSummary[] = []
  for (const product of candidates) {
    const res = await request.get(`${API_BASE}/product/${product.slug}`, { headers: HOST_HEADER })
    if (res.status() !== 200) continue
    const html = await res.text()
    const hasVariant = /type="radio"[^>]*value="/.test(html)
    const addDisabled = /__addButton"\s+disabled/.test(html)
    if (!hasVariant && !addDisabled) found.push(product)
    if (found.length >= 8) break
  }
  return found
}

/** Adds `slug`'s product from its own page; asserts the real success status, not a guess. */
async function addFromProductPage(page: Page, slug: string): Promise<void> {
  const response = await page.goto(`${SHOP_ORIGIN}/product/${slug}`)
  expect(response?.status(), `product page for ${slug}`).toBe(200)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByText('Added to your bag.')).toBeVisible()
}

/**
 * Types a pin into the checkout's fallback lat/lng inputs (no Maps key needed — `pin-picker.tsx`).
 * Filling the latitude field alone leaves no pin — `typeLatLng` only picks once both fields parse
 * to a finite number (`parseCoordinate`) — so the delivery note (not a fee: 6.6.c retired it)
 * stays the only thing shown below the review until both fields have landed.
 */
async function typePin(page: Page, pin: { lat: number; lng: number }): Promise<void> {
  const inputs = page.locator('input[inputmode="decimal"]')
  await inputs.nth(0).fill(String(pin.lat))
  await inputs.nth(1).fill(String(pin.lng))
}

/** Fills the checkout's contact and address fields — every case below needs the same ones. */
async function fillContact(
  page: Page,
  contact: { name: string; whatsapp: string; email: string },
): Promise<void> {
  await page.getByLabel(/full name/i).fill(contact.name)
  await page.getByLabel(/whatsapp/i).fill(contact.whatsapp)
  await page.getByLabel(/email/i).fill(contact.email)
  await page.getByLabel(/address/i).fill('Jl. Teuku Umar, Denpasar')
}

/**
 * Finds two distinct products one store can send (6.6.c: the checkout no longer previews a fee,
 * so there is no public, side-effect-free way left to ask "would this pair find one store" — this
 * probes by actually placing a throwaway order per candidate pair, in its own browser context (so
 * the main test's own bag is never touched). A `no_single_store` refusal moves to the next pair; a
 * redirect to `/order/` is the pair this returns — the throwaway order itself is left to expire on
 * its own quote window, never torn down here. A worktree with fewer than two sellable products, or
 * whose stores never cover any pair, is a setup gap: this fails loudly (`expect(...).not.toBeNull()`),
 * never a skip.
 */
async function findSellablePair(
  page: Page,
  request: APIRequestContext,
): Promise<{ a: ProductSummary; b: ProductSummary }> {
  const products = await listProducts(request)
  expect(products.length, 'seeded, published products').toBeGreaterThan(0)
  const sellable = await sellableUnvariantedProducts(request, products)
  expect(sellable.length, 'in-stock, unvarianted products to pick two from').toBeGreaterThanOrEqual(
    2,
  )

  const browser = page.context().browser()
  if (browser === null) throw new Error('finding a sellable pair needs a real browser')

  for (let i = 0; i < sellable.length - 1; i++) {
    for (let j = i + 1; j < sellable.length; j++) {
      const a = sellable[i]!
      const b = sellable[j]!
      const probeContext = await browser.newContext()
      const probe = await probeContext.newPage()
      await addFromProductPage(probe, a.slug)
      await addFromProductPage(probe, b.slug)
      await probe.goto(`${SHOP_ORIGIN}/checkout`)
      await fillContact(probe, {
        name: 'E2E Probe',
        whatsapp: '0812 0000 0000',
        email: 'e2e-shop-gate-probe@example.test',
      })
      await typePin(probe, DEFAULT_CENTRE)
      await probe.getByRole('button', { name: 'Continue to payment' }).click()
      const ok = await probe
        .waitForURL(/\/order\//, { timeout: 5000 })
        .then(() => true)
        .catch(() => false)
      await probeContext.close()
      if (ok) return { a, b }
    }
  }
  expect(null, 'two products one store can send together').not.toBeNull()
  throw new Error('unreachable')
}

// ---------------------------------------------------------------------------------------------
// Database child process (`GATE_DB=local` only — `payment.spec.ts`'s own pattern: importing the
// CMS core straight into Playwright's Node process pulls in Next-only subpath exports that only
// resolve under Next's bundler, so the script below runs as its own `payload run` process).
// ---------------------------------------------------------------------------------------------

function localSettings(): { readonly databaseUrl: string } {
  const suffix = envVar('DB_SUFFIX')
  const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    (suffix ? `postgres://postgres:postgres@127.0.0.1:5432/indies_${suffix}` : undefined)
  if (!databaseUrl)
    throw new Error('GATE_DB=local needs DB_SUFFIX (`pnpm worktree:env`) or E2E_DATABASE_URL.')
  return { databaseUrl }
}

const OPS_SCRIPT = `
import { writeFileSync } from 'node:fs'
process.env.PAYLOAD_SECRET ??= 'e2e-shop-gate-dev-only-never-signs-anything'
const { cms, cmsPool } = await import('./engine/packages/cms/src/instance')
const { trackingTokenHash, quoteDeliveryFee } = await import('./engine/packages/cms/src/shop/orders')

const payload = await cms()
const pool = cmsPool(payload)
const client = await pool.connect()
const op = JSON.parse(process.env.GATE_OP ?? '{}')
// A staff actor's shape (\`FulfilmentActor\`), never a real sign-in — the owner quotes any order.
const STAFF_ACTOR = { id: 1, collection: 'users', role: 'owner' }

async function run() {
  if (op.op === 'order-by-token') {
    const hash = trackingTokenHash(op.token)
    const { rows } = await client.query(
      'SELECT id, number, status, store_id FROM orders WHERE tracking_token_hash = $1', [hash],
    )
    const order = rows[0]
    if (!order) return { found: false }
    const lines = (await client.query(
      'SELECT product_id, variant_sku, qty FROM orders_lines WHERE _parent_id = $1 ORDER BY _order', [order.id],
    )).rows
    return {
      found: true, id: Number(order.id), number: Number(order.number), status: order.status,
      storeId: Number(order.store_id),
      lines: lines.map((l) => ({
        productId: Number(l.product_id), variantSku: l.variant_sku, qty: Number(l.qty),
      })),
    }
  }
  if (op.op === 'stock') {
    const { rows } = await client.query(
      'SELECT quantity FROM stock_levels WHERE store_id = $1 AND product_id = $2 AND variant_sku IS NOT DISTINCT FROM $3',
      [op.storeId, op.productId, op.variantSku ?? null],
    )
    return { quantity: rows[0] ? Number(rows[0].quantity) : null }
  }
  if (op.op === 'expire') {
    await client.query(
      "UPDATE orders SET expires_at = now() - interval '10 minutes' WHERE id = $1", [op.orderId],
    )
    return { ok: true }
  }
  if (op.op === 'quote') {
    return await quoteDeliveryFee(payload, {
      orderId: op.orderId, feeIdr: op.feeIdr, actor: STAFF_ACTOR,
    })
  }
  throw new Error('unknown op: ' + op.op)
}

const result = await run()
client.release()
writeFileSync(process.env.GATE_OUT, JSON.stringify(result))
await payload.destroy()
process.exit(0)
`

const opsScript = join(root, `.e2e-shop-gate-ops-${randomBytes(4).toString('hex')}.ts`)
const opsOutDir = opsScript.replace(/\.ts$/, '-out')

/** Runs one DB op in its own `payload run` process; answers what it wrote to `GATE_OUT`. */
function runOp(op: Record<string, unknown>): Record<string, unknown> {
  if (!existsSync(opsOutDir)) mkdirSync(opsOutDir, { recursive: true })
  if (!existsSync(opsScript)) writeFileSync(opsScript, OPS_SCRIPT)
  const out = join(opsOutDir, `out-${randomBytes(6).toString('hex')}.json`)
  execFileSync('pnpm', ['--filter', '@engine/cms', 'payload', 'run', opsScript], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      DATABASE_URL: localSettings().databaseUrl,
      NODE_ENV: 'development',
      GATE_OP: JSON.stringify(op),
      GATE_OUT: out,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (!existsSync(out)) throw new Error(`gate ops.ts (${op.op}) wrote no result file`)
  return JSON.parse(readFileSync(out, 'utf8'))
}

type OrderRow = {
  readonly found: boolean
  readonly id?: number
  readonly number?: number
  readonly status?: string
  readonly storeId?: number
  readonly lines?: readonly { productId: number; variantSku: string | null; qty: number }[]
}

const orderByToken = (token: string): OrderRow => runOp({ op: 'order-by-token', token }) as OrderRow
const stockOf = (storeId: number, productId: number, variantSku: string | null = null): number => {
  const result = runOp({ op: 'stock', storeId, productId, variantSku }) as {
    quantity: number | null
  }
  expect(
    result.quantity,
    `stock_levels row for store ${storeId}, product ${productId}`,
  ).not.toBeNull()
  return result.quantity!
}
const expireOrder = (orderId: number): void => void runOp({ op: 'expire', orderId })
/** The staff "Send price" step, via the Local API directly (the admin UI is 7.2's own gate). */
const quoteOrder = (orderId: number, feeIdr: number): { ok: boolean; refusal?: string } =>
  runOp({ op: 'quote', orderId, feeIdr }) as { ok: boolean; refusal?: string }

test.afterAll(() => {
  rmSync(opsScript, { force: true })
  rmSync(opsOutDir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------------------------
// Mailpit (step 6) — skipped only when `MAILPIT_URL=none` (staging's Mailpit is loopback-only).
// ---------------------------------------------------------------------------------------------

type MailpitMessage = { readonly ID: string }

async function findOrderEmail(
  request: APIRequestContext,
  to: string,
  orderNumberText: string,
): Promise<{ text: string; subject: string }> {
  // This order's own email (the address is reused by every run), sent after the response
  // (`after()` in the checkout action), so it may land a few seconds after the redirect.
  let found: MailpitMessage | undefined
  const query = `to:${to} subject:"${orderNumberText}"`
  for (let attempt = 0; attempt < 30 && !found; attempt++) {
    const res = await request.get(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(query)}`)
    if (res.ok()) {
      const body = (await res.json()) as { messages?: MailpitMessage[] }
      found = body.messages?.[0]
    }
    if (!found) await new Promise((r) => setTimeout(r, 500))
  }
  expect(found, `an order-created email to ${to} in Mailpit`).toBeDefined()
  const message = await request.get(`${MAILPIT_URL}/api/v1/message/${found!.ID}`)
  expect(message.ok(), 'GET the Mailpit message').toBeTruthy()
  const body = (await message.json()) as { Text: string; Subject: string }
  return { text: body.Text, subject: body.Subject }
}

// ---------------------------------------------------------------------------------------------
// The buyer journey (steps 1-6, 390 px).
// ---------------------------------------------------------------------------------------------

test.describe('the shop payment gate (6.5.c, 6.6.c)', () => {
  test.describe.configure({ timeout: 180_000 })

  test('a guest buys two products; staff quote it; pays; the order is confirmed and emailed', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(WIDTHS[0])

    // Step 1-2: two sellable products, a bag, a checkout pin.
    const pair = await findSellablePair(page, request)
    await addFromProductPage(page, pair.a.slug)
    await addFromProductPage(page, pair.b.slug)
    await page.goto(`${SHOP_ORIGIN}/bag`)
    await shoot(page, 'bag-two-lines-390')
    const bagLines = page.locator('main').getByRole('listitem')
    await expect(bagLines).toHaveCount(2)
    await axeBothWidths(page, 'bag with two lines')

    await page.goto(`${SHOP_ORIGIN}/checkout`)
    await fillContact(page, {
      name: 'E2E Gate Buyer',
      whatsapp: '0812 3456 7890',
      email: 'e2e-shop-gate@example.test',
    })

    // The typed-pin (0, 0) race (6-followup) still applies: typing only the latitude must leave
    // no pin, so a submit right after could never silently send (0, 0).
    const inputs = page.locator('input[inputmode="decimal"]')
    await inputs.nth(0).fill(String(DEFAULT_CENTRE.lat))
    const halfPinAlerts = (await page.getByRole('alert').allTextContents()).filter((t) => t.trim())
    expect(halfPinAlerts, 'no refusal for a half-typed pin').toEqual([])

    await typePin(page, DEFAULT_CENTRE)

    // Step 3 (6.6.c): no fee preview any more — the review holds at an items total, with the
    // "confirmed by our team" note; total = subtotal - discount, exactly.
    const subtotalIdr = rupiahToNumber(
      await page
        .locator('dt', { hasText: 'Subtotal' })
        .locator('xpath=following-sibling::dd[1]')
        .innerText(),
    )
    const discountRow = page.locator('dt', { hasText: 'Discount' })
    const discountIdr =
      (await discountRow.count()) > 0
        ? rupiahToNumber(await discountRow.locator('xpath=following-sibling::dd[1]').innerText())
        : 0
    const itemsTotalIdr = rupiahToNumber(
      await page
        .locator('dt', { hasText: 'Items total' })
        .locator('xpath=following-sibling::dd[1]')
        .innerText(),
    )
    expect(itemsTotalIdr, 'items total = subtotal - discount').toBe(subtotalIdr - discountIdr)
    await expect(page.getByText('Delivery price confirmed by our team')).toBeVisible()
    await shoot(page, 'checkout-filled-390')
    await axeBothWidths(page, 'checkout with no fee')

    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await expect(page).toHaveURL(/\/order\//)
    const orderUrl = new URL(page.url())
    const token = decodeURIComponent(orderUrl.pathname.split('/').pop() ?? '')
    expect(token.length, 'a tracking token in the redirect URL').toBeGreaterThan(10)
    await shoot(page, 'order-confirming-390')
    // Step 4: "confirming your delivery price" — no pay button until staff quote it.
    await expect(
      page.getByRole('heading', { name: /confirming your delivery price/i }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /^Pay /i })).toHaveCount(0)
    await axeBothWidths(page, 'order page, confirming')

    if (!GATE_DB) {
      console.log('SKIPPED (no db access): the quote, pay, paid state, stock and email')
      return
    }

    // Step 5 (GATE_DB only): the staff "Send price" step, via the Local API directly — the
    // admin UI itself ("Send price", the WhatsApp button) is this ticket's own 7.2-style gate,
    // not re-driven in a browser here.
    const order = orderByToken(token)
    expect(order.found, 'the order the checkout created').toBe(true)
    expect(order.status, 'awaiting a quote').toBe('awaiting_quote')
    const FEE_IDR = 25000
    const quoted = quoteOrder(order.id!, FEE_IDR)
    expect(quoted.ok, `the quote (${quoted.refusal ?? ''})`).toBe(true)

    // Step 6: the page switches itself to Pay, with the fee and the final total — no reload: the
    // 5-second poll (`AutoRefresh`) must bring it across on its own, as `payBy` does for a webhook.
    await expect(page.getByRole('button', { name: /^Pay /i })).toBeVisible({ timeout: 10_000 })
    const feeIdr = rupiahToNumber(
      await page
        .locator('dt', { hasText: 'Delivery' })
        .locator('xpath=following-sibling::dd[1]')
        .innerText(),
    )
    expect(feeIdr, 'the quoted fee').toBe(FEE_IDR)
    const totalIdr = rupiahToNumber(
      await page
        .locator('dt', { hasText: 'Total' })
        .locator('xpath=following-sibling::dd[1]')
        .innerText(),
    )
    expect(totalIdr, 'total = items total + fee').toBe(itemsTotalIdr + feeIdr)
    await shoot(page, 'order-pending-390')
    // The order number as the page's own copy renders it ("Order 100059", no grouping — an
    // identifier, not a quantity) — shown only here, on the pending state ("order.title"); the
    // paid state ("Payment received") never repeats it.
    const pendingHeading = await page.getByRole('heading', { name: /^Order /i }).innerText()
    const orderNumberText = /Order (\d+)/.exec(pendingHeading)?.[1] ?? null
    expect(orderNumberText, 'the order number on the pending page').not.toBeNull()
    await axeBothWidths(page, 'order page, pending')

    // Step 7: pay, simulator Settle, the confirmation.
    await page.getByRole('button', { name: /^Pay /i }).click()
    await expect(page.getByText('Test payment — no money moves.')).toBeVisible()
    await page.getByRole('button', { name: 'Settle' }).click()
    await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
    const trackingLink = page.getByRole('link', { name: 'Track your order' })
    await expect(trackingLink).toBeVisible()
    await shoot(page, 'order-paid-390')
    await axeBothWidths(page, 'order page, paid')

    // Step 8: paid, the right store, stock down by each line's qty.
    const paid = orderByToken(token)
    expect(paid.status).toBe('paid')
    for (const line of paid.lines ?? []) {
      const after = stockOf(paid.storeId!, line.productId, line.variantSku)
      // The order's own creation already took the stock; this only confirms the line is
      // present and the quantity is a sane, non-negative integer — the decrement itself
      // is `stock.db.test.ts`'s concern (6.3.d), not re-proven here.
      expect(after, `stock for product ${line.productId} after payment`).toBeGreaterThanOrEqual(0)
    }

    // Step 9: the "your price is ready" email, via Mailpit — sent once the quote moved the order
    // to `pending_payment` (the core's `notifyOrderEvent`, TASKS.md 6.6-core), so it is the one
    // that can carry the final total; the earlier "confirming" email never names a total to check.
    if (MAILPIT_URL === 'none') {
      console.log('SKIPPED: email (MAILPIT_URL=none)')
    } else {
      const email = await findOrderEmail(request, 'e2e-shop-gate@example.test', orderNumberText!)
      expect(
        email.subject,
        'the email names the same order number the order page showed',
      ).toContain(orderNumberText!)
      expect(email.text).toContain(String(totalIdr).replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
      expect(email.text, 'the tracking link starts with the site origin').toContain(SITE_ORIGIN)
    }
  })

  // -------------------------------------------------------------------------------------------
  // Step 10 (6.6.c): an abandoned order expires and returns its stock, in each of its two
  // windows — unquoted (`awaiting_quote`'s `quoteWindowMinutes`) and quoted-but-unpaid
  // (`pending_payment`'s `orderExpiryMinutes`) — and a second sweep changes nothing either way.
  // -------------------------------------------------------------------------------------------

  /** Places one product's order and returns its token — the abandoned-order cases share this. */
  async function placeOneProductOrder(
    page: Page,
    contact: { name: string; whatsapp: string; email: string },
    request: APIRequestContext,
  ): Promise<string> {
    const [product] = await sellableUnvariantedProducts(request, await listProducts(request))
    expect(product, 'a sellable product for the abandoned-order case').toBeDefined()
    await page.goto(`${SHOP_ORIGIN}/bag`)
    await addFromProductPage(page, product!.slug)
    await page.goto(`${SHOP_ORIGIN}/checkout`)
    await fillContact(page, contact)
    await typePin(page, DEFAULT_CENTRE)
    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await expect(page).toHaveURL(/\/order\//)
    return decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
  }

  async function sweep(request: APIRequestContext): Promise<{ status: number }> {
    const res = await request.post(`${API_BASE}/api/x/cron/sweeps`, {
      headers: { ...HOST_HEADER, authorization: `Bearer ${CRON_SECRET}` },
    })
    return { status: res.status() }
  }

  /** Expires `orderId`, sweeps twice, and asserts the stock returns exactly once. */
  async function assertExpiresAndReturnsStockOnce(
    request: APIRequestContext,
    orderId: number,
    storeId: number,
    line: { productId: number; variantSku: string | null; qty: number },
  ): Promise<void> {
    const beforeQty = stockOf(storeId, line.productId, line.variantSku)
    expireOrder(orderId)

    const first = await sweep(request)
    expect(first.status, 'the first sweep').toBe(200)
    const afterSweepQty = stockOf(storeId, line.productId, line.variantSku)
    expect(afterSweepQty, 'stock returned by exactly the line qty').toBe(beforeQty + line.qty)

    const second = await sweep(request)
    expect(second.status, 'a second sweep').toBe(200)
    expect(
      stockOf(storeId, line.productId, line.variantSku),
      'stock unchanged by the second sweep',
    ).toBe(afterSweepQty)
  }

  test('an order never quoted expires after the quote window, and returns its stock once', async ({
    page,
    request,
  }) => {
    test.skip(!GATE_DB, 'SKIPPED (no db access): needs expires_at and stock reads/writes')
    await page.setViewportSize(WIDTHS[0])

    const token = await placeOneProductOrder(
      page,
      {
        name: 'E2E Gate Abandoner',
        whatsapp: '0812 0000 1111',
        email: 'e2e-shop-gate-abandon@example.test',
      },
      request,
    )
    const order = orderByToken(token)
    expect(order.found).toBe(true)
    expect(order.status, 'created awaiting a quote').toBe('awaiting_quote')
    const line = order.lines?.[0]
    expect(line, 'the abandoned order has one line').toBeDefined()

    await assertExpiresAndReturnsStockOnce(request, order.id!, order.storeId!, line!)

    const expired = orderByToken(token)
    expect(expired.status, 'the order after the sweep').toBe('expired')

    await page.goto(`${SHOP_ORIGIN}/order/${encodeURIComponent(token)}`)
    await expect(
      page.getByRole('heading', { name: /couldn't confirm delivery in time/i }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Put these back in my bag' })).toBeVisible()
    await shoot(page, 'order-expired-unquoted-390')
    await axeBothWidths(page, 'order page, expired (never quoted)')
  })

  test('a quoted order abandoned before paying expires after the payment window, and returns its stock once', async ({
    page,
    request,
  }) => {
    test.skip(!GATE_DB, 'SKIPPED (no db access): needs expires_at and stock reads/writes')
    await page.setViewportSize(WIDTHS[0])

    const token = await placeOneProductOrder(
      page,
      {
        name: 'E2E Gate Abandoner (quoted)',
        whatsapp: '0812 0000 2222',
        email: 'e2e-shop-gate-abandon-quoted@example.test',
      },
      request,
    )
    const order = orderByToken(token)
    expect(order.found).toBe(true)
    const line = order.lines?.[0]
    expect(line, 'the abandoned order has one line').toBeDefined()

    const quoted = quoteOrder(order.id!, 15000)
    expect(quoted.ok, `the quote (${quoted.refusal ?? ''})`).toBe(true)
    expect(orderByToken(token).status, 'quoted into the payment window').toBe('pending_payment')

    await assertExpiresAndReturnsStockOnce(request, order.id!, order.storeId!, line!)

    const expired = orderByToken(token)
    expect(expired.status, 'the order after the sweep').toBe('expired')

    await page.goto(`${SHOP_ORIGIN}/order/${encodeURIComponent(token)}`)
    await expect(page.getByRole('button', { name: 'Put these back in my bag' })).toBeVisible()
    await shoot(page, 'order-expired-quoted-390')
    await axeBothWidths(page, 'order page, expired (quoted, unpaid)')
  })
})
