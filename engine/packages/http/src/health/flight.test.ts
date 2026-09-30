/**
 * `./flight` (4.1 senior-be #5; the independent 4.8 review, S3): one run at a time, its answer kept
 * for a window; a query answered in time or reported as not answering, and never started twice
 * while one is pending.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { bounded, memoised, NotAnsweredError } from './flight'

afterEach(() => vi.useRealTimers())

/** A promise and the hands that settle it. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

describe('memoised()', () => {
  it('shares one in-flight run, then keeps its answer for the window', async () => {
    let clock = 0
    let runs = 0
    const gate = deferred<string>()
    const check = memoised(
      () => (runs++, gate.promise),
      5_000,
      () => clock,
    )
    const first = [check(), check(), check()]
    expect(runs).toBe(1)
    gate.resolve('a')
    expect(await Promise.all(first)).toEqual(['a', 'a', 'a'])
    clock = 4_999
    expect(await check()).toBe('a')
    expect(runs).toBe(1)
    clock = 5_000
    await check()
    expect(runs).toBe(2)
  })

  it('keeps no rejection: the next call runs again', async () => {
    let runs = 0
    const check = memoised(async () => {
      runs++
      if (runs === 1) throw new Error('first')
      return 'second'
    }, 5_000)
    await expect(check()).rejects.toThrow('first')
    expect(await check()).toBe('second')
  })
})

describe('bounded()', () => {
  it('answers what the query answers, in time', async () => {
    expect(await bounded('the database', async () => 7, 100)()).toBe(7)
  })

  it('reports a query that does not answer in time, naming it', async () => {
    vi.useFakeTimers()
    const probe = bounded('the database', () => new Promise<never>(() => {}), 2_500)
    const answer = probe().catch((error: unknown) => error)
    vi.advanceTimersByTime(2_500)
    const error = await answer
    expect(error).toBeInstanceOf(NotAnsweredError)
    expect(String(error)).toContain('the database did not answer within 2500 ms')
  })

  it('never starts a second query while one is pending, a timed-out one included', async () => {
    vi.useFakeTimers()
    let started = 0
    const hung = deferred<string>()
    const probe = bounded('the database', () => (started++, hung.promise), 1_000)
    const first = probe().catch((error: unknown) => error)
    vi.advanceTimersByTime(1_000)
    expect(await first).toBeInstanceOf(NotAnsweredError)
    const second = probe()
    expect(started).toBe(1) // the timed-out query is still the one pending
    hung.resolve('late')
    expect(await second).toBe('late')
    await probe()
    expect(started).toBe(2) // settled, so the next check asks afresh
  })

  it('passes a query’s own failure through, and asks again next time', async () => {
    let started = 0
    const probe = bounded(
      'the database',
      async () => {
        started++
        throw new Error('ECONNREFUSED')
      },
      1_000,
    )
    await expect(probe()).rejects.toThrow('ECONNREFUSED')
    await expect(probe()).rejects.toThrow('ECONNREFUSED')
    expect(started).toBe(2)
  })
})
