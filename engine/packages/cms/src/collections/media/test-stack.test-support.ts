/**
 * Test support only — imported by `*.storage.db.test.ts` and never by runtime code; the name keeps
 * it out of every barrel and out of Vitest's own test files.
 *
 * A real stack for the storage tests (TASKS.md 8.3.e): a Postgres database of its own on the server
 * `CMS_TEST_POSTGRES_URL` names, its schema pushed from this config (`PAYLOAD_DEV_PUSH=1`: the
 * wave's migration is generated after the merge, PARALLEL-TRACKS.md §3.2), and the dev stack's
 * MinIO at `STORAGE_TEST_ENDPOINT`, with the local plan's scoped keys — never the root key — as
 * the brand process would hold them (`@engine/media` `storage:policies`, applied beforehand).
 *
 * REST requests go through Payload's own `handleEndpoints`, the handler Next's `/api/[...slug]`
 * route calls, so access, multipart parsing and the file route are Payload's real ones.
 */
import { createHmac } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { multipartUploadOptions, s3BucketObjects, type BucketObjects } from '@engine/media/storage'
import { handleEndpoints, type Payload, type SanitizedConfig } from 'payload'

import { buildEngineConfig, engineConfig } from '../../payload.config'

type Pool = { query: (text: string) => Promise<unknown>; end: () => Promise<void> }

export const server = process.env.CMS_TEST_POSTGRES_URL
export const endpoint = process.env.STORAGE_TEST_ENDPOINT
export const stackAvailable = Boolean(server && endpoint)
const rootUser = process.env.STORAGE_TEST_ROOT_USER || 'minioadmin'
const rootSecret = process.env.STORAGE_TEST_ROOT_SECRET || 'minioadmin'

export const MEDIA_BUCKET = 'test-media'
export const MASTERS_BUCKET = 'archive-masters'
export const ORIGIN = 'http://localhost:4199'

/** The local plan's secret for a user — `@engine/media`'s `deriveLocalSecret()`, restated. */
export const localSecret = (user: string) =>
  createHmac('sha256', rootSecret).update(`indies-local-storage:${user}`).digest('hex').slice(0, 40)

/** A bucket as the root key sees it — for looking, and for setting up what a test needs. */
export const asRoot = (bucket: string): BucketObjects =>
  s3BucketObjects({
    endpoint: endpoint ?? 'http://skipped.invalid',
    region: 'auto',
    bucket,
    credentials: { accessKeyId: rootUser, secretAccessKey: rootSecret },
  })

/** A bucket as one of the local plan's users sees it. */
export const asUser = (bucket: string, user: string): BucketObjects =>
  s3BucketObjects({
    endpoint: endpoint ?? 'http://skipped.invalid',
    region: 'auto',
    bucket,
    credentials: { accessKeyId: user, secretAccessKey: localSecret(user) },
  })

const here = path.dirname(fileURLToPath(import.meta.url))
// pg is db-postgres's dependency, not cms's: reached from beside it.
const { Pool: PgPool } = createRequire(
  path.join(realpathSync(path.join(here, '../../../node_modules/@payloadcms/db-postgres')), 'x.js'),
)('pg') as { Pool: new (options: object) => Pool }

export type Stack = {
  readonly payload: Payload
  readonly env: Record<string, string>
  /** A REST request through Payload's own handler; `token` signs it in as that staff member. */
  rest(
    method: string,
    route: string,
    init?: { token?: string; json?: unknown; form?: FormData },
  ): Promise<Response>
  /** Signs a staff member in; returns the JWT. */
  login(email: string, password: string): Promise<string>
  stop(): Promise<void>
}

/** How a test file boots Payload on the stack's config: its own `getPayload`, under `key`. */
export type Connect = (config: SanitizedConfig, key: string) => Promise<Payload>

export async function startStack(options: {
  storefront: 'gallery' | 'emporium'
  mastersUser: string
  connect: Connect
  /** Where multipart files stream to, if not the process's shared folder — for a test that counts them. */
  tempFileDir?: string
}): Promise<Stack> {
  const database = `cms_storage_test_${process.pid}_${Date.now()}`
  const url = new URL(server!)
  url.pathname = `/${database}`
  const admin = new PgPool({ connectionString: server })
  await admin.query(`CREATE DATABASE "${database}"`)
  const env: Record<string, string> = {
    DATABASE_URL: url.href,
    PAYLOAD_SECRET: 'storage-db-test-only-never-signs-anything'.padEnd(48, 'x'),
    SITE_URL: ORIGIN,
    PAYLOAD_DEV_PUSH: '1',
    BRAND: 'test',
    TEST_STOREFRONT: options.storefront,
    BRAND_ROOT: path.resolve(here, '../../../../../../test'),
    S3_ENDPOINT: endpoint!,
    S3_BUCKET: MEDIA_BUCKET,
    S3_ACCESS_KEY_ID: 'test-media-writer',
    S3_SECRET_ACCESS_KEY: localSecret('test-media-writer'),
    MEDIA_PUBLIC_URL: `${endpoint}/${MEDIA_BUCKET}`,
    MASTERS_BUCKET,
    MASTERS_ACCESS_KEY_ID: options.mastersUser,
    MASTERS_SECRET_ACCESS_KEY: localSecret(options.mastersUser),
  }
  // The hooks read the brand and the buckets at request time, from the process.
  const saved = { ...process.env }
  Object.assign(process.env, env)
  delete process.env.RUN_MIGRATIONS
  // The config the apps run, temp-file clean-up included (`buildEngineConfig`, TASKS.md 8.3.h).
  const base = engineConfig(env)
  const config: SanitizedConfig = await buildEngineConfig(
    options.tempFileDir ? { ...base, upload: multipartUploadOptions(options.tempFileDir) } : base,
  )
  const key = database
  const payload = await options.connect(config, key)
  const rest: Stack['rest'] = async (method, route, init = {}) => {
    const headers = new Headers({ origin: ORIGIN })
    if (init.token) headers.set('authorization', `JWT ${init.token}`)
    let body: string | ArrayBuffer | undefined
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(init.json)
    } else if (init.form) {
      const encoded = new Request(`${ORIGIN}${route}`, { method, body: init.form })
      headers.set('content-type', encoded.headers.get('content-type')!)
      body = await encoded.arrayBuffer()
      headers.set('content-length', String(body.byteLength))
    }
    const request = new Request(`${ORIGIN}${route}`, { method, headers, body })
    return handleEndpoints({ config, payloadInstanceCacheKey: key, request })
  }
  return {
    payload,
    env,
    rest,
    async login(email, password) {
      const response = await rest('POST', '/api/users/login', { json: { email, password } })
      const { token } = (await response.json()) as { token?: string }
      if (!token) throw new Error(`could not sign ${email} in: ${response.status}`)
      return token
    },
    async stop() {
      ;(payload.db as unknown as { pool?: { on?: (e: string, f: () => void) => void } }).pool?.on?.(
        'error',
        () => {},
      )
      await payload.destroy()
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
      await admin.end()
      process.env = saved
    },
  }
}

// A real 16 × 12 JPEG with the Exif a phone writes: its camera ("TestCam", "Phone 1") and a GPS
// position (8° 39′ S, 115° 13′ E). Made with sharp's withExif(); anything after its end marker
// makes each upload's bytes, and so its content address, its own.
export const JPEG = Buffer.from(
  '/9j/4QFWRXhpZgAASUkqAAgAAAAJAA8BAgAIAAAAigAAABABAgAIAAAAkgAAABIBAwABAAAAAQAAABoBBQABAAAAegAAABsBBQABAAAAggAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAmgAAACWIBAABAAAA6AAAAAAAAAA4YwAA6AMAADhjAADoAwAAVGVzdENhbQBQaG9uZSAxAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAAQAAAAA6AEAAEAAAAMAAAAAAAAAAQAAQACAAIAAABTAAAAAgAFAAMAAAAeAQAAAwACAAIAAABFAAAABAAFAAMAAAA2AQAAAAAAAAgAAAABAAAAJwAAAAEAAAAAAAAAAQAAAHMAAAABAAAADQAAAAEAAAAAAAAAAQAAAP/bAEMAEAsMDgwKEA4NDhIREBMYKBoYFhYYMSMlHSg6Mz08OTM4N0BIXE5ARFdFNzhQbVFXX2JnaGc+TXF5cGR4XGVnY//bAEMBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIAAwAEAMBIgACEQEDEQH/xAAVAAEBAAAAAAAAAAAAAAAAAAAABP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAE/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AtABJf//Z',
  'base64',
)
export const jpeg = (marker: string) => Buffer.concat([JPEG, Buffer.from(marker)])
export const valid = {
  alt: 'Engraved map of Bali, 1726, hand-coloured, recto',
  role: 'recto',
  provenance: 'photograph',
}

export function form(data: object, file?: { bytes: Buffer; name: string; type: string }) {
  const body = new FormData()
  body.set('_payload', JSON.stringify(data))
  if (file) body.set('file', new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.name)
  return body
}
export const messages = async (response: Response) => JSON.stringify(await response.json())
