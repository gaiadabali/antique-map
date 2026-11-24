/**
 * What the shop app's own e2e share (TASKS.md 23.6.a): the one host's origin, the owner's REST on
 * Payload's API (through the session the global setup keeps, `../support/sessions.ts`), axe, the
 * two widths, and the gate's evidence under `docs/gates/v2-shop/` (`docs/gates/v2-shop.md` quotes
 * it). The shop app serves the shop's host alone, its routes with no `/shop/<locale>` prefix and
 * English unprefixed (PLAN-V2 §4.2).
 *
 * The REST calls go to 127.0.0.1 with the shop's `Host`: Node's resolver — which the `request`
 * fixture uses — may not map `*.localhost` to loopback (CI maps it in `/etc/hosts`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, request, type APIRequestContext, type Page } from '@playwright/test'
import { format, resolveConfig } from 'prettier'

import { ACCOUNTS, PASSWORD, type AccountKey } from '../admin/accounts'
import { localPort } from '../admin/local.mjs'
import { savedToken, saveTokens } from '../support/sessions'

export const PORT = localPort()
export const SHOP_HOST = process.env.E2E_SHOP_HOST ?? 'shop.localhost'
export const SHOP_ORIGIN = `http://${SHOP_HOST}:${PORT}`

export const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

/** Axe on the page as it stands: no violation, each listed by rule and target when there is one. */
export async function axeClean(page: Page, label: string): Promise<void> {
  // After a resize the admin's sidebar slides: axe reads a half-faded label's contrast as a
  // failure (seen once at 1280 on the store user's landing), so wait for transitions to end.
  await page
    .waitForFunction(() => document.getAnimations().every((each) => each.playState !== 'running'))
    .catch(() => undefined)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

/** The page's own width holds: nothing wider than the viewport (no sideways scroll at 390). */
export async function noOverflow(page: Page, label: string): Promise<void> {
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(wide, `${label}: no horizontal scroll`).toBe(false)
}

// ── Evidence ────────────────────────────────────────────────────────────────────────────────────

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/gates/v2-shop')
const FILE = join(DIR, 'drive.json')

/** Where a screenshot named `name` goes when `E2E_EVIDENCE` is set; else the test's own folder. */
export function shot(name: string, outputDir: string): string {
  const dir = process.env.E2E_EVIDENCE ? DIR : outputDir
  mkdirSync(dir, { recursive: true })
  return join(dir, `${name}.png`)
}

/**
 * Records `value` under `key` in the gate's JSON when `E2E_EVIDENCE` is set — read back and merged
 * on each call (each spec file may run in its own worker), sorted and Prettier-formatted, as the
 * file is committed and `pnpm verify` checks its format.
 */
export async function record(key: string, value: unknown): Promise<void> {
  if (!process.env.E2E_EVIDENCE) return
  mkdirSync(DIR, { recursive: true })
  const read = existsSync(FILE)
    ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>)
    : {}
  read[key] = value
  const sorted = Object.fromEntries(Object.entries(read).sort(([a], [b]) => a.localeCompare(b)))
  const options = (await resolveConfig(FILE)) ?? {}
  writeFileSync(FILE, await format(JSON.stringify(sorted), { ...options, filepath: FILE }))
}

// ── Staff sessions and REST ─────────────────────────────────────────────────────────────────────

/** A REST client on the shop's host, signed in as `who` (the saved session, else a sign-in). */
export async function staffApi(who: AccountKey): Promise<APIRequestContext> {
  const email = ACCOUNTS[who].email
  const base = { baseURL: `http://127.0.0.1:${PORT}` }
  const host = { Host: `${SHOP_HOST}:${PORT}` }
  let token = savedToken(email)
  if (token) {
    const probe = await request.newContext({ ...base, extraHTTPHeaders: host })
    const me = await probe.get('/api/users/me', { headers: { Authorization: `JWT ${token}` } })
    const user = me.ok() ? ((await me.json()) as { user?: unknown }).user : null
    await probe.dispose()
    if (!user) token = null
  }
  if (!token) {
    const login = await request.newContext({ ...base, extraHTTPHeaders: host })
    const answer = await login.post('/api/users/login', { data: { email, password: PASSWORD } })
    expect(answer.ok(), `${who} signs in`).toBe(true)
    token = ((await answer.json()) as { token: string }).token
    saveTokens({ [email]: token })
    await login.dispose()
  }
  return request.newContext({
    ...base,
    extraHTTPHeaders: { ...host, Authorization: `JWT ${token}` },
  })
}

type Order = { id: number; number: number; status: string; store: number | null }

/** Every order the API lists to this client (Payload's own access decides which). */
export async function listOrders(api: APIRequestContext, query = ''): Promise<Order[]> {
  const answer = await api.get(`/api/orders?limit=500&depth=0&sort=id${query}`)
  expect(answer.status(), `GET /api/orders${query}`).toBe(200)
  return ((await answer.json()) as { docs: Order[] }).docs
}
