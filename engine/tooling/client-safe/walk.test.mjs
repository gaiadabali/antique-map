// The walk and the discovery on their own (moved with the walk from the i18n test: 3.4
// senior-fe #5). The gate's planted violations are in check.test.mjs.
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findClientModules, isClientModule } from './discover.mjs'
import { forbiddenReason } from './rules.mjs'
import { findReaches, moduleFile, runtimeReach } from './walk.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

const plant = (files) => {
  const root = (sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'client-safe-'))))
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return (path) => join(root, path)
}

describe('the walk itself, on planted regressions (3.4 senior-fe #5)', () => {
  it('follows a dynamic import() and skips an erased type import', () => {
    const at = plant({
      'entry.ts': "import type { z } from 'zod'\nexport const load = () => import('./lazy')\n",
      'lazy.ts': "export * from 'node:fs'\nexport { z } from 'zod'\n",
      'typed.ts': "import type { z } from 'zod'\nexport type { ZodType } from 'zod'\n",
      'tick.ts': 'export const load = () => import(`./lazy`)\n',
    })
    expect([...runtimeReach(at('entry.ts'))].sort()).toEqual(['node:fs', 'zod'])
    expect([...runtimeReach(at('typed.ts'))]).toEqual([])
    expect([...runtimeReach(at('tick.ts'))].sort()).toEqual(['node:fs', 'zod'])
  })

  it('reads a package under the browser conditions, in its own key order, patterns included', () => {
    const exports = {
      '.': { node: './node.ts', browser: './browser.ts', default: './node.ts' },
      './esm': { require: './node.ts', import: './browser.ts' },
      './parts/*': { default: './parts/*.ts' },
    }
    const at = plant({
      'node_modules/@engine/fake/package.json': JSON.stringify({ name: '@engine/fake', exports }),
      'node_modules/@engine/fake/node.ts': "export const where = 'node'\n",
      'node_modules/@engine/fake/browser.ts': "export { z } from 'zod'\n",
      'node_modules/@engine/fake/parts/deep.ts': "import 'node:path'\n",
      'root.ts': "import '@engine/fake'\n",
      'esm.ts': "import '@engine/fake/esm'\n",
      'deep.ts': "import '@engine/fake/parts/deep'\n",
    })
    expect([...runtimeReach(at('root.ts'))]).toEqual(['@engine/fake', 'zod'])
    expect([...runtimeReach(at('esm.ts'))]).toEqual(['@engine/fake/esm', 'zod'])
    expect([...runtimeReach(at('deep.ts'))]).toEqual(['@engine/fake/parts/deep', 'node:path'])
  })

  it('resolves what an app writes: .tsx, a folder index, a .js twin; a stylesheet is not code', () => {
    const at = plant({
      'a.tsx': "import './b'\nimport './dir'\nimport './c.js'\nimport './look.css'\n",
      'b.tsx': "import 'zod'\n",
      'dir/index.tsx': "import 'node:os'\n",
      'c.ts': "import 'payload'\n",
      'look.css': 'a { color: red }\n',
    })
    expect(moduleFile(at('look.css'))).toBeNull()
    expect([...runtimeReach(at('a.tsx'))].sort()).toEqual(['node:os', 'payload', 'zod'])
  })

  it('fails closed on an import it cannot follow, naming it', () => {
    const at = plant({
      'entry.tsx': "import './gone'\nimport '@engine/missing'\n",
    })
    const reaches = findReaches(at('entry.tsx'), forbiddenReason)
    expect(reaches.map(({ specifier, reason }) => [specifier, reason])).toEqual([
      ['./gone', null],
      ['@engine/missing', null],
    ])
    expect(reaches[0].error).toMatch(/no module at/)
    expect(reaches[1].error).toMatch(/@engine\/missing: no package/)
  })

  it('walks a cycle once', () => {
    const at = plant({ 'a.ts': "import './b'\n", 'b.ts': "import './a'\nimport 'zod'\n" })
    expect(findReaches(at('a.ts'), forbiddenReason).map(({ specifier }) => specifier)).toEqual([
      'zod',
    ])
  })
})

describe('forbiddenReason — the rules of 4.2.a', () => {
  it.each([
    'zod',
    'zod/v4',
    '@engine/config/schema',
    '@engine/config/routes',
    '@engine/config/loader',
    '@engine/config/validate',
    '@engine/config/boot-check',
    'node:fs',
    'node:crypto',
    'payload',
    'payload/shared',
    '@payloadcms/db-postgres',
    '@engine/cms',
    '@engine/cms/access',
  ])('refuses %s', (specifier) => {
    expect(forbiddenReason(specifier)).toEqual(expect.any(String))
  })

  it.each([
    'react',
    'next/link',
    'zodiac',
    '@engine/config/constants',
    '@engine/i18n',
    '@engine/view-models',
    '@engine/cmsx',
    'payloads',
    './zod',
  ])('allows %s', (specifier) => {
    expect(forbiddenReason(specifier)).toBeNull()
  })
})

describe("isClientModule — the first statement is 'use client'", () => {
  it.each([
    ["'use client'\nimport x from 'y'\n"],
    ['"use client";\n'],
    ["﻿// a comment first\n/* and a block */\n'use client'\n"],
    ["'use strict'\n'use client'\n"],
  ])('sees %j', (source) => {
    expect(isClientModule(source)).toBe(true)
  })

  it.each([
    ["import x from 'y'\n'use client'\n"],
    ["'use server'\n"],
    ["const a = 'use client'\n"],
    ["'use client'.trim()\n"],
    ["// 'use client'\nexport {}\n"],
    ['`use client`\n'],
    [''],
  ])('does not see %j', (source) => {
    expect(isClientModule(source)).toBe(false)
  })
})

describe('findClientModules', () => {
  it('finds every client module under engine/, skipping dependencies and build output', () => {
    const at = plant({
      'engine/apps/one/src/a.tsx': "'use client'\n",
      'engine/apps/one/src/server.tsx': 'export default function Page() {}\n',
      'engine/packages/ui/src/b.ts': '"use client"\n',
      'engine/apps/one/.next/chunk.js': "'use client'\n",
      'engine/apps/one/node_modules/dep/index.js': "'use client'\n",
      'engine/packages/ui/src/types.d.ts': "'use client'\n",
    })
    expect(findClientModules(at('engine'))).toEqual(
      [at('engine/apps/one/src/a.tsx'), at('engine/packages/ui/src/b.ts')].sort(),
    )
  })

  it('finds none where there is no engine/apps yet', () => {
    const at = plant({ 'engine/packages/ui/src/b.ts': 'export {}\n' })
    expect(findClientModules(at('engine'))).toEqual([])
    expect(findClientModules(at('engine/apps'))).toEqual([])
  })
})
