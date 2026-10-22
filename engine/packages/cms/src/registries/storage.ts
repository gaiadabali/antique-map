/**
 * Media storage (DEPLOYMENT.md §2, ARCHITECTURE.md §2, §7; TASKS.md 8.3): every upload
 * collection's files go to the one S3-compatible public media bucket — RustFS on a host
 * (D12), MinIO locally (`docker-compose.dev.yml`) — never the Helios disk. Switching provider is
 * an endpoint change. Which bucket, endpoint and key: `@engine/media/storage`'s
 * `mediaStorageTarget()`, the one reading of `S3_*` for every caller.
 *
 * **An upload lands under the private `uploads/` prefix, and is served only through Payload.**
 * The bucket answers anonymous reads for derivatives and capped tiles alone
 * (`@engine/media/storage` `PUBLIC_MEDIA_PREFIXES`, applied by its `storage:policies` script):
 * an upload is the full-resolution processed image, which would bypass `publicZoomMaxPx` and may
 * carry GPS and camera metadata (TASKS.md 8.3.g). So `disablePayloadAccessControl` is never set:
 * a file's `url` is Payload's own file route, which the collection's `read` access answers — for
 * `media`, staff only (`collections/media/access`).
 *
 * **`alwaysInsertFields: true` is what keeps the schema environment-independent.**
 * The storage plugin adds its own fields (`prefix`, `_objectKey`, `url`) to each upload
 * collection only while it is enabled; with it off — no bucket configured, as in the build or a
 * workstation without MinIO — those columns would vanish, and one database would drift from the
 * other. With the flag, the columns exist either way and only the file handling switches. The
 * collection prefix is a constant, `UPLOADS_PREFIX`: the `prefix` column's default is written into
 * the DDL, so it is the same in every environment, the plugin on or off.
 *
 * Which collections: every collection with `upload` in the config, found when the plugin runs —
 * today `media`. `masters` is a plain collection whose files go to the private masters bucket by
 * presigned PUT (CONTENT-MODEL.md §6; `collections/masters`), so it is never in this list; its
 * bucket is read from `MASTERS_*` by `@engine/media/storage`'s `mastersStorageTarget()` at request
 * time, which needs no plugin.
 */
import { mediaStorageTarget, s3ClientConfig, UPLOADS_PREFIX } from '@engine/media/storage'
import { s3Storage } from '@payloadcms/storage-s3'
import type { Config, Plugin } from 'payload'

type Env = Readonly<Record<string, string | undefined>>

/** Uploads go to the bucket once a bucket and an endpoint are configured; else to local disk. */
export function storageConfigured(env: Env): boolean {
  return mediaStorageTarget(env) !== null
}

export function uploadCollectionSlugs(config: Pick<Config, 'collections'>): string[] {
  return (config.collections ?? [])
    .filter((collection) => Boolean(collection.upload))
    .map((c) => c.slug)
}

export function mediaStoragePlugin(env: Env): Plugin {
  return (config) => {
    const target = mediaStorageTarget(env)
    return s3Storage({
      enabled: target !== null,
      alwaysInsertFields: true,
      bucket: target?.bucket ?? '',
      collections: Object.fromEntries(
        uploadCollectionSlugs(config).map((slug) => [slug, { prefix: UPLOADS_PREFIX }]),
      ),
      config: target ? s3ClientConfig(target) : { region: 'auto', forcePathStyle: true },
    })(config)
  }
}
