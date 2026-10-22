/**
 * T2 (recipe 3.2, target 30 s), at a person's pace: mark an antique sold. The antique is a published, available
 * one on staging, found by its stock number from the admin home; afterwards (off the clock) it is put back to
 * Available, so the staging gallery is as it was.
 */
import { expect, test, type Page } from '@playwright/test'

import { need, record, SHOP, signIn } from '../support'
import { Human } from './pace'

async function publishedAvailable(page: Page): Promise<{ id: number; stockNumber: string }> {
  const res = await page.request.get(
    `${SHOP}/api/works?limit=1&depth=0&sort=-updatedAt&where[_status][equals]=published&where[status][equals]=available&where[stockNumber][exists]=true`,
  )
  const doc = (await res.json()).docs?.[0]
  if (!doc) throw new Error('BLOCKED: no published, available antique on staging')
  return { id: doc.id, stockNumber: doc.stockNumber }
}

async function setAvailability(page: Page, id: number, label: string): Promise<void> {
  await page.goto(`${SHOP}/admin/collections/works/${id}`)
  await page.waitForLoadState('networkidle')
  await page.locator('#field-status .rs__control').click()
  await page.locator('.rs__option').filter({ hasText: label }).first().click()
  await page.getByRole('button', { name: 'Publish changes' }).first().click()
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
}

test('T2 mark an antique sold', async ({ page }, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const work = await publishedAvailable(page)
  await page.goto(`${SHOP}/admin?locale=en`)
  await page.waitForLoadState('networkidle')

  const h = new Human(page, info, 'T2', 'Mark an antique sold', 30)
  await h.start()
  await h.type(page.locator('#wall-q'), work.stockNumber)
  await h.click(page.getByRole('button', { name: 'Search' }))
  await h.read()
  const card = page.locator('a.wall-card').filter({ hasText: work.stockNumber }).first()
  await expect(card, `the Wall finds ${work.stockNumber}`).toBeVisible()
  await h.click(card)
  await page.waitForURL(/\/collections\/works\/\d+/)
  await h.read()
  await h.pick(page.locator('#field-status'), 'Sold')
  await h.click(page.getByRole('button', { name: 'Publish changes' }).first())
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
  await expect(page.locator('#field-status')).toContainText('Sold')
  h.stop()
  await h.shot('t2-sold')
  h.finish('unaided', { stockNumber: work.stockNumber })
  record({ kind: 'human-t2-sold', id: work.id, stockNumber: work.stockNumber })

  // Off the clock: back to Available.
  await setAvailability(page, work.id, 'Available')
  await expect(page.locator('#field-status')).toContainText('Available')
})
