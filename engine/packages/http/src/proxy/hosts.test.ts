// Host trust in the proxy (CARRY-OVER.md §6.5, SECURITY.md X2): `Host` alone picks the site,
// against the env allow-list; an unknown host is a plain 404 that builds no URL; a spoofed
// `X-Forwarded-Host` changes nothing; `/admin` and Payload's REST answer on ADMIN_HOST only; an
// alias redirects to the canonical host the allow-list names. Each case plants the violation it
// guards against, so the test fails if the guard goes.
import { describe, expect, it } from 'vitest'

import { PROXY_REQUEST_HEADERS } from '../manifest'
import { createProxy, decideProxy } from './route'

const ENV = {
  GALLERY_HOSTS: 'indies-gallery.gaiada.com,www.indies-gallery.gaiada.com',
  SHOP_HOSTS: 'old-east-indies.gaiada.com',
}
const GALLERY = 'indies-gallery.gaiada.com'
const SHOP = 'old-east-indies.gaiada.com'

const decide = (
  host: string | null,
  path: string,
  extra: Record<string, string> = {},
  method = 'GET',
) =>
  decideProxy(
    {
      url: new URL(path, 'http://localhost:4030'),
      headers: new Headers({ ...(host === null ? {} : { host }), ...extra }),
      method,
    },
    { env: ENV },
  )

describe('a host on no list', () => {
  it('is a plain 404 for every page, root file, admin and REST path: no site, no URL', () => {
    for (const host of [
      'evil.example.com',
      'localhost:4030',
      '127.0.0.1:4030',
      `${GALLERY}.evil.net`,
      null,
    ]) {
      for (const path of [
        '/',
        '/admin',
        '/admin/login',
        '/api/users',
        '/api/x/legacy/a',
        '/favicon.ico',
        '/gallery/logo.svg',
      ]) {
        const decision = decide(host, path)
        expect(decision, `${host} ${path}`).toMatchObject({
          kind: 'respond',
          status: 404,
          to: null,
          site: null,
        })
      }
    }
  })

  it('answers that 404 itself, with no Location and nothing cached', async () => {
    const response = createProxy({ env: ENV })(
      new Request('http://localhost:4030/admin', { headers: { host: 'evil.example.com' } }),
    )
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('Not found')
  })

  it('still reaches the machine routes the host calls on loopback', () => {
    for (const path of ['/api/health', '/api/x/cron/jobs', '/api/x/revalidate']) {
      expect(decide('127.0.0.1:4030', path), path).toMatchObject({ kind: 'next', why: 'machine' })
    }
    // Passed on with no site: a client's own x-site or x-locale is blanked, never forwarded.
    const forged = decide('127.0.0.1:4030', '/api/health', { 'x-site': 'shop', 'x-locale': 'id' })
    expect(forged.setRequest).toMatchObject({ 'x-site': '', 'x-locale': '' })
    // …and only those: a prefix match is not an exact path's.
    expect(decide('127.0.0.1:4030', '/api/x/revalidate-all').kind).toBe('respond')
    // Exact paths only: nothing under a machine route is one (2.2's second review).
    for (const path of ['/api/x/cron/foo', '/api/x/cron/', '/api/x/cron', '/api/health/x']) {
      expect(decide('127.0.0.1:4030', path), path).toMatchObject({ kind: 'respond', status: 404 })
    }
    expect(decide('127.0.0.1:4030', '/api/healthz').kind).toBe('respond')
  })

  it('picks nothing while the allow-list itself is unusable', () => {
    const broken = { GALLERY_HOSTS: 'x.localhost:3000', SHOP_HOSTS: SHOP }
    const decision = decideProxy(
      { url: new URL('http://localhost/'), headers: new Headers({ host: SHOP }) },
      { env: broken },
    )
    expect(decision).toMatchObject({ kind: 'respond', status: 404 })
  })
})

describe('a spoofed X-Forwarded-Host', () => {
  it('changes nothing: the site, the rewrite and the admin pinning follow Host alone', () => {
    const spoofs = [SHOP, 'evil.example.com', `${SHOP}, ${GALLERY}`]
    for (const spoof of spoofs) {
      const page = decide(GALLERY, '/', { 'x-forwarded-host': spoof })
      expect(page).toMatchObject({ kind: 'rewrite', to: '/gallery/en', site: 'gallery' })
      expect(decide(GALLERY, '/admin', { 'x-forwarded-host': spoof }).why).toBe('not-found')
      expect(decide(GALLERY, '/api/users', { 'x-forwarded-host': spoof }).kind).toBe('respond')
      expect(decide('evil.example.com', '/', { 'x-forwarded-host': GALLERY }).kind).toBe('respond')
    }
  })

  it('is overwritten with the true Host on what the proxy passes on', () => {
    const decision = decide(`${GALLERY}`, '/', { 'x-forwarded-host': 'evil.example.com' })
    expect(decision.setRequest[PROXY_REQUEST_HEADERS.forwardedHost]).toBe(GALLERY)
  })
})

describe('the admin and Payload’s REST answer on ADMIN_HOST alone', () => {
  it('passes /admin and /api/* on the shop’s host (ADMIN_HOST unset: the shop’s canonical)', () => {
    expect(decide(SHOP, '/admin')).toMatchObject({ kind: 'next', why: 'admin', site: 'shop' })
    expect(decide(SHOP, '/admin/collections/users')).toMatchObject({ kind: 'next', why: 'admin' })
    expect(decide(SHOP, '/api/users/login', {}, 'POST')).toMatchObject({ kind: 'next', why: 'api' })
  })

  it('answers /admin with the gallery’s designed 404, and its REST with a plain one', () => {
    for (const path of ['/admin', '/admin/', '/admin/login', '/admin/collections/users']) {
      expect(decide(GALLERY, path), path).toMatchObject({
        kind: 'rewrite',
        why: 'not-found',
        to: '/gallery/en/not-found',
        status: 404,
      })
    }
    for (const path of ['/api', '/api/users', '/api/works', '/api/users/login', '/api/xx']) {
      expect(decide(GALLERY, path, {}, 'POST'), path).toMatchObject({
        kind: 'respond',
        status: 404,
      })
    }
  })

  it('passes the engine routes on either host', () => {
    for (const host of [GALLERY, SHOP]) {
      expect(decide(host, '/api/x/legacy/category/7')).toMatchObject({ kind: 'next', why: 'api' })
      expect(decide(host, '/api/health').why).toBe('machine')
    }
  })

  it('follows ADMIN_HOST when it names the gallery instead', () => {
    const env = { ...ENV, ADMIN_HOST: GALLERY }
    const at = (host: string, path: string) =>
      decideProxy(
        { url: new URL(path, 'http://localhost'), headers: new Headers({ host }) },
        { env },
      )
    expect(at(GALLERY, '/admin').why).toBe('admin')
    expect(at(SHOP, '/admin').why).toBe('not-found')
    expect(at(SHOP, '/api/users').kind).toBe('respond')
  })

  it('starts the admin in English unless its user chose a language', () => {
    expect(decide(SHOP, '/admin').setRequest['accept-language']).toBe('en')
    expect(decide(SHOP, '/admin', { cookie: 'payload-lng=id' }).setRequest['accept-language']).toBe(
      undefined,
    )
  })
})

describe('an alias of a site', () => {
  it('redirects permanently to the canonical host the allow-list names, path and query kept', () => {
    expect(decide(`www.${GALLERY}`, '/antique-maps?page=2')).toMatchObject({
      kind: 'respond',
      status: 301,
      to: `https://${GALLERY}/antique-maps?page=2`,
    })
    // A write keeps its method across the redirect.
    expect(decide(`www.${GALLERY}`, '/api/x/legacy/a', {}, 'POST').status).toBe(308)
    // Never toward a host the request named: a spoofed header has no say.
    expect(decide(`www.${GALLERY}`, '/', { 'x-forwarded-host': 'evil.example.com' }).to).toBe(
      `https://${GALLERY}/`,
    )
  })
})
