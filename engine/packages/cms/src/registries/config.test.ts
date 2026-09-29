/**
 * The config itself (TASKS.md 3.2.a): brand-independent in everything that reaches the schema,
 * with the settings the Check names. Brands are found on disk — a brand's slug never appears in
 * engine code, tests included (CONVENTIONS.md §1).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PostgresAdapter } from '@payloadcms/db-postgres'
import {
  buildConfig,
  type CollectionConfig,
  type Field,
  type Payload,
  type SanitizedConfig,
} from 'payload'
import { describe, expect, it } from 'vitest'

import { COOKIE_PREFIX, engineConfig } from '../payload.config'

type Env = Record<string, string | undefined>

const repoRoot = (() => {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  while (!fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) dir = path.dirname(dir)
  return dir
})()

/**
 * Every committed brand config, as the env a process for it would have. From git, not the
 * folder listing: another test scaffolds a throwaway brand at the repository root while this runs.
 */
const BRAND_ENVS: Array<{ label: string; env: Env }> = execFileSync(
  'git',
  ['ls-files', '-z', '--', '*/site/brand.config.json', '*/site/brand.*.json'],
  { cwd: repoRoot, encoding: 'utf8' },
)
  .split('\0')
  .map((file) => /^([a-z0-9-]+)\/site\/brand\.(config|gallery|emporium)\.json$/.exec(file))
  .filter((match): match is RegExpExecArray => match !== null)
  .map(([, brand, kind]) =>
    kind === 'config'
      ? { label: brand!, env: { BRAND: brand } }
      : { label: `${brand}/${kind}`, env: { BRAND: brand, TEST_STOREFRONT: kind } },
  )

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
  it('finds every committed brand to compare against', () => {
    expect(BRAND_ENVS.length).toBeGreaterThanOrEqual(4)
  })

  it('has the same schema with BRAND unset as with every brand', async () => {
    const unset = schemaShape(await build({}))
    for (const { label, env } of BRAND_ENVS) {
      expect({ label, shape: schemaShape(await build(env)) }).toEqual({ label, shape: unset })
    }
  }, 60_000)

  it('holds the superset locales, English first, in every database', async () => {
    const config = await build({})
    expect(config.localization && config.localization.localeCodes).toEqual(['en', 'id', 'nl'])
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

  it('lets BRAND set only the server URL, CSRF/CORS and the mail sender', async () => {
    const [first] = BRAND_ENVS
    const env = { ...first!.env, SITE_URL: 'http://localhost:4167/', SMTP_HOST: '127.0.0.1' }
    const config = await build(env)
    expect(config.serverURL).toBe('http://localhost:4167')
    expect(config.csrf).toContain('http://localhost:4167')
    expect(config.cors).toContain('http://localhost:4167')
    expect(config.email).toBeDefined()
    const bare = await build({})
    expect(bare.serverURL ?? '').toBe('')
    expect(bare.csrf).toEqual([])
    expect(bare.email).toBeUndefined()
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
