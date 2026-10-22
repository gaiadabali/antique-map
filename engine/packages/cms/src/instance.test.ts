/**
 * `@engine/cms/instance` (TASKS.md 4.8.d). Importing it opens nothing — proven with
 * `DATABASE_URL`, `PGHOST` and `PGPORT` at a sentinel listener that must accept no connection,
 * since an unset `DATABASE_URL` is not an absent database: `pg` falls back to `PGHOST` and to
 * `localhost:5432`, a workstation's own Postgres (CONVENTIONS.md §12). `cms()`'s first call is
 * what connects; a failed one leaves no unhandled rejection, and the next call retries. No module
 * under `engine/packages/**` but cms's CLI, this instance and tests calls `getPayload(`. What
 * needs a real database is `instance.db.test.ts`'s.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

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

/** Every variable that could make the config migrate or push, cleared. */
const QUIET = { RUN_MIGRATIONS: undefined, PAYLOAD_DEV_PUSH: undefined }

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
  }, 120_000)

  it("cms()'s first call is what connects, a failed one leaves no unhandled rejection, and the next retries", async () => {
    // Payload rejects its adapter's `initializing` promise on a failed connect and awaits it
    // nowhere; `db/adapter` observes it, or a plain Node process would die here (review N1).
    const unhandled: unknown[] = []
    const record = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', record)
    try {
      await expect(instance.cms()).rejects.toThrow(/cannot connect to Postgres/)
      const afterFirst = accepted
      expect(afterFirst).toBeGreaterThan(0)
      // Nothing is cached from a failed first call: the second connects again.
      await expect(instance.cms()).rejects.toThrow(/cannot connect to Postgres/)
      expect(accepted).toBeGreaterThan(afterFirst)
      await new Promise((resolve) => setTimeout(resolve, 100))
    } finally {
      process.off('unhandledRejection', record)
    }
    expect(unhandled).toEqual([])
  }, 120_000)
})

describe('cmsPool()', () => {
  const as = (db: unknown) => ({ db }) as unknown as Parameters<Instance['cmsPool']>[0]
  let cmsPool: Instance['cmsPool']

  beforeAll(async () => {
    ;({ cmsPool } = await import('./instance'))
  }, 120_000)

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
        !/\.test(-support)?\.[^/]+$/.test(file),
    )
    expect(others).toEqual([])
  }, 120_000)
})
