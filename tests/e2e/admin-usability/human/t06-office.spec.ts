/**
 * The office tasks that work on existing records, at a person's pace: T6 import the 500-row sheet and fix its
 * three planted mistakes (recipe 3.5, 10 min), T7 answer a new lead on WhatsApp (4.1, 1 min), T9 reassign a
 * paid order (5.2, 1 min), T10 the shop's WhatsApp number (6.1, 1 min), T11 every delivery band (6.3, 2 min),
 * T12 replace a damaged item on T8's delivered order (5.5, 2 min). What T10 and T11 change is put back
 * afterwards, off the clock.
 */
import { readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { need, OUT, record, recorded, SHOP, sidebarLink, signIn } from '../support'
import { Human } from './pace'
import { placePaidOrder } from './steps'

/** The preview's counts, each number before its word. */
const COUNTS = /\d+ New \d+ Changed \d+ Unchanged \d+ Rejected \d+ Held/

async function owner(page: Page): Promise<void> {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  await page.goto(`${SHOP}/admin?locale=en`)
  await page.waitForLoadState('networkidle')
}

async function settingsTab(h: Human, ...tabs: string[]): Promise<void> {
  const page = h.page
  await h.click(await sidebarLink(page, '/admin/globals/site-settings'))
  await page.waitForURL(/\/globals\/site-settings/)
  await h.read()
  for (const tab of tabs) {
    const button = page.locator('.tabs-field__tab-button', { hasText: tab }).first()
    if (!(await button.getAttribute('class'))?.includes('--active')) await h.click(button)
    await h.read(1)
  }
}

test.describe.serial('office tasks on existing records', () => {
  test('T6 import a 500-row stock sheet', async ({ page }, info) => {
    await owner(page)
    const original = readFileSync(`${OUT}/stock-sheet-500.csv`, 'utf8').replace(/\r\n/g, '\n')
    const lines = original.split('\n')
    // The three planted mistakes, as the person fixes them in the spreadsheet (file rows 15, 213, 378).
    lines[14] = lines[14]!.replace(/,lima$/, ',5')
    lines[212] = lines[212]!.replace(/,-2$/, ',2')
    lines[377] = lines[377]!.replace(/^AMD-079,/, 'AMD-007,')
    const fixed = lines.join('\n')
    expect(fixed).not.toBe(original)

    const h = new Human(page, info, 'T6', 'Import a 500-row stock sheet', 600)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/stock-import'))
    await page.waitForURL(/\/admin\/stock-import/)
    await h.read()
    const input = page.locator('#stock-import-file')
    await h.file(input, {
      name: 'stock-sheet-500.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(original),
    })
    await h.click(page.getByRole('button', { name: 'Preview' }))
    await expect(page.getByRole('heading', { name: /preview: nothing is saved yet/i })).toBeVisible(
      {
        timeout: 120_000,
      },
    )
    await h.read(10)
    const first = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
    h.stumble(
      `first preview: ${COUNTS.exec(first)?.[0] ?? 'counts not found'}; the rejected and held rows are listed last, below every row that changes`,
    )
    await h.shot('t6-preview-errors')
    await h.away(
      95,
      'open the sheet in Excel, go to rows 15, 213 and 378, fix them, save as CSV UTF-8',
    )
    const again = page.getByRole('button', { name: /choose another file/i })
    if ((await again.count()) > 0) await h.click(again)
    await h.file(page.locator('#stock-import-file'), {
      name: 'stock-sheet-500.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(fixed),
    })
    await h.click(page.getByRole('button', { name: 'Preview' }))
    await expect(page.getByRole('heading', { name: /preview: nothing is saved yet/i })).toBeVisible(
      {
        timeout: 120_000,
      },
    )
    await h.read(5)
    const second = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
    h.stumble(`second preview: ${COUNTS.exec(second)?.[0] ?? 'counts not found'}`)
    await h.click(page.getByRole('button', { name: 'Apply' }))
    await expect(page.getByRole('heading', { name: 'Applied' })).toBeVisible({ timeout: 180_000 })
    h.stop()
    await h.shot('t6-applied')
    h.finish('unaided')
  })

  test('T7 answer a new lead on WhatsApp', async ({ page }, info) => {
    await owner(page)
    const h = new Human(page, info, 'T7', 'Answer a new lead on WhatsApp', 60)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/leads'))
    await page.waitForURL(/\/admin\/leads/)
    await h.read()
    await h.click(page.locator('a.ix-item').first())
    await page.waitForURL(/\/leads\/\d+/)
    await h.read(3)
    const wa = page.getByRole('link', { name: /reply on whatsapp/i })
    if ((await wa.count()) > 0) {
      const popup = page
        .context()
        .waitForEvent('page', { timeout: 15_000 })
        .catch(() => null)
      await h.click(wa.first())
      const opened = await popup
      await h.away(
        10,
        'WhatsApp opens with the number and an opening line; on staging it is closed unsent',
      )
      await opened?.close()
    } else {
      h.stumble('this lead has no "Reply on WhatsApp" (no phone number): replied by email instead')
      await h.click(page.getByRole('link', { name: /reply by email/i }).first())
      await h.away(10, 'the email draft opens; on staging it is closed unsent')
    }
    await page.bringToFront()
    await h.pick(page.locator('#field-status'), 'In progress')
    await h.click(page.getByRole('button', { name: 'Save' }).first())
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
    h.stop()
    await h.shot('t7-in-progress')
    h.finish('unaided', { lead: page.url().split('/').pop() })
  })

  test('T9 reassign an order', async ({ page }, info) => {
    const number = await placePaidOrder(page, info, 'T9')
    await page.goto(`${SHOP}/admin?locale=en`)
    await page.waitForLoadState('networkidle')
    const h = new Human(page, info, 'T9', 'Reassign an order', 60)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/orders'))
    await page.waitForURL(/\/admin\/orders/)
    await h.read()
    await h.click(
      page
        .locator('a[href^="/admin/orders/"]')
        .filter({ hasText: `#${number}` })
        .first(),
    )
    await page.waitForURL(/\/admin\/orders\/\d+/)
    await h.read()
    await h.click(page.getByRole('link', { name: /^Reassign$/ }).first())
    await page.waitForURL(/reassign=1/)
    await h.read(4)
    const select = page.locator('#reassign-store')
    const options = await select.locator('option').allInnerTexts()
    const pickAt = Math.max(
      0,
      options.findIndex((o) => !/missing/i.test(o)),
    )
    await h.click(select)
    await h.pause(2)
    await select.selectOption({ index: pickAt })
    if (!options.some((o) => /every item|missing/i.test(o)))
      h.stumble(
        'the store list shows no "has every item" or "missing" marks (recipe 5.2 promises them)',
      )
    h.stumble('the reassign form has no reason field (recipe 5.2 asks for one)')
    await h.click(page.getByRole('button', { name: 'Confirm reassignment' }))
    await page.waitForURL(/\/admin\/orders\/\d+(?!.*reassign)/, { timeout: 30_000 })
    await h.read(1)
    h.stop()
    // A refusal is the panel's own error notice with words in it (Payload keeps an empty alert region on every page).
    const refused = await page.locator('.ix-notice--error').filter({ hasText: /\S/ }).count()
    await h.shot('t9-reassigned')
    h.finish(refused ? 'not_done' : 'unaided', { number, to: options[pickAt] })
    record({ kind: 'human-reassigned', number })
  })

  test('T10 change the shop WhatsApp number', async ({ page }, info) => {
    await owner(page)
    const h = new Human(page, info, 'T10', "Change the shop's WhatsApp number", 60)
    await h.start()
    await settingsTab(h, 'Old East Indies', 'Contact and notices')
    const field = page.getByLabel('WhatsApp', { exact: true }).first()
    const before = await field.inputValue()
    await h.type(field, '+6281139000000', { replace: true })
    await h.click(page.getByRole('button', { name: 'Save' }).first())
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
    h.stop()
    await h.shot('t10-saved')
    h.finish('unaided')
    // Off the clock: the number as it was.
    await field.fill(before)
    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(field).toHaveValue(before)
  })

  test('T11 update every delivery band', async ({ page }, info) => {
    await owner(page)
    const h = new Human(page, info, 'T11', 'Update every delivery band', 120)
    await h.start()
    await settingsTab(h, 'Old East Indies', 'Checkout and delivery')
    const fees = page.locator('input[id^="field-shop__delivery__bands__"][id$="__feeIdr"]')
    if (
      (await fees
        .first()
        .isVisible()
        .catch(() => false)) === false
    ) {
      h.stumble('the distance band rows opened closed: Show All')
      await h.click(
        page.locator('#field-shop__delivery__bands').getByRole('button', { name: 'Show All' }),
      )
    }
    const before = await fees.evaluateAll((inputs) =>
      inputs.map((i) => (i as HTMLInputElement).value),
    )
    for (let n = 0; n < before.length; n += 1) {
      await h.pause(2)
      await h.type(fees.nth(n), String(Number(before[n]) + 2000), { replace: true })
    }
    await h.click(page.getByRole('button', { name: 'Save' }).first())
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
    h.stop()
    await h.shot('t11-saved')
    h.finish('unaided', { bands: before.length })
    // Off the clock: the fees as they were.
    for (let n = 0; n < before.length; n += 1) await fees.nth(n).fill(before[n]!)
    await page.getByRole('button', { name: 'Save' }).first().click()
    for (let n = 0; n < before.length; n += 1) await expect(fees.nth(n)).toHaveValue(before[n]!)
  })

  test('T12 replace a damaged item', async ({ page }, info) => {
    const delivered = recorded('human-delivered')
    expect(delivered, 'BLOCKED: T8 must have delivered an order in this run').toBeDefined()
    await owner(page)
    const h = new Human(page, info, 'T12', 'Replace a damaged item', 120)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/orders'))
    await page.waitForURL(/\/admin\/orders/)
    await h.read()
    await h.click(
      page
        .locator('a[href^="/admin/orders/"]')
        .filter({ hasText: `#${delivered!.number}` })
        .first(),
    )
    await page.waitForURL(/\/admin\/orders\/\d+/)
    await h.read()
    await h.click(
      page
        .getByRole('link', { name: /replace damaged item/i })
        .or(page.getByRole('button', { name: /replace damaged item/i }))
        .first(),
    )
    await h.read(2)
    await h.click(page.locator('input[name="line"]').first())
    await h.type(page.locator('#replace-note'), 'Frame cracked, photo on WhatsApp')
    await h.click(page.getByRole('button', { name: 'Confirm replacement' }))
    await page.waitForLoadState('networkidle')
    await h.read(2)
    h.stop()
    await h.shot('t12-replaced')
    const replacement = await page.getByText(/Replacement|Replaced by/i).count()
    h.finish(replacement ? 'unaided' : 'not_done', { order: delivered!.number })
  })
})
