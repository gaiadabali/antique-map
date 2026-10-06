/**
 * The retention policy and its queries, without a database (TASKS.md 9.1.d): the cutoffs and the
 * `where` each deletion uses.
 */
import { describe, expect, it } from 'vitest'

import {
  CHAT_SESSION_RETENTION_DAYS,
  CLOSED_LEAD_RETENTION_MONTHS,
  RETENTION_DEFAULTS,
  SPAM_LEAD_RETENTION_DAYS,
  daysBefore,
  monthsBefore,
} from './policy'
import { expiredChatSessions, expiredLeads } from './sweep'

const NOW = new Date('2027-06-15T03:15:00.000Z')

describe('the retention policy', () => {
  it('keeps COMPLIANCE.md section 1 as named constants', () => {
    expect(CHAT_SESSION_RETENTION_DAYS).toBe(30)
    expect(CLOSED_LEAD_RETENTION_MONTHS).toBe(24)
    expect(SPAM_LEAD_RETENTION_DAYS).toBe(30)
    expect(RETENTION_DEFAULTS).toEqual({
      chatSessionDays: 30,
      closedLeadMonths: 24,
      spamLeadDays: 30,
    })
  })

  it('counts days and calendar months back from now', () => {
    expect(daysBefore(NOW, 30).toISOString()).toBe('2027-05-16T03:15:00.000Z')
    expect(monthsBefore(NOW, 24).toISOString()).toBe('2025-06-15T03:15:00.000Z')
    // A month-end clamps rather than spilling into the next month.
    expect(monthsBefore(new Date('2027-05-31T00:00:00.000Z'), 3).toISOString()).toBe(
      '2027-02-28T00:00:00.000Z',
    )
    expect(monthsBefore(new Date('2028-03-31T00:00:00.000Z'), 1).toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    )
  })
})

describe('what each deletion selects', () => {
  it('never selects a lead that is not closed or spam', () => {
    const text = JSON.stringify(expiredLeads(NOW, RETENTION_DEFAULTS))
    expect(text).toContain('"status":{"equals":"closed"}')
    expect(text).toContain('"status":{"equals":"spam"}')
    expect(text).not.toMatch(/"new"|"contacted"|"in_progress"/)
    expect(text).toContain('2025-06-15T03:15:00.000Z')
    expect(text).toContain('2027-05-16T03:15:00.000Z')
  })

  it('selects a chat session by its expiry, or its last message when it has none', () => {
    const text = JSON.stringify(expiredChatSessions(NOW, RETENTION_DEFAULTS))
    expect(text).toContain('"expiresAt":{"less_than_equal":"2027-06-15T03:15:00.000Z"}')
    expect(text).toContain('"lastMessageAt":{"less_than":"2027-05-16T03:15:00.000Z"}')
  })
})
