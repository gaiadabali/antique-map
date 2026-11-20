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
 * - **The shop page preview** (TASKS.md 27.5.a): the admin's Live Preview frames a shop page on the
 *   shop's own origin. When the admin's host is the shop's (`ADMIN_HOST`, the default), the
 *   admin's `frame-src` allows that one origin and the shop's storefront pages allow it as their
 *   one `frame-ancestors`; otherwise both stay `'none'`. The gallery and the checkout are never
 *   framed.
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
import { adminOrigin, parsePublicPath, siteOrigin, SITES, type SiteKey } from '@engine/config/sites'

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
  /**
   * The shop page preview's origin (`previewOriginOf`): the admin may frame it, and — passed for a
   * shop request — a storefront page may be framed by it. `null`: no frames either way.
   */
  readonly previewOrigin?: string | null
  /**
   * The site is served over plain http — a local hostname (`originOf`), never a real one: no
   * `upgrade-insecure-requests`, which would send the preview frame to an https origin that
   * does not exist there.
   */
  readonly plainHttp?: boolean
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
  // The deep-zoom viewer fetches the IIIF `info.json` from the media origin with XHR, which only
  // `connect-src` allows (found by driving the viewer under this policy, F-01).
  const connect = [`'self'`, ...media, ...MIDTRANS, TURNSTILE]
  const frames = [...MIDTRANS, TURNSTILE]
  const workers = [`'self'`]
  const ancestors: string[] = []
  if (options.development) scripts.push(`'unsafe-eval'`)
  if (surface === 'admin') {
    // The admin loads nothing from a third party: no Snap, no Turnstile, no frames of its own.
    connect.splice(0, connect.length, `'self'`)
    // Its one frame: the shop page preview, on the shop's own origin (27.5.a).
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
 * The origin a shop page preview is framed from and on: the shop's, when the admin answers there
 * (`ADMIN_HOST` is the shop's canonical host, the default); else `null` — staff cookies would not
 * reach a frame on another host, so no frame is allowed at all.
 */
export function previewOriginOf(env: Env): string | null {
  const shop = siteOrigin('shop', env)
  return shop !== null && shop === adminOrigin(env) ? shop : null
}

/**
 * A published video's or PDF's own answer (`/api/x/media/{id}`, `@engine/http/media`): not a page,
 * so not a page's policy — a sandbox, so that a script inside a PDF a browser renders as a
 * document of its own runs in an opaque origin, never the site's.
 */
export const MEDIA_FILE_CSP = 'sandbox'
const MEDIA_FILE_PATH = /^\/api\/x\/media\/[^/]+$/

/**
 * The builder `createProxy({ contentSecurityPolicy })` takes: a fresh nonce and the policy for the
 * request's surface, on every call.
 */
export function contentSecurityPolicy(env: Env = process.env) {
  // Read on each request, like the proxy's host allow-list: nothing runs at import.
  return (context: CspContext & { readonly locale?: unknown }): string => {
    if (MEDIA_FILE_PATH.test(context.pathname)) return MEDIA_FILE_CSP
    const surface = surfaceOf(context)
    // The admin frames the preview; only the shop's own pages are framed by it.
    const framed = surface === 'admin' || context.site === 'shop'
    return buildCsp(surface, newNonce(), {
      development: env.NODE_ENV !== 'production',
      mediaOrigin: mediaOriginOf(env),
      previewOrigin: framed ? previewOriginOf(env) : null,
      plainHttp: siteOrigin(context.site, env)?.startsWith('http://') === true,
    })
  }
}
