// C13 v1.3 (TASKS.md 4.3.b): the placeholder a mount names while its handler is unbuilt, the brand
// files the root URLs are answered from, and what the proxy sets beyond its rewrite — a missing
// User-Agent, the public query and its own not-found's status.
import { describe, expect, it } from 'vitest'

import {
  BRAND_ASSET_URL,
  BRAND_ROOT_ASSETS,
  ENGINE_ROUTES,
  PROXY_NOT_FOUND_STATUS,
  PROXY_REQUEST_HEADERS,
  PROXY_USER_AGENT,
  REVALIDATE_REQUEST,
  ROOT_REWRITES,
  UNBUILT_HANDLER,
  unbuiltHandlerOf,
} from '../manifest'

describe('C13 — the placeholder for an unbuilt handler', () => {
  it('is robots’ fail-closed answer alone', () => {
    expect(UNBUILT_HANDLER.byPath).toEqual({ '/api/x/robots': '@engine/http/unbuilt/robots' })
    expect(unbuiltHandlerOf('/api/x/robots')).toBe('@engine/http/unbuilt/robots')
  })

  it('is never a route’s own handler, so route parity can tell a placeholder from a handler', () => {
    for (const route of ENGINE_ROUTES) {
      const placeholder = unbuiltHandlerOf(route.path)
      expect(
        ENGINE_ROUTES.some((each) => each.handler === placeholder),
        route.path,
      ).toBe(false)
      expect(route.handler.startsWith(UNBUILT_HANDLER.specifier), route.path).toBe(false)
    }
  })

  it('names only mounted routes among its exceptions', () => {
    for (const path of Object.keys(UNBUILT_HANDLER.byPath)) {
      expect(
        ENGINE_ROUTES.some((route) => route.path === path),
        path,
      ).toBe(true)
    }
  })
})

describe('C13 — the brand files a root URL is answered from', () => {
  it('answers every brand-file root URL from a file BRAND_ROOT_ASSETS names, or the favicon', () => {
    const named = Object.values(BRAND_ROOT_ASSETS).map((file) => `${BRAND_ASSET_URL.path}${file}`)
    const brandFiles = ROOT_REWRITES.filter((row) => row.to.startsWith(BRAND_ASSET_URL.path))
    expect(brandFiles.length).toBeGreaterThan(0)
    for (const { from, to } of brandFiles) {
      expect(named.includes(to) || to === `${BRAND_ASSET_URL.path}:favicon`, from).toBe(true)
    }
    expect(named).toEqual(['/brand-assets/apple-touch-icon.png', '/brand-assets/site.webmanifest'])
  })
})

describe('C13 — what the proxy sets beyond its rewrite', () => {
  it('names each request header once, in the lower case Next hands a page', () => {
    const names = Object.values(PROXY_REQUEST_HEADERS)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(name, name).toBe(name.toLowerCase())
    expect(PROXY_REQUEST_HEADERS.publicSearch).toBe('x-public-search')
  })

  it('supplies a User-Agent that is a non-empty RFC 9110 product with a comment', () => {
    // Next reads an empty User-Agent as none at all, and serves such a request the prerendered shell.
    const token = "[!#$%&'*+.^_`|~0-9A-Za-z-]+"
    expect(PROXY_USER_AGENT).toMatch(new RegExp(`^${token}(/${token})? \\([^()]+\\)$`))
    expect(PROXY_USER_AGENT).toBe('engine-proxy (no user-agent)')
  })

  it('answers its own not-found with a 404 on the rewrite', () => {
    expect(PROXY_NOT_FOUND_STATUS).toBe(404)
  })
})

describe('C13 — the revalidate route invalidate(tags) posts to from outside a request', () => {
  it('is a mounted POST behind its own secret, with bounded bodies', () => {
    const route = ENGINE_ROUTES.find((each) => each.path === '/api/x/revalidate')
    expect(route).toMatchObject({ methods: ['POST'], auth: ['revalidate'], owner: 'WEB' })
    // No cookie authenticates it, so the same-origin check does not apply: the bearer is its credential.
    expect(route?.sameOrigin).toBe(false)
    expect(Number.isSafeInteger(REVALIDATE_REQUEST.maxTags)).toBe(true)
    expect(REVALIDATE_REQUEST.maxTags).toBeGreaterThan(0)
    expect(REVALIDATE_REQUEST.maxBodyBytes).toBeGreaterThan(0)
  })
})
