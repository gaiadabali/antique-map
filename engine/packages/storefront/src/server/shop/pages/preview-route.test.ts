/**
 * `GET /api/x/preview` (TASKS.md 27.5.a): draft mode is switched on only for a signed-in owner or
 * editor whose session the request carries, on the shop's host, from the shop's own origin, and
 * only towards a shop page's own path. Anyone else — the public, a store user, another site, a
 * forged address — gets no draft mode.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  enabled: false,
  user: null as null | { collection: string; role: string },
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  draftMode: async () => ({
    isEnabled: state.enabled,
    enable: () => {
      state.enabled = true
    },
    disable: () => {
      state.enabled = false
    },
  }),
}))
vi.mock('server-only', () => ({}))
vi.mock('@engine/cms/instance', () => ({
  cms: async () => ({ auth: async () => ({ user: state.user }) }),
}))

import { GET } from './preview-route'
import { previewPath, returnPath } from './preview-path'

const ask = (query: string, headers: Record<string, string> = {}) =>
  GET(
    new Request(`http://shop.localhost/api/x/preview${query}`, {
      headers: { 'x-site': 'shop', 'sec-fetch-site': 'same-origin', ...headers },
    }),
  )

describe('GET /api/x/preview', () => {
  beforeEach(() => {
    state.enabled = false
    state.user = null
  })
  afterEach(() => vi.restoreAllMocks())

  it('lets an address the owner typed in (Sec-Fetch-Site: none) through', async () => {
    state.user = { collection: 'users', role: 'owner' }
    expect((await ask('?path=%2F', { 'sec-fetch-site': 'none' })).status).toBe(307)
  })

  it('lets a signed-in owner or editor into a page’s draft, and sends them to the page', async () => {
    for (const role of ['owner', 'editor']) {
      state.enabled = false
      state.user = { collection: 'users', role }
      const response = await ask('?path=%2Fpartnership')
      expect(response.status, role).toBe(307)
      expect(response.headers.get('location')).toBe('/partnership')
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(state.enabled, role).toBe(true)
    }
  })

  it('refuses the public and a store user, and switches nothing on', async () => {
    expect((await ask('?path=%2F')).status).toBe(403)
    state.user = { collection: 'users', role: 'store' }
    expect((await ask('?path=%2F')).status).toBe(403)
    expect(state.enabled).toBe(false)
  })

  it('refuses another site’s host, a request from another site, and an address not a shop page', async () => {
    state.user = { collection: 'users', role: 'owner' }
    expect((await ask('?path=%2F', { 'x-site': 'gallery' })).status).toBe(404)
    expect((await ask('?path=%2F', { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
    expect((await ask('?path=%2F', { 'sec-fetch-site': 'same-site' })).status).toBe(403)
    for (const path of ['https://evil.example/', '//evil.example', '/checkout', '/nope/deeper/x']) {
      expect((await ask(`?path=${encodeURIComponent(path)}`)).status, path).toBe(400)
    }
    expect(state.enabled).toBe(false)
  })

  it('leaves draft mode for anyone, back to a shop path', async () => {
    state.enabled = true
    const response = await ask('?exit=1&path=%2F%2Fevil.example')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('/')
    expect(state.enabled).toBe(false)
  })
})

describe('the addresses a preview may open', () => {
  it('are the shop’s pages in either language', () => {
    for (const path of ['/', '/partnership', '/stores', '/about-us', '/id', '/id/kemitraan']) {
      expect(previewPath(path), path).toBe(path)
    }
  })

  it('are never another origin, a query or a page that is not a CMS page', () => {
    for (const path of [null, '', 'about', '//x.example', '/\\x', '/about?x=1', '/checkout']) {
      expect(previewPath(path), String(path)).toBeNull()
    }
    expect(returnPath('/checkout')).toBe('/checkout')
    expect(returnPath('https://evil.example')).toBe('/')
  })
})
