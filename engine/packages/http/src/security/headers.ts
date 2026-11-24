/**
 * The static security headers (SECURITY.md B3): what an app sets on every answer, "not the vhost".
 * A site's own app sets them from its proxy (`createProxy({ securityHeaders })`); today's app
 * sets the same ones in its `next.config.ts` (`apps/web/src/security/headers.ts`) until phase 26.
 *
 * - `X-Content-Type-Options: nosniff` — a stored file is never reinterpreted as a script.
 * - `Referrer-Policy: strict-origin-when-cross-origin` — the default; the proxy overrides it with
 *   `no-referrer` on a tracking or order page (a token in the path never leaves in a Referer).
 * - `Permissions-Policy` — geolocation for our own pages only (the checkout's "use my location"),
 *   camera, microphone and the payment handler off.
 * - `Cross-Origin-Opener-Policy: same-origin` — no other window shares our browsing context.
 * - `Strict-Transport-Security` — only once the site is on its real domain over https for good
 *   (`hsts: true`, after cutover): a browser that has seen it refuses http for the whole period.
 */
export type SecurityHeaderOptions = {
  /** Send HSTS: true only on a production host that will stay on https. */
  readonly hsts?: boolean
}

export const HSTS_MAX_AGE_SECONDS = 31_536_000

export function securityHeaders(options: SecurityHeaderOptions = {}): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    ...(options.hsts === true
      ? { 'Strict-Transport-Security': `max-age=${HSTS_MAX_AGE_SECONDS}` }
      : {}),
  }
}
