/**
 * Plain object operations on one bucket, with the key a target names — for the jobs that write
 * derivatives and tiles (TASKS.md 15.1, 15.2), the tooling, and the tests that prove what each
 * key may do. A refusal is answered, not thrown: `'denied'`, so a caller can assert it.
 */
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import { s3ClientConfig, type S3Target } from './env'

export type PutOutcome = 'written' | 'denied'

export interface BucketObjects {
  readonly bucket: string
  put(key: string, body: Uint8Array | string, contentType?: string): Promise<PutOutcome>
  /** The object's size in bytes, or null when the bucket holds nothing at `key`. */
  size(key: string): Promise<number | null>
  remove(key: string): Promise<void>
  /** Every key under `prefix`, up to 1,000. */
  list(prefix: string): Promise<string[]>
}

const isDenied = (error: unknown) => {
  const { name, $metadata } = (error ?? {}) as {
    name?: string
    $metadata?: { httpStatusCode?: number }
  }
  return name === 'AccessDenied' || $metadata?.httpStatusCode === 403
}
const isMissing = (error: unknown) => {
  const { name, $metadata } = (error ?? {}) as {
    name?: string
    $metadata?: { httpStatusCode?: number }
  }
  return name === 'NotFound' || name === 'NoSuchKey' || $metadata?.httpStatusCode === 404
}

export function s3BucketObjects(
  target: S3Target,
  client: S3Client = new S3Client(s3ClientConfig(target)),
): BucketObjects {
  const Bucket = target.bucket
  return {
    bucket: Bucket,
    async put(key, body, contentType) {
      try {
        await client.send(
          new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
        )
        return 'written'
      } catch (error) {
        if (isDenied(error)) return 'denied'
        throw error
      }
    },
    async size(key) {
      try {
        return (await client.send(new HeadObjectCommand({ Bucket, Key: key }))).ContentLength ?? 0
      } catch (error) {
        if (isMissing(error)) return null
        throw error
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }))
    },
    async list(prefix) {
      const listed = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix }))
      return (listed.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : []))
    },
  }
}
