/**
 * `media` on a real database and the dev stack's MinIO (TASKS.md 8.3.a, 8.3.d, 8.3.e, 8.3.g),
 * through Payload's REST handler with the scoped media key. Runs when both
 * CMS_TEST_POSTGRES_URL and STORAGE_TEST_ENDPOINT are set (`./test-stack.test-support`), after the local storage
 * policies are applied; otherwise it skips.
 */
import { createHash } from 'node:crypto'

import { MEDIA_UPLOAD_MAX_BYTES, UPLOADS_PREFIX } from '@engine/media/storage'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  asRoot,
  form,
  JPEG,
  jpeg,
  MEDIA_BUCKET,
  messages,
  ORIGIN,
  stackAvailable,
  startStack,
  valid,
  type Stack,
} from './test-stack.test-support'

const PASSWORD = 'storage-test-password-1'

describe.skipIf(!stackAvailable)(
  'media, stored in the media bucket (on Postgres and MinIO)',
  () => {
    let stack: Stack
    let staff: string
    const stored: string[] = []

    beforeAll(async () => {
      stack = await startStack({
        connect: (config, key) => getPayload({ config, key }),
      })
      const users = [
        { email: 'owner@storage.test', name: 'Owner' },
        { email: 'cataloguer@storage.test', name: 'Cataloguer', role: 'editor' },
      ]
      for (const user of users) {
        await stack.payload.create({
          collection: 'users',
          data: { ...user, password: PASSWORD } as never,
        })
      }
      staff = await stack.login('cataloguer@storage.test', PASSWORD)
    }, 180_000)

    afterAll(async () => {
      for (const key of stored) await asRoot(MEDIA_BUCKET).remove(key)
      await stack?.stop()
    }, 60_000)

    const upload = (data: object, bytes = jpeg(`${Date.now()}-${Math.random()}`), query = '') =>
      stack.rest('POST', `/api/media${query}`, {
        token: staff,
        form: form(data, { bytes, name: 'M-9999_recto_01.jpg', type: 'image/jpeg' }),
      })

    it('requires localised alt text: none, blank, or only in another language is refused', async () => {
      const none = await upload({ role: 'recto', provenance: 'photograph' })
      expect(none.status).toBe(400)
      expect(await messages(none)).toMatch(/alt/)
      expect((await upload({ ...valid, alt: '   ' })).status).toBe(400)
      const inIndonesianOnly = await upload({ ...valid, alt: 'Peta Bali' }, undefined, '?locale=id')
      expect(inIndonesianOnly.status).toBe(400)
      expect(await messages(inIndonesianOnly)).toMatch(/default language \(en\) first/)
    }, 60_000)

    it('requires a role, a provenance and a subject, with no default for provenance', async () => {
      expect(await messages(await upload({ alt: valid.alt, role: 'recto' }))).toMatch(/provenance/)
      expect(await messages(await upload({ alt: valid.alt, provenance: 'photograph' }))).toMatch(
        /role/,
      )
      expect(
        await messages(await upload({ alt: valid.alt, role: 'recto', provenance: 'photograph' })),
      ).toMatch(/subject/)
      expect((await upload({ ...valid, role: 'primary' })).status).toBe(400)
    }, 60_000)

    it('lands in the media bucket under uploads/, and is served to staff alone (8.3.g)', async () => {
      const bytes = jpeg('lands-in-the-bucket')
      const response = await upload(valid, bytes)
      expect(response.status).toBe(201)
      const { doc } = (await response.json()) as { doc: Record<string, string> }
      const key = `${doc.prefix}/${doc.filename}`
      stored.push(key)
      expect(key.startsWith(`${UPLOADS_PREFIX}/`)).toBe(true)
      expect(await asRoot(MEDIA_BUCKET).size(key)).toBe(bytes.length)
      expect(doc.assetId).toBe(createHash('sha256').update(bytes).digest('hex').slice(0, 32))
      expect(doc).toMatchObject({ role: 'recto', provenance: 'photograph', alt: valid.alt })
      // Its URL is Payload's file route on the site, never the bucket's public address.
      const url = new URL(doc.url!)
      expect(url.origin).toBe(ORIGIN)
      expect(url.pathname).toBe(`/api/media/file/${doc.filename}`)
      expect((await fetch(`${stack.env.MEDIA_PUBLIC_URL}/${key}`)).status).toBe(403)
      const file = `${url.pathname}${url.search}`
      expect((await stack.rest('GET', file)).status).toBe(403)
      const forStaff = await stack.rest('GET', file, { token: staff })
      expect(forStaff.status).toBe(200)
      const served = Buffer.from(await forStaff.arrayBuffer())
      expect(served.equals(bytes)).toBe(true)
      // The bucket holds the file as uploaded, Exif and all — which is why nothing public serves it.
      expect(served.includes('TestCam')).toBe(true)
    }, 60_000)

    it("keeps the pipeline's fields out of a request's hands", async () => {
      const response = await upload({
        ...valid,
        assetId: 'f'.repeat(32),
        derivatives: { status: 'ready', version: 'v9' },
        iiif: { status: 'ready' },
      })
      const { doc } = (await response.json()) as { doc: Record<string, unknown> }
      stored.push(`${String(doc.prefix)}/${String(doc.filename)}`)
      expect(doc.assetId).not.toBe('f'.repeat(32))
      expect(doc.derivatives).toMatchObject({ status: 'pending', version: null })
      expect(doc.iiif).toMatchObject({ status: 'none' })
    }, 60_000)

    it('refuses a type it does not take, judged by the bytes, not the name (8.3.d)', async () => {
      const as = (bytes: Buffer, name: string, type: string) =>
        stack.rest('POST', '/api/media', { token: staff, form: form(valid, { bytes, name, type }) })
      const svg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      )
      expect((await as(svg, 'map.svg', 'image/svg+xml')).status).toBe(400)
      expect(
        (await as(Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n'), 'map.pdf', 'application/pdf')).status,
      ).toBe(400)
      expect(
        (await as(Buffer.from('MZ\x90\x00 not an image at all'), 'map.jpg', 'image/jpeg')).status,
      ).toBe(400)
      expect(await asRoot(MEDIA_BUCKET).list(`${UPLOADS_PREFIX}/map.`)).toEqual([])
    }, 60_000)

    it('refuses a file over the limit with 413, before storing it (8.3.d)', async () => {
      const big = Buffer.alloc(MEDIA_UPLOAD_MAX_BYTES + 1)
      JPEG.copy(big)
      const error = await stack.payload
        .create({
          collection: 'media',
          data: valid as never,
          file: { data: big, mimetype: 'image/jpeg', name: 'too-big.jpg', size: big.length },
        })
        .catch((e: { status?: number; message?: string }) => e)
      expect(error).toMatchObject({ status: 413 })
      expect(await asRoot(MEDIA_BUCKET).list(`${UPLOADS_PREFIX}/too-big`)).toEqual([])
    }, 60_000)

    it('lets only staff make an image — never a visitor or a customer (Found 10)', async () => {
      const anonymous = await stack.rest('POST', '/api/media', {
        form: form(valid, { bytes: jpeg('anon'), name: 'anon.jpg', type: 'image/jpeg' }),
      })
      expect(anonymous.status).toBe(403)
      const customer = await stack.payload
        .create({
          collection: 'media',
          data: valid as never,
          file: {
            data: jpeg('customer'),
            mimetype: 'image/jpeg',
            name: 'return-photo.jpg',
            size: 100,
          },
          overrideAccess: false,
          user: { id: 1, collection: 'customers' } as never,
        })
        .catch((e: { status?: number }) => e)
      expect(customer).toMatchObject({ status: 403 })
    }, 60_000)
  },
)
