/**
 * The retention periods of COMPLIANCE.md §1, each a named constant, and the date arithmetic that
 * turns one into a cutoff. Pure: no Payload, no clock of its own — the sweep passes `now`.
 *
 * Driver images are not in the policy: their 30 days live with the code that stores them
 * (`shop/fulfilment` `DRIVER_IMAGE_RETENTION_DAYS`), and the sweep calls that purge.
 */

/** Chat transcripts: 30 days after the last message (AI.md §3.4; COMPLIANCE.md §1). */
export const CHAT_SESSION_RETENTION_DAYS = 30
/** Leads: 24 months after the lead closes (COMPLIANCE.md §1). */
export const CLOSED_LEAD_RETENTION_MONTHS = 24
/** Spam leads: 30 days — nothing to answer, nothing to keep (TASKS.md 9.1.d). */
export const SPAM_LEAD_RETENTION_DAYS = 30

export type RetentionPolicy = {
  readonly chatSessionDays: number
  readonly closedLeadMonths: number
  readonly spamLeadDays: number
}

export const RETENTION_DEFAULTS: RetentionPolicy = {
  chatSessionDays: CHAT_SESSION_RETENTION_DAYS,
  closedLeadMonths: CLOSED_LEAD_RETENTION_MONTHS,
  spamLeadDays: SPAM_LEAD_RETENTION_DAYS,
}

const DAY_MS = 24 * 60 * 60 * 1000

/** `now` minus `days` whole days. */
export function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS)
}

/** `now` minus `months` calendar months, in UTC; a month-end clamps (31 May − 3 months = 28 Feb). */
export function monthsBefore(now: Date, months: number): Date {
  const result = new Date(now.getTime())
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() - months)
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}
