/**
 * The order page's flows (TASKS.md 6.5.a; EXPERIENCE-SHOP.md §7-§8), in a browser, on a production
 * build with `MIDTRANS_MODE=simulate`: pay, confirm and recover — never the checkout itself (6.1.c,
 * `checkout.spec.ts` on `w/6.3a`, not this file's concern).
 *
 * Seeds its own pending order per case through `createOrder` (the Local API, as the checkout does
 * it), against this worktree's own database (`.env.local`'s `DB_SUFFIX`; `E2E_DATABASE_URL`
 * overrides it, as `tests/e2e/admin/local.mjs` reads it for the admin's drive). Each seed runs in
 * its own `payload run` child process (`tests/e2e/admin/fixtures.ts`'s own pattern): importing the
 * CMS core directly into Playwright's Node process pulls in Next-only subpath exports
 * (`@engine/cache`'s `next/cache`) that only resolve under Next's own bundler, not Playwright's
 * loader — so the seed script is written out at run time rather than imported. The simulator's four
 * buttons stand in for Midtrans (COMMERCE.md §6): Settle, Pending, Deny, Expire.
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type EnvMap = Map<string, string>

/** A dotenv file as a Map; a missing file is an empty Map (mirrors `env-file.mjs`'s `readEnvFile`). */
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

/** This worktree's database (`DB_SUFFIX`) and port, exactly as `tests/e2e/admin/local.mjs` reads them. */
function settings(): { readonly databaseUrl: string; readonly port: string } {
  const local = readEnvFile(join(root, '.env.local'))
  const get = (key: string) => process.env[key] ?? local.get(key)
  const suffix = get('DB_SUFFIX')
  const database = suffix ? `indies_${suffix}` : undefined
  const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    (database ? `postgres://postgres:postgres@127.0.0.1:5432/${database}` : undefined)
  if (!databaseUrl) throw new Error('No database: run `pnpm worktree:env` or set E2E_DATABASE_URL.')
  return { databaseUrl, port: process.env.E2E_PORT ?? get('PORT') ?? '4200' }
}

const { databaseUrl, port } = settings()
const BASE_URL = `http://shop.localhost:${port}`

/**
 * The seed script `payload run` executes, one call per op: `seed-order` makes a published,
 * in-stock product and a `pending_payment` order for it, already quoted (mirrors
 * `orders-db.test-support.ts`'s `openShop` and `product`, against this worktree's real database
 * instead of a temporary pushed one) — `createOrder` lands an order `awaiting_quote` with no fee
 * (TASKS.md 6.6), so this seed moves it on with `quoteDeliveryFee`, as a staff "Send price" would,
 * before this file's pay/expire cases ever see it; `mark-expired` is the direct SQL the order
 * page's own `*.db.test.ts` uses to reach the `expired` state without waiting on the sweep (6.4's
 * concern, not this file's).
 */
const SEED_SCRIPT = `
import { writeFileSync } from 'node:fs'
process.env.PAYLOAD_SECRET ??= 'e2e-shop-payment-dev-only-never-signs-anything'
const { cms, cmsPool } = await import('./engine/packages/cms/src/instance')
const { createOrder, quoteDeliveryFee } = await import('./engine/packages/cms/src/shop/orders')
const { createBagCookieKey, serialiseBag } = await import('./engine/packages/cms/src/shop/pricing')
const { makeProduct } = await import('./engine/packages/cms/src/collections/stock-levels/shop.test-support')
const { invalidationBatch } = await import('./engine/packages/cache/src/index')

const payload = await cms()
const pool = cmsPool(payload)
const op = JSON.parse(process.env.SEED_OP ?? '{}')
// A staff actor's shape (\`FulfilmentActor\`), never a real sign-in: the owner may quote any store's order.
const STAFF_ACTOR = { id: 1, collection: 'users', role: 'owner' }
const SEEDED_FEE_IDR = 20000

async function openStore() {
  const stores = (await payload.find({ collection: 'stores', limit: 1 })).docs
  const store = stores[0] ?? (await payload.create({
    collection: 'stores', data: { code: 'E2E-PAY', name: 'E2E payment store' },
  }))
  await payload.update({
    collection: 'stores', id: store.id,
    data: { active: true, address: 'Jl. Raya Ubud 1', area: 'Ubud', lat: -8.5069, lng: 115.2625 },
  })
  await invalidationBatch().operation((context) => payload.updateGlobal({
    slug: 'site-settings', context,
    data: { shop: { checkoutEnabled: true, quoteWindowMinutes: 120, orderExpiryMinutes: 45 } },
  }))
  return store.id
}

if (op.op === 'seed-order') {
  const storeId = await openStore()
  const bagKey = createBagCookieKey('e2e-shop-payment-bag-cookie-key-0123456789')
  const product = await makeProduct(payload, 'E2E-PAY-' + Date.now() + '-' + Math.random().toString(36).slice(2), [])
  await pool.query("UPDATE products SET _status = 'published' WHERE id = " + product.id)
  await payload.create({
    collection: 'stock-levels',
    data: { store: storeId, product: product.id, variantSku: null, quantity: 5 },
  })
  const bagCookie = serialiseBag([{ productId: product.id, variantSku: null, qty: 1 }], bagKey)
  const created = await createOrder(payload, {
    bagCookie,
    details: {
      contact: { name: 'E2E Buyer', whatsapp: '0812 1111 2222', email: 'e2e-payment@example.test', locale: 'en' },
      delivery: { address: 'Jl. Raya Ubud 1', notes: '', lat: -8.5193, lng: 115.2633 },
    },
    expectedTotalIdr: null,
  }, { bagKey })
  if (!created.ok) {
    writeFileSync(process.env.SEED_OUT, JSON.stringify(created))
  } else {
    const quoted = await quoteDeliveryFee(payload, {
      orderId: created.orderId, feeIdr: SEEDED_FEE_IDR, actor: STAFF_ACTOR,
    })
    writeFileSync(process.env.SEED_OUT, JSON.stringify({ ...created, quoted }))
  }
} else if (op.op === 'mark-expired') {
  await pool.query("UPDATE orders SET status = 'expired' WHERE id = " + op.orderId)
  writeFileSync(process.env.SEED_OUT, JSON.stringify({ ok: true }))
} else {
  throw new Error('unknown op: ' + op.op)
}
await payload.destroy()
process.exit(0)
`

// At the repo root, with plain relative import specifiers resolved from there — exactly
// `tests/e2e/admin/fixtures.ts`'s own shape — not a nested scratch directory or `file://`-wrapped
// absolute specifiers: both changed this script from running (as `fixtures.ts` does) to a silent
// no-op (`payload run` exits 0, prints nothing, runs nothing) on this workstation. Scratch, deleted
// below; never committed.
const seedScript = join(root, `.e2e-shop-payment-seed-${randomBytes(4).toString('hex')}.ts`)
writeFileSync(seedScript, SEED_SCRIPT)
const seedOutDir = seedScript.replace(/\.ts$/, '-out')
mkdirSync(seedOutDir)

/**
 * Runs one seed op in its own `payload run` process and answers what it wrote to `SEED_OUT` — a
 * file, not stdout: on Windows, `pnpm`'s own child (`payload`'s CLI) writes straight to the
 * console's handle rather than through the piped stream a captured `execFileSync` reads back.
 */
function runSeed(op: Record<string, unknown>): Record<string, unknown> {
  const seedOut = join(seedOutDir, `out-${randomBytes(6).toString('hex')}.json`)
  execFileSync('pnpm', ['--filter', '@engine/cms', 'payload', 'run', seedScript], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'development',
      SEED_OP: JSON.stringify(op),
      SEED_OUT: seedOut,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (!existsSync(seedOut)) throw new Error(`seed.ts (${op.op}) wrote no result file`)
  return JSON.parse(readFileSync(seedOut, 'utf8'))
}

type Seeded = { readonly number: number; readonly token: string; readonly orderId: number }

/** A fresh, in-stock product and a pending order for it — one per case, never shared. */
function seedOrder(): Seeded {
  const created = runSeed({ op: 'seed-order' }) as {
    ok: boolean
    refusal?: string
    number?: number
    trackingToken?: string
    orderId?: number
  }
  if (!created.ok) throw new Error(`setup: order was refused (${created.refusal})`)
  return { number: created.number!, token: created.trackingToken!, orderId: created.orderId! }
}

function markExpired(orderId: number): void {
  runSeed({ op: 'mark-expired', orderId })
}

/** A token certain to be wrong — `load-order.ts` hashes it and finds no matching order. */
function wrongToken(): string {
  return randomBytes(18).toString('base64url')
}

// English is unprefixed (the shop's default locale) — `/en/…` is a different, not-found address.
const orderUrl = (token: string) => `${BASE_URL}/order/${encodeURIComponent(token)}`
/** The order number as the page's own copy renders it — a plain identifier, no grouping. */
const orderHeading = (number: number) => `Order ${number}`

async function axeClean(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
}

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

test.afterAll(() => {
  rmSync(seedScript, { force: true })
  rmSync(seedOutDir, { recursive: true, force: true })
})

test.describe('the order page', () => {
  // Each case seeds its own order in a `payload run` child (10–20 s on a loaded workstation).
  test.describe.configure({ timeout: 60_000 })
  test('a wrong token is a 404', async ({ page }) => {
    seedOrder()
    const response = await page.goto(orderUrl(wrongToken()))
    expect(response?.status()).toBe(404)
  })

  for (const viewport of WIDTHS) {
    test(`a pending order shows the pay button, axe-clean at ${viewport.width}px`, async ({
      page,
    }) => {
      const order = seedOrder()
      await page.setViewportSize(viewport)
      const response = await page.goto(orderUrl(order.token))
      expect(response?.status(), "the order page itself — see this file's header").toBe(200)
      await expect(page.getByRole('heading', { name: orderHeading(order.number) })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Pay /i })).toBeVisible()
      await axeClean(page)
    })
  }

  test('pay, then simulator Settle, shows paid with the tracking link', async ({ page }) => {
    const order = seedOrder()
    await page.goto(orderUrl(order.token))
    await page.getByRole('button', { name: /^Pay /i }).click()
    await expect(page.getByText('Test payment — no money moves.')).toBeVisible()
    await page.getByRole('button', { name: 'Settle' }).click()
    await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Track your order' })).toBeVisible()
    await axeClean(page)
  })

  test('pay, then simulator Pending, keeps the pay-by text (no news yet)', async ({ page }) => {
    const order = seedOrder()
    await page.goto(orderUrl(order.token))
    await page.getByRole('button', { name: /^Pay /i }).click()
    await page.getByRole('button', { name: 'Pending' }).click()
    await expect(page.getByRole('heading', { name: orderHeading(order.number) })).toBeVisible()
  })

  test('an expired order: "Put these back in my bag" refills the bag', async ({ page }) => {
    const order = seedOrder()
    markExpired(order.orderId)
    await page.goto(orderUrl(order.token))
    await expect(page.getByRole('button', { name: 'Put these back in my bag' })).toBeVisible()
    await page.getByRole('button', { name: 'Put these back in my bag' }).click()
    await expect(page).toHaveURL(/\/bag$/)
    await expect(page.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('1')
  })
})
