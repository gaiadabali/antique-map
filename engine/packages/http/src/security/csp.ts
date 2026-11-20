/**
 * The Content-Security-Policy (SECURITY.md B2, B6, X2) — one policy per request, a fresh nonce each
 * time, built from what the request is:
 *
 * - **A storefront page** (B2): `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src
 *   'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `frame-src` and `connect-src` allowing
 *   only Midtrans Snap and Turnstile besides our own origin. Next takes the nonce for the scripts
 *   it renders from the request's CSP header, which the proxy sets from this string.
 * - **The checkout page alone** (B6): what Google documents for the Maps JavaScript API under a
 *   strict CSP — `'unsafe-eval'` and `blob:` in `script-src`, `worker-src blob:`, Google's hosts
 *   in `img-src`, `connect-src` and `frame-src`.
 * - **The admin** (X2): its own policy. Payload's admin styles its widgets inline and its code
 *   editor runs a worker from a blob, so `style-src` allows inline styles and `worker-src` blobs;
 *   scripts stay nonce-only, and the admin loads nothing from a third party. Its logo and icons are
 *   the site's own files, on its own origin (`'self'`).
 * - **The page preview**: the admin's Live Preview frames a page on the site's own origin, allowed
 *   only when the admin answers on that origin (`previewOrigin`); otherwise `'none'` both ways.
 *
 * `style-src 'unsafe-inline'` stays on storefront pages: React writes `style=""` attributes, which a
 * nonce cannot cover; script injection is closed by `script-src`. Pure and edge-safe (Web Crypto).
 * Today's app keeps its own copy (`apps/web/src/security/csp.ts`) until phase 26 retires it.
 */
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

export type CspSurface = 'storefront' | 'checkout' | 'admin'

export type CspOptions = {
  /** `NODE_ENV !== 'production'`: React's dev tooling needs `'unsafe-eval'`. */
  readonly development?: boolean
  /** The public media origin (`MEDIA_PUBLIC_URL`'s), where derivatives and tiles are served. */
  readonly mediaOrigin?: string | null
  /** The page preview's origin: the admin may frame it, and a storefront page be framed by it. */
  readonly previewOrigin?: string | null
  /** The site is served over plain http (a `*.localhost` one): no `upgrade-insecure-requests`. */
  readonly plainHttp?: boolean
}

/** A fresh nonce: 128 random bits, base64. */
export function newNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const unique = (values: readonly string[]) => [...new Set(values)]

/** The policy for `surface` with `nonce`, as one header value. */
export function buildCsp(surface: CspSurface, nonce: string, options: CspOptions = {}): string {
  const media = options.mediaOrigin ? [options.mediaOrigin] : []
  const scripts = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`]
  const img = [`'self'`, 'data:', 'blob:', ...media]
  // The deep-zoom viewer fetches the IIIF `info.json` from the media origin with XHR.
  const connect = [`'self'`, ...media, ...MIDTRANS, TURNSTILE]
  const frames = [...MIDTRANS, TURNSTILE]
  const workers = [`'self'`]
  const ancestors: string[] = []
  if (options.development) scripts.push(`'unsafe-eval'`)
  if (surface === 'admin') {
    // The admin loads nothing from a third party: no Snap, no Turnstile, no frames of its own.
    connect.splice(0, connect.length, `'self'`)
    frames.splice(0, frames.length, ...(options.previewOrigin ? [options.previewOrigin] : []))
    workers.push('blob:')
  }
  if (surface === 'storefront' && options.previewOrigin) ancestors.push(options.previewOrigin)
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
    ['frame-ancestors', ancestors.length === 0 ? [`'none'`] : ancestors],
  ]
  const policy = directives.map(([name, values]) => `${name} ${values.join(' ')}`)
  if (!options.development && !options.plainHttp) policy.push('upgrade-insecure-requests')
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
 * A published video's or PDF's own answer (`/api/x/media/{id}`): not a page, so a sandbox — a
 * script inside a PDF a browser renders as a document runs in an opaque origin, never the site's.
 */
export const MEDIA_FILE_CSP = 'sandbox'
export const MEDIA_FILE_PATH = /^\/api\/x\/media\/[^/]+$/
