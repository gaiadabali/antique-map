/**
 * The media pipeline on a real database and the dev stack's MinIO (TASKS.md 5.2; SECURITY.md F1,
 * F3, F4), with the scoped media key: a JPEG carrying a camera and a GPS position is uploaded
 * through Payload's REST handler, the pipeline publishes it, and its derivatives are in the public
 * `derivatives/` prefix — anonymously readable, with no Exif — while the upload under `uploads/`
 * stays refused. A second run writes the same objects and no others. Runs when both
 * CMS_TEST_POSTGRES_URL and STORAGE_TEST_ENDPOINT are set (`./test-stack.test-support`), after
 * the local storage policies are applied; otherwise it skips.
 */
import { DERIVATIVE_VERSION } from '@engine/media/contract'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { deriveMedia } from './pipeline'
import {
  asRoot,
  form,
  jpeg,
  MEDIA_BUCKET,
  stackAvailable,
  startStack,
  valid,
  type Stack,
} from './test-stack.test-support'

const PASSWORD = 'pipeline-test-password-1'

/** Whether bytes carry any trace of the fixture's Exif: its block, its camera or its GPS IFD. */
const carriesExif = (bytes: Uint8Array) => {
  const text = Buffer.from(bytes).toString('latin1')
  return ['Exif', 'EXIF', 'TestCam', 'Phone 1'].some((mark) => text.includes(mark))
}

describe.skipIf(!stackAvailable)('the media pipeline (on Postgres and MinIO)', () => {
  let stack: Stack
  let staff: string
  const stored: string[] = []

  beforeAll(async () => {
    stack = await startStack({ connect: (config, key) => getPayload({ config, key }) })
    await stack.payload.create({
      collection: 'users',
      data: {
        email: 'editor@pipeline.test',
        name: 'Editor',
        role: 'editor',
        password: PASSWORD,
      } as never,
    })
    staff = await stack.login('editor@pipeline.test', PASSWORD)
  }, 180_000)

  afterAll(async () => {
    for (const key of stored) await asRoot(MEDIA_BUCKET).remove(key)
    await stack?.stop()
  }, 60_000)

  it('publishes an uploaded GPS-tagged JPEG as derivatives with no Exif, the upload staying private', async () => {
    const bytes = jpeg(`pipeline-${Date.now()}`)
    expect(carriesExif(bytes)).toBe(true)
    const response = await stack.rest('POST', '/api/media', {
      token: staff,
      form: form(valid, { bytes, name: 'M-0500_recto_01.jpg', type: 'image/jpeg' }),
    })
    expect(response.status).toBe(201)
    const { doc } = (await response.json()) as { doc: Record<string, unknown> }
    const id = doc.id as number
    const assetId = String(doc.assetId)
    const upload = `${String(doc.prefix)}/${String(doc.filename)}`
    stored.push(upload)
    // Outside a Next request the upload hook cannot run after the response: the save succeeds
    // and the record waits, pending, for the backfill.
    expect(doc.derivatives).toMatchObject({ status: 'pending' })

    const outcome = await deriveMedia(stack.payload, id)
    expect(outcome).toMatchObject({ status: 'ready', tiles: 'none' })

    const prefix = `derivatives/${DERIVATIVE_VERSION}/${assetId}/`
    const keys = (await asRoot(MEDIA_BUCKET).list(prefix)).sort()
    stored.push(...keys)
    // A 16 px wide source: one rung, its own width, in both formats.
    expect(keys).toEqual([`${prefix}16.avif`, `${prefix}16.webp`])
    for (const key of keys) {
      const published = await asRoot(MEDIA_BUCKET).get(key)
      expect(published).not.toBeNull()
      expect(carriesExif(published!)).toBe(false)
      // Public: anonymous reads of the derivative prefix are answered.
      const anonymous = await fetch(`${stack.env.MEDIA_PUBLIC_URL}/${key}`)
      expect(anonymous.status).toBe(200)
      expect(anonymous.headers.get('cache-control')).toContain('immutable')
    }
    // Private: the upload itself, Exif and all, is refused anonymously.
    expect((await fetch(`${stack.env.MEDIA_PUBLIC_URL}/${upload}`)).status).toBe(403)
    expect(carriesExif((await asRoot(MEDIA_BUCKET).get(upload))!)).toBe(true)

    const recorded = await stack.payload.findByID({ collection: 'media', id, depth: 0 })
    expect(recorded).toMatchObject({
      assetId,
      derivatives: { status: 'ready', version: DERIVATIVE_VERSION },
      iiif: { status: 'none' },
    })
    expect(String((recorded.derivatives as { blurDataUri?: unknown }).blurDataUri)).toMatch(
      /^data:image\/webp;base64,/,
    )

    // Idempotent: up to date, it is left alone; forced, it rewrites the same keys and no others.
    expect(await deriveMedia(stack.payload, id)).toEqual({ status: 'up-to-date' })
    expect(await deriveMedia(stack.payload, id, { force: true })).toMatchObject({ status: 'ready' })
    expect((await asRoot(MEDIA_BUCKET).list(prefix)).sort()).toEqual(keys)
  }, 120_000)
})
