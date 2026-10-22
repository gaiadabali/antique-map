/**
 * Where the driver's details are kept (COMMERCE.md §9; SECURITY.md F4–F5): the media bucket, under
 * `orders/{id}/` — a **private** prefix. The bucket answers anonymous reads for `derivatives/` and
 * `iiif/` alone (`@engine/media/storage` `PUBLIC_MEDIA_PREFIXES`, applied by its policy script),
 * so an object here is reachable only by a short-lived presigned GET this server signs. The media
 * key is the one that may write and delete in that bucket (`policies/media-writer.json`); the
 * masters key may not write outside `masters/` nor delete at all, so the masters bucket cannot
 * hold an image that must be deleted after 30 days.
 *
 * Read from the environment at call time (`S3_ENDPOINT`, `S3_BUCKET`, the media key pair), never
 * while the config is built; null while no bucket is configured. Tests pass their own store.
 */
import { mediaStorageTarget, s3BucketObjects, type S3Target } from '@engine/media/storage'

import { presignGetUrl } from './presign'

export const DRIVER_IMAGE_PREFIX = 'orders'

/** The prefix every image of one order lives under. */
export const orderImagePrefix = (orderId: number) => `${DRIVER_IMAGE_PREFIX}/${orderId}/`

export interface DriverImageStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>
  remove(key: string): Promise<void>
  /** Every key under `prefix`. */
  list(prefix: string): Promise<string[]>
  /** A GET URL for `key` that expires after `ttlSeconds`. */
  presignGet(key: string, ttlSeconds: number): Promise<string>
}

export type DriverImageStoreSource = () => DriverImageStore | null

export function s3DriverImageStore(target: S3Target): DriverImageStore | null {
  const { credentials } = target
  // A presigned URL needs a key pair to sign with; an instance role is not supported here.
  if (!credentials) return null
  const objects = s3BucketObjects(target)
  return {
    async put(key, bytes, contentType) {
      if ((await objects.put(key, bytes, contentType)) === 'denied') {
        throw new Error(`fulfilment: the media key may not write ${key}`)
      }
    },
    remove: (key) => objects.remove(key),
    list: (prefix) => objects.list(prefix),
    presignGet: async (key, ttlSeconds) =>
      presignGetUrl({
        endpoint: target.endpoint,
        bucket: target.bucket,
        key,
        region: target.region,
        credentials,
        expiresInSeconds: ttlSeconds,
      }),
  }
}

let cached: { readonly signature: string; readonly store: DriverImageStore | null } | null = null

/** The process's store, from its environment; null while no media bucket is configured. */
export const driverImageStoreFromEnv: DriverImageStoreSource = () => {
  const target = mediaStorageTarget(process.env)
  if (!target) return null
  const signature = JSON.stringify(target)
  if (cached?.signature !== signature) cached = { signature, store: s3DriverImageStore(target) }
  return cached.store
}
