import { createProxy } from '@engine/http/proxy'

import { withStoreLanding } from './security/admin-landing'
import { contentSecurityPolicy } from './security/csp'
import { withRateLimits } from './security/guard'

// The per-request CSP (SECURITY.md B2, B6; gate finding F-01) and the per-address limits on
// sign-in and password reset (§2.10, F-02) in front of the engine's proxy; a store user opening
// the admin's home goes to their Order panel before anything renders (16.2).
export const proxy = withRateLimits(
  withStoreLanding(createProxy({ contentSecurityPolicy: contentSecurityPolicy() })),
)

// Next reads the matcher statically, so it is `@engine/http/manifest`'s `PROXY_MATCHER` copied,
// never imported; `test/proxy-matcher.test.ts` compares the two. `/api/` reaches the proxy too, so
// Payload's REST answers on ADMIN_HOST alone (ARCHITECTURE.md §2).
export const config = { matcher: ['/((?!_next/|__nextjs).*)'] }
