/**
 * Test support only — for `request-temp-files.db.test.ts`; the name keeps it out of every barrel.
 *
 * A throwaway database on the server `CMS_TEST_POSTGRES_URL` names, its schema pushed
 * (`PAYLOAD_DEV_PUSH=1`), booted — by the test's own `getPayload` — on the config the apps run,
 * `buildEngineConfig()`, with its multipart files streamed to a folder of the test's own, so the
 * test can count what is left in it while other test files upload in parallel. The limits are
 * lowered to a mebibyte so an over-limit body is cheap to send; the clean-up does not depend on
 * size. Two probes are added — a collection with custom endpoints and a writable global — for the
 * success paths the stubs refuse.
 */
import { mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MULTIPART_ENVELOPE_BYTES, multipartUploadOptions } from '@engine/media/storage'
import {
  addDataAndFileToRequest,
  handleEndpoints,
  type CollectionConfig,
  type GlobalConfig,
  type Payload,
  type SanitizedConfig,
} from 'payload'

import { buildEngineConfig, engineConfig } from '../payload.config'
import { testOrigin } from '../db/test-origin.test-support'

export const LIMIT = 1024 * 1024
const admin = testOrigin(4181)
export const ORIGIN = admin.origin
export const PROBES = 'temp-file-probes'
export const PROBE_GLOBAL = 'temp-file-probe'

type Pool = {
  on?: (event: 'error', listener: () => void) => unknown
  query: (text: string) => Promise<unknown>
  end: () => Promise<void>
}

function pgPool(connectionString: string): Pool {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dbPostgres = realpathSync(path.join(here, '../../node_modules/@payloadcms/db-postgres'))
  const pg = createRequire(path.join(dbPostgres, 'x.js'))('pg') as {
    Pool: new (o: object) => Pool
  }
  return new pg.Pool({ connectionString })
}

const anyone = () => true

const probeCollection: CollectionConfig = {
  slug: PROBES,
  access: { read: anyone, create: anyone, update: anyone, delete: anyone },
  fields: [{ name: 'note', type: 'text' }],
  endpoints: [
    {
      // A custom endpoint parsing its own body, as `masters`' upload-url does; it reports where
      // the file is while the request runs, so the test knows it looks in the right folder.
      path: '/echo',
      method: 'post',
      handler: async (req) => {
        await addDataAndFileToRequest(req)
        return Response.json({ during: req.file?.tempFilePath ?? null })
      },
    },
    {
      path: '/explode',
      method: 'post',
      handler: async (req) => {
        await addDataAndFileToRequest(req)
        throw new Error('a handler failing once the body is parsed')
      },
    },
  ],
}

const probeGlobal: GlobalConfig = {
  slug: PROBE_GLOBAL,
  access: { read: anyone, update: anyone },
  fields: [{ name: 'note', type: 'text' }],
}

export type Probe = {
  readonly payload: Payload
  readonly tempDir: string
  /** What the requests have left in the temp folder. */
  leftovers(): string[]
  /** Empties it, so one test's leak never fails the next. */
  clear(): void
  /** A request through Payload's own REST handler, as Next's `/api/[...slug]` route makes it. */
  rest(
    method: string,
    route: string,
    init?: { token?: string; form?: FormData; json?: unknown; body?: ReadableStream<Uint8Array> },
  ): Promise<Response>
  stop(): Promise<void>
}

/** How the test boots Payload on the probe's config — its own `getPayload`, under `key`. */
export type Connect = (config: SanitizedConfig, key: string) => Promise<Payload>

export async function startProbe(server: string, connect: Connect): Promise<Probe> {
  const database = `cms_temp_files_test_${process.pid}_${Date.now()}`
  const url = new URL(server)
  url.pathname = `/${database}`
  const tempDir = mkdtempSync(path.join(tmpdir(), 'cms-temp-files-test-'))
  const env = {
    DATABASE_URL: url.toString(),
    PAYLOAD_SECRET: 't'.repeat(48),
    PAYLOAD_DEV_PUSH: '1',
    ...admin.env,
  }
  const base = engineConfig(env)
  const config = await buildEngineConfig({
    ...base,
    collections: [...(base.collections ?? []), probeCollection],
    globals: [...(base.globals ?? []), probeGlobal],
    upload: {
      ...multipartUploadOptions(tempDir),
      limits: { fileSize: LIMIT, files: 1 },
      requestSizeLimit: LIMIT + MULTIPART_ENVELOPE_BYTES,
    },
  })
  const creator = pgPool(server)
  await creator.query(`CREATE DATABASE "${database}"`)
  await creator.end()
  const payload = await connect(config, database)

  const rest: Probe['rest'] = async (method, route, init = {}) => {
    const headers = new Headers({ origin: ORIGIN })
    if (init.token) headers.set('authorization', `JWT ${init.token}`)
    let body: RequestInit['body']
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(init.json)
    } else if (init.form) {
      const encoded = new Request(`${ORIGIN}${route}`, { method, body: init.form })
      headers.set('content-type', encoded.headers.get('content-type')!)
      body = await encoded.arrayBuffer()
    } else if (init.body) {
      headers.set('content-type', `multipart/form-data; boundary=${BOUNDARY}`)
      body = init.body
    }
    const request = new Request(`${ORIGIN}${route}`, {
      method,
      headers,
      body,
      ...(init.body ? { duplex: 'half' } : {}),
    } as RequestInit)
    return handleEndpoints({ config, payloadInstanceCacheKey: database, request })
  }

  return {
    payload,
    tempDir,
    leftovers: () => readdirSync(tempDir),
    clear: () => {
      for (const name of readdirSync(tempDir)) rmSync(path.join(tempDir, name), { force: true })
    },
    rest,
    async stop() {
      ;(payload.db as unknown as { pool?: Pool }).pool?.on?.('error', () => {})
      await payload.destroy()
      const dropper = pgPool(server)
      await dropper.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
      await dropper.end()
      rmSync(tempDir, { recursive: true, force: true })
    },
  }
}

/** A multipart body with `_payload` and, if given, one file under `field` (`file` by default). */
export function form(data: unknown, file?: { bytes: number; field?: string }): FormData {
  const body = new FormData()
  body.set('_payload', typeof data === 'string' ? data : JSON.stringify(data))
  if (file) {
    const blob = new Blob([new Uint8Array(file.bytes).fill(7)], { type: 'application/pdf' })
    body.append(file.field ?? 'file', blob, 'attachment.pdf')
  }
  return body
}

export const BOUNDARY = 'cms-temp-files-test-boundary'

/** A body that sends a file part's first bytes and then fails, as a client hanging up does. */
export function hangingUpBody(bytes: number): ReadableStream<Uint8Array> {
  const head = new TextEncoder().encode(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="cut.pdf"\r\n` +
      'Content-Type: application/pdf\r\n\r\n',
  )
  let sent = false
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent) {
        controller.error(new Error('the client hung up'))
        return
      }
      sent = true
      controller.enqueue(head)
      controller.enqueue(new Uint8Array(bytes).fill(7))
    },
  })
}
