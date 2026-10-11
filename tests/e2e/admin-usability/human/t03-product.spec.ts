/**
 * T3 (recipe 3.3, target 3 min) and T4 (recipe 3.3, target 5 min), at a person's pace: a product with one photo
 * and stock at three stores; a product with six variants. Both are REHEARSAL products, unpublished afterwards
 * (off the clock).
 */
import { expect, test, type Page } from '@playwright/test'

import { MARK, need, record, RUN, SHOP, sidebarLink, signIn, unpublish } from '../support'
import { Human } from './pace'
import { addImage, stagingPhoto } from './steps'

const stamp = () => `${RUN}-${Date.now().toString(36).slice(-4)}`

async function productForm(h: Human, sku: string, name: string, price: string): Promise<void> {
  const page = h.page
  await h.type(page.locator('#field-sku'), sku)
  await h.type(page.locator('#field-name'), name)
  await h.type(
    page.locator('#field-description'),
    'A rehearsal product for the timed test. Not for sale.',
  )
  await h.pick(page.locator('#field-category'), 'Prints', 'Pri')
  await h.type(page.locator('#field-price'), price)
}

async function publish(h: Human): Promise<number> {
  const page = h.page
  await h.click(page.getByRole('button', { name: 'Publish changes' }).first())
  await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+/, { timeout: 60_000 })
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
  return Number(/products\/(\d+)/.exec(page.url())![1])
}

/**
 * The product field of a stock row, as a person fills it: they type the SKU they just made, and the field
 * searches by name only — "No options" — so they clear it and type part of the name.
 */
async function pickProduct(h: Human, name: string, sku: string): Promise<void> {
  const page = h.page
  const field = page.locator('#field-product')
  await h.click(field.locator('.rs__control').first())
  await h.keysOnly(sku)
  await h.pause(3)
  if (await page.getByText('No options').isVisible()) {
    h.stumble(`the stock row's Product field finds nothing by SKU (${sku}), only by name`)
    await h.pause(4)
    await h.clearField()
    await h.keysOnly(sku.slice(6))
  }
  const option = page.locator('.rs__option').filter({ hasText: name }).first()
  await option.waitFor({ timeout: 20_000 })
  await h.click(option, 1.2)
}

async function openStock(h: Human, page: Page): Promise<void> {
  await h.click(await sidebarLink(page, '/admin/collections/stock-levels'))
  await expect(page).toHaveURL(/\/collections\/stock-levels/)
  await h.read()
}

test.describe.serial('T3, T4 products', () => {
  test('T3 add a product, stock at three stores', async ({ page }, info) => {
    const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
    await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
    const photo = await stagingPhoto(page, 'product')
    await page.goto(`${SHOP}/admin?locale=en`)
    await page.waitForLoadState('networkidle')
    const sku = `REH-H-${stamp()}`
    const name = `${MARK} human-pace product ${sku.slice(6)}`

    const h = new Human(page, info, 'T3', 'Add a product, stock at three stores', 180)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/collections/products'))
    await h.read()
    await h.click(page.getByRole('link', { name: 'Create New' }).first())
    await h.read()
    await addImage(h, photo, {
      alt: 'A framed print on a white wall',
      subject: /product/i,
      role: /flat/i,
    })
    await productForm(h, sku, name, '185000')
    const id = await publish(h)
    await h.shot('t3-published')
    for (const store of ['Denpasar 004', 'Denpasar 008', 'Canggu 001']) {
      await openStock(h, page)
      await h.click(page.getByRole('link', { name: 'Create New' }).first())
      await h.read()
      await h.pick(page.locator('#field-store'), store, store.split(' ')[1])
      await pickProduct(h, name, sku)
      await h.type(page.getByLabel(/count on the shelf/i), '1')
      await h.click(page.getByRole('button', { name: 'Save' }))
      await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
    }
    h.stop()
    await h.shot('t3-stocked')
    h.finish('unaided', { sku })
    record({ kind: 'human-product', id, sku })
    await unpublish(page, id)
  })

  test('T4 add a product with six variants', async ({ page }, info) => {
    const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
    await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
    const photo = await stagingPhoto(page, 'product')
    await page.goto(`${SHOP}/admin?locale=en`)
    await page.waitForLoadState('networkidle')
    const sku = `REH-V-${stamp()}`
    const name = `${MARK} human-pace variants ${sku.slice(6)}`
    const variants = [
      ['A4 matte', '-A4M', '150000'],
      ['A4 cotton', '-A4C', '175000'],
      ['A3 matte', '-A3M', '220000'],
      ['A3 cotton', '-A3C', '250000'],
      ['A2 matte', '-A2M', '320000'],
      ['A2 cotton', '-A2C', '360000'],
    ] as const

    const h = new Human(page, info, 'T4', 'Add a product with six variants', 300)
    await h.start()
    await h.click(await sidebarLink(page, '/admin/collections/products'))
    await h.read()
    await h.click(page.getByRole('link', { name: 'Create New' }).first())
    await h.read()
    await addImage(h, photo, {
      alt: 'A framed print on a white wall',
      subject: /product/i,
      role: /flat/i,
    })
    await productForm(h, sku, name, '150000')
    for (const [i, [label, suffix, price]] of variants.entries()) {
      await h.click(page.getByRole('button', { name: 'Add Variant' }))
      const row = (f: string) => page.locator(`#field-variants__${i}__${f}`)
      await expect(row('label')).toBeVisible()
      await h.type(row('label'), label)
      await h.type(row('sku'), `${sku}${suffix}`)
      await h.type(row('price'), price)
      const onSale = row('active')
      if ((await onSale.count()) > 0 && !(await onSale.isChecked())) await h.click(onSale)
    }
    const id = await publish(h)
    h.stop()
    await h.shot('t4-published')
    h.finish('unaided', { sku, variants: variants.length })
    record({ kind: 'human-product', id, sku })
    await unpublish(page, id)
  })
})
