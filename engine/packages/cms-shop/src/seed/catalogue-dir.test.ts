/**
 * `catalogueDir` inside the built server: the admin's "Shop products" seed on staging runs where
 * `import.meta.dirname` is undefined, and must fall back to the committed export (`null`) instead
 * of failing with `The "paths[0]" argument must be of type string`.
 */
import { describe, expect, it } from 'vitest'

import { catalogueDir } from './run'

describe('catalogueDir', () => {
  it('is null, not an error, with no LEGACY_DATA_DIR and no folder of its own', () => {
    expect(catalogueDir({}, undefined)).toBeNull()
  })

  it('is LEGACY_DATA_DIR when that folder exists', () => {
    expect(catalogueDir({ LEGACY_DATA_DIR: process.cwd() }, undefined)).toBe(process.cwd())
  })

  it('is null when LEGACY_DATA_DIR names no folder', () => {
    expect(catalogueDir({ LEGACY_DATA_DIR: '/no/such/folder' }, undefined)).toBeNull()
  })
})
