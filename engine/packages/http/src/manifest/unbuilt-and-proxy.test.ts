// The placeholder a mount names while its handler is unbuilt, the site files the root URLs are
// answered from, and what the proxy sets beyond its rewrite — a missing User-Agent, the public
// query, the true host and its own not-found's status.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { SITE_KEYS } from '@engine/config/sites'
import { describe, expect, it } from 'vitest'

import {
  ENGINE_ROUTES,
  HOST_FREE_PATHS,
  PROXY_MATCHER,
  PROXY_NOT_FOUND_STATUS,
  PROXY_REQUEST_HEADERS,
  PROXY_USER_AGENT,
  REVALIDATE_REQUEST,
  SITE_ASSETS,
  UNBUILT_HANDLER,
  unbuiltHandlerOf,
} from '../manifest'

describe('the placeholder for an unbuilt handler', () => {
  it('is one module, with robots’ fail-closed answer its one exception', () => {
    expect(unbuiltHandlerOf('/api/x/sitemap/[[...path]]')).toBe('@engine/http/unbuilt')
    expect(unbuiltHandlerOf('/api/x/well-known/[...path]')).toBe('@engine/http/unbuilt')
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

describe('the site files a page links and the root URLs answer from', () => {
  const PUBLIC = fileURLToPath(new URL('../../../../apps/web/public/', import.meta.url))

  it('are shipped by every site, under its own folder of the app’s public/', () => {
    for (const site of SITE_KEYS) {
      for (const file of Object.values(SITE_ASSETS)) {
        expect(existsSync(`${PUBLIC}${site}/${file}`), `${site}/${file}`).toBe(true)
      }
    }
  })
})

describe('what the proxy lets through on any host, and its matcher', () => {
  it('lets through only the mounted health route and bearer-authenticated machine routes', () => {
    for (const path of HOST_FREE_PATHS) {
      const mounted = ENGINE_ROUTES.filter((route) => (route.path + '/').startsWith(path))
      expect(mounted.length, path).toBeGreaterThan(0)
      for (const route of mounted) {
        const machine = route.auth.every((auth) => auth === 'cron' || auth === 'revalidate')
        expect(route.path === '/api/health' || machine, route.path).toBe(true)
      }
    }
  })

  it('runs on /api/ too, so Payload’s REST is checked against ADMIN_HOST', () => {
    const [matcher = ''] = PROXY_MATCHER
    const runs = (path: string) => new RegExp(`^${matcher}$`).test(path)
    expect(runs('/api/users')).toBe(true)
    expect(runs('/admin')).toBe(true)
    expect(runs('/')).toBe(true)
    expect(runs('/_next/static/chunk.js')).toBe(false)
  })
})

describe('what the proxy sets beyond its rewrite', () => {
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

describe('the revalidate route invalidate(tags) posts to from outside a request', () => {
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
