import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

import { S3Client } from '@aws-sdk/client-s3'
import { describe, expect, it, vi } from 'vitest'

import {
  derivativeKey,
  DERIVATIVE_FORMATS,
  DERIVATIVE_WIDTHS,
  iiifFullKey,
  iiifPublicKey,
  intakeMasterKey,
  masterKey,
  PRESIGN_TTL_SECONDS,
} from '../contract'
import {
  isPublicMediaKey,
  isSha256Hex,
  kindPrefix,
  MASTER_TYPES,
  MASTER_UPLOAD_MAX_BYTES,
  masterContentType,
  masterUploadProblems,
  mastersStorageTarget,
  MEDIA_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_MIME_TYPES,
  mediaStorageTarget,
  MULTIPART_ENVELOPE_BYTES,
  multipartUploadOptions,
  UPLOAD_TEMP_DIR,
  s3ClientConfig,
  s3MastersStore,
  sha256HexToBase64,
  storedChecksumToHex,
  UPLOADS_PREFIX,
} from './index'

const ID = '0123456789abcdef0123456789abcdef'
const SHA = 'a'.repeat(64)

describe('the public part of a media bucket (8.3.g)', () => {
  it('is every derivative and every capped tile C9 names', () => {
    for (const width of DERIVATIVE_WIDTHS) {
      for (const format of DERIVATIVE_FORMATS) {
        expect(isPublicMediaKey(derivativeKey(ID, width, format))).toBe(true)
      }
    }
    expect(isPublicMediaKey(`${iiifPublicKey(ID)}/info.json`)).toBe(true)
    expect(isPublicMediaKey(`${iiifPublicKey(ID)}/0,0,512,512/512,/0/default.jpg`)).toBe(true)
  })

  it("is never an upload's original, the uncapped pyramid, or a key that climbs out", () => {
    expect(isPublicMediaKey(`${UPLOADS_PREFIX}/M-9999_recto_01.jpg`)).toBe(false)
    expect(isPublicMediaKey(`${UPLOADS_PREFIX}/abc/M-9999_recto_01.tif`)).toBe(false)
    expect(isPublicMediaKey(`${iiifFullKey(ID)}/info.json`)).toBe(false)
    expect(isPublicMediaKey('derivatives/../uploads/x.jpg')).toBe(false)
    expect(isPublicMediaKey('/derivatives/v1/x.avif')).toBe(false)
    expect(isPublicMediaKey('derivatives/')).toBe(false)
    expect(isPublicMediaKey('iiif')).toBe(false)
  })
})

describe('upload limits and types (8.3.d)', () => {
  it('keeps a media upload under the CDN limit in front of /admin, and to web rasters', () => {
    expect(MEDIA_UPLOAD_MAX_BYTES).toBeLessThan(100_000_000 - 4_000_000)
    expect([...MEDIA_UPLOAD_MIME_TYPES].sort()).toEqual(
      ['image/avif', 'image/jpeg', 'image/png', 'image/webp'].sort(),
    )
    expect(MEDIA_UPLOAD_MIME_TYPES).not.toContain('image/svg+xml')
    // TIFF is a capture's (DNG and most RAW sniff as TIFF): masters, never media.
    expect(MEDIA_UPLOAD_MIME_TYPES).not.toContain('image/tiff')
  })

  it('parses multipart to the media limit, streaming to the OS temp folder, one file a request', () => {
    const options = multipartUploadOptions()
    expect(options).toMatchObject({
      abortOnLimit: true,
      useTempFiles: true,
      limits: { fileSize: MEDIA_UPLOAD_MAX_BYTES, files: 1 },
      requestSizeLimit: MEDIA_UPLOAD_MAX_BYTES + MULTIPART_ENVELOPE_BYTES,
    })
    expect(options.requestSizeLimit).toBeLessThan(100_000_000)
    expect(options.tempFileDir).toBe(UPLOAD_TEMP_DIR)
    expect(UPLOAD_TEMP_DIR.startsWith(tmpdir())).toBe(true)
  })

  it('takes what the handover accepts as a capture, and only rasters or a PDF as a print file', () => {
    for (const ext of [
      'cr2',
      'cr3',
      'nef',
      'arw',
      'raf',
      'orf',
      'rw2',
      'dng',
      'tif',
      'jpg',
      'heic',
      'png',
      'pdf',
    ]) {
      expect(masterContentType('capture', ext)).not.toBeNull()
    }
    // One kind now: the configurator's print files went with it (TASKS.md 2.4.b).
    expect(Object.keys(MASTER_TYPES)).toEqual(['capture'])
    expect(masterContentType('capture', 'svg')).toBeNull()
    expect(masterContentType('capture', 'exe')).toBeNull()
    expect(masterContentType('capture', 'toString')).toBeNull()
  })

  it('refuses a master too large, empty or of a refused type, in words', () => {
    expect(masterUploadProblems({ kind: 'capture', extension: 'cr3', byteSize: 30e6 })).toEqual([])
    expect(
      masterUploadProblems({
        kind: 'capture',
        extension: 'tif',
        byteSize: MASTER_UPLOAD_MAX_BYTES,
      }),
    ).toEqual([])
    expect(
      masterUploadProblems({
        kind: 'capture',
        extension: 'tif',
        byteSize: MASTER_UPLOAD_MAX_BYTES + 1,
      }),
    ).toEqual([expect.stringMatching(/at most 5\.4 GB/)])
    expect(masterUploadProblems({ kind: 'capture', extension: 'tif', byteSize: 0 })).toHaveLength(1)
    expect(masterUploadProblems({ kind: 'capture', extension: 'tif', byteSize: 1.5 })).toHaveLength(
      1,
    )
    expect(masterUploadProblems({ kind: 'capture', extension: 'svg', byteSize: 10 })).toEqual([
      expect.stringMatching(/cannot be a \.svg file/),
    ])
  })

  it('files every capture under its prefix, as C9 builds the keys', () => {
    expect(masterKey('m-000123', SHA, 'cr3').startsWith(kindPrefix('capture'))).toBe(true)
    expect(intakeMasterKey('pilot-2026-10', SHA, 'cr3').startsWith(kindPrefix('capture'))).toBe(
      true,
    )
  })
})

describe('checksums', () => {
  it("converts between the record's hex and S3's base64, and ignores a composite checksum", () => {
    const hex = 'be8ce94aac5a265a2a0da2642a4bd3fc99e5c523fb667ab5332f0d25e0a065f7'
    const base64 = sha256HexToBase64(hex)
    expect(base64).toHaveLength(44)
    expect(storedChecksumToHex(base64)).toBe(hex)
    expect(storedChecksumToHex(`${base64.slice(0, -1)}-3`)).toBeNull()
    expect(storedChecksumToHex(undefined)).toBeNull()
    expect(isSha256Hex(hex)).toBe(true)
    expect(isSha256Hex(hex.toUpperCase())).toBe(false)
    expect(() => sha256HexToBase64('abc')).toThrow(/64 lower-case hex/)
  })
})

describe('which bucket a process writes', () => {
  const env = {
    S3_ENDPOINT: ' http://localhost:9000 ',
    S3_BUCKET: 'test-media',
    S3_ACCESS_KEY_ID: 'media-key',
    S3_SECRET_ACCESS_KEY: 'media-secret',
    MASTERS_BUCKET: 'archive-masters',
    MASTERS_ACCESS_KEY_ID: 'masters-key',
    MASTERS_SECRET_ACCESS_KEY: 'masters-secret',
  }

  it('reads each bucket with its own key pair, on the one endpoint', () => {
    expect(mediaStorageTarget(env)).toEqual({
      endpoint: 'http://localhost:9000',
      region: 'auto',
      bucket: 'test-media',
      credentials: { accessKeyId: 'media-key', secretAccessKey: 'media-secret' },
    })
    expect(mastersStorageTarget({ ...env, S3_REGION: 'ap-southeast-1' })).toMatchObject({
      bucket: 'archive-masters',
      region: 'ap-southeast-1',
      credentials: { accessKeyId: 'masters-key', secretAccessKey: 'masters-secret' },
    })
    expect(s3ClientConfig(mastersStorageTarget(env)!)).toMatchObject({
      forcePathStyle: true,
      requestHandler: {
        connectionTimeout: 5_000,
        requestTimeout: 120_000,
        throwOnRequestTimeout: true,
      },
    })
  })

  it('is none without a bucket or an endpoint, and no credentials without both halves', () => {
    expect(mastersStorageTarget({ ...env, MASTERS_BUCKET: ' ' })).toBeNull()
    expect(mediaStorageTarget({ ...env, S3_ENDPOINT: undefined })).toBeNull()
    expect(mediaStorageTarget({ ...env, S3_SECRET_ACCESS_KEY: '' })).not.toHaveProperty(
      'credentials',
    )
  })
})

describe('the masters store', () => {
  const target = {
    endpoint: 'http://storage.invalid:9000',
    region: 'auto',
    bucket: 'archive-masters',
    credentials: { accessKeyId: 'k', secretAccessKey: 's' },
  }

  it('signs a PUT whose length and SHA-256 are headers the storage checks, not query parameters', async () => {
    const store = s3MastersStore(target)
    const now = new Date('2026-10-01T08:00:00Z')
    const put = await store.presignPut({
      key: masterKey('m-000123', SHA, 'cr3'),
      checksum: SHA,
      byteSize: 1234,
      contentType: 'image/x-canon-cr3',
      now,
    })
    const url = new URL(put.url)
    expect(url.origin).toBe('http://storage.invalid:9000')
    expect(url.pathname).toBe(`/archive-masters/masters/m-000123/${SHA}.cr3`)
    const signed = url.searchParams.get('X-Amz-SignedHeaders')!.split(';')
    expect(signed).toEqual(
      expect.arrayContaining(['content-length', 'content-type', 'x-amz-checksum-sha256']),
    )
    expect(url.searchParams.has('x-amz-checksum-sha256')).toBe(false)
    expect(url.searchParams.get('X-Amz-Expires')).toBe(String(PRESIGN_TTL_SECONDS.masterUpload))
    expect(put).toMatchObject({
      method: 'PUT',
      byteSize: 1234,
      headers: {
        'content-type': 'image/x-canon-cr3',
        'x-amz-checksum-sha256': sha256HexToBase64(SHA),
      },
      expiresAt: '2026-10-01T09:00:00.000Z',
    })
  })

  it('reads what the bucket holds, and answers null for a key it lacks', async () => {
    const client = new S3Client({ region: 'auto' })
    const send = vi.spyOn(client, 'send')
    const store = s3MastersStore(target, client)
    send.mockResolvedValueOnce({
      ContentLength: 26,
      ChecksumSHA256: sha256HexToBase64(SHA),
      ContentType: 'image/tiff',
    } as never)
    expect(await store.head('masters/x')).toEqual({
      byteSize: 26,
      checksum: SHA,
      contentType: 'image/tiff',
    })
    expect((send.mock.calls[0]![0] as { input: object }).input).toMatchObject({
      ChecksumMode: 'ENABLED',
    })
    send.mockRejectedValueOnce(Object.assign(new Error('nope'), { name: 'NotFound' }))
    expect(await store.head('masters/y')).toBeNull()
    send.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'AccessDenied' }))
    await expect(store.head('masters/z')).rejects.toThrow('denied')
  })

  it('hashes a stored object by streaming it, and refuses an oversized text read', async () => {
    const client = new S3Client({ region: 'auto' })
    const send = vi.spyOn(client, 'send')
    const store = s3MastersStore(target, client)
    async function* chunks() {
      yield Buffer.from('hello ')
      yield Buffer.from('master')
    }
    send.mockResolvedValueOnce({ Body: chunks() } as never)
    expect(await store.hash('masters/x')).toBe(
      createHash('sha256').update('hello master').digest('hex'),
    )
    send.mockResolvedValueOnce({ ContentLength: 10_000, Body: chunks() } as never)
    await expect(store.readText('masters/intake/x/intake.json', 100)).rejects.toThrow(
      /larger than 100/,
    )
    send.mockResolvedValueOnce({ ContentLength: 12, Body: chunks() } as never)
    expect(await store.readText('masters/intake/x/intake.json', 100)).toBe('hello master')
  })
})
