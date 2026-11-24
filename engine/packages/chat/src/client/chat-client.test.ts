import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  isAllowedCardHref,
  isAllowedHandoffHref,
  postConsent,
  sendChatMessage,
} from './chat-client'

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendChatMessage', () => {
  it('sends only text, locale and pagePath — never a title or a price', async () => {
    const calls: { url: string; body: unknown }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, body: JSON.parse(String(init.body)) })
        return new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 })
      }),
    )

    sendChatMessage(
      { text: 'Do you have maps of Java?', locale: 'en', pagePath: '/en/item/42-a-map' },
      () => undefined,
      () => undefined,
      () => undefined,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('/api/x/chat/message')
    expect(calls[0]?.body).toEqual({
      text: 'Do you have maps of Java?',
      locale: 'en',
      pagePath: '/en/item/42-a-map',
    })
  })

  it('reads the Retry-After header once, since the error event itself carries no such field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(new ReadableStream({ start: (c) => c.close() }), {
            status: 429,
            headers: { 'Retry-After': '12' },
          }),
      ),
    )

    const seen: number[] = []
    sendChatMessage(
      { text: 'hi', locale: 'en', pagePath: '/' },
      () => undefined,
      (seconds) => seen.push(seconds),
      () => undefined,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([12])
  })
})

describe('postConsent', () => {
  it('contact details go to the consent route, never in a message', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, body: JSON.parse(String(init.body)) })
        return jsonResponse({ ok: true, reference: 'L-1' })
      }),
    )

    const result = await postConsent({
      consentToken: 'token-123',
      name: 'Ida Bagus',
      whatsapp: '+6281234567890',
      email: null,
      preferredChannel: 'whatsapp',
      message: '',
      idempotencyKey: 'idem-key-123',
      locale: 'en',
    })

    expect(result).toEqual({ ok: true, reference: 'L-1' })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('/api/x/chat/consent')
    expect(calls[0]?.body.name).toBe('Ida Bagus')
    expect(calls[0]?.body.whatsapp).toBe('+6281234567890')
  })
})

describe('isAllowedHandoffHref', () => {
  it("renders the server's WhatsApp link and refuses a link to another domain", () => {
    const origin = 'https://gallery.example.com'
    expect(isAllowedHandoffHref('https://wa.me/6281234567890?text=hi', origin)).toBe(true)
    expect(isAllowedHandoffHref('mailto:owner@example.com?subject=hi', origin)).toBe(true)
    expect(isAllowedHandoffHref(`${origin}/contact`, origin)).toBe(true)
    expect(isAllowedHandoffHref('https://evil.example.net/phish', origin)).toBe(false)
    expect(isAllowedHandoffHref('javascript:alert(1)', origin)).toBe(false)
    expect(isAllowedHandoffHref(`${origin}.evil.example/phish`, origin)).toBe(false)
    expect(isAllowedHandoffHref('https://wa.me.evil.example/x', origin)).toBe(false)
    expect(isAllowedHandoffHref('http://wa.me/6281234567890', origin)).toBe(false)
  })

  it('a card links only into our own site', () => {
    const origin = 'https://gallery.example.com'
    expect(isAllowedCardHref('/product/1-x', origin)).toBe(true)
    expect(isAllowedCardHref(`${origin}/item/1-x`, origin)).toBe(true)
    expect(isAllowedCardHref('//evil.example/x', origin)).toBe(false)
    expect(isAllowedCardHref(`${origin}.evil.example/x`, origin)).toBe(false)
    expect(isAllowedCardHref('javascript:alert(1)', origin)).toBe(false)
  })
})
