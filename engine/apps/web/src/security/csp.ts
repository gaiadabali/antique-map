/**
 * The Content-Security-Policy builder (SECURITY.md B2, B6; TASKS.md 10.1.d, finding F-01: until
 * this is wired, no CSP is set — `@engine/http/proxy`'s own header says so).
 *
 * One policy per request, a fresh nonce each time (`newNonce`), built from what the request is:
 *
 * - **A storefront page** (B2): `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src
 *   'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `frame-src` and `connect-src` allowing
 *   only Midtrans Snap and Turnstile besides our own origin. Next takes the nonce for the scripts
 *   it renders from the request's CSP header, which the proxy sets from this string.
 * - **The checkout page alone** (B6): what Google documents for the Maps JavaScript API under a
 *   strict CSP — `'unsafe-eval'` and `blob:` in `script-src`, `worker-src blob:`, Google's hosts
 *   in `img-src`, `connect-src` and `frame-src` — and nothing from Google Fonts.
 * - **The admin** (X2): its own policy. Payload's admin styles its widgets inline and its code
 *   editor runs a worker from a blob, so `style-src` allows inline styles and `worker-src` blobs;
 *   scripts stay nonce-only, and the admin loads nothing from a third party.
 *
 * `style-src 'unsafe-inline'` stays on storefront pages: React writes `style=""` attributes, which
 * a nonce cannot cover; script injection, the XSS vector, is closed by `script-src`.
 *
 * Pure and edge-safe (Web Crypto only). Wiring, which belongs to the platform lane (the proxy owns
 * `src/proxy.ts`):
 *
 *   import { createProxy } from '@engine/http/proxy'
 *   import { contentSecurityPolicy } from './security/csp'
 *   export const proxy = createProxy({ contentSecurityPolicy: contentSecurityPolicy() })
 */
import { parsePublicPath, SITES, type SiteKey } from '@engine/config/sites'

type Env = Readonly<Record<string, string | undefined>>

/** Midtrans Snap's two origins (`app.` serves snap.js and the payment frame). */
const MIDTRANS = ['https://app.midtrans.com', 'https://app.sandbox.midtrans.com'] as const
const TURNSTILE = 'https://challenges.cloudflare.com'
/** What Google documents for the Maps JavaScript API (B6). */
const GOOGLE = [
  'https://*.googleapis.com',
  'https://*.gstatic.com',
  'https://*.google.com',
  'https://*.googleusercontent.com',
] as const

/** A fresh nonce: 128 random bits, base64. */
export function newNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export type CspContext = {
  readonly site: SiteKey
  readonly pathname: string
}

export type CspOptions = {
  /** `NODE_ENV !== 'production'`: React's dev tooling needs `'unsafe-eval'`. */
  readonly development?: boolean
  /** The public media origin (`MEDIA_PUBLIC_URL`'s), where derivatives and tiles are served. */
  readonly mediaOrigin?: string | null
}

type Surface = 'storefront' | 'checkout' | 'admin'

/** Which of the three policies a path gets. */
export function surfaceOf(context: CspContext): Surface {
  const { pathname, site } = context
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin'
  const parsed = parsePublicPath(SITES[site], pathname, new URLSearchParams())
  return parsed.kind === 'surface' && parsed.surface === 'checkout' ? 'checkout' : 'storefront'
}

const unique = (values: readonly string[]) => [...new Set(values)]

/** The policy for `surface` with `nonce`, as one header value. */
export function buildCsp(surface: Surface, nonce: string, options: CspOptions = {}): string {
  const media = options.mediaOrigin ? [options.mediaOrigin] : []
  const scripts = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`]
  const img = [`'self'`, 'data:', 'blob:', ...media]
  const connect = [`'self'`, ...MIDTRANS, TURNSTILE]
  const frames = [...MIDTRANS, TURNSTILE]
  const workers = [`'self'`]
  if (options.development) scripts.push(`'unsafe-eval'`)
  if (surface === 'admin') {
    // The admin loads nothing from a third party: no Snap, no Turnstile, no frames of its own.
    connect.splice(1)
    frames.splice(0)
    workers.push('blob:')
  }
  if (surface === 'checkout') {
    scripts.push(`'unsafe-eval'`, 'blob:')
    workers.push('blob:')
    img.push(...GOOGLE)
    connect.push(...GOOGLE)
    frames.push('https://*.google.com')
  }
  const directives: Array<[string, readonly string[]]> = [
    ['default-src', [`'self'`]],
    ['script-src', unique(scripts)],
    ['style-src', [`'self'`, `'unsafe-inline'`]],
    ['img-src', unique(img)],
    ['font-src', [`'self'`, 'data:']],
    ['connect-src', unique(connect)],
    ['frame-src', frames.length === 0 ? [`'none'`] : unique(frames)],
    ['worker-src', unique(workers)],
    ['manifest-src', [`'self'`]],
    ['media-src', [`'self'`, ...media]],
    ['object-src', [`'none'`]],
    ['base-uri', [`'none'`]],
    ['form-action', [`'self'`]],
    ['frame-ancestors', [`'none'`]],
  ]
  const policy = directives.map(([name, values]) => `${name} ${values.join(' ')}`)
  if (!options.development) policy.push('upgrade-insecure-requests')
  return policy.join('; ')
}

/** The origin of `MEDIA_PUBLIC_URL`, or null when it is unset or not a URL. */
export function mediaOriginOf(env: Env): string | null {
  const raw = env.MEDIA_PUBLIC_URL
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

/**
 * The builder `createProxy({ contentSecurityPolicy })` takes: a fresh nonce and the policy for the
 * request's surface, on every call.
 */
export function contentSecurityPolicy(env: Env = process.env) {
  const options: CspOptions = {
    development: env.NODE_ENV !== 'production',
    mediaOrigin: mediaOriginOf(env),
  }
  return (context: CspContext & { readonly locale?: unknown }): string =>
    buildCsp(surfaceOf(context), newNonce(), options)
}
