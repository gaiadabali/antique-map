// The root entry is imported by Client Components for the formatters, so nothing it reaches may
// read a file (`formatMoney` must render the same on the server and in the browser, C5) or pull
// in the schema library: C1's zod schema is ~30 KB gzip of a page's 150 KB first-party budget
// (DESIGN-SYSTEM.md §7, 3.1 senior-fe #1), and the root needs only C1's zod-free constants
// (`@engine/config/constants`). The copy reader is the server's, at `@engine/i18n/copy`.
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
/** `import …`, `export … from`, a bare `import 'x'`; `import type`/`export type` are erased. */
const STATEMENTS =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g

function moduleFile(path: string): string {
  const found = [path, `${path}.ts`, resolve(path, 'index.ts')].find(
    (candidate) => candidate.endsWith('.ts') && existsSync(candidate),
  )
  if (!found) throw new Error(`no module at ${path}`)
  return found
}

/**
 * Every package specifier a module reaches at runtime, following relative imports and the
 * workspace's own `@engine/*` packages (through their `exports`) all the way down.
 */
function runtimeReach(entry: string, seen = new Set<string>()): Set<string> {
  const reached = new Set<string>()
  if (seen.has(entry)) return reached
  seen.add(entry)
  for (const [, typeOnly, specifier = ''] of readFileSync(entry, 'utf8').matchAll(STATEMENTS)) {
    if (typeOnly) continue
    if (specifier.startsWith('.')) {
      for (const each of runtimeReach(moduleFile(resolve(dirname(entry), specifier)), seen))
        reached.add(each)
      continue
    }
    reached.add(specifier)
    if (specifier.startsWith('@engine/')) {
      const file = require.resolve(specifier, { paths: [dirname(entry)] })
      for (const each of runtimeReach(file, seen)) reached.add(each)
    }
  }
  return reached
}

/** The package specifiers a module imports itself, relative imports followed within its package. */
function directReach(entry: string, seen = new Set<string>()): Set<string> {
  const direct = new Set<string>()
  if (seen.has(entry)) return direct
  seen.add(entry)
  for (const [, typeOnly, specifier = ''] of readFileSync(entry, 'utf8').matchAll(STATEMENTS)) {
    if (typeOnly) continue
    if (!specifier.startsWith('.')) direct.add(specifier)
    else
      for (const each of directReach(moduleFile(resolve(dirname(entry), specifier)), seen))
        direct.add(each)
  }
  return direct
}

const entry = (path: string) => fileURLToPath(new URL(path, import.meta.url))
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
    const schema = require.resolve('@engine/config/schema', { paths: [entry('../src/')] })
    expect([...runtimeReach(schema)].filter(isZod)).toEqual(['zod'])
  })

  it('keeps file reads in the copy entry', () => {
    const copy = [...runtimeReach(entry('../src/copy.ts'))]
    expect(copy).toEqual(expect.arrayContaining(['node:fs', 'node:path']))
  })
})
