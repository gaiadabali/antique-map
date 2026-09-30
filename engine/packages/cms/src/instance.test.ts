/**
 * `@engine/cms/instance` (TASKS.md 4.8.d). Importing it opens nothing — proven with
 * `DATABASE_URL`, `PGHOST` and `PGPORT` at a sentinel listener that must accept no connection,
 * since an unset `DATABASE_URL` is not an absent database: `pg` falls back to `PGHOST` and to
 * `localhost:5432`, a workstation's own Postgres (CONVENTIONS.md §12). Against a `db:fresh`
 * database, named by `CMS_TEST_DATABASE_URL` (e.g. `pnpm db:fresh --brand test --storefront
 * gallery`, then postgres://postgres:postgres@localhost:5432/test_<suffix>_gallery), `cms()`
 * resolves one instance and its pool answers READ COMMITTED; without that variable that part
 * skips — a setup state (CONVENTIONS.md §8). And no module under `engine/packages/**` but cms's
 * CLI, this instance and tests calls `getPayload(`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { databaseProbe } from './db/probe'

type Instance = typeof import('./instance')

const SECRET = 'instance-test-only-never-signs-anything-'.padEnd(48, 'x')
const saved = { ...process.env }

/** Sets (or, for `undefined`, deletes) each variable; `afterAll` puts the process's own back. */
function useEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

/** Every variable that could make the config migrate, push or pick a brand, cleared. */
const QUIET = { RUN_MIGRATIONS: undefined, PAYLOAD_DEV_PUSH: undefined, BRAND: undefined }

/** A fresh evaluation of the module and its config, under the environment set now. */
async function importInstance(): Promise<Instance> {
  vi.resetModules()
  return import('@engine/cms/instance')
}

afterAll(() => {
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]
  Object.assign(process.env, saved)
})

describe('importing @engine/cms/instance', () => {
  let sentinel: Server
  let port = 0
  let accepted = 0

  beforeAll(async () => {
    sentinel = createServer((socket: Socket) => {
      accepted += 1
      socket.destroy()
    })
    await new Promise<void>((resolve) => sentinel.listen(0, '127.0.0.1', resolve))
    port = (sentinel.address() as { port: number }).port
    useEnv({
      ...QUIET,
      DATABASE_URL: `postgres://sentinel:sentinel@127.0.0.1:${port}/sentinel`,
      PGHOST: '127.0.0.1',
      PGPORT: String(port),
      PAYLOAD_SECRET: SECRET,
    })
  })

  afterAll(async () => {
    await new Promise((resolve) => sentinel.close(resolve))
  })

  let instance: Instance

  it('opens no connection, with DATABASE_URL and PGHOST at a listener that counts them', async () => {
    instance = await importInstance()
    expect(typeof instance.cms).toBe('function')
    // Anything the import set off has had time to reach the listener.
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(accepted).toBe(0)
  })

  it("and cms()'s first call is what connects — to that listener, which refuses it", async () => {
    // A refused connect also rejects the adapter's own `initializing` promise, which nothing in
    // Payload awaits; observe it here so the run reports only this test's outcome.
    const { default: configPromise } = await import('./payload.config')
    const config = await configPromise
    const init = config.db.init
    config.db.init = (args) => {
      const adapter = init(args)
      ;(adapter as { initializing?: Promise<unknown> }).initializing?.catch(() => undefined)
      return adapter
    }
    await expect(instance.cms()).rejects.toThrow(/cannot connect to Postgres/)
    expect(accepted).toBeGreaterThan(0)
  }, 30_000)
})

describe('cmsPool()', () => {
  const as = (db: unknown) => ({ db }) as unknown as Parameters<Instance['cmsPool']>[0]
  let cmsPool: Instance['cmsPool']

  beforeAll(async () => {
    ;({ cmsPool } = await import('./instance'))
  })

  it("returns the adapter's pool, the very object databaseProbe() takes", () => {
    const pool = { connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) }
    expect(cmsPool(as({ pool }))).toBe(pool)
  })

  it('throws when the pool has no connect(): an unconnected instance, another adapter', () => {
    for (const db of [{}, { pool: null }, { pool: {} }, { pool: { connect: 'yes' } }]) {
      expect(() => cmsPool(as(db))).toThrow(/payload\.db\.pool\.connect is not a function/)
    }
  })
})

const database = process.env.CMS_TEST_DATABASE_URL

describe.skipIf(!database)('on a db:fresh database', () => {
  let instance: Instance
  let payload: Awaited<ReturnType<Instance['cms']>> | undefined

  beforeAll(async () => {
    useEnv({
      ...QUIET,
      DATABASE_URL: database,
      PGHOST: undefined,
      PGPORT: undefined,
      PAYLOAD_SECRET: SECRET,
    })
    instance = await importInstance()
  })

  afterAll(async () => {
    await payload?.destroy()
  }, 30_000)

  it('cms() twice — at once, then again — resolves one instance', async () => {
    const [first, second] = await Promise.all([instance.cms(), instance.cms()])
    payload = first
    expect(second).toBe(first)
    expect(await instance.cms()).toBe(first)
  }, 60_000)

  it('databaseProbe(cmsPool(payload))() answers READ COMMITTED', async () => {
    payload ??= await instance.cms()
    const probe = databaseProbe(instance.cmsPool(payload))
    expect(await probe()).toEqual({ transactionIsolation: 'read committed' })
  }, 30_000)
})

describe('the one server-route getPayload()', () => {
  const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const SOURCE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/
  const SKIPPED = new Set(['node_modules', 'dist', '.next', 'coverage'])

  function* modules(folder: string): Generator<string> {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory() && !SKIPPED.has(entry.name))
        yield* modules(path.join(folder, entry.name))
      else if (entry.isFile() && SOURCE.test(entry.name)) yield path.join(folder, entry.name)
    }
  }

  /** Whether the module calls `getPayload(` — as code, not in a comment or a string. */
  function callsGetPayload(file: string): boolean {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
    let found = false
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression
        const name = ts.isPropertyAccessExpression(callee) ? callee.name : callee
        if (ts.isIdentifier(name) && name.text === 'getPayload') found = true
      }
      if (!found) ts.forEachChild(node, visit)
    }
    visit(source)
    return found
  }

  it("is cms's instance; only cms's CLI and tests call getPayload( besides", () => {
    const callers = [...modules(packages)]
      .filter(callsGetPayload)
      .map((file) => path.relative(packages, file).split(path.sep).join('/'))
    expect(callers).toContain('cms/src/instance.ts')
    const others = callers.filter(
      (file) =>
        file !== 'cms/src/instance.ts' &&
        file !== 'cms/src/db/cli.ts' &&
        !/\.test\.[^/]+$/.test(file),
    )
    expect(others).toEqual([])
  })
})
