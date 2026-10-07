/**
 * The drafting limits (TASKS.md 8.3 item 5) and the route's body: one draft per work at a time,
 * 20 per user per hour, and a body that names a work and nothing else.
 */
import { describe, expect, it } from 'vitest'

import { workIdOf } from './http'
import { DraftLimiter } from './limits'

describe('the drafting limits (8.3)', () => {
  it('holds one draft per work at a time', () => {
    const limiter = new DraftLimiter()
    expect(limiter.begin('1')).toBe(true)
    expect(limiter.begin('1')).toBe(false)
    expect(limiter.begin('2')).toBe(true)
    limiter.end('1')
    expect(limiter.begin('1')).toBe(true)
  })

  it('allows 20 drafts per user per hour, then says how long to wait', () => {
    const limiter = new DraftLimiter()
    const start = 1_000_000
    for (let n = 0; n < 20; n++) expect(limiter.take('u1', start + n)).toBe(0)
    expect(limiter.take('u1', start + 20)).toBe(3600)
    expect(limiter.take('u2', start + 20)).toBe(0)
    expect(limiter.take('u1', start + 60 * 60 * 1000 + 1)).toBe(0)
  })
})

describe('the drafting route’s body (8.3.a)', () => {
  it('names a work by id and nothing else — never who asks', () => {
    expect(workIdOf('{"workId":12}')).toBe(12)
    expect(workIdOf('{"workId":"12"}')).toBe(12)
    expect(workIdOf('{"workId":12,"user":1}')).toBeNull()
    expect(workIdOf('{"workId":-1}')).toBeNull()
    expect(workIdOf('{"workId":1.5}')).toBeNull()
    expect(workIdOf('not json')).toBeNull()
    expect(workIdOf(`{"workId":"${'1'.repeat(2000)}"}`)).toBeNull()
  })
})
