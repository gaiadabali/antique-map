/**
 * `POST /api/x/orders/{id}/driver-image` — the store panel's camera-friendly upload (TASKS.md
 * 7.2.a; COMMERCE.md §9). A plain multipart form post (`file`); `attachDriverImage` does the
 * re-encoding and every refusal (size, type, store) — this route only reads the bytes.
 */
import 'server-only'

import { attachDriverImage } from '@engine/cms/shop/fulfilment'

import { actorFrom, backToOrder, parseOrderId } from './auth'

type Ctx = { readonly params: Promise<{ readonly id: string }> }

export async function ordersDriverImagePost(request: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params
  const orderId = parseOrderId(id)
  if (orderId === null) return Response.json({ ok: false, refusal: 'not_found' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return backToOrder(request, orderId, 'unavailable')
  }
  const file = form.get('file')
  if (!(file instanceof Blob)) {
    return backToOrder(request, orderId, 'empty_file')
  }

  try {
    const { payload, user } = await actorFrom(request)
    const buffer = new Uint8Array(await file.arrayBuffer())
    const result = await attachDriverImage(payload, {
      orderId,
      actor: user,
      file: {
        buffer,
        mimetype: file.type || undefined,
        size: file.size,
      },
    })
    return backToOrder(request, orderId, result.ok ? undefined : result.refusal)
  } catch (error) {
    console.error(
      `[orders] driver-image ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return backToOrder(request, orderId, 'unavailable')
  }
}
