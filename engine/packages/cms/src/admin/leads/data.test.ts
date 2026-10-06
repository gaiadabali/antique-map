import { describe, expect, it } from 'vitest'

import { firstLine, timeAgo } from './data'

describe('the inbox shows no more than the first line of the message', () => {
  it('keeps only the first line', () => {
    expect(firstLine('Hello there\nMore detail on another line')).toBe('Hello there')
  })

  it('truncates a long first line', () => {
    const long = 'x'.repeat(200)
    expect(firstLine(long, 140)).toBe(`${'x'.repeat(140)}…`)
  })

  it('is empty for no message', () => {
    expect(firstLine(null)).toBe('')
    expect(firstLine(undefined)).toBe('')
  })
})

describe('timeAgo', () => {
  it('reads "just now" for a moment ago', () => {
    expect(timeAgo(new Date(), 'en')).toBe('just now')
  })

  it('reads hours in both languages', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(timeAgo(threeHoursAgo, 'en')).toBe('3 h ago')
    expect(timeAgo(threeHoursAgo, 'id')).toBe('3 jam lalu')
  })
})
