import { describe, expect, it } from 'vitest'

import { COPY, fill, text, word } from './copy'

describe('the dashboard copy', () => {
  it('every label has both languages', () => {
    for (const [key, pair] of Object.entries(COPY)) {
      expect(pair.en, key).not.toBe('')
      expect(pair.id, key).not.toBe('')
    }
  })

  it('falls back to English, fills placeholders and names known words', () => {
    expect(text('fr', 'visitors')).toBe('Visitors')
    expect(text('id', 'visitors')).toBe('Pengunjung')
    expect(fill('en', 'comparing', { days: 7, from: 'a', to: 'b' })).toContain(
      '7 days before (a to b)',
    )
    expect(word('id', 'whatsapp')).toBe('WhatsApp')
    expect(word('en', 'not-a-key')).toBe('not-a-key')
  })
})
