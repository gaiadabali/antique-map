import { describe, expect, it } from 'vitest'

import { PARTNER_KIND_LABELS, PARTNER_STATUS_LABELS } from '.'

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
