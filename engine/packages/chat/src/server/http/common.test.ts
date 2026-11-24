import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { ChatDeps } from '../context'
import { CHAT_LIMITS } from '../env'
import { galleryChat } from '../sites/gallery'
import { shopChat } from '../sites/shop'
import { isSameOrigin, readJson, siteOf } from './common'

function chunked(text: string): Request {
  const bytes = new TextEncoder().encode(text)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let at = 0; at < bytes.length; at += 1024) controller.enqueue(bytes.slice(at, at + 1024))
      controller.close()
    },
  })
  return new Request('http://localhost/api/x/chat', {
    method: 'POST',
    body: stream,
    duplex: 'half',
  } as RequestInit)
}

describe('readJson caps a chunked body', () => {
  it('refuses a body over the cap that declares no Content-Length', async () => {
    const request = chunked(JSON.stringify({ text: 'a'.repeat(CHAT_LIMITS.maxBodyBytes * 2) }))
    expect(request.headers.get('content-length')).toBeNull()
    expect(await readJson(request)).toBeNull()
  })

  it('reads a chunked body within the cap', async () => {
    expect(await readJson(chunked('{"a":1}'))).toEqual({ a: 1 })
  })
})

describe('the site of a request in one app’s environment — the shop’s own (23.4)', () => {
  const ONE_APP = { SITE_HOSTS: 'shop.localhost,www.shop.localhost', PORT: '4881' } as const
  const deps = (sites: ChatDeps['sites'], env: Record<string, string>) =>
    ({ sites, env }) as unknown as ChatDeps
  const ask = (host: string, origin?: string) =>
    new Request(`http://${host}/api/x/chat/session`, {
      method: 'POST',
      headers: { host, ...(origin ? { origin } : {}) },
    })

  it('names the app’s site on its canonical host alone, from SITE_HOSTS', () => {
    const shop = deps({ shop: shopChat }, ONE_APP)
    expect(siteOf(ask('shop.localhost:4881'), shop)).toBe('shop')
    expect(siteOf(ask('www.shop.localhost'), shop)).toBeNull()
    expect(siteOf(ask('gallery.localhost'), shop)).toBeNull()
  })

  it('checks a write’s Origin against the app’s own origin', () => {
    const shop = deps({ shop: shopChat }, ONE_APP)
    expect(isSameOrigin(ask('shop.localhost', 'http://shop.localhost:4881'), 'shop', shop)).toBe(
      true,
    )
    expect(isSameOrigin(ask('shop.localhost', 'http://evil.localhost'), 'shop', shop)).toBe(false)
  })

  it('still picks each site from its own list in today’s two-site environment', () => {
    const today = deps(
      { gallery: galleryChat, shop: shopChat },
      { GALLERY_HOSTS: 'gallery.example.org', SHOP_HOSTS: 'shop.example.org' },
    )
    expect(siteOf(ask('gallery.example.org'), today)).toBe('gallery')
    expect(siteOf(ask('shop.example.org'), today)).toBe('shop')
    expect(siteOf(ask('other.example.org'), today)).toBeNull()
  })
})
