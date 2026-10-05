/**
 * Who is signed in, for the store panel's action routes (`src/app/api/x/orders/**`, TASKS.md 7.2).
 * Every route reads the session the same way Payload's own admin does — the request's cookies,
 * through `payload.auth()` — so a route reached without a valid session acts as nobody, and the
 * fulfilment core (`@engine/cms/shop/fulfilment`) refuses it (`not_staff`).
 */
import 'server-only'

import { cms } from '@engine/cms/instance'
import type { Payload } from '@engine/cms/instance'
import type { FulfilmentActor } from '@engine/cms/shop/fulfilment'

export type Actor = { readonly payload: Payload; readonly user: FulfilmentActor }

export async function actorFrom(request: Request): Promise<Actor> {
  const payload = await cms()
  const { user } = await payload.auth({ headers: request.headers })
  return { payload, user }
}

/**
 * A redirect back to the order's admin screen, with `error` set when the action was refused. A
 * relative `Location` (never `Response.redirect`, which needs an absolute URL): behind the site
 * proxy, `request.url` is the internal one-host URL the rewrite resolved to, not the browser's
 * `shop.localhost`/`oldeastindies.com` — an absolute redirect built from it sends the browser to
 * the wrong host.
 */
export function backToOrder(request: Request, orderId: number, error?: string): Response {
  const query = error ? `?error=${encodeURIComponent(error)}` : ''
  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/orders/${orderId}${query}` },
  })
}

export function parseOrderId(id: string): number | null {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}
