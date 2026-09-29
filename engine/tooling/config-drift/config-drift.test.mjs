import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { runConfigDrift } from './config-drift.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('runConfigDrift — the mechanism, proven on a fixture generator (2.2.g)', () => {
  it('reports a gap when the committed file does not exist yet', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const generator = { name: 'fixture', committedPath: 'generated.txt', regenerate: async () => 'fresh content\n' }
    const result = await runConfigDrift(sandbox, [generator])
    expect(result.violations).toEqual([])
    expect(result.degraded).toEqual(['fixture: nothing to check yet — generated.txt does not exist'])
  })

  it('reports a gap when regenerate() itself cannot run yet (its prerequisite is missing)', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const generator = {
      name: 'fixture',
      committedPath: 'generated.txt',
      regenerate: async () => {
        throw new Error('no generator command wired up yet')
      },
    }
    const result = await runConfigDrift(sandbox, [generator])
    expect(result.degraded).toEqual(['fixture: nothing to check yet — no generator command wired up yet'])
  })

  it('regenerate → diff → fail on drift, then pass once the committed file matches again — the planted violation (2.2.i)', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const committedPath = 'generated.txt'
    writeFileSync(join(sandbox, committedPath), 'fresh content\n')
    const generator = { name: 'fixture', committedPath, regenerate: async () => 'fresh content\n' }

    const clean = await runConfigDrift(sandbox, [generator])
    expect(clean.violations).toEqual([])

    // Plant the violation: someone hand-edited the generated file (or the
    // config changed in a way `BRAND`-unset regeneration does not agree with).
    writeFileSync(join(sandbox, committedPath), 'hand-edited content\n')
    const drifted = await runConfigDrift(sandbox, [generator])
    expect(drifted.violations).toEqual([{ name: 'fixture', path: committedPath }])

    // Regenerate for real and commit the result: drift clears.
    writeFileSync(join(sandbox, committedPath), 'fresh content\n')
    const after = await runConfigDrift(sandbox, [generator])
    expect(after.violations).toEqual([])
  })

  it('checks several generators independently — one drifted, one degraded, one clean', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    mkdirSync(join(sandbox, 'a'))
    writeFileSync(join(sandbox, 'a', 'gen.txt'), 'v1')
    const generators = [
      { name: 'clean', committedPath: 'a/gen.txt', regenerate: async () => 'v1' },
      { name: 'drifted', committedPath: 'a/gen.txt', regenerate: async () => 'v2' },
      { name: 'not-wired', committedPath: 'missing.txt', regenerate: async () => null },
    ]
    const result = await runConfigDrift(sandbox, generators)
    expect(result.violations).toEqual([{ name: 'drifted', path: 'a/gen.txt' }])
    expect(result.degraded).toHaveLength(1)
    expect(result.degraded[0]).toMatch(/not-wired/)
  })
})
