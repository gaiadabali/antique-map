/**
 * The checkout's refusal words (TASKS 6.3.a): every `createOrder` / `quoteCheckout` refusal becomes
 * one plain, kind sentence from the lexicon — never a stack trace, never an internal code. Pure:
 * it maps a refusal to a key and params, and the caller renders it with its own messages module,
 * so it is unit-tested without a server (`./refusal-text.test.ts`).
 *
 * `out_of_stock` and `no_single_store` name the items — `nameOf` supplies the product's name, and
 * a line the shop forgot is named "an item" rather than an id (COMMERCE.md §10: internals never
 * reach the buyer).
 */
import {
  DISCOUNT_MESSAGE_KEYS,
  type DiscountMessageKey,
  type DiscountRefusal,
} from '@engine/cms/shop/pricing'

import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import type { LineRef, PickRefusal } from '@engine/cms/shop/orders'
import type { OrderRefusal } from '@engine/cms/shop/orders'

/** A refusal of either checkout step, flattened to what the words need. */
export type CheckoutRefusal = OrderRefusal | PickRefusal

export type RefusalCopy = {
  readonly key: string
  readonly params?: Readonly<Record<string, string>>
}

/** A line's buyer-facing name; `null` when the shop cannot name it any more. */
export type NameOf = (line: LineRef) => string | null

const GENERIC_ITEM = 'an item'

/** The named lines, comma-joined, for `{items}`. */
export function itemNames(lines: readonly LineRef[], nameOf: NameOf): string {
  const names = lines.map((line) => nameOf(line) ?? GENERIC_ITEM)
  return names.join(', ')
}

/** The lexicon key and params for a checkout refusal. Every refusal has an answer. */
export function refusalCopy(refusal: CheckoutRefusal, nameOf: NameOf): RefusalCopy {
  switch (refusal.refusal) {
    case 'invalid_details':
      return { key: 'checkout.problem.invalid-details' }
    case 'checkout_disabled':
      return { key: 'checkout.problem.checkout-disabled' }
    case 'empty_bag':
      return { key: 'cart.empty' }
    case 'invalid_pin':
      return { key: 'checkout.problem.invalid-pin' }
    case 'outside_indonesia':
      return { key: 'checkout.problem.outside-indonesia' }
    case 'outside_reach':
      return { key: 'bag.beyondReach' }
    case 'no_delivery_table':
      return { key: 'bag.deliveryUnavailable' }
    case 'out_of_stock':
      return {
        key: 'checkout.problem.out-of-stock',
        params: { items: itemNames(refusal.lines, nameOf) },
      }
    case 'no_single_store':
      return {
        key: 'checkout.problem.no-single-store',
        params: { items: itemNames(refusal.missing, nameOf) },
      }
    case 'code_refused': {
      const { amountIdr } = refusal.code
      return {
        key: discountKey(refusal.code.reason),
        ...(amountIdr === undefined ? {} : { params: { amount: formatRupiah(amountIdr) } }),
      }
    }
    case 'price_changed':
      return { key: 'checkout.problem.price-changed' }
  }
}

/** The welcome code's refusal key — the same words the bag page shows for the same reason. */
export function discountKey(reason: DiscountRefusal['reason']): DiscountMessageKey {
  return DISCOUNT_MESSAGE_KEYS[reason]
}
