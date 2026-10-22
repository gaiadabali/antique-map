/**
 * `POST /api/x/orders/{id}/reassign` — the owner and editor's reassignment (TASKS.md 7.2.b;
 * CONTENT-OPERATIONS.md §5.2). A plain form post (`toStoreId`); `reassignOrder` moves the stock and
 * the order in one step.
 */
import 'server-only'

import { reassignOrder } from '@engine/cms/shop/fulfilment'

import { actorFrom, backToOrder, parseOrderId } from './auth'

type Ctx = { readonly params: Promise<{ readonly id: string }> }

export async function ordersReassignPost(request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params
  const orderId = parseOrderId(id)
  if (orderId === null) return Response.json({ ok: false, refusal: 'not_found' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return backToOrder(request, orderId, 'unavailable')
  }
  const toStoreId = Number(form.get('toStoreId'))
  if (!Number.isInteger(toStoreId) || toStoreId <= 0) {
    return backToOrder(request, orderId, 'unavailable')
  }

  try {
    const { payload, user } = await actorFrom(request)
    const result = await reassignOrder(payload, { orderId, toStoreId, actor: user })
    return backToOrder(request, orderId, result.ok ? undefined : result.refusal)
  } catch (error) {
    console.error(
      `[orders] reassign ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return backToOrder(request, orderId, 'unavailable')
  }
}
