/**
 * Old East Indies' proxy (Next 16's `proxy` convention; PLAN-V2 §3, §4.2). The app is the shop, so
 * it picks no site: it answers the shop's own hosts alone (`SITE_HOSTS`, the first canonical, any
 * other a 301 to it, a host off the list a plain 404), `/admin` and Payload's REST on `ADMIN_HOST`
 * alone, and rewrites each public path into `app/[locale]/…` without the internal `/shop/` prefix.
 * It sets the locale and the request headers a page reads, the static security headers (SECURITY.md
 * B3) and the per-request CSP (B2; the admin's own, X2). No database, no file: `@engine/http/proxy`.
 *
 * In front of it, as in today's app (TASKS.md 23.4): the per-address limits on sign-in and password
 * reset (SECURITY.md §2.10, F-02; `@engine/http/limits`), counted before anything else is decided,
 * and a store user opening the admin's home sent to their Order panel before anything renders
 * (16.2; `@engine/http/admin-landing`).
 */
import { withStoreLanding } from '@engine/http/admin-landing'
import { withRateLimits } from '@engine/http/limits'
import { createProxy } from '@engine/http/proxy'
import { appContentSecurityPolicy, securityHeaders } from '@engine/http/security'

export const proxy = withRateLimits(
  withStoreLanding(
    createProxy({
      app: 'shop',
      contentSecurityPolicy: appContentSecurityPolicy('shop'),
      // HSTS waits for cutover on the shop's real domain (SECURITY.md B3).
      securityHeaders: securityHeaders({ hsts: false }),
    }),
  ),
)

// Next reads the matcher statically, so it is `@engine/http/manifest`'s `PROXY_MATCHER` copied,
// never imported; `proxy.test.ts` compares the two. `/api/` reaches the proxy too, so Payload's
// REST answers on ADMIN_HOST alone.
export const config = { matcher: ['/((?!_next/|__nextjs).*)'] }
