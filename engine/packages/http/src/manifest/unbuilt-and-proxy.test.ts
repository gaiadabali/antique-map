// The placeholder a mount names while its handler is unbuilt, the site files the root URLs are
// answered from, and what the proxy sets beyond its rewrite — a missing User-Agent, the public
// query, the true host and its own not-found's status.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { SITE_KEYS } from '@engine/config/sites'
import { describe, expect, it } from 'vitest'

import {
  ENGINE_ROUTES,
  HOST_FREE_PATHS,
  PROXY_MATCHER,
  UNROUTED_HANDLER,
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
  it('lets through exact paths only: the health route and bearer-authenticated machine routes', () => {
    for (const path of HOST_FREE_PATHS) {
      const route = ENGINE_ROUTES.find((each) => each.path === path)
      expect(route, `${path} is a mounted route, exactly`).toBeDefined()
      const machine = route?.auth.every((auth) => auth === 'cron' || auth === 'revalidate')
      expect(path === '/api/health' || machine, path).toBe(true)
      expect(path.endsWith('/'), `${path} is no prefix`).toBe(false)
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

describe('an /api/x/ path no engine route serves', () => {
  const MOUNT = fileURLToPath(
    new URL('../../../../apps/web/src/app/api/x/[...rest]/route.ts', import.meta.url),
  )

  it('is mounted at api/x/[...rest], every method re-exported from @engine/http/unrouted', () => {
    const source = readFileSync(MOUNT, 'utf8')
    expect(UNROUTED_HANDLER.mount).toBe('/api/x/[...rest]')
    expect(source).toContain(`from '${UNROUTED_HANDLER.specifier}'`)
    for (const method of UNROUTED_HANDLER.methods)
      expect(source, method).toMatch(new RegExp(`\\b${method}\\b`))
    expect(ENGINE_ROUTES.some((route) => route.handler === UNROUTED_HANDLER.specifier)).toBe(false)
  })

  it('answers a plain, uncached 404 to every method, so Payload never sees it', async () => {
    const handlers = (await import('../unrouted/route')) as Record<
      string,
      (r: Request) => Promise<Response>
    >
    for (const method of UNROUTED_HANDLER.methods) {
      const handler = handlers[method]
      expect(handler, method).toBeTypeOf('function')
      const response = await handler!(
        new Request('http://localhost/api/x/users/me', {
          method,
          headers: { origin: 'http://gallery.localhost', cookie: 'payload-token=x' },
        }),
      )
      expect(response.status, method).toBe(404)
      expect(response.headers.get('cache-control'), method).toBe('no-store')
      expect(response.headers.get('access-control-allow-origin'), method).toBeNull()
    }
  })
})
