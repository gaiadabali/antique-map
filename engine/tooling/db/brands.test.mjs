import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { discoverBrands } from './brands.mjs'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

/** Builds `<root>/<name>/README.md` — a minimal brand folder (BRANDS.md §2). */
function brandFolder(name) {
  mkdirSync(join(root, name), { recursive: true })
  writeFileSync(join(root, name, 'README.md'), `# ${name}\n`)
}

describe('discoverBrands', () => {
  it('finds the real brand folders, sorted, and never a literal slug', () => {
    root = mkdtempSync(join(tmpdir(), 'db-brands-'))
    brandFolder('test')
    brandFolder('fixture-emporium')
    brandFolder('fixture-atlas')
    mkdirSync(join(root, 'engine'), { recursive: true }) // infra, not a brand
    mkdirSync(join(root, 'docs'), { recursive: true })
    writeFileSync(join(root, 'docs', 'README.md'), '# docs\n') // has a README but is denylisted

    expect(discoverBrands(root)).toEqual(['fixture-atlas', 'fixture-emporium', 'test'])
  })

  it('ignores a top-level directory with no README.md', () => {
    root = mkdtempSync(join(tmpdir(), 'db-brands-'))
    brandFolder('test')
    mkdirSync(join(root, 'not-a-brand-yet'), { recursive: true })

    expect(discoverBrands(root)).toEqual(['test'])
  })

  it('ignores dotfolders', () => {
    root = mkdtempSync(join(tmpdir(), 'db-brands-'))
    brandFolder('test')
    mkdirSync(join(root, '.git'), { recursive: true })
    writeFileSync(join(root, '.git', 'README.md'), 'not a brand\n')

    expect(discoverBrands(root)).toEqual(['test'])
  })
})
