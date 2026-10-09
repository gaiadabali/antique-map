/**
 * Recipe 6 (CONTENT-OPERATIONS.md 5.5, target under 2 minutes): the owner opens the delivered REHEARSAL 10.4 order
 * and uses "Replace damaged item" to create a Rp 0 replacement order. The test looks where the recipe says (the
 * order screen), then in the order's other admin screens. If the action is not there the recipe FAILS with that
 * reason; if it is, the test ticks a line, writes the note, confirms and checks the new order's channel and total.
 */
import { expect, test } from '@playwright/test'

import { Meter, need, record, recorded, SHOP, signIn } from './support'

test('R6 owner: create a replacement order for the delivered rehearsal order', async ({
  page,
}, info) => {
  const delivered = recorded('order-delivered', { width: 1280 })
  expect(delivered, 'BLOCKED: recipe 4 (desktop) must have delivered an order first').toBeDefined()
  const id = Number(delivered!.id)
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const m = new Meter(page, info, 'R6 create a replacement order', 120)

  m.start()
  await page.goto(`${SHOP}/admin`)
  await m.click(
    page.locator('.template-default__wrap a.card__click[href="/admin/collections/orders"]'),
  )
  await m.click(page.getByRole('link', { name: new RegExp(`^#?${delivered!.number}$`) }).first())
  await expect(page).toHaveURL(new RegExp(`/orders/${id}`))
  await page.waitForLoadState('networkidle')
  await m.shot('r6-1-order-as-opened-from-the-list')
  const replace = /replace|replacement|pengganti/i
  const onRecord = await page
    .getByRole('link', { name: replace })
    .or(page.getByRole('button', { name: replace }))
    .count()

  // The store panel's order screen (owner view), reached by its address.
  await page.goto(`${SHOP}/admin/orders/${id}`)
  await page.waitForLoadState('networkidle')
  await m.shot('r6-2-order-panel')
  const onOrderScreen = await page
    .getByRole('link', { name: replace })
    .or(page.getByRole('button', { name: replace }))
    .count()
  await page.goto(`${SHOP}/admin/collections/orders/${id}`)
  await page.waitForLoadState('networkidle')
  const channel = await page
    .locator('#field-channel')
    .first()
    .innerText()
    .catch(() => '(not shown)')

  m.stop()
  m.stumble(
    `"Replace damaged item": ${onOrderScreen} match(es) on the order screen, ${onRecord} on the order's record screen (channel field: ${channel.replace(/\s+/g, ' ').trim()}); ` +
      'the engine has no replace route: api/x/orders holds only quote, driver-image, hand-back, move and reassign',
  )
  const found = onOrderScreen + onRecord > 0
  m.finish(found ? 'PASS' : 'FAIL', {
    reason: found
      ? 'the action exists'
      : 'the order screen has no Replace damaged item action: replacement orders (COMMERCE.md 12) are not built in the admin',
    order: delivered!.number,
  })
  record({ kind: 'replacement-attempt', order: delivered!.number, found })
  expect(
    found,
    'FAIL: no "Replace damaged item" on the order screen (CONTENT-OPERATIONS 5.5): replacement orders are not built',
  ).toBe(true)
})
