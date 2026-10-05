/**
 * `POST /api/x/orders/{id}/move` — the store panel's one big button, and the owner's status menu
 * (TASKS.md 7.2; CONTENT-OPERATIONS.md §5.1, §5.3 — a cancel is a move to `cancelled`). A plain
 * form post (`to`, an optional `reason`), so the critical path needs no client JavaScript; the
 * fulfilment core (`moveOrder`) judges and makes the move, this route only reads the request and
 * sends the person back to what they were looking at.
 */
import 'server-only'

import { moveOrder, type MoveInput } from '@engine/cms/shop/fulfilment'

import { actorFrom, backToOrder, parseOrderId } from './auth'

type Ctx = { readonly params: Promise<{ readonly id: string }> }

export async function ordersMovePost(request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params
  const orderId = parseOrderId(id)
  if (orderId === null) return Response.json({ ok: false, refusal: 'not_found' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return backToOrder(request, orderId, 'unavailable')
  }
  const to = form.get('to')
  if (typeof to !== 'string' || to === '') {
    return backToOrder(request, orderId, 'unavailable')
  }
  const reasonValue = form.get('reason')
  const reason = typeof reasonValue === 'string' && reasonValue !== '' ? reasonValue : undefined

  try {
    const { payload, user } = await actorFrom(request)
    const result = await moveOrder(payload, {
      orderId,
      to: to as MoveInput['to'],
      actor: user,
      reason,
    })
    return backToOrder(request, orderId, result.ok ? undefined : result.refusal)
  } catch (error) {
    console.error(`[orders] move ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`)
    return backToOrder(request, orderId, 'unavailable')
  }
}
