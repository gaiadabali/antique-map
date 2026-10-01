// TASKS.md 5.4.a — which module a mount names (C13 `UNBUILT_HANDLER`'s policy), each rule proven
// by a planted violation in a sandbox that clears once it is removed.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { writeFixtureApp, writeFixtureHttp, writeFixtureManifest } from './fixtures.mjs'
import { checkRouteParity } from './route-parity.mjs'
import { findSpecifierMismatches } from './specifiers.mjs'

const repoRoot = process.cwd()
const CART = '/api/x/commerce/cart/[[...path]]'
const HEALTH = { path: '/api/health', exports: ['GET'] }
const cart = (from) => ({ path: CART, exports: ['GET', 'POST'], from })
const EVERY_METHOD = "export const GET = () => new Response('ok')\nexport const POST = GET\n"
/** Each case starts a Vite server: generous on a loaded machine (qa's phase 4 gate, L2). */
const LOADED = { timeout: 60_000 }

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** Route parity over fixture apps (`{ name: mountedRoutes }`), with a fixture `@engine/http`. */
async function parity(apps, http = {}) {
  sandbox ??= mkdtempSync(join(tmpdir(), 'rp-spec-'))
  const appsAbsDir = join(sandbox, 'apps')
  rmSync(appsAbsDir, { recursive: true, force: true })
  for (const [name, mountedRoutes] of Object.entries(apps)) {
    writeFixtureApp(appsAbsDir, name, { mountedRoutes })
  }
  const manifestAbsPath = writeFixtureManifest(join(sandbox, 'manifest'))
  const options = { manifestAbsPath, appsAbsDir, ...writeFixtureHttp(sandbox, http) }
  return (await checkRouteParity(repoRoot, options)).violations
}

describe('a mount names handlerOf(path) or unbuiltHandlerOf(path) (5.4.a)', LOADED, () => {
  it('passes the handler for a built route and the placeholder for an unbuilt one', async () => {
    expect(await parity({ one: [HEALTH, cart()], two: [HEALTH, cart()] })).toEqual([])
  })

  it("flags a mount naming another route's handler, and clears once it names its own", async () => {
    expect(await parity({ one: [HEALTH, cart('@engine/http/health')] })).toEqual([
      expect.objectContaining({
        kind: 'wrong-specifier',
        app: 'one',
        path: CART,
        file: expect.stringContaining(join('one', 'src', 'app', 'api', 'x', 'commerce')),
        expected: ['@engine/http/commerce/cart', '@engine/http/unbuilt'],
        actual: ['@engine/http/health'],
      }),
    ])
    expect(await parity({ one: [HEALTH, cart('@engine/http/unbuilt')] })).toEqual([])
  })

  it('flags a mount that defines its handler instead of re-exporting one', async () => {
    expect(await parity({ one: [HEALTH, cart(null)] })).toEqual([
      expect.objectContaining({ kind: 'wrong-specifier', path: CART, actual: [] }),
    ])
  })
})

describe('the placeholder only while the handler has no module (5.4.a)', LOADED, () => {
  const built = { handlers: { 'commerce/cart': EVERY_METHOD } }

  it('flags a placeholder once src/<area>/route.ts exists, and clears once repointed', async () => {
    expect(await parity({ one: [HEALTH, cart('@engine/http/unbuilt')] }, built)).toEqual([
      expect.objectContaining({
        kind: 'placeholder-with-handler',
        app: 'one',
        path: CART,
        placeholder: '@engine/http/unbuilt',
        handler: '@engine/http/commerce/cart',
      }),
    ])
    expect(await parity({ one: [HEALTH, cart('@engine/http/commerce/cart')] }, built)).toEqual([])
  })

  it('flags a handler named before its module exists', async () => {
    expect(await parity({ one: [HEALTH, cart('@engine/http/commerce/cart')] })).toEqual([
      expect.objectContaining({ kind: 'missing-handler', handler: '@engine/http/commerce/cart' }),
    ])
  })
})

describe('both apps name the same specifier for each route (5.4.a)', LOADED, () => {
  it('flags two apps that disagree, and clears once both repoint', async () => {
    const built = { handlers: { 'commerce/cart': EVERY_METHOD } }
    const apps = { one: [HEALTH, cart('@engine/http/commerce/cart')], two: [HEALTH, cart()] }
    const violations = await parity(apps, built)
    expect(violations).toContainEqual({
      kind: 'specifier-mismatch',
      path: CART,
      byApp: { one: ['@engine/http/commerce/cart'], two: ['@engine/http/unbuilt'] },
    })
    const both = { one: apps.one, two: [HEALTH, cart('@engine/http/commerce/cart')] }
    expect(await parity(both, built)).toEqual([])
  })

  it('compares what each app names, route by route', () => {
    const byPath = new Map([
      ['/a', { one: ['@engine/http/a'], two: ['@engine/http/a'] }],
      ['/b', { one: ['@engine/http/b'], two: ['@engine/http/unbuilt'] }],
    ])
    expect(findSpecifierMismatches(byPath)).toEqual([
      {
        kind: 'specifier-mismatch',
        path: '/b',
        byApp: { one: ['@engine/http/b'], two: ['@engine/http/unbuilt'] },
      },
    ])
  })
})
