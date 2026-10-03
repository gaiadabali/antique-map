import { describe, expect, it } from 'vitest'

import { PAGE_KIND_LABELS } from './kinds'

describe('pages labels', () => {
  it('every page kind label has en and id', () => {
    for (const [kind, labels] of Object.entries(PAGE_KIND_LABELS)) {
      expect(labels, kind).toHaveProperty('en')
      expect(labels, kind).toHaveProperty('id')
    }
  })
})
