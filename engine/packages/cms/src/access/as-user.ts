/**
 * The arguments every Local API call made **for a request** carries (SECURITY.md R4): the
 * request, its user, and `overrideAccess: false`, so the call is judged by the same collection and
 * field access as the REST API — a store user's order list is scoped to their store, an editor
 * never reads a lead or an asking price. The Local API's default is `overrideAccess: true`, which
 * skips all of it; the few system calls (the payment webhook, the import, jobs) set
 * `overrideAccess: true` explicitly instead, and are listed (R4).
 *
 *   await payload.find({ collection: 'orders', ...asUser(req), where })
 */
import type { PayloadRequest } from 'payload'

export function asUser(req: PayloadRequest): {
  req: PayloadRequest
  user: PayloadRequest['user']
  overrideAccess: false
} {
  return { req, user: req.user, overrideAccess: false }
}
