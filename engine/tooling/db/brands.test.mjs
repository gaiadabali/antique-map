import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { brandLayout, discoverBrands } from './brands.mjs'

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

describe('brandLayout (3.5.c)', () => {
  it('tells a single-config brand from one with a config per storefront, from file names', () => {
    root = mkdtempSync(join(tmpdir(), 'db-brands-'))
    mkdirSync(join(root, 'fixture-atlas', 'site'), { recursive: true })
    writeFileSync(join(root, 'fixture-atlas', 'site', 'brand.config.json'), '{}\n')
    mkdirSync(join(root, 'fixture-synthetic', 'site', 'copy'), { recursive: true })
    for (const file of ['brand.gallery.json', 'brand.emporium.json', 'notes.json']) {
      writeFileSync(join(root, 'fixture-synthetic', 'site', file), '{}\n')
    }
    mkdirSync(join(root, 'fixture-empty', 'site'), { recursive: true })

    expect(brandLayout(root, 'fixture-atlas')).toEqual({ single: true, storefronts: [] })
    expect(brandLayout(root, 'fixture-synthetic')).toEqual({
      single: false,
      storefronts: ['emporium', 'gallery'],
    })
    expect(brandLayout(root, 'fixture-empty')).toEqual({ single: false, storefronts: [] })
    expect(brandLayout(root, 'fixture-missing')).toEqual({ single: false, storefronts: [] })
  })
})
