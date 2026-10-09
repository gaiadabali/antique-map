/**
 * Recipe 4 (CONTENT-OPERATIONS.md 5.1, target: each step in two taps and under 10 seconds; a first-timer completes
 * the flow unaided): a DPS-004 store user takes an order from the list to Delivered, with the driver image. Set-up
 * (not timed): a guest places the order exactly as tests/e2e/rehearsal/shop.spec.ts does (pin on DPS-004), the owner
 * prices it in the admin, the buyer pays in the simulator. Then the store user signs in and the stopwatch runs from
 * the page they land on to Delivered, through the admin UI only. Runs at 1280 px and at 390 px.
 */
import { expect, test, type Page } from '@playwright/test'

import { BUY_SLUG, MARK, Meter, need, PIN, record, RUN, SHOP, signIn, widthOf } from './support'

const FEE = 15_000
const rupiah = (text: string): number => Number(text.replace(/\D/g, ''))

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

test.describe.serial('R4 store user moves an order to delivered', () => {
  let token = ''
  let number = ''
  let itemsTotal = 0

  test('set-up: the buyer places the order, the owner prices it, the buyer pays', async ({
    page,
  }, info) => {
    const width = widthOf(info)
    const html = await (await page.request.get(`${SHOP}/product/${BUY_SLUG}`)).text()
    expect(
      html.includes('Add to bag') && !/addButton"[^>]*disabled/.test(html),
      `${BUY_SLUG} sellable`,
    ).toBe(true)
    await page.goto(`${SHOP}/product/${BUY_SLUG}`)
    await page.getByRole('button', { name: 'Add to bag' }).click()
    await expect(page.getByText('Added to your bag.')).toBeVisible()
    await page.goto(`${SHOP}/checkout`)
    await page.waitForLoadState('networkidle')
    const fields: [RegExp, string][] = [
      [/full name/i, MARK],
      [/whatsapp/i, '0812 0000 1040'],
      [/email/i, `rehearsal-10-4.${width}.${RUN}@example.test`],
      [/address/i, 'REHEARSAL 10.4 - Jl. Teuku Umar, Denpasar (timed admin test, ignore)'],
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
    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await expect(page).toHaveURL(/\/order\//)
    token = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
    itemsTotal = rupiah(await page.locator('dl').locator('dd').last().innerText())
    const heading = await page.getByText(/^Order [\d,]+$/).innerText()
    number = /Order ([\d,]+)/.exec(heading)![1]!.replace(/,/g, '')
    record({ kind: 'order-placed', width, number, slug: BUY_SLUG })

    const owner = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
    await signIn(page, owner.E2E_OWNER_EMAIL!, owner.E2E_OWNER_PASSWORD!)
    const pm = new Meter(page, info, 'R5b owner prices one order (the courier fee)', 0)
    pm.start()
    await page.goto(`${SHOP}/admin`)
    await pm.click(page.getByRole('link', { name: /Orders to act on/ }))
    await page.waitForLoadState('networkidle')
    await pm.click(page.getByRole('link', { name: new RegExp(`^#?${number}$`) }).first())
    await expect(page).toHaveURL(/\/orders\/\d+/)
    await page.waitForLoadState('networkidle')
    const priceBox = page.locator('input[name="feeIdr"]')
    const found = (await priceBox.count()) > 0
    if (!found) {
      pm.stumble(
        `the order opened from the dashboard link (${page.url()}) has no delivery-price box; it is only on ${SHOP}/admin/orders/<id>, which nothing links to (typed the address to carry on)`,
      )
      await page.goto(`${SHOP}/admin/orders/${/orders\/(\d+)/.exec(page.url())![1]}`)
      await page.waitForLoadState('networkidle')
    }
    await priceBox.fill(String(FEE))
    await pm.click(page.getByRole('button', { name: 'Send price' }))
    await page.waitForURL('**/admin/orders/**')
    await expect(page.getByText('Awaiting payment')).toBeVisible()
    pm.stop()
    pm.finish(found ? 'PASS' : 'FAIL', {
      reason: found ? 'price box on the opened order' : 'price box not on the order the list opens',
    })

    await page.goto(`${SHOP}/order/${token}`)
    const pay = page.getByRole('button', { name: /^Pay /i })
    expect(rupiah(await pay.innerText()), 'subtotal + the staff fee').toBe(itemsTotal + FEE)
    await pay.click()
    await expect(page.getByText('Test payment — no money moves.')).toBeVisible()
    await page.getByRole('button', { name: 'Settle' }).click()
    await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
  })

  test('the store user: list, accept, driver booked, driver image, on the way, delivered', async ({
    page,
  }, info) => {
    const width = widthOf(info)
    const creds = need('E2E_STORE_A_EMAIL', 'E2E_STORE_A_PASSWORD')
    await signIn(page, creds.E2E_STORE_A_EMAIL!, creds.E2E_STORE_A_PASSWORD!)
    const m = new Meter(page, info, 'R4 store user moves an order to delivered', 0)
    const steps: { step: string; seconds: number; taps: number }[] = []
    const squeezed: string[] = []
    let t = 0
    let taps = 0
    const tap = async (name: string, locator: ReturnType<Page['locator']>): Promise<void> => {
      taps += 1
      await m.click(locator)
      void name
    }
    const done = (step: string): void => {
      const e = m.elapsed()
      steps.push({ step, seconds: Math.round((e - t) / 100) / 10, taps })
      t = e
      taps = 0
    }

    m.start()
    await page.goto(`${SHOP}/admin`)
    await page.waitForLoadState('networkidle')
    squeezed.push(`list ${await overflow(page)}`)
    await m.shot('r4-1-store-landing')
    const landing = page.url()
    await tap('orders', page.getByRole('link', { name: /Orders to act on/ }))
    await page.waitForLoadState('networkidle')
    await m.shot('r4-1b-store-orders-list')
    squeezed.push(`orders-list ${await overflow(page)}`)
    const listUrl = page.url()
    done('dashboard to the orders list')
    await tap('open', page.getByRole('link', { name: new RegExp(`^#?${number}$`) }).first())
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/orders\/\d+/)
    const id = Number(/orders\/(\d+)/.exec(page.url())![1])
    const openedUrl = page.url()
    await m.shot('r4-2a-order-as-opened-from-the-list')
    // A first-timer needs the big next-step button on the order screen. If the link led to the generic record
    // screen instead, that is a stumble; the run goes on at the store panel's address so the rest is still timed.
    const unaided =
      new URL(openedUrl).pathname.startsWith('/admin/orders/') &&
      (await page.getByRole('link', { name: /^Processing$/ }).count()) > 0
    if (!unaided) {
      m.stumble(
        `the order link in the list opened ${openedUrl}, which has no next-step button; the store panel is only at ${SHOP}/admin/orders/${id}, which no link on the dashboard or the list points to (typed the address to carry on)`,
      )
      await page.goto(`${SHOP}/admin/orders/${id}`)
      await page.waitForLoadState('networkidle')
    }
    await expect(page.getByRole('link', { name: /^Processing$/ })).toBeVisible()
    squeezed.push(`order ${await overflow(page)}`)
    await m.shot('r4-2-order-paid')
    done('open the order from the list')

    const advance = async (label: RegExp, name: string): Promise<void> => {
      await tap(name, page.getByRole('link', { name: label }))
      await m.shot(`r4-sheet-${name}`)
      await tap(name, page.getByRole('button', { name: /^Confirm$/ }))
      await page.waitForURL('**/admin/orders/**')
      await page.waitForLoadState('networkidle')
      squeezed.push(`${name} ${await overflow(page)}`)
      done(name)
    }
    await advance(/^Processing$/, 'accept')
    await advance(/^Waiting for driver$/, 'driver-booked')
    const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 300 } })
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'driver.png', mimeType: 'image/png', buffer: photo })
    await m.shot('r4-3-driver-image-chosen')
    taps += 1 // choosing the picture
    await tap('driver-image', page.getByRole('button', { name: /Add driver details/ }))
    await page.waitForURL('**/admin/orders/**')
    await page.waitForLoadState('networkidle')
    done('driver image (file chosen counts as a tap: +1)')
    await advance(/^On the way$/, 'on-the-way')
    await advance(/^Delivered$/, 'delivered')
    await m.shot('r4-4-delivered')
    m.stop()

    const final = (await page.locator('body').innerText()).slice(0, 400)
    const track = await page.context().newPage()
    await track.goto(`${SHOP}/track/${encodeURIComponent(token)}`)
    await expect(track.getByText('Delivered').first()).toBeVisible()
    await track.close()
    record({ kind: 'order-delivered', width, number, id })
    m.stumble(
      `landed on ${landing}, the Orders to act on link opened ${listUrl}; page-width overflow (px, 0 = none) per screen: ${squeezed.join(', ')}`,
    )
    m.stumble(`final screen text: ${final.replace(/\s+/g, ' ')}`)
    const slow = steps.filter((s) => s.seconds > 10)
    const manyTaps = steps.filter((s) => s.taps > 2)
    m.finish(unaided && slow.length === 0 && manyTaps.length === 0 ? 'PASS' : 'FAIL', {
      steps,
      unaided,
    })
    expect(unaided, 'the order link from the list leads to the next-step button (unaided)').toBe(
      true,
    )
    expect(slow, 'steps over 10 seconds').toEqual([])
    expect(manyTaps, 'steps over two taps').toEqual([])
    expect(
      squeezed.filter((s) => !s.endsWith(' 0')),
      'screens wider than the viewport',
    ).toEqual([])
  })
})
