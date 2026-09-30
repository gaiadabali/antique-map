// qa's 5.4 gate, B1 — the paths to Payload a specifier check alone never sees, each planted and
// refused, then cleared once removed: a relative path into cms, a `#` subpath import, a symlink,
// a side-effect import in a mount, `createRequire(…)('payload')`, and an import Vite externalises
// to Node (`./payload-guard.mjs`'s hooks).
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { writeFixtureApp, writeFixtureHttp, writeFixtureManifest } from './fixtures.mjs'
import { withPayloadGuard } from './payload-guard.mjs'
import { checkRouteParity } from './route-parity.mjs'

const repoRoot = process.cwd()
const CMS = join(repoRoot, 'engine', 'packages', 'cms')
const CMS_INSTANCE = join(CMS, 'src', 'instance.ts')
const fromCms = createRequire(join(CMS, 'package.json'))
const posix = (path) => path.split('\\').join('/')
const MOUNTS = [
  { path: '/api/health', exports: ['GET'] },
  { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
]
const HEALTH_MOUNT = join('apps', 'one', 'src', 'app', 'api', 'health', 'route.ts')
/** Each case starts a Vite server: generous on a loaded machine (qa's phase 4 gate, L2). */
const LOADED = { timeout: 60_000 }

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** Route parity with the health handler's text `route(httpSrc)`, after `plant(sandbox, httpSrc)`. */
async function parity(route, plant = () => {}) {
  sandbox = mkdtempSync(join(tmpdir(), 'rp-guard-'))
  const appsAbsDir = join(sandbox, 'apps')
  writeFixtureApp(appsAbsDir, 'one', { mountedRoutes: MOUNTS })
  const manifestAbsPath = writeFixtureManifest(join(sandbox, 'manifest'))
  const httpSrc = join(sandbox, 'http-src')
  const http = writeFixtureHttp(sandbox, { handlers: { health: route(httpSrc) } })
  plant(sandbox, httpSrc)
  return (await checkRouteParity(repoRoot, { manifestAbsPath, appsAbsDir, ...http })).violations
}
const GET = "export const GET = () => new Response('ok')\n"
const reached = (extra = {}) => expect.objectContaining({ kind: 'payload-reached', ...extra })

describe('refused by the module an import resolves to, not only its specifier', LOADED, () => {
  it('(a) a relative path into cms', async () => {
    const route = (httpSrc) => {
      const spelled = posix(relative(join(httpSrc, 'health'), CMS_INSTANCE)).replace(/\.ts$/, '')
      return `import { cms } from '${spelled}'\nexport const GET = () => Response.json(cms)\n`
    }
    expect(await parity(route)).toEqual([
      reached({ source: expect.stringMatching(/\.\.\/.*\/engine\/packages\/cms\/src\/instance$/) }),
    ])
    expect(await parity(() => GET)).toEqual([]) // removed: passes
  })

  it('(b) a `#` subpath import, through a symlinked @engine/cms', async () => {
    const plant = (_sandbox, httpSrc) => {
      writeFileSync(
        join(httpSrc, 'package.json'),
        JSON.stringify({
          name: 'fixture-http',
          type: 'module',
          imports: { '#cms': '@engine/cms/instance' },
        }),
      )
      mkdirSync(join(httpSrc, 'node_modules', '@engine'), { recursive: true })
      symlinkSync(CMS, join(httpSrc, 'node_modules', '@engine', 'cms'), 'junction')
    }
    const route = () => "import { cms } from '#cms'\nexport const GET = () => Response.json(cms)\n"
    expect(await parity(route, plant)).toEqual([reached({ source: '#cms' })])
  })

  it('(c) a side-effect import in a mount, beside its re-export', async () => {
    const plant = (root) =>
      writeFileSync(
        join(root, HEALTH_MOUNT),
        "import 'payload'\nexport { GET } from '@engine/http/health'\n",
      )
    const violations = await parity(() => GET, plant)
    expect(violations).toContainEqual(
      expect.objectContaining({
        kind: 'wrong-specifier',
        actual: ['payload', '@engine/http/health'],
      }),
    )
    expect(violations).toContainEqual(reached({ source: 'payload' }))
  })

  it("(d) createRequire(…)('payload'), anchored at cms", async () => {
    const anchor = pathToFileURL(join(CMS, 'package.json')).href
    const route = () =>
      "import { createRequire } from 'node:module'\n" +
      `export const payload = createRequire('${anchor}')('payload')\n${GET}`
    expect(await parity(route)).toEqual([reached({ source: 'payload' })])
  })
})

describe("Node's own resolvers refuse Payload while the guard is up, and only then", LOADED, () => {
  const payloadFile = fromCms.resolve('payload')

  it('an import Vite would externalise, by the file it resolves to', async () => {
    const url = pathToFileURL(payloadFile).href
    await expect(withPayloadGuard(() => import(url))).rejects.toThrow(/route parity refused/)
  })

  it('require() and createRequire(), by specifier', async () => {
    await expect(withPayloadGuard(async () => fromCms.resolve('payload'))).rejects.toThrow(
      /route parity refused 'payload'/,
    )
    expect(fromCms.resolve('payload')).toBe(payloadFile) // lowered again afterwards
  })
})
