import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkFileSize, countLines, isExcluded, LIMIT } from './check-file-size.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

function makeFile(root, relPath, lines) {
  const abs = join(root, relPath)
  mkdirSync(join(abs, '..'), { recursive: true })
  writeFileSync(abs, Array.from({ length: lines }, (_, i) => `const x${i} = ${i}`).join('\n') + '\n')
  return abs
}

describe('countLines', () => {
  it('does not count a trailing newline as an extra line', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'cfs-')))
    const file = makeFile(root, 'a.ts', 5)
    expect(countLines(file)).toBe(5)
  })
})

describe('isExcluded', () => {
  it('excludes generated files, migrations and fixtures', () => {
    expect(isExcluded('engine/apps/gallery/payload-types.ts')).toBe(true)
    expect(isExcluded('engine/packages/cms/src/migrations/0001_init.ts')).toBe(true)
    expect(isExcluded('engine/packages/domain/src/__fixtures__/big.ts')).toBe(true)
    expect(isExcluded('engine/packages/domain/src/money.ts')).toBe(false)
  })
})

describe('checkFileSize — the planted violation (2.2.i)', () => {
  it('fails on a file over the 300-line limit and passes once it is removed', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'cfs-')))
    makeFile(root, 'engine/packages/domain/src/ok.ts', LIMIT)
    const before = checkFileSize(root, ['engine'])
    expect(before).toEqual([])

    makeFile(root, 'engine/packages/domain/src/too-long.ts', LIMIT + 1)
    const violated = checkFileSize(root, ['engine'])
    expect(violated).toEqual([{ path: 'engine/packages/domain/src/too-long.ts', lines: LIMIT + 1 }])

    rmSync(join(root, 'engine/packages/domain/src/too-long.ts'))
    const after = checkFileSize(root, ['engine'])
    expect(after).toEqual([])
  })

  it('does not flag a file over the limit that is excluded (a migration)', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'cfs-')))
    makeFile(root, 'engine/packages/cms/src/migrations/0002_big.ts', LIMIT + 50)
    expect(checkFileSize(root, ['engine'])).toEqual([])
  })

  it('skips a root that does not exist yet', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'cfs-')))
    expect(checkFileSize(root, ['scripts'])).toEqual([])
  })
})
