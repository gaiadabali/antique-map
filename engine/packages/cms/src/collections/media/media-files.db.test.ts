/**
 * Videos and PDFs in Media, on a real, pushed Postgres (CONTENT-MODEL.md §6): an MP4, a WebM and
 * a PDF are taken, sniffed and held to their type, with a title instead of alt text and no
 * pipeline; a PDF over its cap, an SVG, an HTML page and a PDF sent as something else are
 * refused; a relation that needs an image refuses a PDF or a video on save; and the rule behind
 * the public media route (`./public-file`) opens a video or a PDF only while a published shop
 * page places it, with its stored type, in ranges — never an image's upload. The route's headers
 * are `@engine/http`'s own test (`media/media-route.test.ts`).
 * Uploads go to disk (no bucket configured), under the tests' own temp folder.
 */
import { MEDIA_PDF_MAX_BYTES } from '@engine/media/storage'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { collectingWrites } from '../places/pushed-database.test-support'
import { makeProduct } from '@engine/cms-shop/collections/stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'
import { publicMediaFile } from './public-file'

const ascii = (text: string) => Buffer.from(text, 'latin1')
/** The smallest MP4 Payload's box check takes: an `ftyp` box, then an empty `mdat`. */
const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 24]),
  ascii('ftypisom'),
  Buffer.from([0, 0, 2, 0]),
  ascii('isommp41'),
  Buffer.from([0, 0, 0, 16]),
  ascii('mdat'),
  ascii('01234567'),
])
/** An EBML header whose DocType is `webm`. */
const WEBM = Buffer.concat([
  Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f]),
  Buffer.from([0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04]),
  Buffer.from([0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84]),
  ascii('webm'),
  Buffer.from([0x42, 0x87, 0x81, 0x04, 0x42, 0x85, 0x81, 0x02]),
  Buffer.from([0x18, 0x53, 0x80, 0x67, 0x80]),
])
const PDF = ascii(
  '%PDF-1.4\n1 0 obj<<>>endobj\nxref\n0 1\n0000000000 65535 f \ntrailer<<>>\nstartxref\n9\n%%EOF\n',
)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

describe.skipIf(!server)('videos and PDFs in Media, on a real database', () => {
  let stack: StaffStack
  const ids: Record<'mp4' | 'webm' | 'pdf' | 'png', number> = { mp4: 0, webm: 0, pdf: 0, png: 0 }

  beforeAll(async () => {
    // Outside a request: a publish's cache tags go to a collector (`collectingWrites`).
    stack = await startStaffStack('cms_media_files_test', async (config, key) =>
      collectingWrites(await getPayload({ config, key })),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const upload = (bytes: Buffer, name: string, mimetype: string, data: object) =>
    stack.payload.create({
      collection: 'media',
      locale: 'en',
      data: data as never,
      file: { data: bytes, mimetype, name, size: bytes.length },
    }) as unknown as Promise<Record<string, unknown> & { id: number }>
  const refusal = (promise: Promise<unknown>) =>
    promise.then(
      () => null,
      (error: { status?: number; message?: string; data?: unknown }) => error,
    )

  it('takes an MP4, a WebM and a PDF, with a title and no pipeline', async () => {
    const video = { title: 'The press', description: 'A sheet goes through the press.' }
    const mp4 = await upload(MP4, 'press.mp4', 'video/mp4', video)
    const webm = await upload(WEBM, 'press.webm', 'video/webm', video)
    const pdf = await upload(PDF, 'price-list.pdf', 'application/pdf', { title: 'Price list' })
    expect(mp4).toMatchObject({ kind: 'video', mimeType: 'video/mp4', assetId: null })
    expect(webm).toMatchObject({ kind: 'video', mimeType: 'video/webm' })
    expect(pdf).toMatchObject({ kind: 'pdf', mimeType: 'application/pdf', title: 'Price list' })
    expect(pdf.role ?? null).toBeNull()
    const png = await upload(PNG, 'dot.png', 'image/png', {
      alt: 'A dot',
      subject: 'product',
      role: 'flat',
      provenance: 'photograph',
    })
    expect(png).toMatchObject({ kind: 'image', derivatives: { status: 'pending' } })
    Object.assign(ids, { mp4: mp4.id, webm: webm.id, pdf: pdf.id, png: png.id })
  })

  it('asks a video for its words, and an image still for its alt text and intake', async () => {
    expect(await refusal(upload(MP4, 'mute.mp4', 'video/mp4', { title: 'Mute' }))).toMatchObject({
      message: expect.stringMatching(/description/i),
    })
    expect(await refusal(upload(PDF, 'untitled.pdf', 'application/pdf', {}))).not.toBeNull()
    expect(await refusal(upload(PNG, 'bare.png', 'image/png', { alt: 'x' }))).not.toBeNull()
  })

  it('refuses a PDF over its cap, an SVG, an HTML page and a PDF sent as a video', async () => {
    const big = Buffer.alloc(MEDIA_PDF_MAX_BYTES + 1)
    PDF.copy(big)
    expect(
      await refusal(upload(big, 'huge.pdf', 'application/pdf', { title: 'Huge' })),
    ).toMatchObject({ status: 413, message: expect.stringMatching(/a PDF may be at most/) })
    const svg = ascii('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect(await refusal(upload(svg, 'x.svg', 'image/svg+xml', { title: 'x' }))).not.toBeNull()
    const html = ascii('<!doctype html><html><script>alert(1)</script></html>')
    expect(await refusal(upload(html, 'x.html', 'text/html', { title: 'x' }))).not.toBeNull()
    expect(await refusal(upload(html, 'x.pdf', 'application/pdf', { title: 'x' }))).toMatchObject({
      status: 400,
    })
    expect(await refusal(upload(PDF, 'x.mp4', 'video/mp4', { title: 'x' }))).toMatchObject({
      status: 400,
    })
    const { totalDocs } = await stack.payload.count({ collection: 'media' })
    expect(totalDocs).toBe(4)
  })

  it('refuses a PDF or a video where an image is needed, and an image where a video is', async () => {
    const product = await makeProduct(stack.payload, 'OEI-MEDIA-KIND')
    const withImage = (image: number) =>
      stack.payload.update({
        collection: 'products',
        id: product.id,
        draft: true,
        data: { images: [{ image }] } as never,
      })
    expect(await refusal(withImage(ids.pdf))).toMatchObject({
      message: expect.stringMatching(/invalid/i),
    })
    expect(await refusal(withImage(ids.mp4))).not.toBeNull()
    expect(await refusal(withImage(ids.png))).toBeNull()
    const page = (layout: unknown[]) =>
      stack.payload.create({
        collection: 'pages',
        locale: 'en',
        draft: true,
        data: { site: 'shop', kind: 'page', slug: `p-${Date.now()}`, title: 'P', layout } as never,
      })
    const picture = { blockType: 'imageText', title: 'T', image: ids.pdf }
    expect(await refusal(page([picture]))).not.toBeNull()
    expect(await refusal(page([{ blockType: 'video', video: ids.png }]))).not.toBeNull()
    expect(await refusal(page([{ blockType: 'documentLink', document: ids.mp4 }]))).not.toBeNull()
  })

  it('serves a video or a PDF only while a published shop page places it', async () => {
    const get = (id: number) => publicMediaFile(stack.payload, id)
    const bytesOf = async (file: Awaited<ReturnType<typeof get>>, start: number, end: number) => {
      const read = await file!.read({ start, end })
      return Buffer.from(await new Response(read!.body).arrayBuffer())
    }
    const layout = [
      { blockType: 'video', video: ids.mp4, poster: ids.png },
      { blockType: 'documentLink', document: ids.pdf, label: 'Prices' },
      { blockType: 'imageText', title: 'Dot', image: ids.png },
    ]
    const draft = (await stack.payload.create({
      collection: 'pages',
      locale: 'en',
      draft: true,
      data: { site: 'shop', kind: 'page', slug: 'films', title: 'Films', layout } as never,
    })) as unknown as { id: number }
    expect(await get(ids.pdf)).toBeNull()

    await stack.payload.update({
      collection: 'pages',
      id: draft.id,
      locale: 'en',
      data: { _status: 'published' } as never,
    })
    const pdf = await get(ids.pdf)
    expect(pdf).toMatchObject({ kind: 'pdf', mimeType: 'application/pdf', size: PDF.length })
    expect(pdf!.filename).toMatch(/^price-list/)
    expect((await bytesOf(pdf, 0, PDF.length - 1)).equals(PDF)).toBe(true)

    const video = await get(ids.mp4)
    expect(video).toMatchObject({ kind: 'video', mimeType: 'video/mp4', size: MP4.length })
    expect((await bytesOf(video, 0, 7)).equals(MP4.subarray(0, 8))).toBe(true)

    // Never an image's upload, though the published page places it; never an unplaced video.
    expect(await get(ids.png)).toBeNull()
    expect(await get(ids.webm)).toBeNull()

    await stack.payload.update({
      collection: 'pages',
      id: draft.id,
      locale: 'en',
      data: { _status: 'draft' } as never,
    })
    expect(await get(ids.mp4)).toBeNull()
  })
})
