/**
 * 10.3.b, shop journey on staging: buy → fulfil → track. A guest bags a design, checks out with a
 * Bali pin (order lands awaiting_quote); staff enter the courier fee (owner, admin UI); the buyer
 * pays through the simulator; the store moves it processing → waiting for driver → driver image →
 * on the way → delivered, and the tracking page shows each step. The staff steps are the 7.4
 * gate's (`tests/e2e/shop-fulfilment/flow.spec.ts`) driven the same way, and need staging
 * accounts from the environment: E2E_OWNER_* and E2E_STORE_A_* (a DPS-004 user; the pin is on DPS-004 and
 * the product is one it stocks, `support.ts`); the order number is read off the awaiting-quote page. Without them those
 * steps fail with BLOCKED; nothing is invented and no user is created on staging.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

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

const FEE_IDR = 15_000

const rupiah = (text: string): number => Number(text.replace(/\D/g, ''))

/** The rehearsal's product, stocked by store A: listed, and its add button enabled (first variant preselected). */
async function sellableSlug(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${SHOP}/product/${PRODUCT}`)
  expect(res.status(), `the product ${PRODUCT}`).toBe(200)
  const html = await res.text()
  expect(html.includes('Add to bag') && !/addButton"[^>]*disabled/.test(html), 'sellable').toBe(
    true,
  )
  return PRODUCT
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.context().clearCookies()
  await page.goto(`${SHOP}/admin/login`)
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

async function openOrder(page: Page, number: string): Promise<void> {
  await page.goto(`${SHOP}/admin/orders`)
  await page
    .getByRole('link')
    .filter({ hasText: `#${number}` })
    .first()
    .click()
  await page.waitForURL('**/admin/orders/**')
}

async function advance(page: Page, link: RegExp): Promise<void> {
  await page.getByRole('link', { name: link }).click()
  await page.getByRole('button', { name: /^Confirm$/ }).click()
  await page.waitForURL('**/admin/orders/**')
}

test.describe.serial('shop: buy → fulfil → track', () => {
  test.setTimeout(300_000)
  let token = ''
  let itemsTotal = 0
  let number = ''
  let email = ''

  test('add to bag, check out with a Bali pin, place the order', async ({
    page,
    request,
  }, info) => {
    email = rehearsalEmail('shop', widthOf(info))
    const slug = await sellableSlug(request)
    const product = await page.goto(`${SHOP}/product/${slug}`)
    expect(product?.status()).toBe(200)
    await page.getByRole('button', { name: 'Add to bag' }).click()
    await expect(page.getByText('Added to your bag.')).toBeVisible()
    await page.goto(`${SHOP}/bag`)
    await expect(page.locator('main').getByRole('listitem')).toHaveCount(1)
    await shoot(page, info, 'shop-1-bag')

    await page.goto(`${SHOP}/checkout`)
    await page.waitForLoadState('networkidle')
    const fields: [RegExp, string][] = [
      [/full name/i, REHEARSAL_NAME],
      [/whatsapp/i, '0812 0000 1030'],
      [/email/i, email],
      [/address/i, 'REHEARSAL 10.3 - Jl. Teuku Umar, Denpasar (launch rehearsal, ignore)'],
    ]
    await expect(async () => {
      for (const [label, value] of fields) await page.getByLabel(label).fill(value)
      await page.waitForTimeout(750)
      for (const [label, value] of fields) await expect(page.getByLabel(label)).toHaveValue(value)
    }).toPass({ timeout: 20_000 })
    const pin = page.locator('input[inputmode="decimal"]')
    await pin.nth(0).fill(String(PIN.lat))
    await pin.nth(1).fill(String(PIN.lng))
    await expect(page.locator('input[type="hidden"][name="lat"]')).toHaveValue(String(PIN.lat))
    await expect(page.locator('input[type="hidden"][name="lng"]')).toHaveValue(String(PIN.lng))
    await shoot(page, info, 'shop-2-checkout')

    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await expect(page).toHaveURL(/\/order\//)
    token = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
    expect(token.length, 'a tracking token in the redirect URL').toBeGreaterThan(10)
    await expect(
      page.getByRole('heading', { name: "We're confirming your delivery price" }),
    ).toBeVisible()
    itemsTotal = rupiah(await page.locator('dl').locator('dd').last().innerText())
    expect(itemsTotal, 'the items total on the awaiting-quote page').toBeGreaterThan(0)
    await shoot(page, info, 'shop-3-awaiting-quote')
    // This release shows the number on the awaiting-quote page: no Mailpit needed to find the order.
    const heading = await page.getByText(/^Order [\d,]+$/).innerText()
    number = /Order ([\d,]+)/.exec(heading)![1]!.replace(/,/g, '')
    expect(number.length, 'an order number on the awaiting-quote page').toBeGreaterThan(3)
    record({ kind: 'shop-order-placed', width: widthOf(info), token, email, number })
  })

  test('staff enter the courier fee (owner, admin)', async ({ page }, info) => {
    const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
    await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
    await openOrder(page, number)
    await page.locator('input[name="feeIdr"]').fill(String(FEE_IDR))
    await page.getByRole('button', { name: 'Send price' }).click()
    await page.waitForURL('**/admin/orders/**')
    await expect(page.getByText('Awaiting payment')).toBeVisible()
    await shoot(page, info, 'shop-4-quote-sent')
    record({ kind: 'shop-order-quoted', width: widthOf(info), number })
  })

  test('the buyer pays through the simulator', async ({ page }, info) => {
    await page.goto(`${SHOP}/order/${token}`)
    const pay = page.getByRole('button', { name: /^Pay /i })
    await expect(pay, 'the priced Pay button').toBeVisible()
    expect(rupiah(await pay.innerText()), 'subtotal + the staff fee').toBe(itemsTotal + FEE_IDR)
    await pay.click()
    await expect(page.getByText('Test payment — no money moves.')).toBeVisible()
    await page.getByRole('button', { name: 'Settle' }).click()
    await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
    await shoot(page, info, 'shop-5-paid')
  })

  test('the store moves it to delivered and the tracking page shows each step', async ({
    page,
    context,
  }, info) => {
    const creds = need('E2E_STORE_A_EMAIL', 'E2E_STORE_A_PASSWORD')
    const tracker = await context.browser()!.newContext({ viewport: page.viewportSize()! })
    const track = await tracker.newPage()
    const seen = async (label: string, name: string): Promise<void> => {
      await track.goto(`${SHOP}/track/${encodeURIComponent(token)}`)
      await expect(track.getByRole('heading', { name: /^Order #/ })).toBeVisible()
      await expect(track.getByText(label).first(), `tracking shows "${label}"`).toBeVisible()
      await shoot(track, info, `shop-6-track-${name}`)
    }
    await signIn(page, creds.E2E_STORE_A_EMAIL!, creds.E2E_STORE_A_PASSWORD!)
    await openOrder(page, number)
    await seen('Payment received', 'paid')
    await advance(page, /^Processing$/)
    await seen('Being packed', 'processing')
    await advance(page, /^Waiting for driver$/)
    await seen('Waiting for a driver', 'waiting')
    const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } })
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'driver.png', mimeType: 'image/png', buffer: photo })
    await page.getByRole('button', { name: /Add driver details/ }).click()
    await page.waitForURL('**/admin/orders/**')
    await advance(page, /^On the way$/)
    await seen('On the way', 'on-the-way')
    await advance(page, /^Delivered$/)
    await seen('Delivered', 'delivered')
    await expect(track.getByRole('img', { name: 'Your driver' })).toBeVisible()
    await tracker.close()
    record({ kind: 'shop-order-delivered', width: widthOf(info), number, token })
  })
})
