/**
 * Media takes videos and PDFs as well as images (CONTENT-MODEL.md §6), driven as the owner on a
 * production build: the sidebar's "Media" lists each file's type; a video and a PDF are uploaded
 * in the admin with a title instead of alt text; a shop page places them in a Video and a PDF
 * link block; the published page plays the video (controls, no autoplay, `preload="metadata"`)
 * and links the PDF, axe-clean at 390 and 1280 px; and the public media route serves the two —
 * stored type, `nosniff`, the PDF inline and sandboxed, the video in ranges — and never an image's
 * upload, nor anything once the page is unpublished. Screenshots go to `E2E_MEDIA_SHOTS` when set.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { join } from 'node:path'

import { ACCOUNTS } from './accounts'
import { setLanguage, signIn } from './admin'
import { fixtures, sql } from './local.mjs'

const RUN = Date.now().toString(36)
const SLUG = `media-${RUN}`

test.describe.configure({ mode: 'serial' })

const ids = { video: 0, pdf: 0, image: 0 }
const shot = (name: string) =>
  process.env.E2E_MEDIA_SHOTS
    ? join(process.env.E2E_MEDIA_SHOTS, `${name}.png`)
    : test.info().outputPath(`${name}.png`)

/** A real, playable WebM: two seconds of a canvas, recorded by the browser itself. */
async function recordedWebm(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const ctx = canvas.getContext('2d')!
    const recorder = new MediaRecorder(canvas.captureStream(25), { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const done = new Promise((resolve) => (recorder.onstop = resolve))
    recorder.start()
    const started = performance.now()
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = (performance.now() - started) / 2000
        ctx.fillStyle = `hsl(${Math.round(t * 120)}, 40%, 45%)`
        ctx.fillRect(0, 0, 640, 360)
        ctx.fillStyle = 'white'
        ctx.font = '48px sans-serif'
        ctx.fillText('The workshop', 170, 200)
        if (t < 1) requestAnimationFrame(frame)
        else resolve()
      }
      frame()
    })
    recorder.stop()
    await done
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer())
    let text = ''
    for (const byte of bytes) text += String.fromCharCode(byte)
    return btoa(text)
  })
  return Buffer.from(base64, 'base64')
}

/** A one-page PDF with a line of text, its cross-reference table and end marker. */
function pricePdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length 60 >>\nstream\nBT /F1 24 Tf 72 760 Td (Wholesale price list 2027) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, i) => {
    offsets.push(body.length)
    body += `${i + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

async function uploadInAdmin(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
  fill: (page: Page) => Promise<void>,
): Promise<number> {
  await page.goto('/admin/collections/media/create')
  await page.locator('input[type="file"]').setInputFiles(file)
  await fill(page)
  await page.locator('#action-save').click()
  await page.waitForURL(/\/admin\/collections\/media\/\d+$/)
  return Number(page.url().split('/').pop())
}

/** A REST write from the admin page itself, with the session's cookie. */
async function write(page: Page, method: string, path: string, json: unknown) {
  return page.evaluate(
    async ({ method, path, json }) => {
      const answer = await fetch(path, {
        method,
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(json),
      })
      return { status: answer.status, body: (await answer.json()) as { doc?: { id: number } } }
    },
    { method, path, json },
  )
}

/** A GET from the page itself (Chromium resolves `*.localhost`; Node's resolver may not). */
async function fetched(page: Page, path: string, headers: Record<string, string> = {}) {
  return page.evaluate(
    async ({ path, headers }) => {
      const answer = await fetch(path, { headers, cache: 'no-store' })
      await answer.arrayBuffer()
      return { status: answer.status, headers: Object.fromEntries(answer.headers.entries()) }
    },
    { path, headers },
  )
}

test.beforeAll(() => {
  fixtures()
})

test('the owner uploads an image, a video and a PDF to Media', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  await setLanguage(page, 'en')
  ids.image = await uploadInAdmin(
    page,
    {
      name: `poster-${RUN}.png`,
      mimeType: 'image/png',
      buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 640, height: 360 } }),
    },
    async (p) => {
      await p.locator('#field-alt').fill(`The workshop's press, run ${RUN}`)
      for (const [id, option] of [
        ['#field-subject', /other/i],
        ['#field-role', /Editorial/],
        ['#field-provenance', /Photograph/],
      ] as const) {
        await p.locator(id).click()
        await p.locator('.rs__option').filter({ hasText: option }).first().click()
      }
    },
  )
  const webm = await recordedWebm(page)
  ids.video = await uploadInAdmin(
    page,
    { name: `workshop-${RUN}.webm`, mimeType: 'video/webm', buffer: webm },
    async (p) => {
      await p.locator('#field-title').fill('The workshop at work')
      await p.locator('#field-description').fill('A sheet of cotton paper goes through the press.')
    },
  )
  await expect(page.locator('#field-alt')).toBeHidden()
  await page.screenshot({ path: shot('admin-video-1280'), fullPage: true })
  ids.pdf = await uploadInAdmin(
    page,
    { name: `price-list-${RUN}.pdf`, mimeType: 'application/pdf', buffer: pricePdf() },
    async (p) => {
      await p.locator('#field-title').fill('Wholesale price list 2027')
    },
  )
  expect(
    sql(`SELECT string_agg(kind::text, ',' ORDER BY id) FROM media
         WHERE id IN (${ids.image}, ${ids.video}, ${ids.pdf})`),
  ).toBe('image,video,pdf')
  expect(sql(`SELECT asset_id IS NULL FROM media WHERE id = ${ids.pdf}`)).toBe('t')

  await page.goto('/admin/collections/media')
  await expect(page.locator('th').filter({ hasText: /^Type$/ })).toBeVisible()
  for (const kind of ['Image', 'Video', 'PDF']) {
    await expect(
      page
        .locator('td')
        .filter({ hasText: new RegExp(`^${kind}$`) })
        .first(),
    ).toBeVisible()
  }
  await page.screenshot({ path: shot('admin-media-list-1280') })
})

test('a shop page plays the video and links the PDF, at 390 and 1280', async ({ page }) => {
  await signIn(page, ACCOUNTS.owner.email)
  await page.goto('/admin')
  // Refused where an image is needed: a PDF in a picture block, an image in a Video block.
  const refused = await write(page, 'POST', '/api/pages?locale=en&draft=true', {
    site: 'shop',
    kind: 'page',
    slug: `${SLUG}-bad`,
    title: 'Bad',
    layout: [{ blockType: 'imageText', title: 'x', image: ids.pdf }],
  })
  expect(refused.status).toBe(400)
  const created = await write(page, 'POST', '/api/pages?locale=en', {
    site: 'shop',
    kind: 'page',
    slug: SLUG,
    title: 'Our workshop',
    _status: 'published',
    layout: [
      { blockType: 'text', title: 'Our workshop', body: 'How a print is made, start to finish.' },
      { blockType: 'video', video: ids.video, poster: ids.image, caption: 'The press, 2026' },
      { blockType: 'documentLink', document: ids.pdf, note: 'Prices for shops and hotels.' },
    ],
  })
  expect(created.status).toBe(201)
  const pageId = created.body.doc!.id
  await page.goto(`/admin/collections/pages/${pageId}`)
  await expect(page.getByText('Video', { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: shot('admin-page-blocks-1280'), fullPage: true })

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
    await page.goto(`/${SLUG}`)
    const video = page.locator('video')
    await expect(video).toHaveAttribute('preload', 'metadata')
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).not.toHaveAttribute('autoplay', /.*/)
    await expect(video.locator('source')).toHaveAttribute('src', `/api/x/media/${ids.video}`)
    const link = page.getByRole('link', { name: /Wholesale price list 2027/ })
    await expect(link).toHaveAttribute('href', `/api/x/media/${ids.pdf}`)
    await video.evaluate((element: HTMLVideoElement) =>
      element.readyState >= 1
        ? undefined
        : new Promise((resolve) => element.addEventListener('loadedmetadata', resolve)),
    )
    const axe = await new AxeBuilder({ page }).analyze()
    expect(axe.violations.map((v) => v.id)).toEqual([])
    await page.screenshot({ path: shot(`shop-page-${width}`), fullPage: true })
  }

  const pdf = await fetched(page, `/api/x/media/${ids.pdf}`)
  expect(pdf.status).toBe(200)
  expect(pdf.headers['content-type']).toBe('application/pdf')
  expect(pdf.headers['x-content-type-options']).toBe('nosniff')
  expect(pdf.headers['content-security-policy']).toBe('sandbox')
  expect(pdf.headers['content-disposition']).toMatch(/^inline; filename="price-list-/)
  const range = await fetched(page, `/api/x/media/${ids.video}`, { range: 'bytes=0-99' })
  expect(range.status).toBe(206)
  expect(range.headers['content-type']).toBe('video/webm')
  expect(range.headers['content-range']).toMatch(/^bytes 0-99\/\d+$/)
  expect((await fetched(page, `/api/x/media/${ids.image}`)).status).toBe(404)

  await page.goto('/admin')
  expect((await write(page, 'PATCH', `/api/pages/${pageId}`, { _status: 'draft' })).status).toBe(
    200,
  )
  expect((await fetched(page, `/api/x/media/${ids.pdf}`)).status).toBe(404)
})
