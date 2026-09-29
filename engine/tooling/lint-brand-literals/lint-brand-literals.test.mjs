import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { collectBannedTerms, discoverRealBrands } from './banned-terms.mjs'
import { lintBrandLiterals } from './lint-brand-literals.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A fictional two-brand-plus-test repo shape, so no real slug ever appears here. */
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'lbl-'))
  for (const slug of ['fixture-atlas', 'fixture-bazaar', 'test']) {
    mkdirSync(join(root, slug), { recursive: true })
    writeFileSync(join(root, slug, 'README.md'), `# ${slug}\n`)
  }
  mkdirSync(join(root, 'engine', 'packages', 'domain', 'src'), { recursive: true })
  return root
}

describe('discoverRealBrands', () => {
  it('finds every brand folder but the synthetic test brand', () => {
    const root = (sandbox = makeRepo())
    expect(discoverRealBrands(root)).toEqual(['fixture-atlas', 'fixture-bazaar'])
  })
})

describe('collectBannedTerms', () => {
  it('derives slug and title-cased name, and reports a gap with no brand.config.json', () => {
    const root = (sandbox = makeRepo())
    const { terms, gaps } = collectBannedTerms(root)
    expect(terms).toContain('fixture-atlas')
    expect(terms).toContain('Fixture Atlas')
    expect(gaps.sort()).toEqual(['fixture-atlas', 'fixture-bazaar'])
  })

  it('reads slug, name and domains once a brand.config.json exists', () => {
    const root = (sandbox = makeRepo())
    mkdirSync(join(root, 'fixture-atlas', 'site'), { recursive: true })
    writeFileSync(
      join(root, 'fixture-atlas', 'site', 'brand.config.json'),
      JSON.stringify({
        slug: 'fixture-atlas',
        name: 'Fixture Atlas',
        domains: { production: 'fixture-atlas.example.test', staging: null },
      }),
    )
    const { terms, gaps } = collectBannedTerms(root)
    expect(terms).toContain('fixture-atlas.example.test')
    expect(gaps).toEqual(['fixture-bazaar'])
  })
})

describe('lintBrandLiterals — the planted violation (2.2.i)', () => {
  it('fails on a brand literal under engine/ and passes once it is removed', () => {
    const root = (sandbox = makeRepo())
    const file = join(root, 'engine', 'packages', 'domain', 'src', 'money.ts')
    writeFileSync(file, "export const base = 'usd'\n")
    const before = lintBrandLiterals(root)
    expect(before.violations).toEqual([])

    writeFileSync(file, "if (brand.slug === 'fixture-atlas') { /* … */ }\n")
    const violated = lintBrandLiterals(root)
    expect(violated.violations).toEqual([
      { path: 'engine/packages/domain/src/money.ts', line: 1, term: 'fixture-atlas' },
    ])

    writeFileSync(file, "if (hasModule(brand, 'purchase.offers')) { /* … */ }\n")
    const after = lintBrandLiterals(root)
    expect(after.violations).toEqual([])
  })

  it('excludes migrations, fixtures and .env files', () => {
    const root = (sandbox = makeRepo())
    mkdirSync(join(root, 'engine', 'packages', 'cms', 'src', 'migrations'), { recursive: true })
    writeFileSync(
      join(root, 'engine', 'packages', 'cms', 'src', 'migrations', '0001_init.ts'),
      "-- fixture-atlas\n",
    )
    mkdirSync(join(root, 'engine', 'packages', 'domain', 'src', '__fixtures__'), { recursive: true })
    writeFileSync(
      join(root, 'engine', 'packages', 'domain', 'src', '__fixtures__', 'catalogue.ts'),
      "export const title = 'fixture-atlas map'\n",
    )
    writeFileSync(join(root, 'engine', '.env.local'), 'FIXTURE_ATLAS=1\n')
    expect(lintBrandLiterals(root).violations).toEqual([])
  })

  it('degrades explicitly when no brand folder exists yet', () => {
    const root = (sandbox = mkdtempSync(join(tmpdir(), 'lbl-empty-')))
    mkdirSync(join(root, 'engine'), { recursive: true })
    const result = lintBrandLiterals(root)
    expect(result.terms).toEqual([])
    expect(result.violations).toEqual([])
  })
})
