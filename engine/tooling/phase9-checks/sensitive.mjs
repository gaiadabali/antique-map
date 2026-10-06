// Sensitive paths the check never requests (the ticket's hard rule; `@engine/config`'s surfaces
// mark the shop's tracking and order pages sensitive — a token is a credential). The locale route
// maps (table.ts) spell tracking `track`/`lacak` and order `order`/`pesanan`; admin and api are
// never crawled. A skipped path is counted, never guessed at.
export const SENSITIVE_PREFIXES = ['/track', '/lacak', '/order', '/pesanan', '/admin', '/api']

/** True when the path names a sensitive surface and must not be requested. */
export function isSensitive(path) {
  const clean = path.split('?')[0]
  return SENSITIVE_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`))
}
