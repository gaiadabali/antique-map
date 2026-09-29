import { describe, expect, it } from 'vitest'

import { pnpmCommand, runPnpm, withoutKeys } from './pnpm.mjs'

describe('pnpmCommand', () => {
  it("runs pnpm's own JS entry when pnpm names one, else pnpm on PATH", () => {
    expect(pnpmCommand(['--version'], { npm_execpath: '/opt/pnpm/bin/pnpm.cjs' })).toEqual({
      bin: process.execPath,
      args: ['/opt/pnpm/bin/pnpm.cjs', '--version'],
    })
    expect(pnpmCommand(['--version'], {})).toEqual({ bin: 'pnpm', args: ['--version'] })
    // npm's own entry is not pnpm's
    expect(pnpmCommand(['-v'], { npm_execpath: '/usr/lib/npm/bin/npm-cli.js' }).bin).toBe('pnpm')
  })
})

describe('withoutKeys', () => {
  it('drops the named keys whatever their case, and keeps the rest', () => {
    expect(
      withoutKeys({ Path: 'p', DATABASE_URL: 'a', database_url: 'b', X: '1' }, ['DATABASE_URL']),
    ).toEqual({
      Path: 'p',
      X: '1',
    })
  })
})

describe('runPnpm', () => {
  it('runs pnpm with exactly the environment given and reports its exit code', async () => {
    const { code, stdout } = await runPnpm(['--version'], { env: process.env })
    expect(code).toBe(0)
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/)
  }, 60_000)
})
