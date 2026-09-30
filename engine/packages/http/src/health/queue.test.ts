/**
 * The queue as health reports it (`./queue`; 4.1 senior-be #3): counted with `runJobs`' own filter
 * on every queue, lag from when the oldest job became runnable, and stalls apart.
 */
import { describe, expect, it } from 'vitest'

import {
  judgeQueue,
  QUEUE_LAG_ALERT_SECONDS,
  runnableJobsWhere,
  stalledJobsWhere,
  STALLED_AFTER_SECONDS,
} from './queue'

const NOW = new Date('2026-09-30T12:00:00.000Z')
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString()

describe('runnableJobsWhere()', () => {
  it('is runJobs’ own filter (payload 3.90.2), with no queue named — every queue runs', () => {
    expect(runnableJobsWhere(NOW)).toEqual({
      and: [
        { completedAt: { exists: false } },
        { hasError: { not_equals: true } },
        { processing: { equals: false } },
        {
          or: [
            { waitUntil: { exists: false } },
            { waitUntil: { less_than: '2026-09-30T12:00:00.000Z' } },
          ],
        },
      ],
    })
    expect(JSON.stringify(runnableJobsWhere(NOW))).not.toContain('queue')
  })
})

describe('stalledJobsWhere()', () => {
  it('is an unfinished job still claimed long after its run began', () => {
    expect(stalledJobsWhere(NOW)).toEqual({
      and: [
        { completedAt: { exists: false } },
        { processing: { equals: true } },
        { updatedAt: { less_than: ago(STALLED_AFTER_SECONDS) } },
      ],
    })
  })
})

describe('judgeQueue()', () => {
  it('an empty queue has no lag', () => {
    expect(judgeQueue({ pending: 0, stalled: 0 }, NOW)).toEqual({
      ok: true,
      pending: 0,
      lagSeconds: 0,
      stalled: 0,
    })
  })

  it('lags from the oldest runnable job’s creation', () => {
    expect(judgeQueue({ pending: 3, oldest: { createdAt: ago(90) }, stalled: 0 }, NOW)).toEqual({
      ok: true,
      pending: 3,
      lagSeconds: 90,
      stalled: 0,
    })
  })

  it('a job that waited for its waitUntil lags only from then', () => {
    const oldest = { createdAt: ago(86_400), waitUntil: ago(30) }
    expect(judgeQueue({ pending: 1, oldest, stalled: 0 }, NOW).lagSeconds).toBe(30)
  })

  it('is lagging past DEPLOYMENT.md §7’s ten minutes, and stalled on a stuck claim', () => {
    const late = { createdAt: ago(QUEUE_LAG_ALERT_SECONDS + 1) }
    expect(judgeQueue({ pending: 1, oldest: late, stalled: 0 }, NOW)).toMatchObject({
      ok: false,
      detail: 'lagging',
    })
    expect(judgeQueue({ pending: 0, stalled: 2 }, NOW)).toMatchObject({
      ok: false,
      detail: 'stalled',
      stalled: 2,
    })
  })

  it('reads a Date as a string alike, and never counts a job with no time as lag', () => {
    const at = new Date(NOW.getTime() - 5_000)
    expect(judgeQueue({ pending: 1, oldest: { createdAt: at }, stalled: 0 }, NOW).lagSeconds).toBe(
      5,
    )
    expect(judgeQueue({ pending: 1, oldest: {}, stalled: 0 }, NOW).lagSeconds).toBe(0)
  })
})
