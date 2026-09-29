// The root entry is what a Client Component could import, so nothing it reaches may read a file or
// pull in the schema library: C1's zod schema is ~28 KB gzip of a page's 150 KB first-party budget
// (DESIGN-SYSTEM.md §7, 3.1 senior-fe #1), and the root needs only C1's zod-free constants
// (`@engine/config/constants`). Safe to bundle is not safe to call: a Client Component formats
// nothing — money, calendar dates and dimensions arrive as the server's strings (CONVENTIONS.md
// §6). The copy reader is the server's, at `@engine/i18n/copy`. The walk follows what a browser
// bundler follows — static and dynamic imports, packages under the browser conditions — and is
// tested itself on planted regressions (3.4 senior-fe #5).
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/** `import …`, `export … from`, a bare `import 'x'`; `import type`/`export type` are erased. */
const STATEMENTS =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g
/** `import('x')`: a bundler splits it into a chunk, which the page still loads. */
const DYNAMIC = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
/** A browser bundler's conditions; a package's `exports` is read in its own key order. */
const BROWSER_CONDITIONS = new Set(['browser', 'import', 'module', 'default'])

function specifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const statics = [...source.matchAll(STATEMENTS)].filter(([, typeOnly]) => !typeOnly)
  return [
    ...statics.map(([, , s = '']) => s),
    ...[...source.matchAll(DYNAMIC)].map(([, s = '']) => s),
  ]
}

function moduleFile(path: string): string {
  const found = [path, `${path}.ts`, resolve(path, 'index.ts')].find(
    (candidate) => candidate.endsWith('.ts') && existsSync(candidate),
  )
  if (!found) throw new Error(`no module at ${path}`)
  return realpathSync(found)
}

/** An `exports` value under the browser conditions, `*` filled; `null` when none applies. */
function target(value: unknown, star: string): string | null {
  if (typeof value === 'string') return value.replaceAll('*', star)
  if (value === null || typeof value !== 'object') return null
  for (const [condition, next] of Object.entries(value)) {
    const found = BROWSER_CONDITIONS.has(condition) ? target(next, star) : null
    if (found !== null) return found
  }
  return null
}

/** A workspace package's file for `@engine/<name>[/<sub>]`, from its `exports`. */
function resolvePackage(specifier: string, from: string): string {
  const [scope = '', name = '', ...rest] = specifier.split('/')
  const subpath = rest.length > 0 ? `./${rest.join('/')}` : '.'
  for (let dir = dirname(from); ; dir = dirname(dir)) {
    const root = join(dir, 'node_modules', scope, name)
    if (existsSync(join(root, 'package.json'))) {
      const { exports } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
        exports: unknown
      }
      const map = (
        typeof exports === 'object' && exports !== null ? exports : { '.': exports }
      ) as Record<string, unknown>
      const keys = Object.keys(map)
      const bare = keys.every((key) => !key.startsWith('.'))
      const exact = bare ? (subpath === '.' ? map : undefined) : map[subpath]
      const pattern = keys
        .filter((key) => key.includes('*') && subpath.startsWith(key.slice(0, key.indexOf('*'))))
        .sort((a, b) => b.indexOf('*') - a.indexOf('*'))
        .find((key) => subpath.endsWith(key.slice(key.indexOf('*') + 1)))
      const star = pattern
        ? subpath.slice(
            pattern.indexOf('*'),
            subpath.length - (pattern.length - pattern.indexOf('*') - 1),
          )
        : ''
      const file = target(exact ?? (pattern ? map[pattern] : undefined), star)
      if (file === null) throw new Error(`${specifier}: not exported to a browser`)
      return moduleFile(resolve(root, file))
    }
    if (dirname(dir) === dir) throw new Error(`${specifier}: no package`)
  }
}

/**
 * Every package specifier a module reaches at runtime, following relative imports and the
 * workspace's own `@engine/*` packages (through their `exports`) all the way down.
 */
function runtimeReach(entry: string, seen = new Set<string>()): Set<string> {
  const reached = new Set<string>()
  if (seen.has(entry)) return reached
  seen.add(entry)
  for (const specifier of specifiersOf(entry)) {
    const next = specifier.startsWith('.')
      ? moduleFile(resolve(dirname(entry), specifier))
      : specifier.startsWith('@engine/')
        ? resolvePackage(specifier, entry)
        : null
    if (!specifier.startsWith('.')) reached.add(specifier)
    if (next !== null) for (const each of runtimeReach(next, seen)) reached.add(each)
  }
  return reached
}

/** The package specifiers a module imports itself, relative imports followed within its package. */
function directReach(entry: string, seen = new Set<string>()): Set<string> {
  const direct = new Set<string>()
  if (seen.has(entry)) return direct
  seen.add(entry)
  for (const specifier of specifiersOf(entry)) {
    if (!specifier.startsWith('.')) direct.add(specifier)
    else
      for (const each of directReach(moduleFile(resolve(dirname(entry), specifier)), seen))
        direct.add(each)
  }
  return direct
}

const entry = (path: string) => realpathSync(fileURLToPath(new URL(path, import.meta.url)))
const isZod = (specifier: string) => specifier === 'zod' || specifier.startsWith('zod/')

describe('@engine/i18n — the root entry is safe in the browser', () => {
  it('imports only the zod-free constants of C1, and reaches no other package from there', () => {
    const root = entry('../src/index.ts')
    expect([...directReach(root)]).toEqual(['@engine/config/constants'])
    const reached = [...runtimeReach(root)]
    expect(reached).toEqual(['@engine/config/constants'])
    expect(reached.filter(isZod)).toEqual([])
    expect(reached.filter((specifier) => specifier.startsWith('node:'))).toEqual([])
  })

  it('would see zod if it were reached: the schema entry reaches it', () => {
    // The walk is not vacuous: through C1's schema entry it finds the schema library.
    const schema = resolvePackage('@engine/config/schema', entry('../src/index.ts'))
    expect([...runtimeReach(schema)].filter(isZod)).toEqual(['zod'])
  })

  it('keeps file reads in the copy entry', () => {
    const copy = [...runtimeReach(entry('../src/copy.ts'))]
    expect(copy).toEqual(expect.arrayContaining(['node:fs', 'node:path']))
  })
})

describe('the walk itself, on planted regressions (3.4 senior-fe #5)', () => {
  const plant = (files: Record<string, string>) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'client-safe-')))
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), text)
    }
    return (path: string) => join(root, path)
  }

  it('follows a dynamic import() and skips an erased type import', () => {
    const at = plant({
      'entry.ts': "import type { z } from 'zod'\nexport const load = () => import('./lazy')\n",
      'lazy.ts': "export * from 'node:fs'\nexport { z } from 'zod'\n",
      'typed.ts': "import type { z } from 'zod'\nexport type { ZodType } from 'zod'\n",
    })
    expect([...runtimeReach(at('entry.ts'))].sort()).toEqual(['node:fs', 'zod'])
    expect([...runtimeReach(at('typed.ts'))]).toEqual([])
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
})
