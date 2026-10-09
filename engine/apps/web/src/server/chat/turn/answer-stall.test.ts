/** A stream that goes silent after its headers is aborted at the stall window and ends as a failure. */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { answer, STREAM_STALL_MS, type AnswerInput } from './answer'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the answer loop on a stalled upstream stream', () => {
  it('aborts the call after 30 s of silence and ends the turn as failed', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let callSignal!: AbortSignal
    const client = {
      // A stream that never yields and ignores the abort: only the stall timer can end the turn.
      streamAnswer: (_params: unknown, signal: AbortSignal) => {
        callSignal = signal
        return {
          events: { [Symbol.asyncIterator]: () => ({ next: () => new Promise<never>(() => {}) }) },
          finalMessage: () => new Promise<never>(() => {}),
        }
      },
    }
    const pending = answer({
      client,
      models: { chat: 'claude-sonnet-5-5', effort: 'low' },
      system: 's',
      messages: [{ role: 'user', content: 'hi' }],
      check: {},
      tools: {},
      signal: new AbortController().signal,
      emit: () => undefined,
      mayCall: async () => null,
    } as unknown as AnswerInput)

    await vi.advanceTimersByTimeAsync(STREAM_STALL_MS - 1)
    expect(callSignal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const result = await pending
    expect(callSignal.aborted).toBe(true)
    expect(result.ended).toBe('failed')
    expect(vi.getTimerCount()).toBe(0)
  })
})
