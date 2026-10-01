/**
 * The private masters bucket, as the CMS reaches it (TASKS.md 8.3.b; ARCHITECTURE.md §7).
 *
 * **A master's bytes never pass through the app server.** The server signs a PUT for one key,
 * one length and one SHA-256, and the client sends the file straight to the bucket: a large TIFF
 * would exceed the CDN's request limit in front of `/admin`, and the app has no business holding
 * a gigabyte in memory. The signature covers `content-length` and `x-amz-checksum-sha256` as
 * *headers* — `unhoistableHeaders` — so the storage refuses a longer file, other bytes, and a
 * request that drops the checksum. Hoisted into the query string instead, MinIO accepts a PUT
 * without the header and verifies nothing (measured on MinIO 2025-07-23 while building this).
 *
 * Completion is the `masters` record's creation: the server asks the bucket what it holds under
 * the key (`head`) — the size and the SHA-256 the storage verified on the way in — and records
 * them, refusing a record for a file that is missing or other than declared. A file put there by
 * other means (the pilot set, copied with the origin's credentials before any collection
 * existed) carries no stored checksum; the intake import alone may then `hash()` it.
 */
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { PRESIGN_TTL_SECONDS } from '../contract'
import { sha256HexOf, sha256HexToBase64, storedChecksumToHex } from './checksum'
import { s3ClientConfig, type S3Target } from './env'

/** What the bucket holds under a key. `checksum` is hex, or null when no whole-file SHA-256 is stored. */
export type StoredObject = {
  readonly byteSize: number
  readonly checksum: string | null
  readonly contentType: string | null
}

/** A signed PUT: the client sends exactly `headers`, and a body of exactly `byteSize` bytes. */
export type PresignedPut = {
  readonly method: 'PUT'
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly byteSize: number
  readonly expiresAt: string
}

export type PresignPutInput = {
  readonly key: string
  /** The file's SHA-256, 64 lower-case hex digits. */
  readonly checksum: string
  readonly byteSize: number
  readonly contentType: string
  readonly expiresInSeconds?: number
  readonly now?: Date
}

export interface MastersStore {
  readonly bucket: string
  presignPut(input: PresignPutInput): Promise<PresignedPut>
  head(key: string): Promise<StoredObject | null>
  /** Streams the object and hashes it — the intake import's fallback only. Null when missing. */
  hash(key: string): Promise<string | null>
  /** A small text object (an intake manifest), or null when missing; throws above `maxBytes`. */
  readText(key: string, maxBytes: number): Promise<string | null>
}

function isMissing(error: unknown): boolean {
  const { name, $metadata } = (error ?? {}) as {
    name?: string
    $metadata?: { httpStatusCode?: number }
  }
  return name === 'NotFound' || name === 'NoSuchKey' || $metadata?.httpStatusCode === 404
}

async function orNull<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read()
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

function body(output: GetObjectCommandOutput): AsyncIterable<Uint8Array> {
  const stream = output.Body as unknown as AsyncIterable<Uint8Array> | undefined
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
    throw new Error('the storage answered without a readable body')
  }
  return stream
}

export function s3MastersStore(
  target: S3Target,
  client: S3Client = new S3Client(s3ClientConfig(target)),
): MastersStore {
  const Bucket = target.bucket
  return {
    bucket: Bucket,

    async presignPut(input) {
      const expiresIn = input.expiresInSeconds ?? PRESIGN_TTL_SECONDS.masterUpload
      const checksum = sha256HexToBase64(input.checksum)
      const command = new PutObjectCommand({
        Bucket,
        Key: input.key,
        ContentLength: input.byteSize,
        ContentType: input.contentType,
        ChecksumSHA256: checksum,
      })
      const url = await getSignedUrl(client, command, {
        expiresIn,
        signableHeaders: new Set(['content-length', 'content-type']),
        unhoistableHeaders: new Set(['x-amz-checksum-sha256']),
      })
      const now = input.now ?? new Date()
      return {
        method: 'PUT',
        url,
        headers: { 'content-type': input.contentType, 'x-amz-checksum-sha256': checksum },
        byteSize: input.byteSize,
        expiresAt: new Date(now.getTime() + expiresIn * 1000).toISOString(),
      }
    },

    head: (key) =>
      orNull(async () => {
        const head = await client.send(
          new HeadObjectCommand({ Bucket, Key: key, ChecksumMode: 'ENABLED' }),
        )
        return {
          byteSize: head.ContentLength ?? 0,
          checksum: storedChecksumToHex(head.ChecksumSHA256),
          contentType: head.ContentType ?? null,
        }
      }),

    hash: (key) =>
      orNull(async () =>
        sha256HexOf(body(await client.send(new GetObjectCommand({ Bucket, Key: key })))),
      ),

    readText: (key, maxBytes) =>
      orNull(async () => {
        const object = await client.send(new GetObjectCommand({ Bucket, Key: key }))
        if ((object.ContentLength ?? 0) > maxBytes) {
          ;(object.Body as { destroy?: () => void } | undefined)?.destroy?.()
          throw new Error(`${key} is larger than ${maxBytes} bytes`)
        }
        const chunks: Uint8Array[] = []
        for await (const chunk of body(object)) chunks.push(chunk)
        return Buffer.concat(chunks).toString('utf8')
      }),
  }
}
