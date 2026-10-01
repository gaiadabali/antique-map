/**
 * `masters` on the outlet — the synthetic brand's emporium storefront, with its outlet masters key
 * — on a real database and MinIO (the 8.3 review's finding 4; `../media/test-stack.test-support`,
 * skips without CMS_TEST_POSTGRES_URL and STORAGE_TEST_ENDPOINT): an outlet records no capture
 * and only its own print files, by any API, and imports no intake batch.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { masterKey, printFileKey, type IntakeManifest } from '@engine/media/contract'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  asRoot,
  asUser,
  MASTERS_BUCKET,
  stackAvailable,
  startStack,
  type Stack,
} from '../media/test-stack.test-support'
import { importIntakeManifest } from './intake-import'

const PASSWORD = 'storage-test-password-1'
const run = randomUUID().slice(0, 8)
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe.skipIf(!stackAvailable)('masters on the outlet (on Postgres and MinIO)', () => {
  let stack: Stack
  let staff: string
  const stored: string[] = []

  beforeAll(async () => {
    stack = await startStack({
      storefront: 'emporium',
      mastersUser: 'test-masters-outlet',
      connect: (config, key) => getPayload({ config, key }),
    })
    await stack.payload.create({
      collection: 'users',
      data: { email: 'shop@storage.test', name: 'Shop', password: PASSWORD } as never,
    })
    staff = await stack.login('shop@storage.test', PASSWORD)
  }, 180_000)

  afterAll(async () => {
    for (const key of stored) await asRoot(MASTERS_BUCKET).remove(key)
    await stack?.stop()
  }, 60_000)

  const api = (method: string, route: string, json?: unknown) =>
    stack.rest(method, route, { token: staff, json })
  const record = (kind: string, storageKey: string, bytes: Buffer, extra: object = {}) => ({
    kind,
    storageKey,
    checksum: sha(bytes),
    ...extra,
  })

  it('refuses a capture record, even for a file the origin really holds', async () => {
    const bytes = randomBytes(64)
    const key = masterKey(`w-${run}`, sha(bytes), 'tif')
    expect(await asUser(MASTERS_BUCKET, 'test-masters-origin').put(key, bytes)).toBe('written')
    stored.push(key)
    const response = await api(
      'POST',
      '/api/masters',
      record('capture', key, bytes, { role: 'recto', provenance: 'photograph' }),
    )
    expect(response.status).toBe(400)
    expect(JSON.stringify(await response.json())).toMatch(/keeps no captures/)
    const step = await api('POST', '/api/masters/upload-url', {
      kind: 'capture',
      checksum: sha(bytes),
      extension: 'tif',
      byteSize: bytes.length,
      workUid: `w-${run}`,
    })
    expect(step.status).toBe(403)
  }, 60_000)

  it("refuses another brand's print file, even one that is in the bucket", async () => {
    const bytes = randomBytes(64)
    const key = printFileKey('someone-else', 'd-1', sha(bytes), 'tif')
    expect(await asRoot(MASTERS_BUCKET).put(key, bytes)).toBe('written')
    stored.push(key)
    const asItsOwn = await api('POST', '/api/masters', record('print-file', key, bytes))
    expect(asItsOwn.status).toBe(400)
    expect(JSON.stringify(await asItsOwn.json())).toMatch(/print-files\/test\//)
    const asTheirs = await api(
      'POST',
      '/api/masters',
      record('print-file', key, bytes, { brand: 'someone-else' }),
    )
    expect(asTheirs.status).toBe(400)
    expect(JSON.stringify(await asTheirs.json())).toMatch(/its own print files only/)
  }, 60_000)

  it('records its own print file, uploaded straight to the bucket, and keeps its brand', async () => {
    const bytes = randomBytes(2048)
    const step = await api('POST', '/api/masters/upload-url', {
      kind: 'print-file',
      checksum: sha(bytes),
      extension: 'tif',
      byteSize: bytes.length,
      designUid: `d-${run}`,
    })
    expect(step.status).toBe(200)
    const {
      storageKey,
      upload,
      record: made,
    } = (await step.json()) as {
      storageKey: string
      upload: { url: string; headers: Record<string, string> }
      record: object
    }
    expect(storageKey).toBe(printFileKey('test', `d-${run}`, sha(bytes), 'tif'))
    const put = await fetch(upload.url, { method: 'PUT', body: bytes, headers: upload.headers })
    expect(put.status).toBe(200)
    stored.push(storageKey)
    const created = await api('POST', '/api/masters', made)
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number; brand: string } }
    expect(doc.brand).toBe('test')
    expect((await api('PATCH', `/api/masters/${doc.id}`, { brand: 'other' })).status).toBe(400)
  }, 60_000)

  it('imports no intake batch: the archive keeps captures', async () => {
    const manifest = {
      brand: 'test',
      batch: `showroom-${run}`,
      receivedAt: '2026-10-01T09:00:00+08:00',
      entries: [],
    } as unknown as IntakeManifest
    await expect(importIntakeManifest(stack.payload, manifest)).rejects.toThrow(/keeps no captures/)
  })
})
