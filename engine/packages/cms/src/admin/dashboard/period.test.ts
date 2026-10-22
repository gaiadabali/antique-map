/**
 * The dashboard's calendar and its compare (TASKS.md 9.2.b), pure: a period is a pair of WITA day
 * strings, the one before it ends the day before it starts, and a bad range never raises.
 */
import { describe, expect, it } from 'vitest'

import { compared } from './compare'
import { instantBounds, resolvePeriod, shiftDay, witaDay } from './period'
import { replyDeadline } from './loaders/asks'

describe('periods', () => {
  // 20:00 UTC on 2 Oct is 04:00 on 3 Oct in Bali.
  const now = new Date('2026-10-02T20:00:00.000Z')

  it('counts "today" in UTC+8', () => {
    expect(witaDay(now)).toBe('2026-10-03')
    expect(witaDay(new Date('2026-10-02T15:59:59.000Z'))).toBe('2026-10-02')
  })

  it('a preset ends today and compares with the equally long period before', () => {
    const p = resolvePeriod({ period: '7' }, now)
    expect(p).toMatchObject({ from: '2026-09-27', to: '2026-10-03', days: 7, preset: 7 })
    expect(p.previous).toEqual({ from: '2026-09-20', to: '2026-09-26' })
    expect(resolvePeriod({ period: '90' }, now).days).toBe(90)
    expect(resolvePeriod({}, now).days).toBe(30)
  })

  it('a range is taken as picked, and a bad one falls back to 30 days', () => {
    const r = resolvePeriod({ from: '2026-09-01', to: '2026-09-10' }, now)
    expect(r).toMatchObject({ preset: 'range', days: 10 })
    expect(r.previous).toEqual({ from: '2026-08-22', to: '2026-08-31' })
    for (const bad of [
      { from: '2026-09-10', to: '2026-09-01' },
      { from: '2026-10-01', to: '2026-10-09' },
      { from: '2025-01-01', to: '2026-09-01' },
      { from: 'yesterday', to: 'today' },
    ]) {
      expect(resolvePeriod(bad, now)).toMatchObject({ preset: 30, days: 30 })
    }
  })

  it('shifts across months and years', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('a day spans 16:00 UTC to 16:00 UTC', () => {
    const { start, end } = instantBounds({ from: '2026-10-03', to: '2026-10-03' })
    expect(start.toISOString()).toBe('2026-10-02T16:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-03T16:00:00.000Z')
  })
})

describe('compare', () => {
  it('the delta is the difference and the percent of the period before', () => {
    expect(compared(150, 100)).toEqual({ current: 150, previous: 100, change: 50, pct: 50 })
    expect(compared(1, 3)).toMatchObject({ change: -2, pct: -66.7 })
  })

  it('has no percent when the period before was nothing', () => {
    expect(compared(4, 0)).toMatchObject({ change: 4, pct: null })
    expect(compared(0, 0)).toMatchObject({ change: 0, pct: null })
  })
})

describe('the same-working-day promise', () => {
  it('ends with the Singapore day, and a weekend lead has until the end of Monday', () => {
    // Friday 2 Oct 2026, 10:00 in Bali: due when Friday ends (Saturday 00:00 Bali).
    expect(replyDeadline(new Date('2026-10-02T02:00:00.000Z')).toISOString()).toBe(
      '2026-10-02T16:00:00.000Z',
    )
    // Saturday 3 Oct: due when Monday 5 Oct ends.
    expect(replyDeadline(new Date('2026-10-03T02:00:00.000Z')).toISOString()).toBe(
      '2026-10-05T16:00:00.000Z',
    )
    // Sunday 4 Oct likewise.
    expect(replyDeadline(new Date('2026-10-04T02:00:00.000Z')).toISOString()).toBe(
      '2026-10-05T16:00:00.000Z',
    )
  })
})
