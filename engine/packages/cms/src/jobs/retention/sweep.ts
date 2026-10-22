/**
 * The retention sweep (TASKS.md 9.1.d; COMPLIANCE.md §1): what is past its date is deleted, once a
 * day, by `POST /api/x/cron/retention`. Pure over Payload's Local API and a `now` — the clock is
 * the caller's, so a test fixes it.
 *
 * - **Chat sessions**: `expiresAt` (the collection's hook sets it to the last message + 30 days) has
 *   passed — or, with none, the last message is more than 30 days old.
 * - **Leads**: `status: 'closed'` and `closedAt` more than 24 months ago; and `spam` leads created
 *   more than 30 days ago. A lead in any other status is never selected, however old, and a closed
 *   lead with no `closedAt` has no clock to count from.
 * - **Driver images**: the fulfilment purge (`shop/fulfilment`, TASKS.md 7.1.b) — 30 days after the
 *   order's last move into delivered or cancelled, the private objects removed and the order's
 *   `driverImage` cleared; the order itself stays.
 *
 * Idempotent: a second run at the same `now` finds nothing. The result and the one log line are
 * counts only — no id, name, contact or message ever reaches the log.
 */
import type { Payload, Where } from 'payload'

import { purgeDriverImages, type DriverImageDeps } from '../../shop/fulfilment'

import { deleteWhere, RETENTION_MAX_ROUNDS } from './delete-batches'
import { daysBefore, monthsBefore, RETENTION_DEFAULTS, type RetentionPolicy } from './policy'

export type RetentionCounts = {
  readonly chatSessions: number
  readonly leads: number
  readonly driverImages: number
}

export type RetentionDeps = {
  /** The private bucket's store; the environment's by default. */
  readonly images?: Pick<DriverImageDeps, 'store'>
  /** Where the counts line goes; the instance's logger by default. */
  readonly log?: (line: string) => void
}

const iso = (date: Date) => date.toISOString()

export function expiredChatSessions(now: Date, policy: RetentionPolicy): Where {
  return {
    or: [
      { expiresAt: { less_than_equal: iso(now) } },
      {
        and: [
          { expiresAt: { exists: false } },
          { lastMessageAt: { less_than: iso(daysBefore(now, policy.chatSessionDays)) } },
        ],
      },
    ],
  }
}

export function expiredLeads(now: Date, policy: RetentionPolicy): Where {
  return {
    or: [
      {
        and: [
          { status: { equals: 'closed' } },
          { closedAt: { less_than: iso(monthsBefore(now, policy.closedLeadMonths)) } },
        ],
      },
      {
        and: [
          { status: { equals: 'spam' } },
          { createdAt: { less_than: iso(daysBefore(now, policy.spamLeadDays)) } },
        ],
      },
    ],
  }
}

/** Driver images are purged a page of 100 orders at a time until a page purges none. */
async function purgeAllDriverImages(
  payload: Payload,
  now: Date,
  deps: RetentionDeps,
): Promise<{ purged: number; failed: number }> {
  let purged = 0
  let failed = 0
  for (let round = 0; round < RETENTION_MAX_ROUNDS; round += 1) {
    const run = await purgeDriverImages(payload, now, deps.images)
    purged += run.purged
    failed = run.failed
    if (run.purged === 0) break
  }
  return { purged, failed }
}

export async function runRetention(
  payload: Payload,
  now: Date,
  policy: RetentionPolicy = RETENTION_DEFAULTS,
  deps: RetentionDeps = {},
): Promise<RetentionCounts> {
  const chatSessions = await deleteWhere(payload, 'chat-sessions', expiredChatSessions(now, policy))
  const leads = await deleteWhere(payload, 'leads', expiredLeads(now, policy))
  const images = await purgeAllDriverImages(payload, now, deps)

  const counts: RetentionCounts = { chatSessions, leads, driverImages: images.purged }
  // Counts only. A failed image purge (no bucket, an unreachable one) is a count too: it stays due
  // and the next run takes it again.
  const line =
    `retention: chatSessions=${counts.chatSessions} leads=${counts.leads}` +
    ` driverImages=${counts.driverImages}` +
    (images.failed > 0 ? ` driverImagesFailed=${images.failed}` : '')
  ;(deps.log ?? ((text: string) => payload.logger.info(text)))(line)
  return counts
}
