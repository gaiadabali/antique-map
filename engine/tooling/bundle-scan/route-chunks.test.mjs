// TASKS.md 5.5.e — the build-chunk scan over a fixture `.next/server` shaped as Turbopack writes
// one: a route's entry loads its chunks with `R.c(…)`, each chunk beside its `.map`. The real
// builds are scanned in CI (ci.yml, right after the build) and in 5.5's report.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findRouteFiles, PAYLOAD_MODULE, scanServer, syncChunksOf } from './route-chunks.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** Writes `files` (path → text, from `.next/`) and returns the fixture's `.next/server`. */
function writeNext(files) {
  sandbox = mkdtempSync(join(tmpdir(), 'bundle-scan-'))
  for (const [path, text] of Object.entries(files)) {
    const file = join(sandbox, '.next', ...path.split('/'))
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, text)
  }
  return join(sandbox, '.next', 'server')
}

const entry = (...chunks) =>
  `var R=require("../../chunks/[turbopack]_runtime.js")("server/app/x/route.js")\n` +
  chunks.map((c) => `R.c("${c}")\n`).join('') +
  'R.m(1);module.exports=R.m(1).exports\n'
const map = (...sources) => JSON.stringify({ version: 3, sources, mappings: '' })
const sectioned = (...sources) =>
  JSON.stringify({ version: 3, sections: [{ offset: { line: 0, column: 0 }, map: { sources } }] })

const ROUTE = 'server/app/api/x/revalidate/route.js'

describe('the route-chunk scan (5.5.e)', () => {
  it('reads R.c chunks once each, and no other call', () => {
    const text = entry('server/chunks/a.js', 'server/chunks/b.js', 'server/chunks/a.js')
    expect(syncChunksOf(`${text}R.l("server/chunks/lazy.js")\n`)).toEqual([
      'server/chunks/a.js',
      'server/chunks/b.js',
    ])
  })

  it('names Payload by cms source or an installed payload / @payloadcms package', () => {
    for (const id of [
      'turbopack:///[project]/engine/packages/cms/src/instance.ts',
      '[project]/node_modules/.pnpm/payload@3.90.1/node_modules/payload/dist/index.js',
      'node_modules/@payloadcms/db-postgres/dist/index.js',
    ])
      expect(PAYLOAD_MODULE.test(id)).toBe(true)
    for (const id of [
      '[project]/engine/packages/http/src/revalidate/route.ts',
      '[project]/engine/packages/http/src/revalidate/payload-revalidate.ts',
      '[project]/node_modules/.pnpm/payload-kit@1/node_modules/payload-kit/x.js',
    ])
      expect(PAYLOAD_MODULE.test(id)).toBe(false)
  })

  it('finds api/x routes at any depth, api/health and brand-assets, and nothing else', () => {
    const server = writeNext({
      [ROUTE]: '',
      'server/app/api/x/commerce/cart/[[...path]]/route.js': '',
      'server/app/api/health/route.js': '',
      'server/app/brand-assets/[...path]/route.js': '',
      'server/app/(payload)/api/[...slug]/route.js': '',
    })
    const found = findRouteFiles(server).map((f) =>
      f
        .slice(server.length + 1)
        .split('\\')
        .join('/'),
    )
    expect(found).toEqual([
      'app/api/health/route.js',
      'app/api/x/commerce/cart/[[...path]]/route.js',
      'app/api/x/revalidate/route.js',
      'app/brand-assets/[...path]/route.js',
    ])
  })

  it.each([
    [
      'its .map',
      {
        'server/chunks/b.js.map': map('turbopack:///[project]/engine/packages/cms/src/instance.ts'),
      },
      '',
    ],
    [
      'a URL-encoded .map source',
      {
        'server/chunks/b.js.map': map(
          '../../node_modules/.pnpm/%40payloadcms%2Bnext%403.90.2/node_modules/%40payloadcms/next/dist/x.js',
        ),
      },
      '',
    ],
    [
      'a sectioned .map',
      { 'server/chunks/b.js.map': sectioned('[project]/node_modules/payload/dist/index.js') },
      '',
    ],
    [
      'a [project]/ id in its code, with no .map',
      {},
      '"[project]/engine/packages/cms/src/instance.ts [app-route] (ecmascript)"',
    ],
  ])(
    'fails a route whose synchronous chunk holds Payload, read from %s, naming the route',
    (_, maps, code) => {
      const server = writeNext({
        [ROUTE]: entry('server/chunks/a.js', 'server/chunks/b.js'),
        'server/chunks/a.js': '"[project]/engine/packages/http/src/revalidate/route.ts"',
        'server/chunks/a.js.map': map('[project]/engine/packages/http/src/revalidate/route.ts'),
        'server/chunks/b.js': code,
        ...maps,
      })
      const { routes } = scanServer(server)
      expect(routes).toHaveLength(1)
      expect(routes[0].route).toBe('app/api/x/revalidate/route.js')
      expect(routes[0].hits).toHaveLength(1)
      expect(routes[0].hits[0]).toMatch(/^server\/chunks\/b\.js :: .*(cms|payload)/)
    },
  )

  it('passes a route whose Payload is only in a lazy chunk, and counts the maps', () => {
    const server = writeNext({
      [ROUTE]: entry('server/chunks/a.js'),
      'server/chunks/a.js': 'R.l("server/chunks/lazy.js")',
      'server/chunks/a.js.map': map('[project]/engine/packages/http/src/revalidate/route.ts'),
      'server/chunks/lazy.js': '"[project]/engine/packages/cms/src/instance.ts"',
    })
    expect(scanServer(server)).toEqual({
      routes: [
        { route: 'app/api/x/revalidate/route.js', chunks: ['server/chunks/a.js'], hits: [] },
      ],
      mapped: 1,
      loads: 1,
    })
  })

  it('fails a route that names a chunk not on disk, and one that names no chunk', () => {
    const server = writeNext({
      [ROUTE]: entry('server/chunks/gone.js'),
      'server/app/api/health/route.js': 'module.exports = {}\n',
    })
    const byRoute = Object.fromEntries(scanServer(server).routes.map((r) => [r.route, r.hits]))
    expect(byRoute['app/api/x/revalidate/route.js']).toEqual([
      'server/chunks/gone.js :: (missing: the chunk is not on disk)',
    ])
    expect(byRoute['app/api/health/route.js']).toEqual([
      '(none: no R.c chunk load found — the build format is not the one this scan reads)',
    ])
  })
})
