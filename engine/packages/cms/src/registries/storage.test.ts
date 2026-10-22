import { UPLOADS_PREFIX } from '@engine/media/storage'
import type { CollectionConfig, Config } from 'payload'
import { describe, expect, it } from 'vitest'

import { Masters } from '../collections/masters'
import { Media } from '../collections/media'
import { mediaStoragePlugin, storageConfigured, uploadCollectionSlugs } from './storage'

const BUCKET_ENV = {
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'test-media',
  S3_ACCESS_KEY_ID: 'test-media-writer',
  S3_SECRET_ACCESS_KEY: 'not-a-real-secret',
}
const stored = (env: Record<string, string | undefined>) =>
  mediaStoragePlugin(env)({ collections: [Media, Masters] } as Config) as Config
const fieldsOf = (config: Config, slug: string) =>
  (config.collections ?? []).find((c) => c.slug === slug)!.fields as CollectionConfig['fields']
const named = (fields: CollectionConfig['fields'], name: string) =>
  fields.find((f) => 'name' in f && f.name === name) as Record<string, unknown> | undefined

describe('media storage (8.3.a, 8.3.g)', () => {
  it('stores media, and only media, in the bucket — masters is no upload collection', () => {
    expect(uploadCollectionSlugs({ collections: [Media, Masters] })).toEqual(['media'])
    expect(storageConfigured(BUCKET_ENV)).toBe(true)
    expect(storageConfigured({ ...BUCKET_ENV, S3_BUCKET: '' })).toBe(false)
  })

  it('puts every upload under the private uploads/ prefix, the same with the bucket or without', () => {
    for (const env of [BUCKET_ENV, {}]) {
      const prefix = named(fieldsOf(stored(env), 'media'), 'prefix')
      expect(prefix).toMatchObject({ defaultValue: UPLOADS_PREFIX })
    }
    const names = (env: object) =>
      fieldsOf(stored(env as Record<string, string>), 'media').map((f) =>
        'name' in f ? f.name : f.type,
      )
    expect(names(BUCKET_ENV)).toEqual(names({}))
    expect(named(fieldsOf(stored(BUCKET_ENV), 'masters'), 'prefix')).toBeUndefined()
  })

  it("serves an upload through Payload's file route — its access — never straight from the bucket", () => {
    const media = (stored(BUCKET_ENV).collections ?? []).find((c) => c.slug === 'media')!
    const upload = media.upload as { handlers?: unknown[]; disableLocalStorage?: boolean }
    // The adapter's static handler sits behind the collection's read access (disablePayloadAccessControl unset).
    expect(upload.handlers).toHaveLength(1)
    expect(upload.disableLocalStorage).toBe(true)
  })
})
