export { proxy } from '@engine/http/proxy'

// Next reads the matcher statically, so it is C13's `PROXY_MATCHER` copied, never imported;
// route parity compares the two (TASKS.md 2.2.d).
export const config = { matcher: ['/((?!api/|_next/|brand-assets/).*)'] }
