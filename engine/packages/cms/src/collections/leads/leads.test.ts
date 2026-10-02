import { describe, expect, it } from 'vitest'

import { LEAD_KIND_LABELS, LEAD_STATUS_LABELS, SOURCE_LABELS } from './kinds'

describe('leads labels', () => {
  it('every lead kind label has en and id', () => {
    for (const [kind, labels] of Object.entries(LEAD_KIND_LABELS)) {
      expect(labels, kind).toHaveProperty('en')
      expect(labels, kind).toHaveProperty('id')
    }
  })

  it('every lead source label has en and id', () => {
    for (const [source, labels] of Object.entries(SOURCE_LABELS)) {
      expect(labels, source).toHaveProperty('en')
      expect(labels, source).toHaveProperty('id')
    }
  })

  it('every lead status label has en and id', () => {
    for (const [status, labels] of Object.entries(LEAD_STATUS_LABELS)) {
      expect(labels, status).toHaveProperty('en')
      expect(labels, status).toHaveProperty('id')
    }
  })
})
