import { describe, expect, it } from 'vitest'

import { EVENT_NAME_LABELS, SOURCE_LABELS } from '.'

describe('events labels', () => {
  it('every event name label has en and id', () => {
    for (const [name, labels] of Object.entries(EVENT_NAME_LABELS)) {
      expect(labels, name).toHaveProperty('en')
      expect(labels, name).toHaveProperty('id')
    }
  })

  it('every source label has en and id', () => {
    for (const [source, labels] of Object.entries(SOURCE_LABELS)) {
      expect(labels, source).toHaveProperty('en')
      expect(labels, source).toHaveProperty('id')
    }
  })
})
