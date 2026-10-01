import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { writeFixtureApp, writeFixtureHttp, writeFixtureManifest } from './fixtures.mjs'
import { checkRouteParity } from './route-parity.mjs'

const repoRoot = process.cwd()

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

// Each case starts a Vite server: 5 s is too short on a loaded machine (qa's phase 4 gate, L2).
const LOADED = { timeout: 60_000 }

describe('checkRouteParity — degrades explicitly with no scaffolded apps', LOADED, () => {
  it('reports the manifest-only checks and degrades the per-app ones', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps') // does not exist
    // A root with no engine/packages/cms at all: slug discovery degrades too.
    const result = await checkRouteParity(repoRoot, {
      manifestAbsPath,
      appsAbsDir,
      collectionsRoot: sandbox,
    })
    expect(result.violations).toEqual([])
    expect(result.degraded.some((d) => d.includes('no app under'))).toBe(true)
    expect(result.degraded.some((d) => d.includes('registries/collections.ts exists'))).toBe(true)
  })

  it("reads the real CMS's slugs: users (built) and the frozen stubs, so it does not degrade", async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const result = await checkRouteParity(repoRoot, {
      manifestAbsPath,
      appsAbsDir: join(sandbox, 'apps'),
    })
    expect(result.violations).toEqual([])
    expect(result.degraded.some((d) => d.includes('collection-slug'))).toBe(false)
    expect(result.collectionSlugs).toContain('users')
    expect(result.collectionSlugs.length).toBeGreaterThan(1) // the stubs count (3.5.a)
  })
})
describe('checkRouteParity — the planted violations (2.2.i)', LOADED, () => {
  it('flags an engine route shadowing a reserved segment, and clears once removed', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const clean = writeFixtureManifest(sandbox)
    const before = await checkRouteParity(repoRoot, {
      manifestAbsPath: clean,
      appsAbsDir: join(sandbox, 'apps'),
    })
    expect(before.violations).toEqual([])

    const shadowed = writeFixtureManifest(join(sandbox, 'shadowed'), {
      includeShadowingRoute: true,
    })
    const violated = await checkRouteParity(repoRoot, {
      manifestAbsPath: shadowed,
      appsAbsDir: join(sandbox, 'apps'),
    })
    expect(violated.violations).toEqual([
      { kind: 'reserved-segment-collision', path: '/api/graphql/[...path]', segment: 'graphql' },
    ])
  })

  it('flags a missing route file, and clears once the app mounts it', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps')
    const http = writeFixtureHttp(sandbox)
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [{ path: '/api/health', exports: ['GET'] }], // cart route missing
    })
    const violated = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir, ...http })
    expect(violated.violations).toEqual([
      expect.objectContaining({
        kind: 'missing-route-file',
        app: 'fixture-storefront',
        path: '/api/x/commerce/cart/[[...path]]',
      }),
    ])

    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
    })
    const after = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir, ...http })
    expect(after.violations).toEqual([])
  })

  it('flags a method mismatch between the manifest and the mounted file', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps')
    const http = writeFixtureHttp(sandbox)
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET'] }, // missing POST
      ],
    })
    const result = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir, ...http })
    expect(result.violations).toEqual([
      expect.objectContaining({ kind: 'method-mismatch', missing: ['POST'], extra: [] }),
    ])
  })

  it("flags a proxy without the manifest's literal matcher, and clears once it matches", async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox, { matcher: ['/((?!api/).*)'] })
    const appsAbsDir = join(sandbox, 'apps')
    const http = writeFixtureHttp(sandbox)
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
      matcher: ['/different-matcher'],
    })
    const violated = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir, ...http })
    expect(violated.violations).toEqual([
      {
        kind: 'proxy-matcher-mismatch',
        app: 'fixture-storefront',
        expected: ['/((?!api/).*)'],
        actual: ['/different-matcher'],
      },
    ])

    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
      matcher: ['/((?!api/).*)'],
    })
    const after = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir, ...http })
    expect(after.violations).toEqual([])
  })

  it('degrades a proxy check explicitly when the app has no proxy.ts', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps')
    const http = writeFixtureHttp(sandbox)
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
      noProxy: true,
    })
    const result = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir, ...http })
    expect(result.violations).toEqual([])
    expect(result.degraded.some((d) => d.includes('no src/proxy.ts'))).toBe(true)
  })
})
