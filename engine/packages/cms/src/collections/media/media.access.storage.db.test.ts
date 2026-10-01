/**
 * `media` over REST on a real stack — the 8.3 review's findings 1–3 (`./test-stack.test-support`;
 * skips without CMS_TEST_POSTGRES_URL and STORAGE_TEST_ENDPOINT):
 * 1. the media limit is the one REST enforces, streamed to the OS temp folder and cleaned up;
 * 2. only staff read media over REST — the loaders read it on the Local API;
 * 3. what intake set (role, provenance) only an admin or a manager corrects.
 */
import { existsSync, readdirSync } from 'node:fs'

import { MEDIA_UPLOAD_MAX_BYTES, UPLOAD_TEMP_DIR, UPLOADS_PREFIX } from '@engine/media/storage'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  asRoot,
  form,
  JPEG,
  MEDIA_BUCKET,
  stackAvailable,
  startStack,
  valid,
  type Stack,
} from './test-stack.test-support'

const PASSWORD = 'storage-test-password-1'
const MiB = 1024 * 1024
const tempFiles = () => (existsSync(UPLOAD_TEMP_DIR) ? readdirSync(UPLOAD_TEMP_DIR) : [])
/** A real JPEG padded after its end marker to `size` bytes. */
const sized = (size: number) => {
  const bytes = Buffer.alloc(size)
  JPEG.copy(bytes)
  bytes.write(String(Date.now()), JPEG.length)
  return bytes
}

describe.skipIf(!stackAvailable)('media over REST (the 8.3 review, findings 1–3)', () => {
  let stack: Stack
  const tokens: Record<string, string> = {}
  const stored: string[] = []

  beforeAll(async () => {
    stack = await startStack({
      storefront: 'gallery',
      mastersUser: 'test-masters-origin',
      connect: (config, key) => getPayload({ config, key }),
    })
    for (const role of ['admin', 'manager', 'cataloguer', 'contributor']) {
      const email = `${role}@access.test`
      await stack.payload.create({
        collection: 'users',
        data: { email, name: role, roles: [role], password: PASSWORD } as never,
      })
      tokens[role] = await stack.login(email, PASSWORD)
    }
  }, 180_000)

  afterAll(async () => {
    for (const key of stored) await asRoot(MEDIA_BUCKET).remove(key)
    await stack?.stop()
  }, 60_000)

  const post = async (bytes: Buffer, data: object = valid, as = 'cataloguer') => {
    const response = await stack.rest('POST', '/api/media', {
      token: tokens[as],
      form: form(data, { bytes, name: 'large-sheet.jpg', type: 'image/jpeg' }),
    })
    const body = (await response.json()) as { doc?: Record<string, unknown>; message?: string }
    if (body.doc) stored.push(`${String(body.doc.prefix)}/${String(body.doc.filename)}`)
    return { status: response.status, body }
  }

  describe('1. the upload limit over REST', () => {
    it('takes a 30 MiB image — over Payload’s own 20 MiB default — and stores it whole', async () => {
      const before = new Set(tempFiles())
      const { status, body } = await post(sized(30 * MiB))
      expect(status).toBe(201)
      expect(
        await asRoot(MEDIA_BUCKET).size(`${UPLOADS_PREFIX}/${String(body.doc!.filename)}`),
      ).toBe(30 * MiB)
      // Streamed to the temp folder while the request ran, and removed once it ended.
      expect(tempFiles().filter((file) => !before.has(file))).toEqual([])
    }, 120_000)

    it('refuses one byte over the limit with 413, storing nothing and leaving no temp file', async () => {
      const before = new Set(tempFiles())
      const { status, body } = await post(sized(MEDIA_UPLOAD_MAX_BYTES + 1))
      expect(status).toBe(413)
      expect(JSON.stringify(body)).toMatch(/limit/i)
      expect(tempFiles().filter((file) => !before.has(file))).toEqual([])
      expect(await asRoot(MEDIA_BUCKET).list(`${UPLOADS_PREFIX}/large-sheet-`)).toEqual(
        stored.filter((key) => key.includes('large-sheet-')).map(() => expect.any(String)),
      )
    }, 180_000)
  })

  describe('2. who reads media', () => {
    let id: number | string

    beforeAll(async () => {
      const { body } = await post(sized(64 * 1024), { ...valid, caption: 'an unpublished work' })
      id = body.doc!.id as number
    }, 60_000)

    it('refuses an anonymous REST list or fetch, and a customer’s', async () => {
      expect((await stack.rest('GET', '/api/media?depth=0&limit=1')).status).toBe(403)
      expect((await stack.rest('GET', `/api/media/${id}`)).status).toBe(403)
      expect((await stack.rest('GET', '/api/media/count')).status).toBe(403)
      expect(
        (await stack.rest('GET', '/api/media?depth=0', { token: tokens.contributor })).status,
      ).toBe(200)
    })

    it('lets the loaders read it on the Local API, access enforced and no staff user', async () => {
      const read = await stack.payload.find({
        collection: 'media',
        overrideAccess: false,
        where: { id: { equals: id } },
        select: { alt: true, caption: true, role: true },
        depth: 0,
      })
      expect(read.docs).toEqual([
        expect.objectContaining({ alt: valid.alt, caption: 'an unpublished work', role: 'recto' }),
      ])
      const asCustomer = await stack.payload.findByID({
        collection: 'media',
        id,
        overrideAccess: false,
        user: { id: 1, collection: 'customers' } as never,
        depth: 0,
      })
      expect(asCustomer).toMatchObject({ id, alt: valid.alt })
      expect(asCustomer).not.toHaveProperty('master')
    })
  })

  describe('3. what intake set stays set', () => {
    it('refuses a contributor or a cataloguer who would make an AI image a photograph', async () => {
      const synthetic = { alt: 'A street at dusk', role: 'editorial', provenance: 'ai-generated' }
      const { status, body } = await post(sized(32 * 1024), synthetic, 'contributor')
      expect(status).toBe(201)
      const route = `/api/media/${String(body.doc!.id)}`
      for (const as of ['contributor', 'cataloguer']) {
        const change = await stack.rest('PATCH', route, {
          token: tokens[as],
          json: { provenance: 'photograph' },
        })
        expect(change.status).toBe(400)
        expect(JSON.stringify(await change.json())).toMatch(/only an admin or a manager/)
      }
      const caption = await stack.rest('PATCH', route, {
        token: tokens.contributor,
        json: { caption: 'Still editable' },
      })
      expect(caption.status).toBe(200)
      const manager = await stack.rest('PATCH', route, {
        token: tokens.manager,
        json: { provenance: 'composite' },
      })
      expect(manager.status).toBe(200)
      const admin = await stack.rest('PATCH', route, {
        token: tokens.admin,
        json: { role: 'room-plate' },
      })
      expect(admin.status).toBe(200)
      expect(
        await stack.payload.findByID({ collection: 'media', id: body.doc!.id as number }),
      ).toMatchObject({
        provenance: 'composite',
        role: 'room-plate',
        caption: 'Still editable',
      })
    }, 60_000)
  })
})
