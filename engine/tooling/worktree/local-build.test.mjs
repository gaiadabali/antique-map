import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOCAL_PRODUCTION_BUILD } from '@engine/config/boot-check'
import { afterEach, describe, expect, it } from 'vitest'

import { readEnvFile } from './env-file.mjs'
import { ensureLocalProductionBuild, LOCAL_BUILD_VARIABLE } from './local-build.mjs'

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url))

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('ensureLocalProductionBuild() (3.5.g)', () => {
  it('is the variable bootCheck() reads', () => {
    expect(LOCAL_BUILD_VARIABLE).toBe(LOCAL_PRODUCTION_BUILD)
  })

  it('adds LOCAL_PRODUCTION_BUILD=1 when absent or blank, and keeps any value', () => {
    const dir = (sandbox = mkdtempSync(join(tmpdir(), 'wt-lpb-')))
    const file = join(dir, '.env.local')
    writeFileSync(file, `PORT=4100\n${LOCAL_BUILD_VARIABLE}=\n`)
    expect(ensureLocalProductionBuild(file)).toBe('added')
    expect(readFileSync(file, 'utf8')).toBe(`PORT=4100\n${LOCAL_BUILD_VARIABLE}=1\n`)
    expect(ensureLocalProductionBuild(file)).toBe('kept')

    writeFileSync(file, `${LOCAL_BUILD_VARIABLE}=0\n`)
    expect(ensureLocalProductionBuild(file)).toBe('kept')
    expect(readFileSync(file, 'utf8')).toBe(`${LOCAL_BUILD_VARIABLE}=0\n`)

    writeFileSync(file, 'OTHER=x\n')
    expect(ensureLocalProductionBuild(file)).toBe('added')
    expect(readEnvFile(file).get(LOCAL_BUILD_VARIABLE)).toBe('1')
  })
})

describe('worktree:env and LOCAL_PRODUCTION_BUILD (3.5.g)', () => {
  it("writes LOCAL_PRODUCTION_BUILD=1 into a new worktree's .env.local and never overwrites it, --force included", () => {
    const repo = (sandbox = mkdtempSync(join(tmpdir(), 'wt-lpb-')))
    execFileSync('git', ['init', '--quiet'], { cwd: repo })
    const run = (...args) =>
      execFileSync(process.execPath, [CLI, 'env', '3', 'HAR', ...args], {
        cwd: repo,
        encoding: 'utf8',
      })
    expect(run()).toMatch(/LOCAL_PRODUCTION_BUILD=1 {2}added/)
    const file = join(repo, '.env.local')
    expect(readEnvFile(file).get(LOCAL_BUILD_VARIABLE)).toBe('1')

    // The line itself, not the header comment that names it.
    const edited = readFileSync(file, 'utf8').replace(
      /^LOCAL_PRODUCTION_BUILD=1$/m,
      'LOCAL_PRODUCTION_BUILD=0',
    )
    expect(edited).toMatch(/^LOCAL_PRODUCTION_BUILD=0$/m)
    writeFileSync(file, edited)
    expect(run('--force')).toMatch(/LOCAL_PRODUCTION_BUILD=0 {2}kept/)
    expect(readFileSync(file, 'utf8')).toBe(edited)
  }, 60_000)
})
