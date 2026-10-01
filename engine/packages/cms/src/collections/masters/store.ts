/**
 * The masters bucket this process reaches, from its environment at request time
 * (`@engine/media/storage` `mastersStorageTarget()`: `S3_ENDPOINT` and `MASTERS_*`). Read lazily,
 * never while the config is built, so the build and a workstation without MinIO load the
 * collection all the same; a write that needs the bucket then refuses, in words.
 */
import { mastersStorageTarget, s3MastersStore, type MastersStore } from '@engine/media/storage'

export type StoreSource = () => MastersStore | null

let cached: { readonly signature: string; readonly store: MastersStore } | null = null

export const mastersStoreFromEnv: StoreSource = () => {
  const target = mastersStorageTarget(process.env)
  if (!target) return null
  const signature = JSON.stringify(target)
  if (cached?.signature !== signature) cached = { signature, store: s3MastersStore(target) }
  return cached.store
}

export const STORE_MISSING =
  'The masters bucket is not configured on this server (S3_ENDPOINT and MASTERS_BUCKET).'
