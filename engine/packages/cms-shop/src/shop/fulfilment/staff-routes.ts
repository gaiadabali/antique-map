/**
 * The store panel's and the owner's order actions as route handlers (TASKS.md 6.6.c, 7.2; moved
 * from today's app, 23.4, so the shop's own app mounts them too) — each a plain form post from the
 * admin's order screen, so the critical path needs no client JavaScript:
 *
 *   orders/quote                 "Send price": the staff's rupiah fee for an `awaiting_quote` order
 *   orders/{id}/move             the one big button, and the owner's status menu (a cancel included)
 *   orders/{id}/driver-image     the camera-friendly upload (`file`)
 *   orders/{id}/hand-back        "Can't send this", with a reason
 *   orders/{id}/reassign         another store, with a reason (required)
 *
 * Who acts is read as Payload's own admin reads it — the request's cookies, through
 * `payload.auth()` — so a request without a valid session acts as nobody and the core refuses it
 * (`not_staff`). The core judges and makes every move; a handler only reads the form and sends the
 * person back to the order's admin screen, with `error` set when the action was refused. Each
 * handler loads the app's Payload (`instance`) only once its form has been read.
 */
import type { Payload } from 'payload'

import { quoteDeliveryFee } from '../orders/quote'
import { attachDriverImage } from './driver-image'
import { handBackOrder } from './hand-back'
import { moveOrder } from './move'
import { reassignOrder } from './reassign'
import type { FulfilmentActor, MoveInput } from './types'
import { parseFeeIdr } from './quote-validate'

export type Instance = () => Promise<Payload>
type Ctx = { readonly params: Promise<{ readonly id: string }> }
type Actor = { readonly payload: Payload; readonly user: FulfilmentActor }
type Refusal = string | undefined

/** The shop's own Payload, loaded on the first action: the shop app's default. */
const shopInstance: Instance = async () => (await import('../../instance')).shopCms()

export function parseOrderId(id: string): number | null {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * A redirect back to the order's admin screen. A relative `Location` (never `Response.redirect`,
 * which needs an absolute URL): behind the proxy, `request.url` is the internal URL the rewrite
 * resolved to, not the browser's host — an absolute redirect built from it would go astray.
 */
export function backToOrder(orderId: number, error?: string): Response {
  const query = error ? `?error=${encodeURIComponent(error)}` : ''
  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/orders/${orderId}${query}` },
  })
}

const notFound = () => Response.json({ ok: false, refusal: 'not_found' }, { status: 404 })

async function formOf(request: Request): Promise<FormData | null> {
  try {
    return await request.formData()
  } catch {
    return null
  }
}

const text = (form: FormData, name: string): string => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/** Who the request's session names, on `instance`'s Payload — or nobody (`user: null`). */
export async function staffActor(instance: Instance, request: Request): Promise<Actor> {
  const payload = await instance()
  const { user } = await payload.auth({ headers: request.headers })
  return { payload, user: user as FulfilmentActor }
}

export function staffOrderRoutes(instance: Instance = shopInstance) {
  const actorFrom = (request: Request) => staffActor(instance, request)

  /** Runs `act` as the request's user; a defect is logged by name and answered `unavailable`. */
  async function acting(
    request: Request,
    name: string,
    orderId: number,
    act: (actor: Actor) => Promise<{ ok: true } | { ok: false; refusal: string }>,
  ): Promise<Response> {
    try {
      const result = await act(await actorFrom(request))
      const refusal: Refusal = result.ok ? undefined : result.refusal
      return backToOrder(orderId, refusal)
    } catch (error) {
      console.error(
        `[orders] ${name} ${orderId} failed: ${error instanceof Error ? error.name : 'error'}`,
      )
      return backToOrder(orderId, 'unavailable')
    }
  }

  /** A `/orders/{id}/…` action: the id read, the form read, then `act`. */
  const onOrder =
    (name: string, act: (form: FormData, orderId: number, request: Request) => Promise<Response>) =>
    async (request: Request, { params }: Ctx): Promise<Response> => {
      const orderId = parseOrderId((await params).id)
      if (orderId === null) return notFound()
      const form = await formOf(request)
      return form === null ? backToOrder(orderId, 'unavailable') : act(form, orderId, request)
    }

  return {
    async ordersQuotePost(request: Request): Promise<Response> {
      const form = await formOf(request)
      if (form === null)
        return Response.json({ ok: false, refusal: 'unavailable' }, { status: 400 })
      const orderId = parseOrderId(text(form, 'orderId'))
      if (orderId === null) return notFound()
      const feeIdr = parseFeeIdr(form.get('feeIdr'))
      if (feeIdr === null) return backToOrder(orderId, 'invalid_fee')
      return acting(request, 'quote', orderId, ({ payload, user }) =>
        quoteDeliveryFee(payload, { orderId, feeIdr, actor: user }),
      )
    },

    ordersMovePost: onOrder('move', async (form, orderId, request) => {
      const to = text(form, 'to')
      if (to === '') return backToOrder(orderId, 'unavailable')
      const reason = text(form, 'reason') || undefined
      return acting(request, 'move', orderId, ({ payload, user }) =>
        moveOrder(payload, { orderId, to: to as MoveInput['to'], actor: user, reason }),
      )
    }),

    ordersDriverImagePost: onOrder('driver-image', async (form, orderId, request) => {
      const file = form.get('file')
      if (!(file instanceof Blob)) return backToOrder(orderId, 'empty_file')
      return acting(request, 'driver-image', orderId, async ({ payload, user }) =>
        attachDriverImage(payload, {
          orderId,
          actor: user,
          file: {
            buffer: new Uint8Array(await file.arrayBuffer()),
            mimetype: file.type || undefined,
            size: file.size,
          },
        }),
      )
    }),

    ordersHandBackPost: onOrder('hand-back', async (form, orderId, request) => {
      const reason = text(form, 'reason')
      return acting(request, 'hand-back', orderId, ({ payload, user }) =>
        handBackOrder(payload, { orderId, actor: user, reason }),
      )
    }),

    ordersReassignPost: onOrder('reassign', async (form, orderId, request) => {
      const toStoreId = Number(form.get('toStoreId'))
      if (!Number.isInteger(toStoreId) || toStoreId <= 0) {
        return backToOrder(orderId, 'unavailable')
      }
      // The admin asks why (TASKS.md 27.3.c); the reason goes on the order's history.
      const reason = text(form, 'reason').trim()
      if (reason === '') return backToOrder(orderId, 'reason_required')
      return acting(request, 'reassign', orderId, ({ payload, user }) =>
        reassignOrder(payload, { orderId, toStoreId, actor: user, reason }),
      )
    }),
  }
}
