/**
 * Runbook §7 on staging (10.3 follow-through; TASKS.md 10.7.b): a payment that settles after its
 * order expired. A guest orders at DPS-004, the owner prices it, the buyer opens the simulator; the
 * order's deadline is then moved into the past with one SQL update on that rehearsal order (the
 * only shortcut: waiting out the 60-minute window), the real sweep expires it and returns its unit,
 * and the buyer settles from the page already open. Its store still holds the unit, so the order
 * must be `paid` at the same store, the unit re-taken, flagged "stock re-taken, send it"; the
 * owner sees "Needs you" with that reason and clears the flag with a note, which the history
 * keeps (COMMERCE.md §13). Mobile project only.
 */
import { execFileSync } from 'node:child_process'

import { expect, test, type Page } from '@playwright/test'

import {
  need,
  PIN,
  PRODUCT,
  record,
  REHEARSAL_NAME,
  rehearsalEmail,
  SHOP,
  shoot,
  widthOf,
} from './support'

/** One read or write on the staging database, as postgres on Helios. */
const sql = (query: string): string =>
  execFileSync('ssh', ['helios', `sudo -u postgres psql -d indies_db -Atc "${query}"`], {
    encoding: 'utf8',
  })
    .trim()
    // psql prints the command tag ("UPDATE 1") after a RETURNING row: keep the first line.
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

test('a payment after expiry is paid at its store, flagged, and the owner clears the flag', async ({
  browser,
}, info) => {
  test.skip(info.project.name !== 'mobile', 'one run is enough: mobile only')
  test.setTimeout(420_000)
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  const buyer = await (
    await browser.newContext({ viewport: { width: 390, height: 844 } })
  ).newPage()

  // Place the order at DPS-004, as shop.spec does.
  await buyer.goto(`${SHOP}/product/${PRODUCT}`)
  await buyer.getByRole('button', { name: 'Add to bag' }).click()
  await expect(buyer.getByText('Added to your bag.')).toBeVisible()
  await buyer.goto(`${SHOP}/checkout`)
  await buyer.waitForLoadState('networkidle')
  const fields: [RegExp, string][] = [
    [/full name/i, REHEARSAL_NAME],
    [/whatsapp/i, '0812 0000 1030'],
    [/email/i, rehearsalEmail('late', widthOf(info))],
    [/address/i, 'REHEARSAL 10.3 - late payment drill, ignore'],
  ]
  await expect(async () => {
    for (const [label, value] of fields) await buyer.getByLabel(label).fill(value)
    await buyer.waitForTimeout(750)
    for (const [label, value] of fields) await expect(buyer.getByLabel(label)).toHaveValue(value)
  }).toPass({ timeout: 20_000 })
  const pin = buyer.locator('input[inputmode="decimal"]')
  await pin.nth(0).fill(String(PIN.lat))
  await pin.nth(1).fill(String(PIN.lng))
  await buyer.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(buyer).toHaveURL(/\/order\//)
  const orderUrl = buyer.url()
  const number = /Order ([\d,]+)/
    .exec(await buyer.getByText(/^Order [\d,]+$/).innerText())![1]!
    .replace(/,/g, '')

  // The owner prices delivery.
  const staff = await (
    await browser.newContext({ viewport: { width: 1280, height: 900 } })
  ).newPage()
  await signIn(staff, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  await staff.goto(`${SHOP}/admin/orders`)
  await staff
    .getByRole('link')
    .filter({ hasText: `#${number}` })
    .first()
    .click()
  await staff.locator('input[name="feeIdr"]').fill('15000')
  await staff.getByRole('button', { name: 'Send price' }).click()
  await expect(staff.getByText('Awaiting payment')).toBeVisible()

  // The buyer opens the simulator and stops there.
  await buyer.goto(orderUrl)
  await buyer.getByRole('button', { name: /^Pay /i }).click()
  await expect(buyer.getByText('Test payment — no money moves.')).toBeVisible()

  // Where its unit sits, before and after: the order's store row for the product.
  const storeOf = () => sql(`select store_snapshot_code from orders where number = ${number}`)
  const unitsAt = () =>
    sql(
      `select sl.quantity from stock_levels sl join orders o on o.store_id = sl.store_id join orders_lines l on l._parent_id = o.id and l.product_id = sl.product_id and l.variant_sku is not distinct from sl.variant_sku where o.number = ${number} limit 1`,
    )
  const store = storeOf()

  // The window closes: deadline 10 min in the past (the sweep allows 5 min grace), then the real sweep (every minute) expires it.
  expect(
    sql(
      `update orders set expires_at = now() - interval '10 minutes' where number = ${number} and status = 'pending_payment' returning number`,
    ),
  ).toBe(number)
  await expect
    .poll(() => sql(`select status from orders where number = ${number}`), {
      timeout: 150_000,
      intervals: [5_000],
    })
    .toBe('expired')

  const afterExpiry = Number(unitsAt())

  // The buyer pays late, from the page that was already open.
  await buyer.getByRole('button', { name: 'Settle' }).click()
  await buyer.waitForLoadState('networkidle')
  await shoot(buyer, info, 'late-1-buyer-after-settle')
  await expect
    .poll(
      () =>
        sql(
          `select status || '|' || coalesce(needs_attention_flag::text, '') || '|' || coalesce(needs_attention_reason, '') from orders where number = ${number}`,
        ),
      { timeout: 30_000 },
    )
    .toMatch(/^paid\|true\|Paid after expiry .*stock re-taken at its store, send it/)
  // Paid at its own store, its unit taken again from that store's shelf.
  expect(storeOf()).toBe(store)
  expect(Number(unitsAt())).toBe(afterExpiry - 1)

  // Runbook §7 step 1: the owner sees it.
  await staff.goto(`${SHOP}/admin/orders`)
  await shoot(staff, info, 'late-2-owner-orders')
  await staff
    .getByRole('link')
    .filter({ hasText: `#${number}` })
    .first()
    .click()
  await expect(staff.getByText('Needs you').first()).toBeVisible()
  await expect(staff.getByText(/stock re-taken at its store, send it/).first()).toBeVisible()
  await shoot(staff, info, 'late-3-owner-order')

  // Runbook §7 step 5: the owner clears the flag with a note; the history keeps it.
  await staff.getByRole('link', { name: 'Clear the flag' }).click()
  await staff.getByLabel('What was done about it').fill('REHEARSAL 10.7 - sent from its store')
  await staff.getByRole('button', { name: 'Confirm, clear the flag' }).click()
  await expect(staff.getByRole('heading', { name: new RegExp(`#${number}`) })).toBeVisible()
  await expect(staff.getByText('Needs you')).toHaveCount(0)
  await shoot(staff, info, 'late-4-owner-cleared')
  expect(sql(`select needs_attention_flag from orders where number = ${number}`)).toBe('f')
  expect(
    sql(
      `select h.note from orders_history h join orders o on o.id = h._parent_id where o.number = ${number} order by h._order desc limit 1`,
    ),
  ).toMatch(/^Flag cleared: REHEARSAL 10\.7 - sent from its store \(was: Paid after expiry/)
  await staff.goto(`${SHOP}/admin`)
  await shoot(staff, info, 'late-5-owner-dashboard')
  record({ kind: 'late-payment', width: 390, number })
})
