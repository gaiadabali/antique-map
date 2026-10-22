/**
 * The media pipeline's scheduling and its one step, on a fake Payload and a fake bucket: an upload
 * schedules one run after the response and never fails the save; the pipeline's own write and a
 * CLI's (collector) context schedule nothing; a run publishes, records and expires the placing
 * records' tags, skips what is up to date, never records a superseded file, and records a failure
 * as retryable without throwing or logging the file name.
 */
import { COLLECTOR_KEY, invalidationBatch } from '@engine/cache'
import { DERIVATIVE_VERSION } from '@engine/media/contract'
import type { MediaPipelineStore } from '@engine/media/pipeline'
import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { deriveMedia, isUpToDate, PIPELINE_CONTEXT_KEY } from './pipeline'
import { derivativesAfterUploadWith, serially } from './pipeline-hook'
import { JPEG } from './test-stack.test-support'

const ASSET = 'abcdefabcdefabcdefabcdefabcdef12'
const BASE = 'https://media.example.test/indies-media'

type Doc = Record<string, unknown>

function fakePayload(doc: Doc | null, placing: { works?: Doc[]; products?: Doc[] } = {}) {
  const updates: { where: unknown; data: Doc; context: Doc }[] = []
  const logged: unknown[] = []
  const payload = {
    logger: { error: (entry: unknown) => logged.push(entry), info: () => undefined },
    findByID: vi.fn(async () => doc),
    find: vi.fn(async ({ collection }: { collection: string }) => ({
      docs: collection === 'works' ? (placing.works ?? []) : (placing.products ?? []),
    })),
    update: vi.fn(async (args: { where: unknown; data: Doc; context: Doc }) => {
      updates.push(args)
      const where = JSON.stringify(args.where)
      return { docs: doc && where.includes(String(doc.assetId)) ? [doc] : [] }
    }),
  }
  return { payload: payload as unknown as Payload, updates, logged, raw: payload }
}

function fakeStore(upload: Uint8Array | null) {
  const written: string[] = []
  const store: MediaPipelineStore = {
    read: vi.fn(async () => upload),
    put: vi.fn(async (key: string) => {
      written.push(key)
    }),
  }
  return { store, written }
}

/** A real 16 × 12 JPEG carrying a camera and a GPS position (the storage tests' fixture). */
const jpeg = async () => JPEG

const media = (extra: Doc = {}): Doc => ({
  id: 7,
  assetId: ASSET,
  filename: 'ibu-sari-at-home.jpg',
  prefix: 'uploads',
  subject: 'work',
  derivatives: { status: 'pending', version: null },
  iiif: { status: 'none' },
  ...extra,
})

describe('the upload hook', () => {
  const req = (file = true) =>
    ({
      file: file ? { name: 'x.jpg' } : undefined,
      payload: { logger: { info: vi.fn() } },
    }) as unknown as PayloadRequest
  const call = (hook: ReturnType<typeof derivativesAfterUploadWith>, args: Doc) =>
    hook({ collection: {} as never, operation: 'create', data: {}, ...args } as never)

  it('schedules one run after the response for a new file, and returns the doc', async () => {
    const deferred: (() => Promise<unknown>)[] = []
    const run = vi.fn(async () => 'ran')
    const hook = derivativesAfterUploadWith((task) => deferred.push(task), run)
    const doc = media()
    expect(call(hook, { doc, previousDoc: {}, req: req(), context: {} })).toBe(doc)
    expect(run).not.toHaveBeenCalled()
    expect(deferred).toHaveLength(1)
    await deferred[0]!()
    expect(run).toHaveBeenCalledWith(expect.anything(), 7)
  })

  it('schedules nothing for an edit without a file, the pipeline’s own write, or a CLI', () => {
    const defer = vi.fn()
    const hook = derivativesAfterUploadWith(defer, vi.fn())
    const doc = media()
    call(hook, { doc, previousDoc: doc, req: req(false), context: {} })
    call(hook, { doc, previousDoc: {}, req: req(), context: { [PIPELINE_CONTEXT_KEY]: true } })
    call(hook, { doc, previousDoc: {}, req: req(), context: invalidationBatch().context() })
    expect(COLLECTOR_KEY in invalidationBatch().context()).toBe(true)
    expect(defer).not.toHaveBeenCalled()
  })

  it('never fails the upload when there is no request to run after', () => {
    const hook = derivativesAfterUploadWith(() => {
      throw new Error('`after` was called outside a request scope')
    }, vi.fn())
    const doc = media()
    expect(call(hook, { doc, previousDoc: {}, req: req(), context: {} })).toBe(doc)
  })

  it('runs one pipeline at a time', async () => {
    const order: string[] = []
    const slow = serially(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      order.push('first')
    })
    const fast = serially(async () => {
      order.push('second')
    })
    await Promise.all([slow, fast])
    expect(order).toEqual(['first', 'second'])
  })
})

describe('deriveMedia', () => {
  it('publishes, records the fields the loaders read, and expires the placing records', async () => {
    const { payload, updates } = fakePayload(media(), {
      works: [{ workUid: 'IG-000123' }],
      products: [{ id: 41 }],
    })
    const { store, written } = fakeStore(await jpeg())
    const batch = invalidationBatch()
    const outcome = await deriveMedia(payload, 7, {
      store,
      mediaPublicUrl: BASE,
      context: batch.context(),
    })
    expect(outcome).toMatchObject({ status: 'ready', tiles: 'none' })
    expect(store.read).toHaveBeenCalledWith('uploads/ibu-sari-at-home.jpg')
    expect(written.every((key) => key.startsWith(`derivatives/v1/${ASSET}/`))).toBe(true)
    expect(updates).toHaveLength(1)
    expect(updates[0]!.data).toMatchObject({
      derivatives: { status: 'ready', version: DERIVATIVE_VERSION },
      iiif: { status: 'none' },
    })
    expect(JSON.stringify(updates[0]!.where)).toContain(ASSET)
    expect(updates[0]!.context[PIPELINE_CONTEXT_KEY]).toBe(true)
    expect(batch.pending).toEqual(['work:IG-000123', 'product:41'])
  })

  it('records the displayed size when Payload measured the file on its side', async () => {
    // The fixture shows 16 × 12; a record measured before EXIF orientation says 12 × 16.
    const sideways = fakePayload(media({ width: 12, height: 16 }))
    const { store } = fakeStore(await jpeg())
    await deriveMedia(sideways.payload, 7, { store, mediaPublicUrl: BASE })
    expect(sideways.updates[0]!.data).toMatchObject({ width: 16, height: 12 })
    const upright = fakePayload(media({ width: 16, height: 12 }))
    await deriveMedia(upright.payload, 7, { store, mediaPublicUrl: BASE })
    expect(upright.updates[0]!.data).not.toHaveProperty('width')
  })

  it('stays ready when the placing records cannot be expired', async () => {
    const { payload, raw, updates, logged } = fakePayload(media())
    raw.find.mockRejectedValue(new Error('Failed query: connection timeout'))
    const warned: unknown[] = []
    ;(raw.logger as Record<string, unknown>).warn = (entry: unknown) => warned.push(entry)
    const { store } = fakeStore(await jpeg())
    const outcome = await deriveMedia(payload, 7, { store, mediaPublicUrl: BASE })
    expect(outcome).toMatchObject({ status: 'ready' })
    expect(updates).toHaveLength(1)
    expect(updates[0]!.data).toMatchObject({ derivatives: { status: 'ready' } })
    expect(logged).toEqual([])
    expect(warned).toHaveLength(1)
  })

  it('leaves an up-to-date record alone unless forced', async () => {
    const ready = media({
      derivatives: { status: 'ready', version: DERIVATIVE_VERSION },
      iiif: { status: 'none' },
    })
    expect(isUpToDate(ready)).toBe(true)
    const { payload } = fakePayload(ready)
    const { store } = fakeStore(await jpeg())
    const deps = { store, mediaPublicUrl: BASE, context: invalidationBatch().context() }
    expect(await deriveMedia(payload, 7, deps)).toEqual({ status: 'up-to-date' })
    expect(store.read).not.toHaveBeenCalled()
    expect(await deriveMedia(payload, 7, { ...deps, force: true })).toMatchObject({
      status: 'ready',
    })
  })

  it('never records over a file replaced meanwhile', async () => {
    const doc = media()
    const { payload, raw } = fakePayload(doc)
    raw.update.mockResolvedValueOnce({ docs: [] })
    const { store } = fakeStore(await jpeg())
    const outcome = await deriveMedia(payload, 7, { store, mediaPublicUrl: BASE })
    expect(outcome).toEqual({ status: 'skipped', reason: 'superseded' })
  })

  it('skips without a bucket, and without a file', async () => {
    const { payload } = fakePayload(media())
    expect(await deriveMedia(payload, 7, { store: null, mediaPublicUrl: BASE })).toEqual({
      status: 'skipped',
      reason: 'no-storage',
    })
    const bare = fakePayload(media({ assetId: null }))
    expect(await deriveMedia(bare.payload, 7, { store: null })).toEqual({
      status: 'skipped',
      reason: 'no-file',
    })
  })

  it('records a failure, retryable, without throwing or logging the file name', async () => {
    const { payload, updates, logged } = fakePayload(media())
    const { store } = fakeStore(null)
    const outcome = await deriveMedia(payload, 7, { store, mediaPublicUrl: BASE })
    expect(outcome.status).toBe('failed')
    expect(updates[0]!.data).toMatchObject({
      derivatives: { status: 'failed' },
      iiif: { status: 'failed' },
    })
    expect(logged).toHaveLength(1)
    expect(JSON.stringify(logged)).not.toContain('ibu-sari')
    expect(logged[0]).toMatchObject({ mediaId: 7, assetId: ASSET, retryable: true })
  })

  it('refuses an upload that is not a media image, and says retrying cannot help', async () => {
    const { payload, logged } = fakePayload(media())
    const { store, written } = fakeStore(Buffer.from('<svg onload="x()"/>'))
    expect((await deriveMedia(payload, 7, { store, mediaPublicUrl: BASE })).status).toBe('failed')
    expect(written).toEqual([])
    expect(logged[0]).toMatchObject({ retryable: false })
  })
})
