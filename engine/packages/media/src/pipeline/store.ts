/**
 * The pipeline's two reads and writes on the media bucket, with the media key
 * (`../storage` `mediaStorageTarget()`): the private upload it renders from, and the public
 * objects it writes. A refused write throws — a pipeline that could not publish must say so,
 * never mark an image ready.
 */
import { s3BucketObjects, type BucketObjects } from '../storage/objects'
import type { S3Target } from '../storage/env'
import type { PublicImageStore } from './publish'

export interface MediaPipelineStore extends PublicImageStore {
  /** The upload's bytes at `key` (under the private `uploads/` prefix), or null when missing. */
  read(key: string): Promise<Uint8Array | null>
}

/** Socket failures worth another try: the SDK retries a request, not a body that breaks mid-read. */
const TRANSIENT = /ECONNRESET|ETIMEDOUT|EPIPE|socket hang up/i
const READ_ATTEMPTS = 3

async function readWithRetry(objects: BucketObjects, key: string): Promise<Uint8Array | null> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await objects.get(key)
    } catch (error) {
      const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
      if (attempt >= READ_ATTEMPTS || !TRANSIENT.test(message)) throw error
    }
  }
}

export function bucketPipelineStore(objects: BucketObjects): MediaPipelineStore {
  return {
    read: (key) => readWithRetry(objects, key),
    async put(key, bytes, contentType, cacheControl) {
      if ((await objects.put(key, bytes, contentType, cacheControl)) === 'denied') {
        throw new Error(`the media key may not write ${key}`)
      }
    },
  }
}

export const s3PipelineStore = (target: S3Target): MediaPipelineStore =>
  bucketPipelineStore(s3BucketObjects(target))
