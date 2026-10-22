import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { firstDifference, NothingToCheckYet, runConfigDrift } from './config-drift.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('runConfigDrift — the mechanism, proven on a fixture generator (2.2.g)', () => {
  it('reports a gap when the committed file does not exist yet', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const generator = {
      name: 'fixture',
      committedPath: 'generated.txt',
      regenerate: async () => 'fresh content\n',
    }
    const result = await runConfigDrift(sandbox, [generator])
    expect(result.violations).toEqual([])
    expect(result.degraded).toEqual([
      'fixture: nothing to check yet — generated.txt does not exist',
    ])
  })

  it('reports drift, not a gap, when a required committed file is missing', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const generator = {
      name: 'fixture',
      committedPath: 'generated.txt',
      required: true,
      regenerate: async () => 'fresh content\n',
    }
    const result = await runConfigDrift(sandbox, [generator])
    expect(result.violations).toEqual([
      { name: 'fixture', path: 'generated.txt', detail: 'the file is not committed' },
    ])
  })

  it('reports a gap only for NothingToCheckYet — a generator that fails is a violation', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const notYet = {
      name: 'not-yet',
      committedPath: 'generated.txt',
      regenerate: async () => {
        throw new NothingToCheckYet('its prerequisite lands in a later task')
      },
    }
    const broken = {
      name: 'broken',
      committedPath: 'generated.txt',
      regenerate: async () => {
        throw new Error('payload exited 1')
      },
    }
    const result = await runConfigDrift(sandbox, [notYet, broken])
    expect(result.degraded).toEqual([
      'not-yet: nothing to check yet — its prerequisite lands in a later task',
    ])
    expect(result.violations).toEqual([
      { name: 'broken', path: 'generated.txt', detail: 'the generator failed: payload exited 1' },
    ])
  })

  it('regenerate → diff → fail on drift, then pass once the committed file matches again — the planted violation (2.2.i)', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const committedPath = 'generated.txt'
    writeFileSync(join(sandbox, committedPath), 'fresh content\n')
    const generator = { name: 'fixture', committedPath, regenerate: async () => 'fresh content\n' }

    const clean = await runConfigDrift(sandbox, [generator])
    expect(clean.violations).toEqual([])

    // Plant the violation: someone hand-edited the generated file.
    writeFileSync(join(sandbox, committedPath), 'hand-edited content\n')
    const drifted = await runConfigDrift(sandbox, [generator])
    expect(drifted.violations).toEqual([
      {
        name: 'fixture',
        path: committedPath,
        detail:
          'first difference at line 1: committed "hand-edited content", regenerated "fresh content"',
      },
    ])

    writeFileSync(join(sandbox, committedPath), 'fresh content\n')
    const after = await runConfigDrift(sandbox, [generator])
    expect(after.violations).toEqual([])
  })

  it('compares with expected() when given — the committed file read before a rewrite', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-'))
    const inPlace = (output) => ({
      name: 'importmap.fixture',
      committedPath: 'importMap.js',
      regenerate: async () => output,
      expected: async () => '{ "a": 1 }\n',
    })
    expect((await runConfigDrift(sandbox, [inPlace('{ "a": 1 }\n')])).violations).toEqual([])
    const drifted = await runConfigDrift(sandbox, [inPlace('{ "a": 2 }\n')])
    expect(drifted.violations).toEqual([
      {
        name: 'importmap.fixture',
        path: 'importMap.js',
        detail:
          'first difference at line 1: committed "{ \\"a\\": 1 }", regenerated "{ \\"a\\": 2 }"',
      },
    ])
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
    expect(result.violations).toEqual([
      expect.objectContaining({ name: 'drifted', path: 'a/gen.txt' }),
    ])
    expect(result.degraded).toHaveLength(1)
    expect(result.degraded[0]).toMatch(/not-wired/)
    expect(result.ran).toBe(2)
  })
})

describe('firstDifference', () => {
  it('names the first line that differs, and a file that ends early', () => {
    expect(firstDifference('a\nb\nc\n', 'a\nB\nc\n')).toBe(
      'first difference at line 2: committed "b", regenerated "B"',
    )
    expect(firstDifference('a\n', 'a\nextra\n')).toBe(
      'first difference at line 2: committed "", regenerated "extra"',
    )
    expect(firstDifference('a\nb', 'a', 'expected')).toBe(
      'first difference at line 2: expected "b", regenerated "<end of file>"',
    )
  })
})
