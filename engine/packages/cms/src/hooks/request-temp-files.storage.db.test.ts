/**
 * `media` still uploads, and leaves no temp file, with the endpoint clean-up on (TASKS.md 8.3.h):
 * through Payload's REST handler, on a real database and the dev stack's MinIO, with the files
 * streamed to a folder of the test's own (`../collections/media/test-stack.test-support`). An
 * upload, a replacement, a bulk replacement (Payload copies the file per document), a refused
 * upload and an anonymous one: each leaves the folder empty, and the stored file is the one sent.
 *
 * Runs when both CMS_TEST_POSTGRES_URL and STORAGE_TEST_ENDPOINT are set, after the local storage
 * policies are applied (`pnpm --filter @engine/media storage:policies`); otherwise it skips.
 */
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  asRoot,
  form,
  jpeg,
  MEDIA_BUCKET,
  stackAvailable,
  startStack,
  valid,
  type Stack,
} from '../collections/media/test-stack.test-support'

const PASSWORD = 'temp-files-storage-test-1'

describe.skipIf(!stackAvailable)('media uploads leave no temp file (on Postgres and MinIO)', () => {
  let stack: Stack
  let staff: string
  const tempDir = mkdtempSync(path.join(tmpdir(), 'cms-temp-files-media-'))
  const stored = new Set<string>()
  const leftovers = () => readdirSync(tempDir)

  beforeAll(async () => {
    stack = await startStack({
      connect: (config, key) => getPayload({ config, key }),
      tempFileDir: tempDir,
    })
    await stack.payload.create({
      collection: 'users',
      data: { email: 'owner@temp-files.test', name: 'Owner', password: PASSWORD } as never,
    })
    await stack.payload.create({
      collection: 'users',
      data: {
        email: 'cataloguer@temp-files.test',
        name: 'Cataloguer',
        role: 'editor',
        password: PASSWORD,
      } as never,
    })
    staff = await stack.login('cataloguer@temp-files.test', PASSWORD)
  }, 180_000)

  afterAll(async () => {
    for (const key of stored) await asRoot(MEDIA_BUCKET).remove(key)
    await stack?.stop()
    rmSync(tempDir, { recursive: true, force: true })
  }, 60_000)

  const send = (
    method: string,
    route: string,
    bytes: Buffer,
    data: object = valid,
    token = staff,
  ) =>
    stack.rest(method, route, {
      token,
      form: form(data, { bytes, name: 'M-9999_recto_01.jpg', type: 'image/jpeg' }),
    })
  const keyOf = (doc: Record<string, unknown>) => `${String(doc.prefix)}/${String(doc.filename)}`

  it('an upload is stored as sent, and leaves nothing', async () => {
    const bytes = jpeg('temp-files-upload')
    const response = await send('POST', '/api/media', bytes)
    expect(response.status).toBe(201)
    const { doc } = (await response.json()) as { doc: Record<string, unknown> }
    stored.add(keyOf(doc))
    expect(await asRoot(MEDIA_BUCKET).size(keyOf(doc))).toBe(bytes.length)
    expect(leftovers()).toEqual([])
  }, 60_000)

  it('a replacement, by id and in bulk, leaves nothing', async () => {
    const created = await send('POST', '/api/media', jpeg('temp-files-before'))
    const { doc } = (await created.json()) as { doc: Record<string, unknown> }
    stored.add(keyOf(doc))
    const byId = await send('PATCH', `/api/media/${String(doc.id)}`, jpeg('temp-files-by-id'), {})
    expect(byId.status).toBe(200)
    stored.add(keyOf(((await byId.json()) as { doc: Record<string, unknown> }).doc))
    const bulk = await send(
      'PATCH',
      `/api/media?where[id][equals]=${String(doc.id)}`,
      jpeg('temp-files-in-bulk'),
      {},
    )
    expect(bulk.status).toBe(200)
    for (const each of ((await bulk.json()) as { docs: Record<string, unknown>[] }).docs) {
      stored.add(keyOf(each))
    }
    expect(leftovers()).toEqual([])
  }, 60_000)

  it('a refused upload and an anonymous one leave nothing', async () => {
    const refused = await send('POST', '/api/media', jpeg('temp-files-no-alt'), { role: 'recto' })
    expect(refused.status).toBe(400)
    const anonymous = await send('POST', '/api/media', jpeg('temp-files-anonymous'), valid, '')
    expect(anonymous.status).toBe(403)
    expect(leftovers()).toEqual([])
  }, 60_000)
})
