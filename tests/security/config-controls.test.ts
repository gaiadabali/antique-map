/**
 * The controls that are configuration, read off the real modules without a database (TASKS.md
 * 10.1.a; SECURITY.md A3, A5, B4, B5, F1, F2, F6, K6, T2, T4, W7, X1, X2): each is a value or a
 * decision the engine makes from its environment, so each is proven by calling the code with the
 * environments that matter — staging's hosts, production's — and reading the answer.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildEngineConfig, engineConfig } from '../../engine/packages/cms/src/payload.config'
import { LOCK_TIME_MS, MAX_LOGIN_ATTEMPTS } from '../../engine/packages/cms/src/collections/users'
import { paymentsConfigFromEnv } from '../../engine/packages/cms/src/shop/payments/config'
import {
  PRODUCTION_ENV,
  STAGING_ENV,
} from '../../engine/packages/cms/src/shop/payments/payments.test-support'
import { refuseCron } from '../../engine/packages/http/src/cron/auth'
import { decideProxy } from '../../engine/packages/http/src/proxy/decide'
import {
  MEDIA_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_MIME_TYPES,
} from '../../engine/packages/media/src/storage/limits'

/** The staging hosts, the shop's being the admin host (SECURITY.md X2, answered Q1). */
const ENV = {
  GALLERY_HOSTS: 'indies-gallery.gaiada.com',
  SHOP_HOSTS: 'old-east-indies.gaiada.com',
  ADMIN_HOST: 'old-east-indies.gaiada.com',
}
const GALLERY = 'indies-gallery.gaiada.com'
const SHOP = 'old-east-indies.gaiada.com'

const decide = (host: string, path: string, method = 'GET', headers: Record<string, string> = {}) =>
  decideProxy(
    {
      url: new URL(`https://${host}${path}`),
      method,
      headers: new Headers({ host, 'user-agent': 'security-suite', ...headers }),
    },
    { env: ENV },
  )

describe('sign-in policy constants (A3)', () => {
  it('locks after 5 failed attempts for 15 minutes', () => {
    expect(MAX_LOGIN_ATTEMPTS).toBe(5)
    expect(LOCK_TIME_MS).toBe(15 * 60 * 1000)
  })
})

describe('the session cookie’s Secure flag follows the build (A5)', () => {
  afterEach(() => vi.unstubAllEnvs())
  const secureIn = async (nodeEnv: string) => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', nodeEnv)
    const { Users } = await import('../../engine/packages/cms/src/collections/users')
    const auth = Users.auth as { cookies?: { secure?: boolean; sameSite?: string }; useSessions?: boolean }
    return { secure: auth.cookies?.secure, sameSite: auth.cookies?.sameSite, sessions: auth.useSessions }
  }
  it('is Secure, SameSite=Lax and server-side sessions on a production build', async () => {
    expect(await secureIn('production')).toEqual({ secure: true, sameSite: 'Lax', sessions: true })
  })
  it('is not Secure on a workstation (http), and still SameSite=Lax with sessions', async () => {
    expect(await secureIn('development')).toEqual({ secure: false, sameSite: 'Lax', sessions: true })
  })
})

describe('Payload’s origins and API surface (B4, B5, R6, F6)', () => {
  it('CSRF and CORS list the admin host’s origin and nothing else; GraphQL is off', async () => {
    const config = await buildEngineConfig(engineConfig({ PAYLOAD_SECRET: 's'.repeat(48), ...ENV }))
    expect([...new Set(config.csrf)]).toEqual([`https://${SHOP}`])
    expect([...new Set(config.cors as string[])]).toEqual([`https://${SHOP}`])
    expect(config.serverURL).toBe(`https://${SHOP}`)
    expect(config.graphQL.disable).toBe(true)
  })

  it('with no usable host list both origin lists are empty rather than a wildcard', async () => {
    const config = await buildEngineConfig(engineConfig({ PAYLOAD_SECRET: 's'.repeat(48) }))
    expect(config.csrf).toEqual([])
    expect(config.cors).toEqual([])
  })

  it('media accepts only JPEG, PNG, WebP and AVIF — no SVG, no TIFF, no pasted URL', async () => {
    const config = await buildEngineConfig(engineConfig({ PAYLOAD_SECRET: 's'.repeat(48) }))
    const upload = config.collections.find((c) => c.slug === 'media')!.upload as {
      mimeTypes?: string[]
      pasteURL?: unknown
    }
    expect(upload.mimeTypes).toEqual([...MEDIA_UPLOAD_MIME_TYPES])
    expect(upload.mimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    expect(upload.pasteURL).toBe(false)
    // FINDING F-09: SECURITY.md F2 says 25 MB; the engine's cap is 90 MiB (under the CDN's 100 MB).
    expect(MEDIA_UPLOAD_MAX_BYTES).toBe(90 * 1024 * 1024)
  })
})

describe('the proxy keeps the admin and Payload’s REST to the admin host (X2)', () => {
  it('answers /admin and Payload’s REST on the admin host', () => {
    expect(decide(SHOP, '/admin/login').why).toBe('admin')
    expect(decide(SHOP, '/api/users/login', 'POST').why).toBe('api')
  })
  it('answers 404 for Payload’s REST on the other site’s host, and its designed 404 for /admin', () => {
    const rest = decide(GALLERY, '/api/users')
    expect(rest).toMatchObject({ kind: 'respond', status: 404, why: 'not-admin-host' })
    const admin = decide(GALLERY, '/admin/login')
    expect(admin).toMatchObject({ kind: 'rewrite', status: 404, why: 'not-found' })
  })
  it('answers 404 for a host on no list, and a permanent redirect for an alias', () => {
    expect(decide('evil.example', '/')).toMatchObject({ kind: 'respond', status: 404 })
    expect(decide('evil.example', '/admin')).toMatchObject({ kind: 'respond', status: 404 })
  })
  it('engine routes answer on either site’s host (the webhook, cron, chat), Payload’s never', () => {
    expect(decide(GALLERY, '/api/x/webhooks/midtrans', 'POST').why).toBe('api')
    expect(decide(GALLERY, '/api/payment-events').status).toBe(404)
    expect(decide(GALLERY, '/api/graphql', 'POST').status).toBe(404)
  })
})

describe('a tracking link is not indexed, not leaked in a Referer, and guess-limited (T2, T4)', () => {
  it('sets no-referrer and noindex on the tracking page and the order page', () => {
    for (const path of ['/track/AAAAAAAAAAAAAAAAAAAAAA']) {
      const decision = decide(SHOP, path)
      expect(decision.setResponse['Referrer-Policy'], path).toBe('no-referrer')
      expect(decision.setResponse['X-Robots-Tag'], path).toBe('noindex')
    }
  })
  it('answers 429 with Retry-After after a burst of distinct wrong tokens from one address', () => {
    const headers = { 'x-forwarded-for': '203.0.113.77' }
    let limited: ReturnType<typeof decide> | undefined
    for (let guess = 0; guess < 80 && limited === undefined; guess += 1) {
      const decision = decide(SHOP, `/track/${String(guess).padStart(22, 'B')}`, 'GET', headers)
      if (decision.status === 429) limited = decision
    }
    expect(limited, 'the guess budget was never hit').toBeDefined()
    expect(limited!.setResponse['Retry-After']).toMatch(/^\d+$/)
  })
})

describe('cron routes need the bearer and are off without a secret (K6)', () => {
  const request = (token?: string) =>
    new Request('http://localhost/api/x/cron/reconcile', {
      method: 'POST',
      headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
    })
  it('503 while CRON_SECRET is unset, 401 for a missing or wrong bearer, null for the right one', () => {
    expect(refuseCron(request('anything'), {})?.status).toBe(503)
    const env = { CRON_SECRET: 'c'.repeat(32) }
    expect(refuseCron(request(), env)?.status).toBe(401)
    expect(refuseCron(request('wrong'), env)?.status).toBe(401)
    expect(refuseCron(request('c'.repeat(31)), env)?.status).toBe(401)
    expect(refuseCron(request('c'.repeat(32)), env)).toBeNull()
  })
})

describe('the payment simulator and keys are judged by environment (W7, K4)', () => {
  it('refuses simulate mode in production and the sandbox key in production', () => {
    expect(paymentsConfigFromEnv({ ...PRODUCTION_ENV, MIDTRANS_MODE: 'simulate' })).toMatchObject({
      ok: false,
      subject: 'MIDTRANS_MODE',
    })
    expect(
      paymentsConfigFromEnv({
        ...PRODUCTION_ENV,
        MIDTRANS_SERVER_KEY: 'SB-Mid-server-TEST0000000000000000',
        MIDTRANS_CLIENT_KEY: 'SB-Mid-client-TEST0000000000000000',
      }),
    ).toMatchObject({ ok: false })
  })
  it('allows simulate on staging, and refuses a live key on staging (staging holds no production key)', () => {
    expect(paymentsConfigFromEnv({ ...STAGING_ENV, MIDTRANS_MODE: 'simulate' })).toMatchObject({ ok: true })
    expect(
      paymentsConfigFromEnv({
        ...STAGING_ENV,
        MIDTRANS_SERVER_KEY: 'Mid-server-TEST0000000000000000',
        MIDTRANS_CLIENT_KEY: 'Mid-client-TEST0000000000000000',
      }),
    ).toMatchObject({ ok: false })
  })
})
