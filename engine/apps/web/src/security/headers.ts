/**
 * The static security headers (SECURITY.md B3; finding F-01): what the app sets on every response,
 * "not the vhost". They do not vary by request, so they ride in `next.config.ts`'s `headers()`; the
 * per-request CSP is `./csp`'s, set by the proxy.
 *
 * - `X-Content-Type-Options: nosniff` — a stored file is never reinterpreted as a script.
 * - `Referrer-Policy: strict-origin-when-cross-origin` — the default; the proxy overrides it with
 *   `no-referrer` on a tracking or order page (a token in the path never leaves in a Referer).
 * - `Permissions-Policy` — geolocation for our own pages only (the checkout's "use my location"),
 *   camera, microphone and the payment-handler off.
 * - `Cross-Origin-Opener-Policy: same-origin` — no other window shares our browsing context.
 * - `Strict-Transport-Security` — only once the site is on its real domain over https for good
 *   (`hsts: true`, after cutover, SECURITY.md B3): a browser that has seen it refuses http for the
 *   whole period, so a staging host on a shared parent domain never sends it.
 *
 * Wiring (the platform lane owns `next.config.ts`):
 *
 *   import { securityHeaders } from './src/security/headers'
 *   headers: async () => [{ source: '/:path*', headers: securityHeaders({ hsts: false }) }, ...]
 */
export type Header = { readonly key: string; readonly value: string }

export type SecurityHeaderOptions = {
  /** Send HSTS: true only on a production host that will stay on https. */
  readonly hsts?: boolean
}

export const HSTS_MAX_AGE_SECONDS = 31_536_000

export function securityHeaders(options: SecurityHeaderOptions = {}): Header[] {
  const headers: Header[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ]
  if (options.hsts === true) {
    headers.push({ key: 'Strict-Transport-Security', value: `max-age=${HSTS_MAX_AGE_SECONDS}` })
  }
  return headers
}
