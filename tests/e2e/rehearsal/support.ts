/** Shared by the 10.3.b rehearsal specs: staging origins, the rehearsal marks, screenshots, the id ledger. */
import { appendFileSync, mkdirSync } from 'node:fs'

import type { Page, TestInfo } from '@playwright/test'

export const GALLERY = (
  process.env.E2E_BASE_GALLERY ?? 'https://indies-gallery.gaiada.com'
).replace(/\/$/, '')
export const SHOP = (process.env.E2E_BASE_SHOP ?? 'https://old-east-indies.gaiada.com').replace(
  /\/$/,
  '',
)
export const SHOTS = process.env.REHEARSAL_SHOTS ?? 'docs/gates/rehearsal/shots'

/** The rehearsal's mark on everything it writes to staging. */
export const REHEARSAL_NAME = 'REHEARSAL 10.3'
/** A tag per process, so two runs never share an email and the ledger tells them apart. */
export const RUN =
  process.env.REHEARSAL_RUN ?? new Date().toISOString().replace(/\D/g, '').slice(0, 14)
export const rehearsalEmail = (part: string, width: number): string =>
  `rehearsal-10-3.${part}.${width}.${RUN}@example.test`

/**
 * The buyer's pin: exactly on DPS-004 (Denpasar), the store of the E2E_STORE_A_* user, so the nearest store with
 * stock is that store whenever it stocks the product. With the real catalogue's stock (10.6) the 7.x gates' pin
 * routed to DPS-005, whose staff have no rehearsal account.
 */
export const PIN = { lat: -8.690738, lng: 115.185504 }
/** A design DPS-004 stocks (its first variant, mounted: 4 on 2026-10-09, one per width per run). */
export const PRODUCT = process.env.REHEARSAL_PRODUCT ?? 'sugar-apple-1863'

export const widthOf = (info: TestInfo): number => (info.project.name === 'mobile' ? 390 : 1280)

export async function shoot(page: Page, info: TestInfo, name: string): Promise<void> {
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({
    path: `${SHOTS}/${name}-${widthOf(info)}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}

/** What the rehearsal created on staging, one JSON line each, for journeys.md and the clean-up. */
export function record(entry: Record<string, unknown>): void {
  mkdirSync(SHOTS, { recursive: true })
  appendFileSync(`${SHOTS}/created.ndjson`, `${JSON.stringify({ run: RUN, ...entry })}\n`)
}

/**
 * A staff step's credential. Never invented: when the environment does not carry it the step
 * fails loudly and says what is needed (a failure, not a skip dressed as a pass).
 */
export function need(...names: string[]): Record<string, string> {
  const missing = names.filter((n) => !process.env[n])
  if (missing.length > 0) {
    throw new Error(`BLOCKED: this staff step needs ${missing.join(', ')} in the environment`)
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]!]))
}
