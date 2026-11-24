'use server'

/**
 * The checkout's delivery preview (the plan's K2; TASKS.md 27.3): once the buyer has pinned their
 * spot, the delivery fee from the store the order will use and the total to pay, so the buyer sees
 * delivery before paying. The merged core's `quoteCheckout` does the work — the same preparation,
 * store pick and pricing as `createOrder`, read outside any transaction, taking no stock and
 * writing nothing.
 *
 * Only the pin and the locale arrive from the form; the lines come from the signed bag cookie and
 * the code from its own signed cookie, and every figure is the server's. What goes back is the fee,
 * the total and whether staff will quote instead — never the store's code, its stock or which other
 * stores hold what. The total it returns is the one the pay button echoes as `expectedTotalIdr`,
 * which `createOrder` only compares (`price_changed`), never reads as a price.
 */
import 'server-only'

import { cookies, headers } from 'next/headers'

import { cms } from '@engine/cms/instance'
import { quoteCheckout } from '@engine/cms-shop/orders'
import { BAG_COOKIE_NAME, bagCookieKeyFromEnv } from '@engine/cms-shop/pricing'

import { deliveryQuoteWait } from '@engine/site/limits'
import { CODE_COOKIE_NAME, parseCodeCookie } from '../bag/code-cookie'
import { displayFor } from '../bag/display'
import { checkoutText } from '../../../sites/shop/checkout/copy'
import { refusalCopy, type CheckoutRefusal } from './refusal-text'

/** What the form shows under the pin, and the total its pay button echoes. */
export type DeliveryPreview =
  | {
      readonly kind: 'priced'
      readonly deliveryIdr: number
      readonly isFree: boolean
      readonly totalIdr: number
    }
  /** Past the last band: staff confirm the fee after the order; the total is the items total. */
  | { readonly kind: 'staff_quote'; readonly totalIdr: number }
  /** Nothing can be quoted for this pin and bag; the words say why. */
  | { readonly kind: 'refused'; readonly message: string }

export type DeliveryPreviewInput = {
  readonly lat: number
  readonly lng: number
  readonly locale: 'en' | 'id'
}

const coordinate = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** The delivery fee and total for the buyer's pin, or why there is none. */
export async function quoteDeliveryAction(input: DeliveryPreviewInput): Promise<DeliveryPreview> {
  const locale = input?.locale === 'id' ? 'id' : 'en'
  const text = checkoutText(locale)
  const lat = coordinate(input?.lat)
  const lng = coordinate(input?.lng)
  if (lat === null || lng === null) {
    return { kind: 'refused', message: text('checkout.problem.invalid-pin') }
  }
  // A bag read and a store pick per call: thirty a minute per address (SECURITY.md §2.10). Off
  // nginx there is no address to count, so nothing is — as for the checkout itself.
  if (deliveryQuoteWait(await headers()) > 0) {
    return { kind: 'refused', message: text('checkout.problem.preview-limited') }
  }

  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const quoted = await quoteCheckout(
    await cms(),
    {
      bagCookie: jar.get(BAG_COOKIE_NAME)?.value,
      pin: { lat, lng },
      welcomeCode: parseCodeCookie(jar.get(CODE_COOKIE_NAME)?.value, key),
    },
    { bagKey: key },
  )
  if (quoted.ok) {
    return quoted.delivery.kind === 'priced'
      ? {
          kind: 'priced',
          deliveryIdr: quoted.delivery.feeIdr,
          isFree: quoted.delivery.isFree,
          totalIdr: quoted.quote.totalIdr,
        }
      : { kind: 'staff_quote', totalIdr: quoted.quote.totalIdr }
  }
  if (quoted.refusal === 'outside_reach' || quoted.refusal === 'no_delivery_table') {
    return { kind: 'refused', message: text('bag.deliveryUnavailable') }
  }
  const named = quoted.refusal === 'out_of_stock' ? quoted.lines : null
  const missing = quoted.refusal === 'no_single_store' ? quoted.missing : null
  const display = await displayFor((named ?? missing ?? []).map((line) => line.productId))
  const nameOf = (line: { readonly productId: number }) =>
    display.find((each) => each.productId === line.productId)?.name ?? null
  // The two delivery refusals were answered above; every other is a checkout refusal.
  const copy = refusalCopy(quoted as CheckoutRefusal, nameOf)
  return {
    kind: 'refused',
    message: copy.params === undefined ? text(copy.key) : text(copy.key, copy.params),
  }
}
