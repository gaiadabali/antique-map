/** `siteverify`: what is sent, and that every failure fails closed. */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { SITEVERIFY_URL, TEST_PASS_SECRET, turnstileVerifier } from './turnstile'

afterEach(() => vi.restoreAllMocks())

const signal = new AbortController().signal

describe('the Turnstile verifier', () => {
  it('posts the secret, the token and the address, and reads success and hostname', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ success: true, hostname: 'Indies-Gallery.gaiada.com' }))
    const result = await turnstileVerifier('secret-0123456789abcdef').verify(
      'tok',
      '203.0.113.9',
      signal,
    )
    expect(result).toEqual({ success: true, hostname: 'indies-gallery.gaiada.com' })
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe(SITEVERIFY_URL)
    const form = init?.body as URLSearchParams
    expect(Object.fromEntries(form)).toEqual({
      secret: 'secret-0123456789abcdef',
      response: 'tok',
      remoteip: '203.0.113.9',
    })
  })

  it.each([
    ['a failed challenge', () => Promise.resolve(Response.json({ success: false }))],
    ['a non-200 answer', () => Promise.resolve(new Response('busy', { status: 503 }))],
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
    ['a body that is not JSON', () => Promise.resolve(new Response('<html>'))],
  ])('fails closed on %s', async (_name, answer) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(answer)
    expect(await turnstileVerifier('secret-0123456789abcdef').verify('tok', null, signal)).toEqual({
      success: false,
      hostname: null,
    })
  })

  it('marks a result verified with the published test secret, and never a real one', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ success: true, hostname: 'example.com' }),
    )
    const signal = new AbortController().signal
    expect(await turnstileVerifier(TEST_PASS_SECRET).verify('tok', null, signal)).toEqual({
      success: true,
      hostname: 'example.com',
      testKey: true,
    })
    expect(await turnstileVerifier('secret-0123456789abcdef').verify('tok', null, signal)).toEqual({
      success: true,
      hostname: 'example.com',
    })
  })
})
