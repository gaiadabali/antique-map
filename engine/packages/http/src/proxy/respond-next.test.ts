/**
 * The proxy's answer against Next itself: `@engine/http` does not depend on `next`, so these
 * tests load the version the app installs, through the app's own resolution
 * — `next/server`'s `NextResponse.rewrite()`, whose protocol `./respond` writes by hand, and the
 * adapter Next runs every proxy under, which strips its internal `_rsc` search param before the
 * proxy sees the URL. That strip is what keeps `_rsc` out of `x-public-search`, and it holds only
 * while `skipProxyUrlNormalize` stays off (Next's build defines `__NEXT_NO_MIDDLEWARE_URL_NORMALIZE`
 * from it), so the app's config is checked for it too.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { PROXY_NOT_FOUND_STATUS, PROXY_REQUEST_HEADERS } from '../manifest'
import { createProxy } from './route'

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url))
/** The one app (TASKS.md 2.1), serving both sites by host (2.2). */
const APP = 'web'
const APPS = ['gallery', 'shop'] as const
const ENV = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost' }
const NO_NORMALIZE = '__NEXT_NO_MIDDLEWARE_URL_NORMALIZE'

type RewriteInit = { status?: number; request?: { headers: Headers } }
type NextServer = {
  NextResponse: { rewrite(destination: string | URL, init?: RewriteInit): Response }
}
type Adapter = {
  adapter(params: {
    page: string
    handler: (request: Request) => Response
    request: { url: string; headers: Record<string, string>; method: string; nextConfig: object }
  }): Promise<{ response: Response }>
}

/** A module of the `next` an app installs, resolved from that app, as its build resolves it. */
function fromApp<T>(_storefront: (typeof APPS)[number], specifier: string): T {
  return createRequire(join(REPO_ROOT, 'engine', 'apps', APP, 'package.json'))(specifier) as T
}

const proxy = createProxy({ env: ENV })

/** The request-header overrides an answer carries, as Next's router applies them. */
function overrides(response: Response): Record<string, string | null> {
  const names = response.headers.get('x-middleware-override-headers')?.split(',') ?? []
  return Object.fromEntries(
    names.sort().map((name) => [name, response.headers.get(`x-middleware-request-${name}`)]),
  )
}

describe.each(APPS)('the proxy’s answer on the %s host against the app’s Next', (app) => {
  // Before any other module of Next's: its server sets the AsyncLocalStorage global first.
  fromApp(app, 'next/dist/server/node-environment-baseline')

  it('is what NextResponse.rewrite(url, { status, request: { headers } }) builds, status included', () => {
    const { NextResponse } = fromApp<NextServer>(app, 'next/server')
    const request = new Request('http://localhost:4230/nope/deeper?q=1', {
      headers: { host: `${app}.localhost`, cookie: 'a=1', 'x-public-search': '?forged' },
    })
    const ours = proxy(request)
    expect(ours.status).toBe(PROXY_NOT_FOUND_STATUS)
    const headers = new Headers()
    for (const [name, value] of Object.entries(overrides(ours))) headers.set(name, value ?? '')
    const destination = ours.headers.get('x-middleware-rewrite') ?? ''
    const theirs = NextResponse.rewrite(destination, { status: ours.status, request: { headers } })
    expect(ours.status).toBe(theirs.status)
    expect(destination).toBe(theirs.headers.get('x-middleware-rewrite'))
    expect(overrides(ours)).toEqual(overrides(theirs))
  })

  it('never copies Next’s `_rsc` into x-public-search: the adapter strips it before the proxy runs', async () => {
    const { adapter } = fromApp<Adapter>(app, 'next/dist/server/web/adapter')
    const run = async (path: string) => {
      const { response } = await adapter({
        page: '/src/proxy',
        handler: proxy,
        request: {
          url: `http://localhost:4230${path}`,
          // a client navigation's RSC fetch; the item route (whose query is kept) is the gallery's
          headers: { host: 'gallery.localhost', rsc: '1', 'user-agent': 'Mozilla/5.0' },
          method: 'GET',
          nextConfig: {},
        },
      })
      return response.headers.get(`x-middleware-request-${PROXY_REQUEST_HEADERS.publicSearch}`)
    }
    const item = app === 'gallery' ? '/product/1706-old' : '/id/produk/1706-lama'
    expect(await run(`${item}?_rsc=1a2b3&utm_source=mail`)).toBe('?utm_source=mail')
    expect(await run(`${item}?_rsc=1a2b3`)).toBe('')

    // The test bites: with the normalisation off, `_rsc` would reach the header.
    process.env[NO_NORMALIZE] = '1'
    try {
      expect(await run(`${item}?_rsc=1a2b3&utm_source=mail`)).toBe('?_rsc=1a2b3&utm_source=mail')
    } finally {
      delete process.env[NO_NORMALIZE]
    }
  })

  it('keeps skipProxyUrlNormalize off in the app’s next.config.ts, the setting the strip rests on', () => {
    const source = readFileSync(join(REPO_ROOT, 'engine', 'apps', APP, 'next.config.ts'), 'utf8')
    expect(source).not.toMatch(/skip(?:Proxy|Middleware)UrlNormalize/)
  })
})
