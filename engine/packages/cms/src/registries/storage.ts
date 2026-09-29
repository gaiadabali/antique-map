/**
 * Media storage (DEPLOYMENT.md §2, ARCHITECTURE.md §2, §7): every upload collection's files go
 * to the brand's S3-compatible bucket — Cloudflare R2 on a host, MinIO locally
 * (`docker-compose.dev.yml`) — never the Helios disk. Switching provider is an endpoint change.
 *
 * **`alwaysInsertFields: true` is what keeps the schema brand- and environment-independent.**
 * The storage plugin adds its own fields (`prefix`, `_objectKey`, `url`) to each upload
 * collection only while it is enabled; with it off — no bucket configured, as in the build or a
 * workstation without MinIO — those columns would vanish, and one database would drift from the
 * other. With the flag, the columns exist either way and only the file handling switches.
 *
 * Which collections: every collection with `upload` in the config, found when the plugin runs,
 * so an upload collection added later (8.3's `media`) is stored in the bucket with no line
 * here. `masters` is a plain collection whose files go to the private bucket by presigned URL
 * (CONTENT-MODEL.md §6), so it is never in this list. No per-collection prefix: a prefix's
 * default value is written into the column's DDL, and it must not differ by brand.
 */
import { s3Storage } from '@payloadcms/storage-s3'
import type { Config, Plugin } from 'payload'

type Env = Readonly<Record<string, string | undefined>>

/** Uploads go to the bucket once a bucket and an endpoint are configured; else to local disk. */
export function storageConfigured(env: Env): boolean {
  return Boolean(env.S3_BUCKET?.trim() && env.S3_ENDPOINT?.trim())
}

export function uploadCollectionSlugs(config: Pick<Config, 'collections'>): string[] {
  return (config.collections ?? [])
    .filter((collection) => Boolean(collection.upload))
    .map((c) => c.slug)
}

export function mediaStoragePlugin(env: Env): Plugin {
  return (config) => {
    const accessKeyId = env.S3_ACCESS_KEY_ID?.trim()
    const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim()
    return s3Storage({
      enabled: storageConfigured(env),
      alwaysInsertFields: true,
      bucket: env.S3_BUCKET?.trim() ?? '',
      collections: Object.fromEntries(uploadCollectionSlugs(config).map((slug) => [slug, true])),
      config: {
        endpoint: env.S3_ENDPOINT?.trim(),
        // R2 takes "auto"; MinIO, with no region of its own configured, accepts any.
        region: env.S3_REGION?.trim() || 'auto',
        // Bucket in the path, not the host name: MinIO needs it, R2 accepts it.
        forcePathStyle: true,
        ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
      },
    })(config)
  }
}
