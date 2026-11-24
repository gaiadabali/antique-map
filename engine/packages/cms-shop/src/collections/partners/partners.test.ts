import { describe, expect, it } from 'vitest'

import { PARTNER_KIND_LABELS, PARTNER_STATUS_LABELS, Partners } from '.'

describe('partners have no auth', () => {
  it('carries no `auth` config and no login route exists for partners', () => {
    expect((Partners as Record<string, unknown>).auth).toBeUndefined()
  })
})

describe('the products picker offers only published products', () => {
  it('filters productsCarried to published products', () => {
    const field = Partners.fields.find((f) => 'name' in f && f.name === 'productsCarried') as {
      filterOptions?: unknown
    }
    expect(field?.filterOptions).toEqual({ _status: { equals: 'published' } })
  })
})

describe('partners labels', () => {
  it('every partner kind label has en and id', () => {
    for (const [kind, labels] of Object.entries(PARTNER_KIND_LABELS)) {
      expect(labels, kind).toHaveProperty('en')
      expect(labels, kind).toHaveProperty('id')
    }
  })

  it('every partner status label has en and id', () => {
    for (const [status, labels] of Object.entries(PARTNER_STATUS_LABELS)) {
      expect(labels, status).toHaveProperty('en')
      expect(labels, status).toHaveProperty('id')
    }
  })
})
