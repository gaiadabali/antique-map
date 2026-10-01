// qa's 5.4 re-gate, blocker — an `exports` condition must never hand Next a different module
// than route parity loads. Route parity resolves with Next's route-handler conditions, refuses
// any condition in an engine package's `exports`/`imports` but an allowlisted one, and loads every
// conditional branch under the Payload hook; each proven by a planted violation.
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { writeFixtureApp, writeFixtureHttp, writeFixtureManifest } from './fixtures.mjs'
import {
  conditionalBranches,
  findExportConditions,
  NEXT_ROUTE_CONDITIONS,
  readEnginePackages,
} from './package-exports.mjs'
import { checkRouteParity } from './route-parity.mjs'
import { withTsRunner } from './ts-runner.mjs'

const repoRoot = process.cwd()
const posix = (path) => path.split('\\').join('/')
const CMS_INSTANCE = posix(join(repoRoot, 'engine', 'packages', 'cms', 'src', 'instance.ts'))
/** Each case starts a Vite server: generous on a loaded machine (qa's phase 4 gate, L2). */
const LOADED = { timeout: 60_000 }

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A fixture package `name` under `<sandbox>/packages/<dir>`, with `files` and its `exports`. */
function writePackage(dir, json, files = {}) {
  const root = join(sandbox, 'packages', dir)
  mkdirSync(root, { recursive: true })
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', ...json }))
  return root
}

describe('conditionalBranches', () => {
  it('reads nested, array, sugar and `imports` conditions, and no plain path', () => {
    const json = {
      exports: {
        './a': './a.ts',
        './b': { node: { 'react-server': './b-rs.ts', default: './b.ts' } },
        './c': [{ import: './c.mjs' }, './c.js'],
      },
      imports: { '#x': { production: './x.ts' } },
    }
    expect(conditionalBranches(json)).toEqual([
      {
        field: 'exports',
        subpath: './b',
        conditions: ['node', 'react-server'],
        target: './b-rs.ts',
      },
      { field: 'exports', subpath: './b', conditions: ['node', 'default'], target: './b.ts' },
      { field: 'exports', subpath: './c', conditions: ['import'], target: './c.mjs' },
      { field: 'imports', subpath: '#x', conditions: ['production'], target: './x.ts' },
    ])
    expect(conditionalBranches({ exports: { import: './i.js' } })).toEqual([
      { field: 'exports', subpath: '.', conditions: ['import'], target: './i.js' },
    ])
  })
})

describe('no engine package exports a condition (5.4 re-gate)', () => {
  it('holds for every real package.json under engine/ (tooling and the apps too)', () => {
    const packages = readEnginePackages(join(repoRoot, 'engine'))
    const files = packages.map(({ file }) => posix(file.slice(repoRoot.length + 1)))
    expect(files).toEqual(expect.arrayContaining(['engine/tooling/package.json']))
    expect(files.filter((f) => f.startsWith('engine/apps/')).length).toBeGreaterThan(1)
    expect(files.some((f) => /node_modules|\.next/.test(f))).toBe(false)
    expect(findExportConditions(packages, repoRoot)).toEqual([])
  })

  // qa's 5.4 third gate, L1: a package.json nested in a package, tooling's, an app's.
  it.each([
    ['engine/packages/http/src/revalidate/package.json', 'imports', '#body'],
    ['engine/tooling/package.json', 'exports', './x'],
    ['engine/apps/gallery/package.json', 'imports', '#body'],
  ])('flags a condition in %s, and passes once it is gone', (path, field, subpath) => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-nested-'))
    const write = (rel, json) => {
      mkdirSync(join(sandbox, rel, '..'), { recursive: true })
      writeFileSync(join(sandbox, rel), JSON.stringify(json))
    }
    write('engine/packages/http/package.json', { name: '@fixture/http', exports: './a.ts' })
    write('engine/apps/gallery/node_modules/x/package.json', { exports: { node: './n.js' } })
    write('engine/apps/gallery/.next/package.json', { imports: { '#a': { node: './n.js' } } })
    const branch = { 'react-server': './payload-real.ts', default: './body.ts' }
    write(path, {
      ...(path.includes('/src/') ? {} : { name: '@fixture/x' }),
      [field]: { [subpath]: branch },
    })
    const found = findExportConditions(readEnginePackages(join(sandbox, 'engine')), sandbox)
    expect(found).toEqual(
      ['react-server', 'default'].map((condition) => ({
        ...{ kind: 'exports-condition', file: path, field, subpath, condition },
      })),
    )
    write(path, { name: '@fixture/x', [field]: { [subpath]: './body.ts' } })
    expect(findExportConditions(readEnginePackages(join(sandbox, 'engine')), sandbox)).toEqual([])
  })

  it('flags a condition, naming the package.json, and passes an allowlisted one', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-exports-'))
    const exports = { './revalidate': { 'react-server': './real.ts', default: './route.ts' } }
    writePackage('http', { name: '@fixture/http', exports })
    const packages = readEnginePackages(join(sandbox, 'packages'))
    const found = findExportConditions(packages, sandbox)
    expect(found).toEqual([
      {
        kind: 'exports-condition',
        file: 'packages/http/package.json',
        field: 'exports',
        subpath: './revalidate',
        condition: 'react-server',
      },
      {
        kind: 'exports-condition',
        file: 'packages/http/package.json',
        field: 'exports',
        subpath: './revalidate',
        condition: 'default',
      },
    ])
    const allowed = ['react-server', 'default'].map((condition) => ({
      package: '@fixture/http',
      subpath: './revalidate',
      condition,
      why: 'a planted exemption',
    }))
    expect(findExportConditions(packages, sandbox, allowed)).toEqual([])
  })
})

describe('every conditional branch is loaded under the Payload hook (5.4 re-gate)', LOADED, () => {
  it.each(['react-server', 'production', 'development'])(
    "refuses a '%s' branch that reaches cms, whatever Next picks, and passes once it is gone",
    async (condition) => {
      sandbox = mkdtempSync(join(tmpdir(), 'rp-branch-'))
      const appsAbsDir = join(sandbox, 'apps')
      writeFixtureApp(appsAbsDir, 'one', {
        mountedRoutes: [
          { path: '/api/health', exports: ['GET'] },
          { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
        ],
      })
      const manifestAbsPath = writeFixtureManifest(join(sandbox, 'manifest'))
      const http = writeFixtureHttp(sandbox)
      const files = {
        'src/real.ts': `export { cms as POST } from '${CMS_INSTANCE}'\n`,
        'src/route.ts': 'export const POST = () => new Response()\n',
      }
      const exports = {
        './revalidate': { [condition]: './src/real.ts', default: './src/route.ts' },
      }
      writePackage('http', { name: '@fixture/http', exports }, files)
      const options = {
        manifestAbsPath,
        appsAbsDir,
        packagesAbsDir: join(sandbox, 'packages'),
        ...http,
      }
      const { violations } = await checkRouteParity(repoRoot, options)
      expect(violations).toContainEqual(
        expect.objectContaining({
          kind: 'conditional-branch-reached',
          file: expect.stringMatching(/packages\/http\/package\.json$/),
          subpath: './revalidate',
          conditions: [condition],
          target: './src/real.ts',
        }),
      )
      expect(violations).toContainEqual(
        expect.objectContaining({ kind: 'exports-condition', condition }),
      )

      writePackage(
        'http',
        { name: '@fixture/http', exports: { './revalidate': './src/route.ts' } },
        files,
      )
      expect((await checkRouteParity(repoRoot, options)).violations).toEqual([])
    },
  )
})

describe("the runner resolves with Next's route-handler conditions (5.4 re-gate)", LOADED, () => {
  it('picks react-server and production over development and default, as `next build` does', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-cond-'))
    const branches = Object.fromEntries(
      ['react-server', 'development', 'default'].map((c) => [c, `./${c}.mjs`]),
    )
    const both = {
      production: './production.mjs',
      development: './development.mjs',
      default: './default.mjs',
    }
    const files = Object.fromEntries(
      ['react-server', 'production', 'development', 'default'].map((c) => [
        `${c}.mjs`,
        `export const picked = '${c}'\n`,
      ]),
    )
    // A workspace-style link: node_modules points at a folder outside it, as pnpm links @engine/*.
    const pkg = writePackage(
      'probe',
      { name: 'probe', exports: { './a': branches, './b': both } },
      files,
    )
    mkdirSync(join(sandbox, 'node_modules'), { recursive: true })
    symlinkSync(pkg, join(sandbox, 'node_modules', 'probe'), 'junction')
    const entry = join(sandbox, 'entry.mjs')
    writeFileSync(
      entry,
      "export { picked as a } from 'probe/a'\nexport { picked as b } from 'probe/b'\n",
    )
    const picked = await withTsRunner(sandbox, (load) => load(entry), {
      conditions: NEXT_ROUTE_CONDITIONS,
    })
    expect({ a: picked.a, b: picked.b }).toEqual({ a: 'react-server', b: 'production' })
  })
})

describe('a branch an app mount imports names no app in its chain (qa L5)', LOADED, () => {
  it('drops the mount that first loaded the branch, as checkAppMounts does', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'rp-chain-'))
    const appsAbsDir = join(sandbox, 'apps')
    const cart = '/api/x/commerce/cart/[[...path]]'
    writeFixtureApp(appsAbsDir, 'one', {
      mountedRoutes: [
        { path: '/api/health', exports: ['GET'] },
        { path: cart, exports: ['GET', 'POST'], from: '@fixture/http/revalidate' },
      ],
    })
    const files = {
      'src/real.ts': `export { cms as POST, cms as GET } from '${CMS_INSTANCE}'\n`,
      'src/route.ts': 'export const POST = () => new Response()\nexport const GET = POST\n',
    }
    const exports = {
      './revalidate': { 'react-server': './src/real.ts', default: './src/route.ts' },
    }
    const pkg = writePackage('http', { name: '@fixture/http', exports }, files)
    mkdirSync(join(sandbox, 'node_modules', '@fixture'), { recursive: true })
    symlinkSync(pkg, join(sandbox, 'node_modules', '@fixture', 'http'), 'junction')
    const options = {
      manifestAbsPath: writeFixtureManifest(join(sandbox, 'manifest')),
      appsAbsDir,
      packagesAbsDir: join(sandbox, 'packages'),
      ...writeFixtureHttp(sandbox),
    }
    const { violations } = await checkRouteParity(repoRoot, options)
    // The mount loads first and reaches cms through the branch, so the hook records it as the
    // branch's importer; the branch's own refusal must not name it.
    expect(violations).toContainEqual(
      expect.objectContaining({ kind: 'payload-reached', app: 'one', path: cart }),
    )
    const branch = violations.find((v) => v.kind === 'conditional-branch-reached')
    expect(branch).toMatchObject({ subpath: './revalidate', conditions: ['react-server'] })
    expect(branch.chain).toHaveLength(1)
    expect(branch.chain[0]).toMatch(/packages\/http\/src\/real\.ts$/)
  })
})
