/**
 * 10.7.c on staging: the owner replaces a damaged item on a delivered rehearsal order at DPS-004
 * (CONTENT-OPERATIONS.md §5.5), and the replacement reaches the store's panel. The original is
 * chosen read-only from the database: a delivered REHEARSAL order at DPS-004, not yet replaced,
 * whose one line DPS-004 still stocks. Asserts the Rp 0 order linked both ways, `processing`, the
 * unit taken off DPS-004's shelf, and the store user seeing it with its badge. Desktop only.
 */
import { execFileSync } from 'node:child_process'

import { expect, test, type Page } from '@playwright/test'

import { need, record, SHOP, shoot } from './support'

const sql = (query: string): string =>
  execFileSync('ssh', ['helios', `sudo -u postgres psql -d indies_db -Atc "${query}"`], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')[0]!
    .trim()

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.context().clearCookies()
  await page.goto(`${SHOP}/admin/login`)
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

test('the owner replaces a damaged item; the Rp 0 replacement reaches the store panel', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'one run is enough: desktop only')
  const owner = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  const store = need('E2E_STORE_A_EMAIL', 'E2E_STORE_A_PASSWORD')

  // A delivered rehearsal order at DPS-004 with one line DPS-004 still stocks, never replaced.
  const pick = sql(
    `select o.id || '|' || o.number || '|' || l.product_id || '|' || coalesce(l.variant_sku, '') || '|' || sl.quantity` +
      ` from orders o join orders_lines l on l._parent_id = o.id join stores s on s.id = o.store_id` +
      ` join stock_levels sl on sl.store_id = o.store_id and sl.product_id = l.product_id and sl.variant_sku is not distinct from l.variant_sku` +
      ` where o.status = 'delivered' and s.code = 'DPS-004' and o.contact_name like 'REHEARSAL%' and sl.quantity >= 1` +
      ` and (select count(*) from orders_lines x where x._parent_id = o.id) = 1` +
      ` and not exists (select 1 from orders r where r.replacement_of_id = o.id) order by o.id desc limit 1`,
  )
  expect(pick, 'a delivered REHEARSAL order at DPS-004 whose item DPS-004 still stocks').toMatch(
    /^\d+\|\d+\|\d+\|.*\|\d+$/,
  )
  const [origId, origNumber, productId, variantSku, before] = pick.split('|')
  const stockOf = () =>
    sql(
      `select sl.quantity from stock_levels sl join stores s on s.id = sl.store_id where s.code = 'DPS-004'` +
        ` and sl.product_id = ${productId} and sl.variant_sku is not distinct from ${variantSku ? `'${variantSku}'` : 'null'}`,
    )

  await signIn(page, owner.E2E_OWNER_EMAIL!, owner.E2E_OWNER_PASSWORD!)
  await page.goto(`${SHOP}/admin/orders/${origId}`)
  await page.getByText('Replace damaged item').first().click()
  await page.locator('input[name="line"]').first().check()
  await page.locator('#replace-note').fill('REHEARSAL 10.7 - frame cracked, photo on WhatsApp')
  await shoot(page, info, 'replace-1-sheet')
  await page.getByRole('button', { name: 'Confirm replacement' }).click()
  await page.waitForURL(
    (url) => /\/admin\/orders\/\d+$/.test(url.pathname) && !url.pathname.endsWith(`/${origId}`),
  )
  const newId = /\/admin\/orders\/(\d+)$/.exec(new URL(page.url()).pathname)![1]!
  await expect(page.getByText(/Replacement — Rp 0/).first()).toBeVisible()
  await shoot(page, info, 'replace-2-new-order')

  expect(
    sql(
      `select channel || '|' || replacement_of_id || '|' || status || '|' || totals_total || '|' || store_snapshot_code from orders where id = ${newId}`,
    ),
  ).toBe(`replacement|${origId}|processing|0|DPS-004`)
  expect(Number(stockOf()), 'one unit came off DPS-004').toBe(Number(before) - 1)

  // The store user sees it in their panel, marked as a replacement.
  await signIn(page, store.E2E_STORE_A_EMAIL!, store.E2E_STORE_A_PASSWORD!)
  await page.goto(`${SHOP}/admin/orders`)
  const newNumber = sql(`select number from orders where id = ${newId}`)
  await expect(page.getByText(`#${newNumber}`).first()).toBeVisible()
  await page.goto(`${SHOP}/admin/orders/${newId}`)
  await expect(page.getByText(/Replacement — Rp 0/).first()).toBeVisible()
  await shoot(page, info, 'replace-3-store-panel')
  record({ kind: 'replacement', original: origNumber, replacement: newNumber })
})
