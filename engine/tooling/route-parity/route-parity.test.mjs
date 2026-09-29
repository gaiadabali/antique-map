import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkRouteParity } from './route-parity.mjs'

const repoRoot = process.cwd()

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A tiny fixture manifest — three routes, one deliberately shadowing `graphql`. */
function writeFixtureManifest(dir, { includeShadowingRoute = false, matcher = ["/((?!api/).*)"] } = {}) {
  mkdirSync(dir, { recursive: true })
  const routes = [
    "{ path: '/api/health', handler: '@engine/http/health', methods: ['GET'] }",
    "{ path: '/api/x/commerce/cart/[[...path]]', handler: '@engine/http/commerce/cart', methods: ['GET', 'POST'] }",
  ]
  if (includeShadowingRoute) {
    routes.push("{ path: '/api/x/graphql/[...path]', handler: '@engine/http/graphql', methods: ['GET'] }")
  }
  const file = join(dir, 'manifest.ts')
  writeFileSync(
    file,
    `export const ENGINE_ROUTES = [${routes.join(', ')}]\n` +
      `export const PROXY_MATCHER = ${JSON.stringify(matcher)}\n`,
  )
  return file
}

function writeFixtureApp(appsDir, name, { mountedRoutes = [], matcher = ["/((?!api/).*)"], noProxy = false } = {}) {
  const appDir = join(appsDir, name)
  for (const { path, exports } of mountedRoutes) {
    const routeFile = join(appDir, 'src', 'app', ...path.split('/').filter(Boolean), 'route.ts')
    mkdirSync(join(routeFile, '..'), { recursive: true })
    writeFileSync(routeFile, exports.map((m) => `export const ${m} = () => new Response('ok')`).join('\n') + '\n')
  }
  mkdirSync(join(appDir, 'src', 'app'), { recursive: true }) // ensures discoverScaffoldedApps sees it even with 0 routes
  if (!noProxy) {
    writeFileSync(
      join(appDir, 'src', 'proxy.ts'),
      `export const config = ${JSON.stringify({ matcher })}\n`,
    )
  }
  return appDir
}

describe('checkRouteParity — degrades explicitly with no scaffolded apps', () => {
  it('reports the manifest-only checks and degrades the per-app ones', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps') // does not exist
    const result = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir })
    expect(result.violations).toEqual([])
    expect(result.degraded.some((d) => d.includes('no app under'))).toBe(true)
    expect(result.degraded.some((d) => d.includes('collections does not exist'))).toBe(true)
  })
})

describe('checkRouteParity — the planted violations (2.2.i)', () => {
  it('flags an engine route shadowing a reserved segment, and clears once removed', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const clean = writeFixtureManifest(sandbox)
    const before = await checkRouteParity(repoRoot, { manifestAbsPath: clean, appsAbsDir: join(sandbox, 'apps') })
    expect(before.violations).toEqual([])

    const shadowed = writeFixtureManifest(join(sandbox, 'shadowed'), { includeShadowingRoute: true })
    const violated = await checkRouteParity(repoRoot, {
      manifestAbsPath: shadowed,
      appsAbsDir: join(sandbox, 'apps'),
    })
    expect(violated.violations).toEqual([
      { kind: 'reserved-segment-collision', path: '/api/x/graphql/[...path]', segment: 'graphql' },
    ])
  })

  it('flags a missing route file, and clears once the app mounts it', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps')
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [{ path: '/api/health', exports: ['GET'] }], // cart route missing
    })
    const violated = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir })
    expect(violated.violations).toEqual([
      expect.objectContaining({ kind: 'missing-route-file', app: 'fixture-storefront', path: '/api/x/commerce/cart/[[...path]]' }),
    ])

    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
    })
    const after = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir })
    expect(after.violations).toEqual([])
  })

  it('flags a method mismatch between the manifest and the mounted file', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps')
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET'] }, // missing POST
      ],
    })
    const result = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir })
    expect(result.violations).toEqual([
      expect.objectContaining({ kind: 'method-mismatch', missing: ['POST'], extra: [] }),
    ])
  })

  it('flags a proxy without the manifest\'s literal matcher, and clears once it matches', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox, { matcher: ['/((?!api/).*)'] })
    const appsAbsDir = join(sandbox, 'apps')
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
      matcher: ['/different-matcher'],
    })
    const violated = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir })
    expect(violated.violations).toEqual([
      { kind: 'proxy-matcher-mismatch', app: 'fixture-storefront', expected: ['/((?!api/).*)'], actual: ['/different-matcher'] },
    ])

    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
      matcher: ['/((?!api/).*)'],
    })
    const after = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir })
    expect(after.violations).toEqual([])
  })

  it('degrades a proxy check explicitly when the app has no proxy.ts', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-'))
    const manifestAbsPath = writeFixtureManifest(sandbox)
    const appsAbsDir = join(sandbox, 'apps')
    writeFixtureApp(appsAbsDir, 'fixture-storefront', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
      ],
      noProxy: true,
    })
    const result = await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir })
    expect(result.violations).toEqual([])
    expect(result.degraded.some((d) => d.includes('no src/proxy.ts'))).toBe(true)
  })
})
