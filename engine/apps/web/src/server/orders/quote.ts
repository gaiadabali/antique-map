/**
 * `POST /api/x/orders/quote` — the admin "Send price" button (TASKS.md 6.6.c): the staff's rupiah
 * fee for an `awaiting_quote` order, through the core's `quoteDeliveryFee`
 * (`@engine/cms/shop/orders`), which checks the staff member, the order's status and window, and
 * prices the total from the stored row.
 */
import 'server-only'

import { quoteDeliveryFee } from '@engine/cms/shop/orders'

import { parseOrderId, backToOrder, actorFrom } from './auth'
import { parseFeeIdr } from './quote-validate'

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
    const result = await quoteDeliveryFee(payload, { orderId, feeIdr, actor: user })
    return backToOrder(request, orderId, result.ok ? undefined : result.refusal)
  } catch (error) {
    console.error(
      `[orders] quote ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return backToOrder(request, orderId, 'unavailable')
  }
}
