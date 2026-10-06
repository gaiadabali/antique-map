import { describe, expect, it } from 'vitest'

import { baliDateTime } from './bali-datetime'

describe('baliDateTime', () => {
  it('shows the day, month and time in WITA (UTC+8), never the raw timestamp', () => {
    const shown = baliDateTime('2026-10-06T13:31:48.252Z', 'en')
    expect(shown).toMatch(/6 Oct/)
    expect(shown).toMatch(/21:31 WITA$/)
    expect(shown).not.toContain('T13')
  })

  it('crosses midnight into the next Bali day', () => {
    expect(baliDateTime('2026-10-06T16:05:00.000Z', 'id')).toMatch(/7 Okt.*00[.:]05 WITA$/)
  })

  it('answers nothing for no time or an unreadable one', () => {
    expect(baliDateTime(null, 'en')).toBeUndefined()
    expect(baliDateTime('not a date', 'en')).toBeUndefined()
  })
})
