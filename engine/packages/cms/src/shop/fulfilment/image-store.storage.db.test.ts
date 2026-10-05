/**
 * The driver image's store against the dev stack's MinIO (`STORAGE_TEST_ENDPOINT`; skipped
 * without it, as the other storage tests are): the hand-written SigV4 presigned GET is accepted
 * by a real S3 server, refused once tampered with or expired, and the `orders/` prefix answers no
 * anonymous read — the media bucket's public policy covers `derivatives/` and `iiif/` only.
 */
import { randomBytes } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { asRoot, endpoint, MEDIA_BUCKET } from '../../collections/media/test-stack.test-support'
import { orderImagePrefix, s3DriverImageStore } from './image-store'

const root = {
  accessKeyId: process.env.STORAGE_TEST_ROOT_USER || 'minioadmin',
  secretAccessKey: process.env.STORAGE_TEST_ROOT_SECRET || 'minioadmin',
}

describe.skipIf(!endpoint)('the driver image store, on MinIO', () => {
  it('signs a GET MinIO honours, and nothing else reads the object', async () => {
    const store = s3DriverImageStore({
      endpoint: endpoint!,
      region: 'auto',
      bucket: MEDIA_BUCKET,
      credentials: root,
    })!
    const key = `${orderImagePrefix(990000 + Math.floor(Math.random() * 9999))}${Date.now()}-${randomBytes(6).toString('hex')}.webp`
    const bytes = randomBytes(64)
    await store.put(key, bytes, 'image/webp')
    try {
      const url = await store.presignGet(key, 60)
      const ok = await fetch(url)
      expect(ok.status).toBe(200)
      expect(ok.headers.get('content-type')).toBe('image/webp')
      expect(Buffer.from(await ok.arrayBuffer()).equals(bytes)).toBe(true)

      const tampered = url.replace(
        /X-Amz-Signature=([0-9a-f])/,
        (_, c: string) => `X-Amz-Signature=${c === '0' ? '1' : '0'}`,
      )
      expect((await fetch(tampered)).status).toBe(403)
      const anonymous = `${endpoint!.replace(/\/$/, '')}/${MEDIA_BUCKET}/${key}`
      expect((await fetch(anonymous)).status).toBe(403)

      const brief = await store.presignGet(key, 1)
      await new Promise((resolve) => setTimeout(resolve, 2100))
      expect((await fetch(brief)).status).toBe(403)
    } finally {
      await store.remove(key)
    }
    expect(await asRoot(MEDIA_BUCKET).size(key)).toBeNull()
  }, 30_000)
})
