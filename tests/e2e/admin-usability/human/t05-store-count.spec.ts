/**
 * T5 (recipe 3.4, target 30 s), store staff on a phone at a person's pace: the shelf holds 7 of one product —
 * put 7 as its count. The product is one on the second page of the store's Stock list (the observer names
 * it). The recipe says to search by name or SKU; the list searches by ID only, so the person tries the name,
 * finds nothing, and pages through. The count is put back afterwards (off the clock).
 */
import { expect, test } from '@playwright/test'

import { need, SHOP, signIn } from '../support'
import { Human } from './pace'

test('T5 update your store count for one product', async ({ page }, info) => {
  const creds = need('E2E_STORE_A_EMAIL', 'E2E_STORE_A_PASSWORD')
  await signIn(page, creds.E2E_STORE_A_EMAIL!, creds.E2E_STORE_A_PASSWORD!)
  // Off the clock: the product the observer names — the third row of the list's second page.
  await page.goto(`${SHOP}/admin/collections/stock-levels?page=2`)
  await page.waitForLoadState('networkidle')
  const row = page.locator('.table tbody tr').nth(2)
  const target = {
    href: (await row.locator('a').first().getAttribute('href'))!,
    product: (await row.locator('td').nth(2).innerText()).trim(),
    variant: (await row.locator('td').nth(3).innerText()).trim(),
  }
  await page.goto(`${SHOP}${target.href}`)
  await page.waitForLoadState('networkidle')
  const before = await page.locator('#field-physicalCount').inputValue()
  await page.goto(`${SHOP}/admin`)
  await page.waitForLoadState('networkidle')

  const h = new Human(page, info, 'T5', 'Update your store count for one product', 30)
  await h.start()
  await h.click(
    page
      .getByRole('button', { name: /^(Open Menu|Buka Menu)$/ })
      .filter({ visible: true })
      .first(),
  )
  await h.click(page.locator('nav a.nav__link[href="/admin/collections/stock-levels"]').first())
  await page.waitForURL(/\/collections\/stock-levels/)
  await h.read()
  const search = page.locator('#search-filter-input')
  await h.type(search, target.product.split(' ').slice(0, 2).join(' '))
  await h.read(3)
  const rows = await page.locator('.table tbody tr').count()
  h.stumble(
    `searched the Stock list for "${target.product.split(' ').slice(0, 2).join(' ')}": ${rows} row(s) — the search box is "Search by ID"`,
  )
  await h.clearField()
  await h.read(3)
  await h.click(page.locator('.paginator').getByRole('button', { name: '2', exact: true }).first())
  await page.waitForURL(/page=2/)
  await h.read(4)
  await h.click(page.locator(`.table a[href="${target.href}"]`).first())
  await page.waitForURL(new RegExp(target.href.replace(/\//g, '\\/') + '$'))
  await h.read()
  await h.type(page.locator('#field-physicalCount'), '7', { replace: true })
  await h.click(page.getByRole('button', { name: 'Save' }).first())
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
  h.stop()
  await h.shot('t5-saved')
  h.finish('unaided', { product: target.product, variant: target.variant, pagesSearched: 2 })

  // Off the clock: the count as it was.
  await page.locator('#field-physicalCount').fill(before)
  await page.getByRole('button', { name: 'Save' }).first().click()
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
})
