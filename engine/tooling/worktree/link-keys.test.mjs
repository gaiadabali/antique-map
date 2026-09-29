import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseLinkTokenKeys, runBootCheck } from '@engine/config/boot-check'
import { afterEach, describe, expect, it } from 'vitest'

import { parseEnv, readEnvFile } from './env-file.mjs'
import { ensureLinkTokenKeys, generateDevRing, LINK_KEY_VARIABLE } from './link-keys.mjs'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url))

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A throwaway git repository standing in for a fresh worktree. */
function freshRepo() {
  sandbox = mkdtempSync(join(tmpdir(), 'wt-'))
  execFileSync('git', ['init', '--quiet'], { cwd: sandbox })
  return sandbox
}

/** `pnpm worktree:env <phase> <lane> [...flags]` in `cwd`; returns its stdout. */
function worktreeEnv(cwd, ...args) {
  return execFileSync(process.execPath, [CLI, 'env', ...args], { cwd, encoding: 'utf8' })
}

describe('generateDevRing()', () => {
  it('is one current "dev" key of 32 bytes, base64url, which parseLinkTokenKeys() accepts', () => {
    const ring = generateDevRing()
    expect(ring).toMatch(/^dev:[A-Za-z0-9_-]{43}$/)
    const parsed = parseLinkTokenKeys(ring)
    expect(parsed.problems).toEqual([])
    expect(parsed.ok).toBe(true)
    expect(parsed.ring.current.kid).toBe('dev')
    expect(parsed.ring.current.secret).toHaveLength(32)
    expect(parsed.ring.keys).toHaveLength(1)
  })

  it('is fresh each time', () => {
    const rings = new Set(Array.from({ length: 20 }, () => generateDevRing()))
    expect(rings.size).toBe(20)
  })

  it('never emits bytes parseLinkTokenKeys() refuses as not random — it draws again', () => {
    const draws = [
      Buffer.alloc(32, 0x0b), // one byte repeated: C6's test-vector key
      Buffer.from(Array.from({ length: 32 }, (_, i) => i % 8)), // a pattern
      Buffer.from('a'.repeat(16) + 'bcdefghijklmnopq'), // printable text
      Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 37 + 200) % 256)),
    ]
    const ring = generateDevRing(() => draws.shift())
    expect(draws).toHaveLength(0)
    expect(parseLinkTokenKeys(ring).ok).toBe(true)
  })
})

describe('ensureLinkTokenKeys()', () => {
  it('adds a ring when absent or blank and keeps one that is set', () => {
    const dir = (sandbox = mkdtempSync(join(tmpdir(), 'wt-')))
    const file = join(dir, '.env.local')
    writeFileSync(file, `# mine\nPORT=4100\n${LINK_KEY_VARIABLE}=\nOTHER=x\n`)
    expect(ensureLinkTokenKeys(file)).toBe('added')
    const ring = readEnvFile(file).get(LINK_KEY_VARIABLE)
    expect(parseLinkTokenKeys(ring).ok).toBe(true)
    expect(readFileSync(file, 'utf8')).toBe(
      `# mine\nPORT=4100\n${LINK_KEY_VARIABLE}=${ring}\nOTHER=x\n`,
    )

    expect(ensureLinkTokenKeys(file)).toBe('kept')
    expect(readEnvFile(file).get(LINK_KEY_VARIABLE)).toBe(ring)

    const hand = `k2:${generateDevRing().slice(4)},k1:revoked`
    writeFileSync(file, `${LINK_KEY_VARIABLE}=${hand}\n`)
    expect(ensureLinkTokenKeys(file)).toBe('kept')
    expect(readFileSync(file, 'utf8')).toBe(`${LINK_KEY_VARIABLE}=${hand}\n`)
  })
})

describe('worktree:env and the link-key ring (3.3.c)', () => {
  it("writes a ring into a new worktree's .env.local that bootCheck() accepts", async () => {
    const repo = freshRepo()
    const out = worktreeEnv(repo, '3', 'HAR')
    expect(out).toMatch(/LINK_TOKEN_KEYS=… {2}added/)
    const local = readEnvFile(join(repo, '.env.local'))
    const ring = local.get(LINK_KEY_VARIABLE)
    expect(out).not.toContain(ring) // a secret never reaches the log

    // A workstation: .env.example's defaults, this .env.local over them, a database named.
    const env = {
      ...Object.fromEntries(parseEnv(readFileSync(join(REPO_ROOT, '.env.example'), 'utf8'))),
      ...Object.fromEntries(local),
      DATABASE_URL: `postgres://postgres:postgres@localhost:5432/test_gallery_${local.get('DB_SUFFIX')}`,
      SITE_URL: `http://localhost:${local.get('PORT')}`,
    }
    const report = await runBootCheck({ env, cwd: REPO_ROOT, fresh: true })
    expect(report.problems).toEqual([])
    expect(report.ok).toBe(true)
    expect(report.warnings.filter((w) => w.subject === LINK_KEY_VARIABLE)).toEqual([])
  }, 60_000)

  it('keeps the ring on a re-run, --force included', () => {
    const repo = freshRepo()
    worktreeEnv(repo, '3', 'HAR')
    const file = join(repo, '.env.local')
    const first = readFileSync(file, 'utf8')
    expect(worktreeEnv(repo, '3', 'HAR')).toMatch(/LINK_TOKEN_KEYS=… {2}kept/)
    expect(readFileSync(file, 'utf8')).toBe(first)
    worktreeEnv(repo, '3', 'HAR', '--force')
    expect(readFileSync(file, 'utf8')).toBe(first)
  }, 60_000)
})
