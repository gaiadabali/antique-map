import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { discoverCollectionSlugs, slugsInRegistry } from './collections.mjs'
import { writeFixtureCms, writeFixtureManifest } from './fixtures.mjs'
import { checkRouteParity } from './route-parity.mjs'

const repoRoot = process.cwd()

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('discoverCollectionSlugs — built collections and the frozen list (3.5.a)', () => {
  it('finds the real users collection and every COLLECTION_SLUGS entry', () => {
    const real = discoverCollectionSlugs(repoRoot)
    expect(real.available).toBe(true)
    expect(real.slugs).toContain('users')
    expect(real.sources).toEqual([
      'engine/packages/cms/src/collections',
      'engine/packages/cms/src/registries/collections.ts COLLECTION_SLUGS',
    ])
  })

  it('counts a stub slug listed only in the registry, and flags a route shadowing it', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    writeFixtureCms(sandbox, {
      built: ['fixture-built'],
      frozen: ['fixture-built', 'fixture-stub'],
    })
    expect(discoverCollectionSlugs(sandbox)).toEqual({
      slugs: ['fixture-built', 'fixture-stub'],
      available: true,
      sources: [
        'engine/packages/cms/src/collections',
        'engine/packages/cms/src/registries/collections.ts COLLECTION_SLUGS',
      ],
    })

    const manifestAbsPath = writeFixtureManifest(join(sandbox, 'manifest'), {
      extraRoutes: [
        "{ path: '/api/fixture-stub/[...path]', handler: '@engine/http/fixture-stub', methods: ['GET'] }",
        "{ path: '/api/x/fixture-built/[...path]', handler: '@engine/http/fixture-built', methods: ['GET'] }",
      ],
    })
    const result = await checkRouteParity(repoRoot, {
      manifestAbsPath,
      appsAbsDir: join(sandbox, 'apps'),
      collectionsRoot: sandbox,
    })
    expect(result.violations).toEqual([
      {
        kind: 'reserved-segment-collision',
        path: '/api/fixture-stub/[...path]',
        segment: 'fixture-stub',
      },
    ])
  })

  it('reads the registry alone, before any collection folder exists', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    writeFixtureCms(sandbox, { frozen: ['fixture-stub'] })
    expect(discoverCollectionSlugs(sandbox)).toMatchObject({
      slugs: ['fixture-stub'],
      available: true,
    })
  })

  it('refuses a registry it cannot read, rather than checking nothing', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    writeFixtureCms(sandbox, { registryText: 'export const SOMETHING_ELSE = []\n' })
    expect(() => discoverCollectionSlugs(sandbox)).toThrow(/no COLLECTION_SLUGS/)
  })
})

describe('slugsInRegistry', () => {
  it('reads the literal with a type annotation, `as const`, comments and either quote', () => {
    const text = [
      '/** COLLECTION_SLUGS is the frozen list. */',
      'export const COLLECTION_SLUGS: readonly string[] = [',
      "  'alpha', // built",
      '  "beta-two",',
      "  /* 'not-a-slug', */ 'gamma',",
      '] as const',
    ].join('\n')
    expect(slugsInRegistry(text)).toEqual(['alpha', 'beta-two', 'gamma'])
    expect(slugsInRegistry('export const OTHER = []')).toBeNull()
  })
})
