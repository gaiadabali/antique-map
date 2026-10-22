import { describe, expect, it } from 'vitest'

import {
  databaseUrl,
  DEV_PAYLOAD_SECRET,
  migrateEnv,
  MigrateError,
  redactUrl,
  runMigrations,
} from './migrate.mjs'

describe('databaseUrl', () => {
  it("defaults to the local stack's Postgres (.env.example)", () => {
    expect(databaseUrl('test_p3_x_gallery', {})).toBe(
      'postgres://postgres:postgres@localhost:5432/test_p3_x_gallery',
    )
  })

  it('follows POSTGRES_* and, over them, the direct transport’s PG* variables, encoded', () => {
    const env = { POSTGRES_USER: 'app', POSTGRES_PASSWORD: 'p@ss/word', POSTGRES_PORT: '5433' }
    expect(databaseUrl('db', env)).toBe('postgres://app:p%40ss%2Fword@localhost:5433/db')
    expect(databaseUrl('db', { ...env, PGHOST: '10.0.0.5', PGPORT: '6543', PGUSER: 'ci' })).toBe(
      'postgres://ci:p%40ss%2Fword@10.0.0.5:6543/db',
    )
  })
})

describe('redactUrl', () => {
  it("hides the URL's password wherever it appears", () => {
    const url = databaseUrl('db', { POSTGRES_PASSWORD: 'hunter2hunter2' })
    expect(redactUrl(`could not connect to ${url}`, url)).toBe(
      'could not connect to postgres://postgres:***@localhost:5432/db',
    )
  })
})

describe('migrateEnv — what the migrate child is handed (3.5.c)', () => {
  const parent = {
    PATH: '/bin',
    DATABASE_URL: 'postgres://someone-elses/db',
    PAYLOAD_SECRET: 'a real secret',
    RUN_MIGRATIONS: '1',
    PAYLOAD_DEV_PUSH: '1',
    NODE_ENV: 'production',
  }

  it('is this database and a dev secret — never a push, RUN_MIGRATIONS or NODE_ENV', () => {
    expect(migrateEnv({ database: 'indies_p3_x', env: parent })).toEqual({
      PATH: '/bin',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/indies_p3_x',
      PAYLOAD_SECRET: DEV_PAYLOAD_SECRET,
    })
  })
})

describe('runMigrations', () => {
  const base = { database: 'indies_p3_x', repoRoot: '/repo', env: {} }

  it('runs `pnpm --filter @engine/cms migrate` from the repo root and relays its messages', async () => {
    const calls = []
    const lines = []
    const run = async (args, options) => {
      calls.push({ args, options })
      return {
        code: 0,
        stdout:
          '{"level":30,"msg":"Migrating: 20260929_initial"}\n\u001b[32mINFO\u001b[39m: Done.\n',
        stderr: '',
      }
    }
    await runMigrations({ ...base, run, log: (line) => lines.push(line) })
    expect(calls).toHaveLength(1)
    expect(calls[0].args).toEqual(['--silent', '--filter', '@engine/cms', 'migrate'])
    expect(calls[0].options.cwd).toBe('/repo')
    expect(calls[0].options.env.DATABASE_URL).toMatch(/\/indies_p3_x$/)
    expect(lines).toEqual([
      '[db] migrate indies_p3_x: pnpm --filter @engine/cms migrate',
      '[db]   Migrating: 20260929_initial',
      '[db]   INFO: Done.',
    ])
  })

  it('refuses a failed migration with its last words, the password redacted', async () => {
    const env = { POSTGRES_PASSWORD: 'not-for-logs-123' }
    const run = async () => ({
      code: 1,
      stdout: '',
      stderr: `error: connect ECONNREFUSED postgres://postgres:not-for-logs-123@localhost:5432/x\n`,
    })
    const error = await runMigrations({ ...base, env, run, log: () => {} }).catch((e) => e)
    expect(error).toBeInstanceOf(MigrateError)
    expect(error.message).toMatch(/exit 1[\s\S]*postgres:\*\*\*@localhost/)
    expect(error.message).not.toContain('not-for-logs-123')
  })
})
