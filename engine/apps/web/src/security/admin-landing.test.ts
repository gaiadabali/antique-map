import { describe, expect, it } from 'vitest'

import { SESSION_COOKIE, STORE_HOME, storeLandingRedirect, withStoreLanding } from './admin-landing'

/** A JWT-shaped token carrying `claims` (unsigned: the landing reads, never verifies). */
function token(claims: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `eyJhbGciOiJIUzI1NiJ9.${body}.signature`
}

function get(path: string, cookie?: string, method = 'GET'): Request {
  return new Request(`https://old-east-indies.gaiada.com${path}`, {
    method,
    headers: cookie ? { cookie } : {},
  })
}

describe('a store user opening the admin lands on the Order panel (16.2)', () => {
  it('answers 307 to the Order panel for a store session on /admin, before anything renders', () => {
    const answer = storeLandingRedirect(
      get('/admin', `${SESSION_COOKIE}=${token({ role: 'store' })}`),
    )
    expect(answer?.status).toBe(307)
    expect(answer?.headers.get('location')).toBe(STORE_HOME)
    expect(answer?.headers.get('cache-control')).toBe('no-store')
  })

  it('reads the session among other cookies, and /admin/ with its slash', () => {
    const cookie = `theme=light; ${SESSION_COOKIE}=${token({ role: 'store', store: 4 })}; lang=id`
    expect(storeLandingRedirect(get('/admin/', cookie))?.status).toBe(307)
  })

  it('leaves the owner, an editor, a guest and every other path or method alone', () => {
    expect(
      storeLandingRedirect(get('/admin', `${SESSION_COOKIE}=${token({ role: 'owner' })}`)),
    ).toBeNull()
    expect(
      storeLandingRedirect(get('/admin', `${SESSION_COOKIE}=${token({ role: 'editor' })}`)),
    ).toBeNull()
    expect(storeLandingRedirect(get('/admin'))).toBeNull()
    const store = `${SESSION_COOKIE}=${token({ role: 'store' })}`
    expect(storeLandingRedirect(get('/admin/orders', store))).toBeNull()
    expect(storeLandingRedirect(get('/admin/collections/orders', store))).toBeNull()
    expect(storeLandingRedirect(get('/admin', store, 'POST'))).toBeNull()
  })

  it('treats a token that is not a JWT as no session', () => {
    expect(storeLandingRedirect(get('/admin', `${SESSION_COOKIE}=not-a-token`))).toBeNull()
    expect(storeLandingRedirect(get('/admin', `${SESSION_COOKIE}=a.%%%.c`))).toBeNull()
  })

  it('passes every other request to the proxy behind it', () => {
    const inner = () => new Response('inner', { status: 200 })
    const proxy = withStoreLanding(inner)
    expect(proxy(get('/admin', `${SESSION_COOKIE}=${token({ role: 'owner' })}`)).status).toBe(200)
    expect(proxy(get('/admin', `${SESSION_COOKIE}=${token({ role: 'store' })}`)).status).toBe(307)
  })
})
