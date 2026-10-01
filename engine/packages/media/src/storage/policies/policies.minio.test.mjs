// The applied policies against a real MinIO (TASKS.md 8.3.c, 8.3.e, 8.3.g, 8.3.i): what each key and an
// anonymous request may and may not do. Runs when STORAGE_TEST_ENDPOINT names the dev stack's S3
// endpoint (http://localhost:9000), after `pnpm --filter @engine/media storage:policies` has
// applied the local plan; STORAGE_TEST_ROOT_USER / _SECRET default to the dev container's root.
// Without the endpoint it skips; with it, a refused or missing key is a failure, not a skip.
import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { afterAll, describe, expect, it } from 'vitest'

import { derivativeKey, iiifFullKey, iiifPublicKey, masterKey, printFileKey } from '../../contract'
import { s3MastersStore } from '../masters-store'
import { UPLOADS_PREFIX } from '../prefixes'
import { CORS_NOT_IMPLEMENTED, mastersCorsRules } from './cors.mjs'
import { deriveLocalSecret } from './plan.mjs'

const { fetch } = globalThis
const endpoint = process.env.STORAGE_TEST_ENDPOINT
const rootUser = process.env.STORAGE_TEST_ROOT_USER || 'minioadmin'
const rootSecret = process.env.STORAGE_TEST_ROOT_SECRET || 'minioadmin'
const here = dirname(fileURLToPath(import.meta.url))
const plan = JSON.parse(readFileSync(join(here, '..', 'plans', 'local.json'), 'utf8'))
const MASTERS = plan.mastersBucket
const MEDIA = 'test-media'
const OTHER_MEDIA = 'ig-media'

const client = (accessKeyId, secretAccessKey) =>
  new S3Client({
    endpoint: endpoint ?? 'http://skipped.invalid',
    region: 'auto',
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  })
const as = (user) => client(user, deriveLocalSecret(rootSecret, user))

const run = `policy-test-${randomUUID().slice(0, 8)}`
const sha = (text) => createHash('sha256').update(text).digest('hex')
const written = []

async function put(s3, Bucket, Key, text = `body of ${Key}`) {
  try {
    await s3.send(new PutObjectCommand({ Bucket, Key, Body: text }))
    written.push({ Bucket, Key })
    return 'written'
  } catch (error) {
    return error.name ?? String(error)
  }
}
async function get(s3, Bucket, Key) {
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket, Key }))
    await object.Body.transformToString()
    return 'read'
  } catch (error) {
    return error.name ?? String(error)
  }
}
async function remove(s3, Bucket, Key) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket, Key }))
    return 'deleted'
  } catch (error) {
    return error.name ?? String(error)
  }
}
const anonymous = async (method, bucket, key) =>
  (
    await fetch(`${endpoint}/${bucket}/${key}`, {
      method,
      ...(method === 'PUT' ? { body: 'x' } : {}),
    })
  ).status

describe.skipIf(!endpoint)('the applied storage policies, on MinIO', () => {
  const root = client(rootUser, rootSecret)
  const outlet = as('test-masters-outlet')
  const origin = as('test-masters-origin')
  const media = as('test-media-writer')
  const capture = masterKey(`${run}-w1`, sha('capture'), 'cr3')
  const printFile = printFileKey('test', `${run}-d1`, sha('print'), 'tif')

  afterAll(async () => {
    for (const { Bucket, Key } of written) await remove(root, Bucket, Key)
  })

  it("the origin's web key writes captures and its own print files, and deletes nothing", async () => {
    expect(await put(origin, MASTERS, capture)).toBe('written')
    expect(await get(origin, MASTERS, capture)).toBe('read')
    expect(await put(origin, MASTERS, printFileKey('test', `${run}-d0`, sha('p0'), 'tif'))).toBe(
      'written',
    )
    expect(await put(origin, MASTERS, printFileKey('other-brand', 'd-1', sha('p1'), 'tif'))).toBe(
      'AccessDenied',
    )
    // The archive is irreplaceable: its web process cannot erase a capture.
    expect(await remove(origin, MASTERS, capture)).toBe('AccessDenied')
    expect(await get(origin, MASTERS, capture)).toBe('read')
  })

  it("the shop's masters key writes only its own print files (8.3.c)", async () => {
    expect(await put(outlet, MASTERS, printFile)).toBe('written')
    expect(await put(outlet, MASTERS, printFileKey('other-brand', 'd-2', sha('p2'), 'tif'))).toBe(
      'AccessDenied',
    )
    expect(await put(outlet, MASTERS, `print-files/${run}.tif`)).toBe('AccessDenied')
    expect(await put(outlet, MASTERS, masterKey(`${run}-w2`, sha('x'), 'cr3'))).toBe('AccessDenied')
    expect(await put(outlet, MASTERS, `masters/intake/test/${run}/${sha('y')}.cr3`)).toBe(
      'AccessDenied',
    )
    expect(await put(outlet, MASTERS, `${run}/anywhere-else.txt`)).toBe('AccessDenied')
    expect(await remove(outlet, MASTERS, capture)).toBe('AccessDenied')
    expect(await get(outlet, MASTERS, capture)).toBe('read')
    expect(await put(outlet, MEDIA, `${UPLOADS_PREFIX}/${run}.jpg`)).toBe('AccessDenied')
  })

  it('a presigned PUT signed with the shop key is refused by the storage outside print-files/', async () => {
    const store = s3MastersStore({ endpoint, region: 'auto', bucket: MASTERS }, outlet)
    const body = Buffer.from(`capture ${run}`)
    const checksum = sha(body)
    const send = async (key) => {
      const signed = await store.presignPut({
        key,
        checksum,
        byteSize: body.length,
        contentType: 'image/tiff',
      })
      const response = await fetch(signed.url, { method: 'PUT', body, headers: signed.headers })
      if (response.ok) written.push({ Bucket: MASTERS, Key: key })
      return response.status
    }
    expect(await send(masterKey(`${run}-w3`, checksum, 'tif'))).toBe(403)
    expect(await send(printFileKey('test', `${run}-d2`, checksum, 'tif'))).toBe(200)
  })

  it('a media key writes its own bucket only', async () => {
    expect(await put(media, MEDIA, `${UPLOADS_PREFIX}/${run}/original.jpg`)).toBe('written')
    expect(await put(media, OTHER_MEDIA, `${UPLOADS_PREFIX}/${run}/original.jpg`)).toBe(
      'AccessDenied',
    )
    expect(await put(media, MASTERS, capture)).toBe('AccessDenied')
    expect(await get(media, MASTERS, capture)).toBe('AccessDenied')
  })

  it('anonymously: derivatives and tiles are readable, an original and a master are not (8.3.g)', async () => {
    const derivative = derivativeKey(sha(run).slice(0, 32), 320, 'webp')
    const tile = `iiif/${sha(run).slice(0, 32)}/info.json`
    const original = `${UPLOADS_PREFIX}/${run}/full-resolution.jpg`
    for (const key of [derivative, tile, original])
      expect(await put(root, MEDIA, key)).toBe('written')
    expect(await anonymous('GET', MEDIA, derivative)).toBe(200)
    expect(await anonymous('GET', MEDIA, tile)).toBe(200)
    expect(await anonymous('GET', MEDIA, original)).toBe(403)
    expect(await anonymous('GET', MASTERS, capture)).toBe(403)
    expect(await anonymous('GET', MASTERS, printFile)).toBe(403)
    expect(await anonymous('PUT', MEDIA, `derivatives/${run}.webp`)).toBe(403)
    expect(await anonymous('GET', MEDIA, '')).toBe(403)
  })

  it('anonymously: the uncapped pyramid under iiif-full/ is refused, beside the public iiif/ (8.3.i)', async () => {
    const id = sha(`${run}-pyramid`).slice(0, 32)
    // The brand writes its own uncapped pyramid with its media key (C9 v1.6 iiifFullKey()).
    const full = `${iiifFullKey('test', id)}/info.json`
    const fullTile = `${iiifFullKey('test', id)}/full/max/0/default.jpg`
    expect(await put(media, MEDIA, full)).toBe('written')
    expect(await put(media, MEDIA, fullTile)).toBe('written')
    const capped = `${iiifPublicKey(id)}/info.json`
    const derivative = derivativeKey(id, 640, 'webp')
    for (const key of [capped, derivative]) expect(await put(media, MEDIA, key)).toBe('written')
    expect(await anonymous('GET', MEDIA, full)).toBe(403)
    expect(await anonymous('GET', MEDIA, fullTile)).toBe(403)
    expect(await anonymous('HEAD', MEDIA, full)).toBe(403)
    // `iiif/` is named with its slash, so `iiif-full/` never matches it; the public parts stay public.
    expect(await anonymous('GET', MEDIA, capped)).toBe(200)
    expect(await anonymous('GET', MEDIA, derivative)).toBe(200)
    // The media key reads its own full pyramid back, for the staff route (C13 fullTiles).
    expect(await get(media, MEDIA, full)).toBe('read')
  })

  // MinIO's community edition implements no per-bucket CORS: PutBucketCors answers NotImplemented
  // and every preflight is answered from the server-wide `api cors_allow_origin` (`*`). There the
  // test skips, as `apply.mjs` warns; against RustFS (TASKS.md 41.2.e) run it with
  // STORAGE_TEST_REQUIRE_BUCKET_CORS=1, so a storage without it fails.
  it("the masters bucket's CORS admits an admin origin's signed PUT, and no other (8.3.i)", async ({
    skip,
  }) => {
    const rules = mastersCorsRules(plan.mastersCors)
    const apply = () =>
      root.send(
        new PutBucketCorsCommand({ Bucket: MASTERS, CORSConfiguration: { CORSRules: rules } }),
      )
    const refusal = await apply().then(
      () => null,
      (error) => error,
    )
    if (refusal && !process.env.STORAGE_TEST_REQUIRE_BUCKET_CORS) {
      expect(`${refusal.name} ${refusal.message}`).toMatch(CORS_NOT_IMPLEMENTED)
      skip(`${endpoint} implements no per-bucket CORS (${refusal.name}); apply.mjs warns locally`)
    }
    expect(refusal).toBeNull()
    await apply() // Whole, so a second run changes nothing.
    const { CORSRules } = await root.send(new GetBucketCorsCommand({ Bucket: MASTERS }))
    expect(CORSRules).toHaveLength(1)
    expect(CORSRules[0]).toMatchObject({
      AllowedMethods: ['PUT'],
      AllowedOrigins: rules[0].AllowedOrigins,
    })
    const preflight = (origin, method = 'PUT') =>
      fetch(`${endpoint}/${MASTERS}/${capture}`, {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': method,
          'access-control-request-headers': 'content-type,x-amz-checksum-sha256',
        },
      })
    const allowed = await preflight('http://localhost:4355')
    expect(allowed.ok).toBe(true)
    expect(allowed.headers.get('access-control-allow-origin')).toMatch(
      /^(http:\/\/localhost:4355|\*)$/,
    )
    expect(allowed.headers.get('access-control-allow-methods')).toMatch(/PUT/)
    for (const refused of [
      await preflight('https://elsewhere.example'),
      await preflight('http://localhost:4355', 'DELETE'),
    ]) {
      expect(refused.headers.get('access-control-allow-origin')).toBeNull()
    }
  })
})
