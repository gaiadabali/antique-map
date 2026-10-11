/**
 * Steps the human-pace tasks share: adding an image through the upload drawer the way a person does it, a
 * real staging photo to upload, and the set-up of a paid order at DPS-004 (off the clock, as recipe 4's).
 */
import { expect, type Page, type TestInfo } from '@playwright/test'

import { dps004Slug, MARK, need, PIN, RUN, SHOP, signIn, widthOf } from '../support'
import type { Human } from './pace'

export type Upload = { name: string; mimeType: string; buffer: Buffer }

/**
 * A real photograph already on staging, of a work or a product (not one a rehearsal uploaded). Read from
 * inside the admin page: Payload honours the session cookie only with the admin's own Origin.
 */
export async function stagingPhoto(page: Page, subject: 'work' | 'product'): Promise<Upload> {
  if (!page.url().startsWith(SHOP)) await page.goto(`${SHOP}/admin`)
  const found = await page.evaluate(async (s) => {
    const list = await fetch(
      `/api/media?limit=40&depth=0&sort=createdAt&where[subject][equals]=${s}&where[mimeType][like]=image`,
    )
    const docs = ((await list.json()).docs ?? []) as {
      url?: string
      mimeType?: string
      filename?: string
    }[]
    for (const doc of docs) {
      if (!doc.url || /rehearsal|human-pace/i.test(doc.filename ?? '')) continue
      const file = await fetch(doc.url)
      if (!file.ok) continue
      const bytes = new Uint8Array(await file.arrayBuffer())
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000)
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return { b64: btoa(bin), mimeType: doc.mimeType ?? 'image/jpeg' }
    }
    return null
  }, subject)
  if (!found) throw new Error(`BLOCKED: no ${subject} photograph on staging to upload`)
  return {
    name: `human-pace-${subject}.${found.mimeType.split('/')[1]}`,
    mimeType: found.mimeType,
    buffer: Buffer.from(found.b64, 'base64'),
  }
}

/** Six views of one sheet from one photograph — the whole, then crops — made in the page's canvas. */
export async function sixViews(page: Page, photo: Upload): Promise<Upload[]> {
  const parts: string[] = await page.evaluate(
    async ({ b64, type }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const bitmap = await createImageBitmap(new Blob([bytes], { type }))
      const { width: w, height: h } = bitmap
      const boxes = [
        [0, 0, w, h],
        [0, 0, w * 0.6, h * 0.6],
        [w * 0.4, 0, w * 0.6, h * 0.6],
        [0, h * 0.4, w * 0.6, h * 0.6],
        [w * 0.4, h * 0.4, w * 0.6, h * 0.6],
        [w * 0.25, h * 0.25, w * 0.5, h * 0.5],
      ]
      const out: string[] = []
      for (const [x, y, cw, ch] of boxes) {
        const scale = Math.min(1, 1600 / Math.max(cw, ch))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(cw * scale)
        canvas.height = Math.round(ch * scale)
        canvas.getContext('2d')!.drawImage(bitmap, x, y, cw, ch, 0, 0, canvas.width, canvas.height)
        out.push(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]!)
      }
      return out
    },
    { b64: photo.buffer.toString('base64'), type: photo.mimeType },
  )
  return parts.map((b64, i) => ({
    name: `human-pace-antique-${i + 1}.jpg`,
    mimeType: 'image/jpeg',
    buffer: Buffer.from(b64, 'base64'),
  }))
}

/**
 * One image the way the recipe adds it: Add Image, Create New, the file, then the four questions every new
 * image asks (alt text, Subject, Role, Provenance) and Save.
 */
export async function addImage(
  h: Human,
  file: Upload,
  answers: { alt: string; subject: RegExp; role: RegExp },
): Promise<void> {
  const page = h.page
  await h.click(page.getByRole('button', { name: 'Add Image' }).last())
  await h.click(page.locator('#field-images').getByRole('button', { name: 'Create New' }).last())
  const drawer = page.locator('.drawer__content, .drawer').last()
  await h.file(drawer.locator('input[type="file"]'), file)
  await h.type(drawer.locator('#field-alt'), answers.alt)
  await h.pick(drawer.locator('#field-subject'), answers.subject)
  await h.pick(drawer.locator('#field-role'), answers.role)
  await h.pick(drawer.locator('#field-provenance'), /photograph/i)
  await h.click(drawer.getByRole('button', { name: 'Save' }))
  await expect(drawer).toBeHidden({ timeout: 90_000 })
}

/**
 * Off the clock: a guest buys a design DPS-004 stocks (pin on the store), the owner prices the delivery,
 * the guest pays in the simulator. Returns the order's number. Leaves the page signed in as the owner.
 */
export async function placePaidOrder(page: Page, info: TestInfo, tag: string): Promise<string> {
  const slug = dps004Slug()
  await page.context().clearCookies()
  await page.goto(`${SHOP}/product/${slug}`)
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByText('Added to your bag.')).toBeVisible()
  await page.goto(`${SHOP}/checkout`)
  await page.waitForLoadState('networkidle')
  const fields: [RegExp, string][] = [
    [/full name/i, `${MARK} ${tag}`],
    [/whatsapp/i, '0812 0000 1040'],
    [/email/i, `rehearsal-10-4.${tag}.${widthOf(info)}.${RUN}@example.test`],
    [/address/i, 'REHEARSAL 10.4 - Jl. Teuku Umar, Denpasar (human-pace test, ignore)'],
  ]
  await expect(async () => {
    for (const [label, value] of fields) await page.getByLabel(label).fill(value)
    await page.waitForTimeout(750)
    for (const [label, value] of fields) await expect(page.getByLabel(label)).toHaveValue(value)
  }).toPass({ timeout: 20_000 })
  const pin = page.locator('input[inputmode="decimal"]')
  await pin.nth(0).fill(String(PIN.lat))
  await pin.nth(1).fill(String(PIN.lng))
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page).toHaveURL(/\/order\//)
  const token = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
  const heading = await page.getByText(/^Order [\d,]+$/i).innerText()
  const number = /Order ([\d,]+)/i.exec(heading)![1]!.replace(/,/g, '')

  const owner = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, owner.E2E_OWNER_EMAIL!, owner.E2E_OWNER_PASSWORD!)
  const id = await page.evaluate(async (n) => {
    const r = await fetch(`/api/orders?limit=1&depth=0&where[number][equals]=${n}`)
    return (await r.json()).docs?.[0]?.id as number
  }, number)
  await page.goto(`${SHOP}/admin/orders/${id}`)
  await page.locator('input[name="feeIdr"]').fill('15000')
  await page.getByRole('button', { name: 'Send price' }).click()
  await expect(page.getByText('Awaiting payment')).toBeVisible()

  const buyer = await page.context().browser()!.newContext()
  const pay = await buyer.newPage()
  await pay.goto(`${SHOP}/order/${token}`)
  await pay.getByRole('button', { name: /^Pay /i }).click()
  await expect(pay.getByText('Test payment — no money moves.')).toBeVisible()
  await pay.getByRole('button', { name: 'Settle' }).click()
  await expect(pay.getByRole('heading', { name: 'Payment received' })).toBeVisible()
  await buyer.close()
  return number
}
