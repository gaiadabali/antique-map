/**
 * The owner panel's two staff actions of TASKS.md 10.7, as collection endpoints (Payload owns
 * `/api/*`; the `/api/x/orders/**` routes live in the web app, outside this task's paths — the
 * precedent is `../leads/create-partner`):
 *
 * - `POST /api/orders/:id/replace` — **Replace damaged item** (COMMERCE.md §12): a plain form with
 *   `line` (each ticked line's row id), `qty_<line id>` and `note`;
 * - `POST /api/orders/:id/clear-flag` — clear `needsAttention` with a `note` (runbook §7).
 *
 * The request carries ids, quantities and a note only — never a price. Who may act is decided by
 * the fulfilment core (`replaceDamagedItem`, `clearOrderFlag`: the owner and editors only), and
 * refused here first: anyone else gets a 403 before the body is read. Each answers with a 303 back
 * to the panel — a relative `Location`, as `server/orders/auth`'s `backToOrder` does, since behind
 * the site proxy `req.url` is not the browser's host — with `?error=<refusal>` when refused.
 */
import type { Endpoint, PayloadHandler, PayloadRequest } from 'payload'

import { clearOrderFlag } from '../../shop/fulfilment/clear-flag'
import { replaceDamagedItem } from '../../shop/fulfilment/replace'
import { hasRole } from '../users/roles'

const seeOther = (path: string, error?: string): Response =>
  new Response(null, {
    status: 303,
    headers: { Location: error ? `${path}?error=${encodeURIComponent(error)}` : path },
  })

const orderIdOf = (req: PayloadRequest): number | null => {
  const n = Number(req.routeParams?.id)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

async function formOf(req: PayloadRequest): Promise<FormData | null> {
  try {
    return (await req.formData?.()) ?? null
  } catch {
    return null
  }
}

const text = (form: FormData, name: string): string => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/** Refuses anyone but the owner and editors before anything is read. */
function guard(req: PayloadRequest): { orderId: number } | Response {
  if (!hasRole(req.user, 'owner', 'editor')) {
    return Response.json({ ok: false, refusal: 'not_allowed' }, { status: 403 })
  }
  const orderId = orderIdOf(req)
  if (orderId === null) return Response.json({ ok: false, refusal: 'not_found' }, { status: 404 })
  return { orderId }
}

const replace: PayloadHandler = async (req) => {
  const guarded = guard(req)
  if (guarded instanceof Response) return guarded
  const { orderId } = guarded
  const back = `/admin/orders/${orderId}`
  const form = await formOf(req)
  if (form === null) return seeOther(back, 'unavailable')

  const lines = form
    .getAll('line')
    .filter((id): id is string => typeof id === 'string' && id !== '')
    .map((lineId) => ({ lineId, qty: Number(text(form, `qty_${lineId}`) || '1') }))
  try {
    const result = await replaceDamagedItem(req.payload, {
      orderId,
      lines,
      note: text(form, 'note'),
      actor: req.user,
    })
    return result.ok ? seeOther(`/admin/orders/${result.orderId}`) : seeOther(back, result.refusal)
  } catch (error) {
    console.error(
      `[orders] replace ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return seeOther(back, 'unavailable')
  }
}

const clearFlag: PayloadHandler = async (req) => {
  const guarded = guard(req)
  if (guarded instanceof Response) return guarded
  const { orderId } = guarded
  const back = `/admin/orders/${orderId}`
  const form = await formOf(req)
  if (form === null) return seeOther(back, 'unavailable')
  try {
    const result = await clearOrderFlag(req.payload, {
      orderId,
      note: text(form, 'note'),
      actor: req.user,
    })
    return seeOther(back, result.ok ? undefined : result.refusal)
  } catch (error) {
    console.error(
      `[orders] clear-flag ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return seeOther(back, 'unavailable')
  }
}

export const ORDER_ENDPOINTS: Endpoint[] = [
  { path: '/:id/replace', method: 'post', handler: replace },
  { path: '/:id/clear-flag', method: 'post', handler: clearFlag },
]
