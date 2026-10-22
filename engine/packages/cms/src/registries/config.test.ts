/**
 * The config itself (TASKS.md 3.2.a, 2.4): the same schema in every context, with the settings the
 * Check names. One CMS serves both sites, so no brand or site shapes it.
 */
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import {
  buildConfig,
  type CollectionConfig,
  type Field,
  type Payload,
  type SanitizedConfig,
} from 'payload'
import { describe, expect, it } from 'vitest'

import { siteOrigin, trustedOrigins } from '../access/origins'
import { testOrigin } from '../db/test-origin.test-support'
import { COOKIE_PREFIX, engineConfig } from '../payload.config'

type Env = Record<string, string | undefined>

/** A serving process's environment: its origin, a mail transport and a media bucket. */
const SERVING: Env = {
  ...testOrigin(4167).env,
  SMTP_HOST: '127.0.0.1',
  SMTP_FROM_ADDRESS: 'admin@test.example',
  S3_BUCKET: 'scratch',
  S3_ENDPOINT: 'http://127.0.0.1:9',
  S3_ACCESS_KEY_ID: 'k',
  S3_SECRET_ACCESS_KEY: 's',
}

const UPLOADS: CollectionConfig = { slug: 'scratch-uploads', upload: true, fields: [] }

async function build(env: Env, extra: CollectionConfig[] = []): Promise<SanitizedConfig> {
  const input = engineConfig(env)
  return buildConfig({ ...input, collections: [...(input.collections ?? []), ...extra] })
}

/** What reaches the schema: every collection's and global's field tree, and the locales. */
function schemaShape(config: SanitizedConfig) {
  const fields = (list: Field[]): unknown =>
    list.map((field) => ({
      name: 'name' in field ? field.name : null,
      type: field.type,
      localized: 'localized' in field ? Boolean(field.localized) : false,
      hasMany: 'hasMany' in field ? Boolean(field.hasMany) : false,
      defaultValue:
        'defaultValue' in field && typeof field.defaultValue !== 'function'
          ? field.defaultValue
          : null,
      options: 'options' in field ? field.options : null,
      fields: 'fields' in field ? fields(field.fields as Field[]) : null,
    }))
  return {
    collections: config.collections.map((c) => ({ slug: c.slug, fields: fields(c.fields) })),
    globals: config.globals.map((g) => ({ slug: g.slug, fields: fields(g.fields) })),
    locales: config.localization && config.localization.localeCodes,
  }
}

describe('the Payload config', () => {
  it('has the same schema in the build (no environment) as in a serving process', async () => {
    expect(schemaShape(await build(SERVING))).toEqual(schemaShape(await build({})))
  }, 60_000)

  it('holds English and Indonesian, English first — no `nl` (TASKS.md 2.4.a)', async () => {
    const config = await build({})
    expect(config.localization && config.localization.localeCodes).toEqual(['en', 'id'])
    expect(config.localization && config.localization.defaultLocale).toBe('en')
  })

  it('keeps the storage plugin’s fields whether or not a bucket is configured', async () => {
    const bucket = {
      S3_BUCKET: 'scratch',
      S3_ENDPOINT: 'http://127.0.0.1:9',
      S3_ACCESS_KEY_ID: 'k',
      S3_SECRET_ACCESS_KEY: 's',
    }
    const names = (config: SanitizedConfig) =>
      config.collections
        .find((c) => c.slug === UPLOADS.slug)!
        .fields.map((field) => ('name' in field ? field.name : field.type))
    const withBucket = names(await build(bucket, [UPLOADS]))
    const without = names(await build({}, [UPLOADS]))
    expect(withBucket).toEqual(without)
    expect(without).toEqual(expect.arrayContaining(['url', 'prefix', '_objectKey']))
  })

  it('never pushes schema, and migrates on boot only with RUN_MIGRATIONS=1', async () => {
    const payload = { config: {}, logger: { info: () => {} } } as unknown as Payload
    const init = async (env: Env) =>
      (await build(env)).db.init({ payload }) as unknown as PostgresAdapter
    const plain = await init({})
    expect(plain.push).toBe(false)
    expect(plain.prodMigrations).toBeUndefined()
    const web = await init({ RUN_MIGRATIONS: '1' })
    expect(web.prodMigrations?.length).toBeGreaterThanOrEqual(1)
  })

  it('takes its server URL and CSRF/CORS from `access/origins`, and mail from SMTP_*', async () => {
    // Read through the helpers, not as literals: TASKS.md 2.2 changes where the origins come from
    // (SITE_URL today, the site hosts after it), and this holds on either side of that merge.
    // Payload appends the server URL to `csrf` once more as it sanitises: compare as sets.
    const distinct = (origins: unknown) => [...new Set(origins as string[])].sort()
    const config = await build(SERVING)
    expect(config.serverURL).toBe(siteOrigin(SERVING))
    expect(config.serverURL).toBeTruthy()
    expect(distinct(config.csrf)).toEqual(distinct(trustedOrigins(SERVING, null)))
    expect(distinct(config.cors)).toEqual(distinct(trustedOrigins(SERVING, null)))
    expect(config.csrf).toContain(config.serverURL)
    expect(config.email).toBeDefined()
    const bare = await build({})
    expect(bare.serverURL ?? '').toBe(siteOrigin({}) ?? '')
    expect(distinct(bare.csrf)).toEqual(distinct(trustedOrigins({}, null)))
    expect(bare.email).toBeUndefined()
    expect((await build({ SMTP_HOST: '127.0.0.1' })).email).toBeUndefined()
  })

  it('runs no GraphQL, no auto-run jobs and no dev-time type writes; the cookie prefix is Payload’s', async () => {
    const config = await build({})
    expect(config.graphQL.disable).toBe(true)
    expect(config.jobs.autoRun).toBeUndefined()
    expect(config.typescript.autoGenerate).toBe(false)
    expect(config.cookiePrefix).toBe('payload')
    expect(COOKIE_PREFIX).toBe('payload')
    expect(config.admin.user).toBe('users')
    expect(config.telemetry).toBe(false)
  })
})
