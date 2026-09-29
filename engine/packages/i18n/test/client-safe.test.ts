// The root entry is imported by Client Components for the formatters, so nothing it reaches may
// read a file: `formatMoney` must render the same on the server and in the browser (C5). The
// copy reader is the server's, at `@engine/i18n/copy`.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

function runtimeImports(entry: string, seen = new Set<string>()): Set<string> {
  const packages = new Set<string>()
  if (seen.has(entry)) return packages
  seen.add(entry)
  const statements = /(?:^|\n)\s*(?:import|export)(\s+type\b)?[^'"]*?from\s+['"]([^'"]+)['"]/g
  for (const [, typeOnly, specifier = ''] of readFileSync(entry, 'utf8').matchAll(statements)) {
    if (typeOnly) continue
    if (!specifier.startsWith('.')) packages.add(specifier)
    else
      for (const name of runtimeImports(`${resolve(dirname(entry), specifier)}.ts`, seen))
        packages.add(name)
  }
  return packages
}

describe('@engine/i18n — the root entry is safe in the browser', () => {
  it('reaches no node: module; the copy entry is the one that reads files', () => {
    const root = runtimeImports(fileURLToPath(new URL('../src/index.ts', import.meta.url)))
    expect([...root]).toEqual(['@engine/config/schema'])
    const copy = runtimeImports(fileURLToPath(new URL('../src/copy.ts', import.meta.url)))
    expect([...copy]).toEqual(expect.arrayContaining(['node:fs', 'node:path']))
  })
})
