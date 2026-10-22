/**
 * `POST /api/x/orders/quote` — the quote move's HTTP handler (TASKS.md 6.6 step 5), as a handler
 * factory for the shell to mount, the way `../fulfilment/http`'s driver-image purge hands its own
 * route over. Auth is the caller's own: `actorFrom` reads the request's session and resolves the
 * acting `Payload` instance and `FulfilmentActor` — the shell's own code, reading cookies, which
 * this package never touches — so this file stays a plain dependency the shell injects, same as
 * `driverImagePurgeRoute`'s `refuse`.
 *
 * Body: `{ orderId: number, feeIdr: number }`. Refusals map to HTTP status: `not_staff` and
 * `forbidden` → 403, `not_found` → 404, `not_awaiting_quote` and `expired` → 409, `invalid_fee` →
 * 400 (also the body's own shape, read before the actor so a malformed request never looks up a
 * session). A defect answers 500 with nothing of the order in the body.
 */
import type { Payload } from 'payload'

import { describeError } from '@engine/config/boot-check'

import type { FulfilmentActor } from '../fulfilment/types'
import { quoteDeliveryFee, type QuoteFeeRefusal, type QuoteFeeResult } from './quote'

export type QuoteRouteContext = { readonly payload: Payload; readonly actor: FulfilmentActor }
export type QuoteRouteOptions = {
  /** Resolves the request's session to a `Payload` instance and the acting user. */
  readonly actorFrom: (request: Request) => Promise<QuoteRouteContext>
  readonly now?: () => Date
}

const STATUS: Record<QuoteFeeRefusal, number> = {
  not_staff: 403,
  forbidden: 403,
  not_found: 404,
  not_awaiting_quote: 409,
  expired: 409,
  invalid_fee: 400,
}

const JSON_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

function badRequest(): Response {
  return Response.json(
    { ok: false, refusal: 'invalid_fee', message: 'Send a JSON body with orderId and feeIdr.' },
    { status: 400, headers: JSON_HEADERS },
  )
}

export function ordersQuoteRoute(options: QuoteRouteOptions) {
  return async function POST(request: Request): Promise<Response> {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest()
    }
    const orderId = (body as { orderId?: unknown } | null)?.orderId
    const feeIdr = (body as { feeIdr?: unknown } | null)?.feeIdr
    if (typeof orderId !== 'number' || !Number.isSafeInteger(orderId) || orderId <= 0) {
      return badRequest()
    }

    try {
      const { payload, actor } = await options.actorFrom(request)
      const result: QuoteFeeResult = await quoteDeliveryFee(payload, {
        orderId,
        feeIdr: feeIdr as number,
        actor,
        now: options.now?.(),
      })
      if (result.ok) return Response.json(result, { headers: JSON_HEADERS })
      return Response.json(result, { status: STATUS[result.refusal], headers: JSON_HEADERS })
    } catch (error) {
      console.error(`[orders] quote ${orderId} failed: ${describeError(error)}`)
      return Response.json(
        { ok: false, refusal: 'unavailable', message: 'The delivery price was not set.' },
        { status: 500, headers: JSON_HEADERS },
      )
    }
  }
}
