/**
 * Who writes and publishes the vocabulary (CONTENT-MODEL.md §8).
 */
import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { refuseContributorPublish, VOCABULARY_ACCESS } from './access'

describe('who writes and publishes the vocabulary', () => {
  const as = (user: unknown) => ({ req: { user } as unknown as PayloadRequest })
  const staff = (...roles: string[]) => ({ collection: 'users', roles })
  const publish = (user: unknown) =>
    refuseContributorPublish({
      data: { _status: 'published' },
      req: { user } as unknown as PayloadRequest,
    } as never)

  it('lets cataloguing roles and contributors write, admins and managers delete', () => {
    expect(VOCABULARY_ACCESS.create(as(staff('contributor')))).toBe(true)
    expect(VOCABULARY_ACCESS.update(as(staff('cataloguer')))).toBe(true)
    expect(VOCABULARY_ACCESS.update(as(staff('editor')))).toBe(false)
    expect(VOCABULARY_ACCESS.update(as(staff('analyst')))).toBe(false)
    expect(VOCABULARY_ACCESS.delete(as(staff('cataloguer')))).toBe(false)
    expect(VOCABULARY_ACCESS.delete(as(staff('manager')))).toBe(true)
    expect(VOCABULARY_ACCESS.create(as({ collection: 'customers', roles: ['admin'] }))).toBe(false)
  })

  it('reads published records only for the public, drafts for staff', () => {
    expect(VOCABULARY_ACCESS.read(as(null))).toEqual({ _status: { equals: 'published' } })
    expect(VOCABULARY_ACCESS.read(as(staff('contributor')))).toBe(true)
    expect(VOCABULARY_ACCESS.readVersions(as(null))).toBe(false)
  })

  it('refuses a contributor’s publish, and nobody else’s', () => {
    expect(() => publish(staff('contributor'))).toThrow(/Contributors save drafts/)
    expect(publish(staff('contributor', 'cataloguer'))).toEqual({ _status: 'published' })
    expect(publish(staff('admin'))).toEqual({ _status: 'published' })
    expect(publish(null)).toEqual({ _status: 'published' })
    const draft = refuseContributorPublish({
      data: { _status: 'draft' },
      req: { user: staff('contributor') } as unknown as PayloadRequest,
    } as never)
    expect(draft).toEqual({ _status: 'draft' })
  })
})
