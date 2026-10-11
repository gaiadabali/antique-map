/**
 * T8 (recipe 5.1, target: two taps and under 10 s a step), store staff on a phone at a person's pace: a paid
 * order at DPS-004 taken from New to Delivered, with the driver's details. Set-up (off the clock): a guest
 * buys, the owner prices the delivery, the guest pays. Each step's time and taps are kept.
 */
import { expect, test } from '@playwright/test'

import { need, record, SHOP, signIn } from '../support'
import { Human } from './pace'
import { placePaidOrder } from './steps'

test('T8 take an order to Delivered', async ({ page }, info) => {
  const number = await placePaidOrder(page, info, 'T8')
  const creds = need('E2E_STORE_A_EMAIL', 'E2E_STORE_A_PASSWORD')
  await page.context().clearCookies()
  await signIn(page, creds.E2E_STORE_A_EMAIL!, creds.E2E_STORE_A_PASSWORD!)
  await page.goto(`${SHOP}/admin`)
  await page.waitForLoadState('networkidle')

  const h = new Human(page, info, 'T8', 'Take an order to Delivered', 60)
  const steps: { step: string; seconds: number; taps: number }[] = []
  let mark = Date.now()
  let taps = 0
  const tap = async (target: Parameters<Human['click']>[0]): Promise<void> => {
    taps += 1
    await h.click(target)
  }
  const done = (step: string): void => {
    steps.push({ step, seconds: Math.round((Date.now() - mark) / 100) / 10, taps })
    mark = Date.now()
    taps = 0
  }

  await h.start()
  mark = Date.now()
  await h.read()
  await tap(
    page
      .locator('a[href^="/admin/orders/"]')
      .filter({ hasText: `#${number}` })
      .first(),
  )
  await page.waitForURL(/\/admin\/orders\/\d+/)
  await h.read()
  done('open the order')
  const id = Number(/orders\/(\d+)/.exec(page.url())![1])

  const advance = async (label: RegExp, step: string): Promise<void> => {
    await tap(page.getByRole('link', { name: label }))
    await h.read(1.5)
    await tap(page.getByRole('button', { name: /^Confirm$/ }))
    await page.waitForURL('**/admin/orders/**')
    await h.read(1)
    done(step)
  }
  await advance(/^Processing$/, 'accept (Processing)')
  await advance(/^Waiting for driver$/, 'driver booked (Waiting for driver)')
  const card = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } })
  taps += 1
  await h.file(page.locator('input[type="file"]'), {
    name: 'driver.png',
    mimeType: 'image/png',
    buffer: card,
  })
  await tap(page.getByRole('button', { name: /Add driver details/ }))
  await page.waitForURL('**/admin/orders/**')
  await h.read(1)
  done('driver details (choosing the picture counts as a tap)')
  await advance(/^On the way$/, 'on the way')
  await advance(/^Delivered$/, 'delivered')
  h.stop()
  await h.shot('t8-delivered')
  const slow = steps.filter((s) => s.seconds > 10)
  const many = steps.filter((s) => s.taps > 2)
  for (const s of slow) h.stumble(`step over 10 s: ${s.step} ${s.seconds} s`)
  for (const s of many) h.stumble(`step over two taps: ${s.step} ${s.taps} taps`)
  h.finish('unaided', { number, steps, stepsOver10s: slow.length, stepsOver2Taps: many.length })
  record({ kind: 'human-delivered', number, id })
  await expect(page.getByText(/Delivered/).first()).toBeVisible()
})
