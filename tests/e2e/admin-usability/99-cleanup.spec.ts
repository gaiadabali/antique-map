/**
 * Clean-up after the proxy run: every REHEARSAL 10.4 product this folder ever created (every run in the ledger,
 * including runs that stopped half-way) is unpublished, and its public page must answer 404. Safe to repeat.
 */
import { existsSync, readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { need, OUT, SHOP, signIn, unpublish } from './support'

type Row = { kind: string; id?: number; slug?: string }

test('clean-up: no REHEARSAL 10.4 product stays published', async ({ page }) => {
  const file = `${OUT}/created.ndjson`
  const rows: Row[] = existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Row)
    : []
  const products = rows.filter((r) => r.kind === 'product')
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  for (const p of products) {
    await unpublish(page, Number(p.id))
    await expect
      .poll(async () => (await page.request.get(`${SHOP}/product/${p.slug}`)).status(), {
        timeout: 120_000,
        message: `public /product/${p.slug} after unpublishing`,
      })
      .toBe(404)
  }
})
