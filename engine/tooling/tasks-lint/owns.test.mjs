import { describe, expect, it } from 'vitest'

import { findOwnsConflicts, ownsOverlap } from './owns.mjs'

describe('ownsOverlap', () => {
  it('a directory glob overlaps a file nested under it, but not a sibling file', () => {
    expect(
      ownsOverlap('engine/apps/*/src/messages/keys.ts', 'engine/apps/gallery/src/messages/keys.ts'),
    ).toBe(true)
    expect(
      ownsOverlap('engine/apps/*/src/messages/keys.ts', 'engine/apps/gallery/PRODUCT.md'),
    ).toBe(false)
  })

  it('a ** glob overlaps anything nested below it', () => {
    expect(ownsOverlap('engine/tooling/db/**', 'engine/tooling/db/naming.mjs')).toBe(true)
    expect(ownsOverlap('engine/tooling/db/**', 'engine/tooling/route-parity/cli.mjs')).toBe(false)
  })

  it('two disjoint literal files never overlap', () => {
    expect(ownsOverlap('docker-compose.dev.yml', '.env.example')).toBe(false)
  })

  it('a filename wildcard only overlaps a name matching its fixed parts', () => {
    expect(ownsOverlap('lighthouserc*.json', 'lighthouserc.gallery.json')).toBe(true)
    expect(ownsOverlap('lighthouserc*.json', 'docker-compose.dev.yml')).toBe(false)
  })

  it('brace expansion overlaps any one of its alternatives', () => {
    expect(ownsOverlap('engine/tooling/{a,b}/**', 'engine/tooling/b/cli.mjs')).toBe(true)
    expect(ownsOverlap('engine/tooling/{a,b}/**', 'engine/tooling/c/cli.mjs')).toBe(false)
  })

  it('the real planted violation (2.2.i): two tasks in one wave both owning engine/apps/emporium/src/surfaces/item', () => {
    expect(
      ownsOverlap(
        'engine/apps/emporium/src/surfaces/item/**',
        'engine/apps/emporium/src/surfaces/item/configurator/**',
      ),
    ).toBe(true)
  })
})

describe('findOwnsConflicts', () => {
  it('lists every overlapping (pathA, pathB) pair between two tasks', () => {
    const a = { id: 'a.1', owns: ['engine/tooling/db/**', 'package.json'] }
    const b = { id: 'a.2', owns: ['engine/tooling/db/naming.mjs', '.env.example'] }
    expect(findOwnsConflicts(a, b)).toEqual([
      {
        taskA: 'a.1',
        taskB: 'a.2',
        pathA: 'engine/tooling/db/**',
        pathB: 'engine/tooling/db/naming.mjs',
      },
    ])
  })

  it('is empty for two tasks with disjoint Owns', () => {
    const a = { id: 'a.1', owns: ['engine/tooling/db/**'] }
    const b = { id: 'a.2', owns: ['engine/tooling/route-parity/**'] }
    expect(findOwnsConflicts(a, b)).toEqual([])
  })
})
