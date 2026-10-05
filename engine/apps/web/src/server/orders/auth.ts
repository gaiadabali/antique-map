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

/** A redirect back to the order's admin screen, with `error` set when the action was refused. */
export function backToOrder(request: Request, orderId: number, error?: string): Response {
  const url = new URL(`/admin/orders/${orderId}`, request.url)
  if (error) url.searchParams.set('error', error)
  return Response.redirect(url, 303)
}

export function parseOrderId(id: string): number | null {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}
