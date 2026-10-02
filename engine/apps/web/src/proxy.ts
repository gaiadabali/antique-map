export { proxy } from '@engine/http/proxy'

// Next reads the matcher statically, so it is `@engine/http/manifest`'s `PROXY_MATCHER` copied,
// never imported; `test/proxy-matcher.test.ts` compares the two. `/api/` reaches the proxy too, so
// Payload's REST answers on ADMIN_HOST alone (ARCHITECTURE.md §2).
export const config = { matcher: ['/((?!_next/|__nextjs).*)'] }
