// TASKS.md 4.2.b — the gate on planted violations: each is planted in a `'use client'` module of
// a fixture repo — direct, through a relative import, through a workspace package, through a
// dynamic `import()` — seen to fail with its import chain, then seen to pass once removed.
// The last test runs the gate on this repository, so `pnpm test` enforces it too.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { checkClientSafe, formatViolation } from './check.mjs'

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url))
const REPO = realpathSync(fileURLToPath(new URL('../../..', import.meta.url)))
const APP = 'engine/apps/fixture'
const BUTTON = `${APP}/src/components/button.tsx`

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/**
 * A fixture repo: an app whose client button imports a helper, and two workspace packages linked
 * into the app's node_modules as pnpm links them — `@engine/fake` (browser-safe until planted)
 * and a stand-in `@engine/config` whose `./schema` entry reaches zod.
 */
function fixture() {
  const root = (sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'client-safe-gate-'))))
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  write(BUTTON, "'use client'\nimport { label } from '../lib/label'\nexport const Button = label\n")
  write(`${APP}/src/lib/label.ts`, "import { money } from '@engine/fake'\nexport const label = 1\n")
  write(`${APP}/src/lib/lazy.ts`, 'export const later = 1\n')
  write(`${APP}/src/page.tsx`, "import 'node:fs'\nexport default function Page() {}\n")
  const pkg = (name, exports, files) => {
    const dir = `engine/packages/${name}`
    write(`${dir}/package.json`, JSON.stringify({ name: `@engine/${name}`, exports }))
    for (const [path, text] of Object.entries(files)) write(`${dir}/${path}`, text)
    mkdirSync(join(root, APP, 'node_modules/@engine'), { recursive: true })
    const link = join(root, APP, 'node_modules/@engine', name)
    symlinkSync(join(root, dir), link, 'junction')
    return (path, text) => write(`${dir}/${path}`, text)
  }
  const fake = pkg(
    'fake',
    { '.': './src/index.ts' },
    { 'src/index.ts': 'export const money = 1\n' },
  )
  pkg(
    'config',
    { './schema': './src/schema.ts', './constants': './src/constants.ts' },
    { 'src/schema.ts': "export { z } from 'zod'\n", 'src/constants.ts': 'export const A = 1\n' },
  )
  return { root, write, fake, at: (path) => join(root, path) }
}

const chainOf = ({ root }, violation) =>
  [violation.chain[0].file, ...violation.chain.map(({ specifier }) => specifier)].map((each) =>
    each.startsWith(root) ? each.slice(root.length + 1).replaceAll('\\', '/') : each,
  )

const run = (cwd) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [CLI], { cwd, encoding: 'utf8' })
  return { status, output: `${stdout}${stderr}` }
}

describe('check:client-safe — each planted violation fails with its chain, then passes (4.2.b)', () => {
  it('passes the unplanted fixture, and ignores a server module that reads files', () => {
    const repo = fixture()
    const { modules, violations } = checkClientSafe(repo.root)
    expect(modules).toEqual([repo.at(BUTTON)])
    expect(violations).toEqual([])
    expect(run(repo.root)).toMatchObject({ status: 0 })
  })

  it('direct: the client module imports zod itself', () => {
    const repo = fixture()
    const clean =
      "'use client'\nimport { label } from '../lib/label'\nexport const Button = label\n"
    repo.write(BUTTON, `'use client'\nimport { z } from 'zod'\n${clean.slice(13)}`)
    const [violation, ...rest] = checkClientSafe(repo.root).violations
    expect(rest).toEqual([])
    expect(chainOf(repo, violation)).toEqual([BUTTON, 'zod'])
    const cli = run(repo.root)
    expect(cli.status).toBe(1)
    expect(cli.output).toContain(`${BUTTON} reaches zod`)

    repo.write(BUTTON, clean)
    expect(checkClientSafe(repo.root).violations).toEqual([])
    expect(run(repo.root).status).toBe(0)
  })

  it('through a relative import: the helper it imports reads a file', () => {
    const repo = fixture()
    const helper = `${APP}/src/lib/label.ts`
    repo.write(
      helper,
      "import { money } from '@engine/fake'\nimport 'node:fs'\nexport const label = 1\n",
    )
    const { violations } = checkClientSafe(repo.root)
    expect(violations.map((each) => chainOf(repo, each))).toEqual([
      [BUTTON, '../lib/label', 'node:fs'],
    ])
    const cli = run(repo.root)
    expect(cli.status).toBe(1)
    expect(cli.output).toContain(`→ ../lib/label (${helper})`)
    expect(cli.output).toContain('→ node:fs')

    repo.write(helper, "import { money } from '@engine/fake'\nexport const label = 1\n")
    expect(checkClientSafe(repo.root).violations).toEqual([])
  })

  it('through a workspace package: @engine/fake reaches the schema entry of @engine/config', () => {
    const repo = fixture()
    repo.fake('src/index.ts', "export { money } from './money'\n")
    repo.fake('src/money.ts', "import '@engine/config/schema'\nexport const money = 1\n")
    // The package imports @engine/config through its own link, as pnpm lays it out.
    mkdirSync(repo.at('engine/packages/fake/node_modules/@engine'), { recursive: true })
    symlinkSync(
      repo.at('engine/packages/config'),
      repo.at('engine/packages/fake/node_modules/@engine/config'),
      'junction',
    )
    const { violations } = checkClientSafe(repo.root)
    expect(violations.map((each) => chainOf(repo, each))).toEqual([
      [BUTTON, '../lib/label', '@engine/fake', './money', '@engine/config/schema'],
    ])
    const text = formatViolation(repo.root, violations[0])
    expect(text).toContain('→ @engine/fake (engine/packages/fake/src/index.ts)')
    expect(run(repo.root).status).toBe(1)

    repo.fake('src/index.ts', 'export const money = 1\n')
    expect(checkClientSafe(repo.root).violations).toEqual([])
  })

  it('through a dynamic import(): a lazily loaded chunk imports Payload', () => {
    const repo = fixture()
    const lazy = `${APP}/src/lib/lazy.ts`
    repo.write(
      BUTTON,
      "'use client'\nimport { label } from '../lib/label'\nexport const load = () => import('../lib/lazy')\n",
    )
    repo.write(lazy, "import { getPayload } from 'payload'\nexport const later = getPayload\n")
    const { violations } = checkClientSafe(repo.root)
    expect(violations.map((each) => chainOf(repo, each))).toEqual([
      [BUTTON, '../lib/lazy', 'payload'],
    ])
    expect(violations[0].chain[0].kind).toBe('dynamic')
    const cli = run(repo.root)
    expect(cli.status).toBe(1)
    expect(cli.output).toContain(`→ import('../lib/lazy') (${lazy})`)

    repo.write(lazy, 'export const later = 1\n')
    expect(checkClientSafe(repo.root).violations).toEqual([])
    expect(run(repo.root).status).toBe(0)
  })

  it('names every rule it breaks: @payloadcms/*, @engine/cms and each config server entry', () => {
    const repo = fixture()
    const banned = [
      '@payloadcms/ui',
      '@engine/cms/access',
      ...['schema', 'routes', 'loader', 'validate', 'boot-check'].map((e) => `@engine/config/${e}`),
    ]
    repo.write(BUTTON, `'use client'\n${banned.map((s) => `import '${s}'`).join('\n')}\n`)
    const reached = checkClientSafe(repo.root).violations.map(({ specifier }) => specifier)
    expect(reached).toEqual(banned)
  })

  it('discovers a client module wherever it sits under engine/, a package included', () => {
    const repo = fixture()
    repo.write('engine/packages/fake/src/widget.tsx', '"use client";\nimport \'node:path\'\n')
    const { modules, violations } = checkClientSafe(repo.root)
    expect(modules).toContain(repo.at('engine/packages/fake/src/widget.tsx'))
    expect(violations.map((each) => chainOf(repo, each))).toEqual([
      ['engine/packages/fake/src/widget.tsx', 'node:path'],
    ])
  })
})

describe('check:client-safe on this repository', () => {
  it("passes: no 'use client' module under engine/ reaches anything server-only", () => {
    const { violations } = checkClientSafe(REPO)
    expect(violations.map((each) => formatViolation(REPO, each))).toEqual([])
  })
})
