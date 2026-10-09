/**
 * Recipe 3 (CONTENT-OPERATIONS.md 4.1, target: from New to replied in under 1 minute): the owner works one of the
 * REHEARSAL 10.3 gallery leads (id 58 by default) through its statuses and leaves a note. A new staff member starts
 * at the dashboard and uses the sidebar, so that is how this test finds the lead. The lead is left Closed with a
 * REHEARSAL 10.4 outcome note (these leads are the rehearsal's own).
 */
import { expect, test } from '@playwright/test'

import { choose, Meter, need, record, RUN, SHOP, signIn } from './support'

const LEAD = process.env.USABILITY_LEAD ?? '58'

test('R3 owner: work a lead through its statuses and add a note', async ({ page }, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const m = new Meter(page, info, 'R3 work a lead', 60)

  m.start()
  await page.goto(`${SHOP}/admin`)
  const inbox = await page.locator('a[href="/admin/leads"]').count()
  const named = await page.getByRole('link', { name: /^Leads inbox$/ }).count()
  m.stumble(
    `the sidebar has ${inbox} link(s) to the leads inbox (/admin/leads), ${named} named "Leads inbox"; the "Leads" entry opens the plain list`,
  )
  await m.click(
    page.locator('.template-default__wrap a.card__click[href="/admin/collections/leads"]'),
  )
  await page.waitForLoadState('networkidle')
  await m.shot('r3-1-leads-list')
  const rows = await page.locator('a[href*="/collections/leads/"]').count()
  const row = page.locator(`a[href$="/collections/leads/${LEAD}"]`).first()
  await expect(row, `lead ${LEAD} in the list`).toBeVisible()
  await m.click(row)
  await page.waitForURL(`**/collections/leads/${LEAD}`)
  await page.waitForLoadState('networkidle')
  await m.shot('r3-2-lead')

  const whatsapp = await page.getByRole('link', { name: /reply on whatsapp/i }).count()
  const email = await page.getByRole('link', { name: /reply by email/i }).count()
  m.stumble(
    `"Reply on WhatsApp" links on the lead: ${whatsapp}; "Reply by email": ${email} (CONTENT-OPERATIONS 4.1 step 3)`,
  )
  // The buttons exist from 10.8.b; a lead with a number or an address gets at least one of them.
  expect(whatsapp + email, 'Reply on WhatsApp / Reply by email on the lead').toBeGreaterThan(0)
  if (whatsapp > 0) {
    const href = await page
      .getByRole('link', { name: /reply on whatsapp/i })
      .first()
      .getAttribute('href')
    expect(href, 'a wa.me link with the lead number and an opening line').toMatch(
      /^https:\/\/wa\.me\/\d{7,15}\?text=/,
    )
  }

  const history = page.locator(
    '#field-statusHistory .array-field__row, #field-statusHistory [id^="statusHistory-row"]',
  )
  const before = await history.count()
  let moves = 0
  for (const status of ['Contacted', 'In progress', 'Closed']) {
    await choose(page.locator('#field-status'), status)
    if (status === 'Closed')
      await page
        .locator('#field-notes')
        .fill(`${RUN} outcome: REHEARSAL 10.4 timed admin test, no sale`)
    if (status === 'In progress')
      await page.locator('#field-notes').fill(`${RUN} REHEARSAL 10.4: called back`)
    await m.click(page.getByRole('button', { name: 'Save' }).first())
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
    moves += 1
  }
  m.stop()
  await m.shot('r3-3-closed')
  await expect(page.locator('#field-status')).toContainText('Closed')
  const after = await history.count()
  m.stumble(`status history rows ${before} to ${after} after ${moves} status changes`)
  record({ kind: 'lead', id: LEAD, listRows: rows })
  m.finish('PASS', { statusHistoryBefore: before, statusHistoryAfter: after })
  expect(after, 'every status change leaves a history row').toBeGreaterThanOrEqual(before + moves)
})
