// TASKS.md 4.7.a — the gate on two more planted violations, in check.test.mjs's style: a bare
// Node built-in (`crypto`, `path`, `fs/promises` — Next polyfills them into a client bundle
// where `node:*` would fail the build) and a dynamic `import()` of an expression, which no walk
// can follow. Each is planted in a `'use client'` module of a fixture repo, seen to fail through
// the API and the CLI with its chain or its expression, then seen to pass once removed.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { checkClientSafe } from './check.mjs'
import { forbiddenReason } from './rules.mjs'
import { UNRESOLVABLE } from './walk.mjs'

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url))
const APP = 'engine/apps/fixture'
const BUTTON = `${APP}/src/components/button.tsx`
const HELPER = `${APP}/src/lib/label.ts`
const CLEAN = "'use client'\nimport { label } from '../lib/label'\nexport const Button = label\n"
const CLEAN_HELPER = 'export const label = 1\n'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A fixture repo: an app whose client button imports a helper, both clean until planted. */
function fixture() {
  const root = (sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'client-safe-builtins-'))))
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  write(BUTTON, CLEAN)
  write(HELPER, CLEAN_HELPER)
  return { root, write }
}

const relativeTo = (root) => (each) =>
  each.startsWith(root) ? each.slice(root.length + 1).replaceAll('\\', '/') : each
const chainOf = (root, { chain }) =>
  [chain[0].file, ...chain.map(({ specifier }) => specifier)].map(relativeTo(root))

const run = (cwd) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [CLI], { cwd, encoding: 'utf8' })
  return { status, output: `${stdout}${stderr}` }
}

/** Plants `text` at `path`, expects each violation's chain, then removes it and expects a pass. */
function plantFailsThenPasses(repo, path, text, chains, cliLines) {
  repo.write(path, text)
  const { violations } = checkClientSafe(repo.root)
  expect(violations.map((each) => chainOf(repo.root, each))).toEqual(chains)
  const cli = run(repo.root)
  expect(cli.status).toBe(1)
  for (const line of cliLines) expect(cli.output).toContain(line)

  repo.write(path, path === BUTTON ? CLEAN : CLEAN_HELPER)
  expect(checkClientSafe(repo.root).violations).toEqual([])
  expect(run(repo.root)).toMatchObject({ status: 0 })
  return violations
}

describe('check:client-safe — a bare Node built-in fails like node:* (4.7.a)', () => {
  it('passes a client module that imports only allowed packages', () => {
    const repo = fixture()
    repo.write(
      BUTTON,
      "'use client'\nimport { useState } from 'react'\nimport clsx from 'clsx'\nimport { label } from '../lib/label'\nexport const Button = label\n",
    )
    expect(checkClientSafe(repo.root).violations).toEqual([])
    expect(run(repo.root)).toMatchObject({ status: 0 })
  })

  it("direct: import { createHash } from 'crypto'", () => {
    const repo = fixture()
    const [violation] = plantFailsThenPasses(
      repo,
      BUTTON,
      `'use client'\nimport { createHash } from 'crypto'\n${CLEAN.slice(13)}`,
      [[BUTTON, 'crypto']],
      [`${BUTTON} reaches crypto — a Node built-in, bare`],
    )
    expect(violation.reason).toBe(forbiddenReason('crypto'))
  })

  it("through a relative import: the helper does import p from 'path'", () => {
    const repo = fixture()
    plantFailsThenPasses(
      repo,
      HELPER,
      "import p from 'path'\nexport const label = p.sep\n",
      [[BUTTON, '../lib/label', 'path']],
      [`${BUTTON} reaches path`, `→ ../lib/label (${HELPER})`, '→ path'],
    )
  })

  it("through a dynamic import('fs/promises')", () => {
    const repo = fixture()
    const [violation] = plantFailsThenPasses(
      repo,
      BUTTON,
      `${CLEAN}export const read = () => import('fs/promises')\n`,
      [[BUTTON, 'fs/promises']],
      [`${BUTTON} reaches fs/promises`, "→ import('fs/promises')"],
    )
    expect(violation.chain.at(-1).kind).toBe('dynamic')
  })

  it('refuses every bare built-in and its subpaths, and no package that only shares a prefix', () => {
    for (const name of ['crypto', 'path', 'fs', 'fs/promises', 'path/posix', 'stream', 'os'])
      expect(forbiddenReason(name), name).toMatch(/^a Node built-in, bare/)
    for (const name of ['pathe', 'path-to-regexp', 'cryptography', 'test', 'react', './path'])
      expect(forbiddenReason(name), name).toBeNull()
  })
})

describe('check:client-safe — a dynamic import() it cannot resolve fails closed (4.7.a)', () => {
  it("const m = 'zod'; await import(m): fails naming the file and the expression", () => {
    const repo = fixture()
    const [violation] = plantFailsThenPasses(
      repo,
      BUTTON,
      `${CLEAN}export async function load() {\n  const m = 'zod'\n  return await import(m)\n}\n`,
      [[BUTTON, 'm']],
      [`${BUTTON} reaches import(m) in ${BUTTON}, which the walk cannot follow`, '→ import(m)'],
    )
    expect(violation).toMatchObject({ reason: null, error: UNRESOLVABLE, expression: 'm' })
  })

  it('a template literal with an expression, reached through a relative import, names both', () => {
    const repo = fixture()
    plantFailsThenPasses(
      repo,
      HELPER,
      'export const label = 1\nexport const locale = (code) => import(`./copy/${code}.json`)\n',
      [[BUTTON, '../lib/label', '`./copy/${code}.json`']],
      [
        `${BUTTON} reaches import(\`./copy/\${code}.json\`) in ${HELPER}`,
        `→ ../lib/label (${HELPER})`,
      ],
    )
  })

  it('a call as the argument fails too', () => {
    const repo = fixture()
    plantFailsThenPasses(
      repo,
      BUTTON,
      `${CLEAN}export const load = (name) => import(pick(name))\n`,
      [[BUTTON, 'pick(name)']],
      ['import(pick(name))'],
    )
  })

  it('a template literal with no expression is a plain string, and is followed', () => {
    const repo = fixture()
    repo.write(BUTTON, `${CLEAN}export const load = () => import(\`../lib/lazy\`)\n`)
    repo.write(`${APP}/src/lib/lazy.ts`, "import 'node:fs'\nexport const later = 1\n")
    const { violations } = checkClientSafe(repo.root)
    expect(violations.map((each) => chainOf(repo.root, each))).toEqual([
      [BUTTON, '../lib/lazy', 'node:fs'],
    ])
  })

  it('prose that mentions import(x) in a comment or a string is not code', () => {
    const repo = fixture()
    repo.write(
      BUTTON,
      `${CLEAN}// a lazy import(chunk) would go here\nexport const note = 'see import(next)'\n`,
    )
    expect(checkClientSafe(repo.root).violations).toEqual([])
  })
})
