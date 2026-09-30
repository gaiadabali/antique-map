// The root entry is what a Client Component could import, so nothing it reaches may read a file or
// pull in the schema library: C1's zod schema is ~28 KB gzip of a page's 150 KB first-party budget
// (DESIGN-SYSTEM.md §7, 3.1 senior-fe #1), and the root needs only C1's zod-free constants
// (`@engine/config/constants`). Safe to bundle is not safe to call: a Client Component formats
// nothing — money, calendar dates and dimensions arrive as the server's strings (CONVENTIONS.md
// §6). The copy reader is the server's, at `@engine/i18n/copy`. The walk — static and dynamic
// imports, packages under the browser conditions — is the client-safe gate's
// (`engine/tooling/client-safe`, TASKS.md 4.2.a), imported back here and tested there on planted
// regressions (3.4 senior-fe #5, 4.2.b).
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  directReach,
  findReaches,
  forbiddenReason,
  resolvePackage,
  runtimeReach,
} from '../../../tooling/client-safe/index.mjs'

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

  it("passes the client-safe gate's rules", () => {
    expect(findReaches(entry('../src/index.ts'), forbiddenReason)).toEqual([])
  })

  it('would see zod if it were reached: the schema entry reaches it', () => {
    // The walk is not vacuous: through C1's schema entry it finds the schema library.
    const schema = resolvePackage('@engine/config/schema', entry('../src/index.ts'))
    expect([...runtimeReach(schema)].filter(isZod)).toEqual(['zod'])
  })

  it('keeps file reads in the copy entry, which the gate refuses in a client bundle', () => {
    const copy = entry('../src/copy.ts')
    expect([...runtimeReach(copy)]).toEqual(expect.arrayContaining(['node:fs', 'node:path']))
    const refused = findReaches(copy, forbiddenReason).map(({ specifier }) => specifier)
    expect(refused).toEqual(expect.arrayContaining(['node:fs', 'node:path']))
  })
})
