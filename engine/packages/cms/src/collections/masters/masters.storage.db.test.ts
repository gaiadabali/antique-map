/**
 * `masters` on a real database and the dev stack's MinIO (TASKS.md 8.3.b, 8.3.e, 8.3.f): a master's
 * bytes go straight to the private bucket by presigned PUT, never through the app; the record is
 * made only for the file the bucket holds; it has no public URL; the intake import is idempotent.
 * Runs with CMS_TEST_POSTGRES_URL and STORAGE_TEST_ENDPOINT set (`../media/test-stack.test-support`).
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { intakeMasterKey, type IntakeManifest } from '@engine/media/contract'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  asRoot,
  MASTERS_BUCKET,
  stackAvailable,
  startStack,
  type Stack,
} from '../media/test-stack.test-support'
import { importIntakeManifest } from './intake-import'

const PASSWORD = 'storage-test-password-1'
const run = randomUUID().slice(0, 8)
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe.skipIf(!stackAvailable)('masters, in the private bucket (on Postgres and MinIO)', () => {
  let stack: Stack
  let staff: string
  let analyst: string
  const sentToApp: number[] = []
  const stored: string[] = []
  // The stack's own multipart folder, so a file left behind by any request is seen (8.3.h, 8.3.i).
  const tempDir = mkdtempSync(path.join(tmpdir(), 'cms-masters-temp-files-'))

  beforeAll(async () => {
    stack = await startStack({
      storefront: 'gallery',
      mastersUser: 'test-masters-origin',
      connect: (config, key) => getPayload({ config, key }),
      tempFileDir: tempDir,
    })
    for (const [email, roles] of [
      ['owner@storage.test', ['admin']],
      ['cataloguer@storage.test', ['cataloguer']],
      ['analyst@storage.test', ['analyst']],
    ] as const) {
      await stack.payload.create({
        collection: 'users',
        data: { email, name: email, roles: [...roles], password: PASSWORD } as never,
      })
    }
    staff = await stack.login('cataloguer@storage.test', PASSWORD)
    analyst = await stack.login('analyst@storage.test', PASSWORD)
  }, 180_000)

  afterAll(async () => {
    for (const key of stored) await asRoot(MASTERS_BUCKET).remove(key)
    await stack?.stop()
    rmSync(tempDir, { recursive: true, force: true })
  }, 60_000)

  /** A JSON request to the app, its body's size counted. */
  const api = (method: string, route: string, json?: unknown, token = staff) => {
    if (json !== undefined) sentToApp.push(Buffer.byteLength(JSON.stringify(json)))
    return stack.rest(method, route, { token, json })
  }
  const declare = (bytes: Buffer, extra: object = { workUid: `w-${run}` }) => ({
    kind: 'capture',
    checksum: sha(bytes),
    extension: 'tif',
    byteSize: bytes.length,
    ...extra,
  })

  it('uploads by presigned PUT straight to the bucket, never through the app server', async () => {
    const bytes = randomBytes(256 * 1024)
    const step = await api('POST', '/api/masters/upload-url', declare(bytes))
    expect(step.status).toBe(200)
    const { storageKey, upload, record } = (await step.json()) as {
      storageKey: string
      upload: { url: string; headers: Record<string, string> }
      record: Record<string, unknown>
    }
    expect(storageKey).toBe(`masters/w-${run}/${sha(bytes)}.tif`)
    // The PUT goes to the storage's own origin, not the app's.
    expect(new URL(upload.url).origin).toBe(stack.env.S3_ENDPOINT)
    const put = await fetch(upload.url, { method: 'PUT', body: bytes, headers: upload.headers })
    expect(put.status).toBe(200)
    stored.push(storageKey)
    const made = await api('POST', '/api/masters', {
      ...record,
      role: 'recto',
      provenance: 'photograph',
    })
    expect(made.status).toBe(201)
    const { doc } = (await made.json()) as { doc: Record<string, unknown> }
    expect(doc).toMatchObject({
      checksum: sha(bytes),
      byteSize: bytes.length,
      contentType: 'image/tiff',
    })
    expect(doc.brand).toBe('test')
    // Everything the app received is a few small JSON bodies; the file is 256 KiB.
    expect(Math.max(...sentToApp)).toBeLessThan(1024)
    expect(sentToApp.reduce((a, b) => a + b, 0)).toBeLessThan(bytes.length / 100)
    // No public URL: none on the record, none from the bucket, and the record is staff-only.
    expect(Object.keys(doc)).not.toContain('url')
    expect((await fetch(`${stack.env.S3_ENDPOINT}/${MASTERS_BUCKET}/${storageKey}`)).status).toBe(
      403,
    )
    expect((await stack.rest('GET', `/api/masters/${String(doc.id)}`)).status).toBe(403)
    // Once recorded, the same file is not signed for again.
    expect((await api('POST', '/api/masters/upload-url', declare(bytes))).status).toBe(409)
  }, 60_000)

  it('is a plain collection: no upload, so a file sent along with a record is never taken', async () => {
    expect(stack.payload.collections.masters?.config.upload).toBeFalsy()
    expect(stack.payload.collections.masters).toBeDefined()
    const bytes = randomBytes(1024)
    const storageKey = `masters/w-${run}/${sha(bytes)}.tif`
    const form = new FormData()
    form.set(
      '_payload',
      JSON.stringify({ ...declare(bytes), storageKey, role: 'recto', provenance: 'photograph' }),
    )
    form.set('file', new Blob([new Uint8Array(bytes)]), 'sneaked-in.tif')
    const response = await stack.rest('POST', '/api/masters', { token: staff, form })
    expect(response.status).toBe(400)
    expect(JSON.stringify(await response.json())).toMatch(/no file at/)
    expect(await asRoot(MASTERS_BUCKET).size(storageKey)).toBeNull()
    // Dropped by the collection, and its temporary copy removed by the request's clean-up.
    expect(readdirSync(tempDir)).toEqual([])
    const signing = new FormData()
    signing.set('_payload', JSON.stringify(declare(bytes)))
    signing.set('file', new Blob([new Uint8Array(bytes)]), 'sneaked-in.tif')
    const signed = await stack.rest('POST', '/api/masters/upload-url', {
      token: staff,
      form: signing,
    })
    expect(signed.status).toBe(200)
    expect(await asRoot(MASTERS_BUCKET).size(storageKey)).toBeNull()
    expect(readdirSync(tempDir)).toEqual([])
  }, 60_000)

  it('refuses a record for a file the bucket lacks, or holds with other bytes', async () => {
    const missing = randomBytes(64)
    const none = await api('POST', '/api/masters', {
      ...declare(missing),
      storageKey: `masters/w-${run}/${sha(missing)}.tif`,
      role: 'recto',
      provenance: 'photograph',
    })
    expect(none.status).toBe(400)
    expect(JSON.stringify(await none.json())).toMatch(/no file at/)
    const bytes = randomBytes(64)
    const { upload } = (await (
      await api('POST', '/api/masters/upload-url', declare(bytes))
    ).json()) as {
      upload: { url: string; headers: Record<string, string> }
    }
    const tampered = await fetch(upload.url, {
      method: 'PUT',
      body: randomBytes(64),
      headers: upload.headers,
    })
    expect(tampered.status).toBe(400)
    const unsigned = await fetch(upload.url, { method: 'PUT', body: bytes })
    expect(unsigned.ok).toBe(false)
  }, 60_000)

  it('signs only for staff who keep the catalogue, once per file', async () => {
    const bytes = randomBytes(32)
    expect(
      (await stack.rest('POST', '/api/masters/upload-url', { json: declare(bytes) })).status,
    ).toBe(401)
    expect((await api('POST', '/api/masters/upload-url', declare(bytes), analyst)).status).toBe(403)
    const tooBig = { ...declare(bytes), byteSize: 6 * 1024 ** 3 }
    expect((await api('POST', '/api/masters/upload-url', tooBig)).status).toBe(400)
    expect(
      (await api('POST', '/api/masters/upload-url', { ...declare(bytes), extension: 'exe' }))
        .status,
    ).toBe(400)
    expect((await api('POST', '/api/masters', {})).status).toBe(400)
  }, 60_000)

  it('keeps what a master is: its checksum, its kind, and its key against a request', async () => {
    const { docs } = await stack.payload.find({ collection: 'masters', limit: 1, depth: 0 })
    const id = docs[0]!.id
    for (const change of [
      { checksum: 'b'.repeat(64) },
      { kind: 'print-file' },
      { storageKey: 'masters/x/y.tif' },
      { brand: 'test-emporium' },
      { role: 'verso' },
      { provenance: 'composite' },
    ]) {
      expect((await api('PATCH', `/api/masters/${id}`, change)).status).toBe(400)
    }
    // What intake set, an admin may correct; the brand and the checksum, nobody.
    const owner = await stack.login('owner@storage.test', PASSWORD)
    expect((await api('PATCH', `/api/masters/${id}`, { role: 'detail' }, owner)).status).toBe(200)
    expect(
      (await api('PATCH', `/api/masters/${id}`, { brand: 'test-emporium' }, owner)).status,
    ).toBe(400)
    const box = await api('PATCH', `/api/masters/${id}`, {
      widthPx: 100,
      heightPx: 80,
      objectBox: { x: 10, y: 10, width: 95, height: 50 },
    })
    expect(JSON.stringify(await box.json())).toMatch(/inside the 100 × 80 px frame/)
    const fits = await api('PATCH', `/api/masters/${id}`, {
      widthPx: 100,
      heightPx: 80,
      objectBox: { x: 5, y: 5, width: 90, height: 70 },
      objectPpi: 300,
    })
    expect(fits.status).toBe(200)
  }, 60_000)

  it('imports an intake manifest once per checksum, however often it runs (8.3.f)', async () => {
    const batch = `pilot-${run}`
    const files = [randomBytes(128), randomBytes(96)]
    const entries = files.map((bytes, i) => ({
      checksum: sha(bytes),
      extension: 'cr3',
      receivedAs: `M-9999_recto_0${i + 1}.cr3`,
      reference: 'M.9999',
      role: i === 0 ? 'recto' : 'reference',
      provenance: 'photograph',
      widthPx: 6000,
      heightPx: 4000,
      objectBox: i === 0 ? { x: 120, y: 80, width: 5700, height: 3800 } : null,
      objectPpi: i === 0 ? 312 : null,
      captureTier: 'better',
      verdict: 'pass',
      retouching: 'none',
      notes: ['print ceiling 60 cm'],
    }))
    // Copied in with the origin's key before any record could exist — so no stored SHA-256.
    for (const [i, bytes] of files.entries()) {
      const key = intakeMasterKey('test', batch, entries[i]!.checksum, 'cr3')
      expect(await asRoot(MASTERS_BUCKET).put(key, bytes)).toBe('written')
      stored.push(key)
    }
    const missing = {
      ...entries[0]!,
      checksum: sha(randomBytes(8)),
      receivedAs: 'never-arrived.cr3',
    }
    const manifest = {
      brand: 'test',
      batch,
      receivedAt: '2026-10-01T09:00:00+08:00',
      entries: [...entries, missing],
    } as unknown as IntakeManifest
    const first = await importIntakeManifest(stack.payload, manifest)
    expect(first.map((o) => o.outcome)).toEqual(['created', 'created', 'failed'])
    expect(first[2]!.reason).toMatch(/no file at/)
    const again = await importIntakeManifest(stack.payload, manifest)
    expect(again.map((o) => o.outcome)).toEqual(['existing', 'existing', 'failed'])
    // Only a brand this archive keeps — its own, or its sister's.
    await expect(
      importIntakeManifest(stack.payload, { ...manifest, brand: 'stranger' }),
    ).rejects.toThrow(/not "stranger"/)
    const { docs, totalDocs } = await stack.payload.find({
      collection: 'masters',
      where: { 'intake.batch': { equals: batch } },
      depth: 0,
    })
    expect(totalDocs).toBe(2)
    expect(docs.find((d) => d.role === 'recto')).toMatchObject({
      storageKey: intakeMasterKey('test', batch, entries[0]!.checksum, 'cr3'),
      objectPpi: 312,
      intake: { verdict: 'pass', reference: 'M.9999', notes: [{ note: 'print ceiling 60 cm' }] },
    })
  }, 60_000)
})
