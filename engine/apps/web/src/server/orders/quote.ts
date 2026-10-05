/**
 * `POST /api/x/orders/quote` — the admin "Send price" button (TASKS.md 6.6.c): the staff's rupiah
 * fee for an `awaiting_quote` order. Mounts the core's `quoteDeliveryFee` (`6.6-core`,
 * `@engine/cms/shop/orders`) through a dynamic import: the core isn't merged into this branch yet,
 * so the named export may not exist — until it does, this refuses `unavailable` rather than
 * failing the typecheck or the build, exactly as `admin/orders/data.ts`'s `loadOrderPayLink` does
 * for `openToken`.
 */
import 'server-only'

import { parseOrderId, backToOrder, actorFrom } from './auth'

type QuoteDeliveryFee = (
  payload: unknown,
  input: { orderId: number; feeIdr: number; actor: unknown },
) => Promise<{ ok: boolean; refusal?: string }>

function parseFeeIdr(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value === '') return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= 0 ? n : null
}

export async function ordersQuotePost(request: Request): Promise<Response> {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ ok: false, refusal: 'unavailable' }, { status: 400 })
  }

  const orderIdValue = form.get('orderId')
  const orderId = typeof orderIdValue === 'string' ? parseOrderId(orderIdValue) : null
  if (orderId === null) return Response.json({ ok: false, refusal: 'not_found' }, { status: 404 })

  const feeIdr = parseFeeIdr(form.get('feeIdr'))
  if (feeIdr === null) return backToOrder(request, orderId, 'invalid_fee')

  try {
    const { payload, user } = await actorFrom(request)
    const orders = (await import('@engine/cms/shop/orders')) as {
      quoteDeliveryFee?: QuoteDeliveryFee
    }
    if (typeof orders.quoteDeliveryFee !== 'function') {
      return backToOrder(request, orderId, 'unavailable')
    }
    const result = await orders.quoteDeliveryFee(payload, { orderId, feeIdr, actor: user })
    return backToOrder(request, orderId, result.ok ? undefined : result.refusal)
  } catch (error) {
    console.error(
      `[orders] quote ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return backToOrder(request, orderId, 'unavailable')
  }
}
