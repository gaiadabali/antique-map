/**
 * `POST /api/x/orders/{id}/hand-back` — store staff handing an order back with a reason (TASKS.md
 * 7.2.a; CONTENT-OPERATIONS.md §5.1 "Can't send this"). `handBackOrder` flags `needsAttention` for
 * the owner and editors; this route only reads the form and redirects.
 */
import 'server-only'

import { handBackOrder } from '@engine/cms/shop/fulfilment'

import { actorFrom, backToOrder, parseOrderId } from './auth'

type Ctx = { readonly params: Promise<{ readonly id: string }> }

export async function ordersHandBackPost(request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params
  const orderId = parseOrderId(id)
  if (orderId === null) return Response.json({ ok: false, refusal: 'not_found' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return backToOrder(request, orderId, 'unavailable')
  }
  const reasonValue = form.get('reason')
  const reason = typeof reasonValue === 'string' ? reasonValue : ''

  try {
    const { payload, user } = await actorFrom(request)
    const result = await handBackOrder(payload, { orderId, actor: user, reason })
    return backToOrder(request, orderId, result.ok ? undefined : result.refusal)
  } catch (error) {
    console.error(
      `[orders] hand-back ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return backToOrder(request, orderId, 'unavailable')
  }
}
