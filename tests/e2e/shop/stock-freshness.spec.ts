/**
 * Availability is live (AGENTS.md: reads that decide a purchase are never cached). A product page
 * rendered once, then a stock change made straight in the database — no product edit, no hook, no
 * revalidation, as an import, a sale's decrement or an expiry's release does — must show the new
 * answer on the next request. Phase 6 shipped availability inside `'use cache'`, and staging showed
 * every product "Out of stock" after its stock was loaded by SQL (`catalogue.cache.test.ts` guards
 * the source; this proves the running build).
 *
 * Needs the database: `GATE_DB=local` (this worktree's `DATABASE_URL` from `.env.local`, through the
 * local dev Postgres container). Otherwise the case is skipped and says so.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const CONTAINER = process.env.E2E_PG_CONTAINER ?? 'indies-platform-dev-postgres-1'

function databaseName(): string {
  const env = readFileSync(join(root, '.env.local'), 'utf8')
  const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim()
  if (!url) throw new Error('GATE_DB=local needs DATABASE_URL in .env.local')
  return new URL(url).pathname.slice(1)
}

function sql(query: string): string {
  return execFileSync(
    'docker',
    ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', databaseName(), '-tAc', query],
    { encoding: 'utf8' },
  ).trim()
}

test.describe('stock changes show without a product edit', () => {
  test.skip(process.env.GATE_DB !== 'local', 'SKIPPED (no db access): GATE_DB=local is not set')

  test('a product page reflects a stock change made only in the database', async ({ page }) => {
    // A published product sold without variants, in stock in some active store.
    const picked = sql(`
      SELECT p.id || '|' || p.slug FROM products p
        JOIN stock_levels sl ON sl.product_id = p.id AND sl.variant_sku IS NULL
        JOIN stores st ON st.id = sl.store_id AND st.active
       WHERE p._status = 'published' AND sl.quantity > 0
         AND NOT EXISTS (SELECT 1 FROM stock_levels v WHERE v.product_id = p.id AND v.variant_sku IS NOT NULL)
       ORDER BY p.id LIMIT 1`)
    const [id, slug] = picked.split('|')
    expect(id && slug, 'a published, unvarianted, in-stock product').toBeTruthy()

    const saved = sql(
      `SELECT COALESCE(json_agg(json_build_object('id', id, 'q', quantity)), '[]') FROM stock_levels WHERE product_id = ${id}`,
    )
    const add = page.getByRole('button', { name: 'Add to bag' })
    const out = page.getByRole('button', { name: 'Out of stock' })

    await page.setViewportSize({ width: 390, height: 844 })
    expect((await page.goto(`/product/${slug}`))?.status()).toBe(200)
    await expect(add).toBeEnabled()

    try {
      sql(`UPDATE stock_levels SET quantity = 0 WHERE product_id = ${id}`)
      await page.reload()
      await expect(out, 'sold out in every store: the next request says so').toBeDisabled()
    } finally {
      sql(`
        UPDATE stock_levels sl SET quantity = (r->>'q')::int
          FROM json_array_elements('${saved}'::json) AS r
         WHERE sl.id = (r->>'id')::int`)
    }

    await page.reload()
    await expect(add, 'restocked: the next request offers it again').toBeEnabled()
  })
})
