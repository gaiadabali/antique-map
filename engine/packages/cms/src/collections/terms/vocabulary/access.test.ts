/**
 * Who writes, publishes and reads the catalogue (CONTENT-MODEL.md §7; DR-10).
 */
import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { VOCABULARY_ACCESS } from './access'

describe('who writes and reads the catalogue', () => {
  const as = (user: unknown) => ({ req: { user } as unknown as PayloadRequest })
  const staff = (role: string, extra: object = {}) => ({ collection: 'users', role, ...extra })
  const store = staff('store', { store: 4 })

  it('lets the owner and the editors write and delete, and nobody else', () => {
    for (const operation of ['create', 'update', 'delete'] as const) {
      expect(VOCABULARY_ACCESS[operation](as(staff('owner')))).toBe(true)
      expect(VOCABULARY_ACCESS[operation](as(staff('editor')))).toBe(true)
      expect(VOCABULARY_ACCESS[operation](as(store))).toBe(false)
      expect(VOCABULARY_ACCESS[operation](as(staff('admin')))).toBe(false)
      expect(VOCABULARY_ACCESS[operation](as(null))).toBe(false)
    }
    expect(VOCABULARY_ACCESS.create(as({ collection: 'customers', role: 'owner' }))).toBe(false)
  })

  it('reads published records only for the public, drafts for the owner and the editors', () => {
    expect(VOCABULARY_ACCESS.read(as(null))).toEqual({ _status: { equals: 'published' } })
    expect(VOCABULARY_ACCESS.read(as(staff('editor')))).toBe(true)
    expect(VOCABULARY_ACCESS.readVersions(as(null))).toBe(false)
    expect(VOCABULARY_ACCESS.readVersions(as(staff('owner')))).toBe(true)
  })

  it('shows store staff none of it: no drafts, no versions, not even the published records', () => {
    expect(VOCABULARY_ACCESS.read(as(store))).toBe(false)
    expect(VOCABULARY_ACCESS.readVersions(as(store))).toBe(false)
  })
})
