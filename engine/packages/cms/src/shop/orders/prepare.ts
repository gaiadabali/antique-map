/**
 * What checkout's every step does first, before any store is picked (COMMERCE.md §3): the shop's
 * checkout switch, the bag re-read from its signed cookie, the server's own prices (6.2's
 * `loadPricingInputs` + `quoteBag`), and the welcome code re-checked — with the buyer's contact
 * when it is known, so `oncePerBuyer` is decided. The request never carries a price: there is no
 * field for one to arrive in.
 *
 * A line nobody holds, or one no longer for sale, is left out of checkout (COMMERCE.md §3); the
 * pay button's `expectedTotalIdr` catches a bag that changed under the buyer.
 */
import type { Payload } from 'payload'

import { parseBag, type BagCookieKey, type BagLine } from '../pricing/bag'
import {
  checkWelcomeCode,
  type DiscountContact,
  type DiscountRefusal,
  type EligibleDiscount,
} from '../pricing/discount'
import { hasBeenUsedByFor, loadPricingInputs } from '../pricing/payload-adapter'
import { buyableLines, quoteBag, type Catalogue, type PricingSettings } from '../pricing/quote'
import type { LineRef } from './assign'
import { loadOrderSettings, loadWelcomeDiscount, type OrderSettings } from './inputs'

export type PrepareInput = {
  /** The `cart` cookie's raw value. */
  readonly bagCookie: string | null | undefined
  readonly bagKey: BagCookieKey
  /** The code the buyer typed, or nothing. */
  readonly welcomeCode: string | null | undefined
  /** The buyer's contact once step 1 is done; `null` before. */
  readonly contact: DiscountContact | null
  readonly now: Date
}

export type PreparedBag = {
  readonly ok: true
  /** The lines that can be bought, in the bag's order: the ones the order is made of. */
  readonly lines: readonly BagLine[]
  readonly catalogue: Catalogue
  readonly settings: PricingSettings
  readonly discount: EligibleDiscount | null
  readonly orderSettings: OrderSettings
}

export type PrepareRefusal =
  | { readonly ok: false; readonly refusal: 'checkout_disabled' }
  | { readonly ok: false; readonly refusal: 'empty_bag' }
  | { readonly ok: false; readonly refusal: 'out_of_stock'; readonly lines: readonly LineRef[] }
  | { readonly ok: false; readonly refusal: 'code_refused'; readonly code: DiscountRefusal }

const ref = ({ productId, variantSku }: LineRef): LineRef => ({ productId, variantSku })

export async function prepareBag(
  payload: Payload,
  input: PrepareInput,
): Promise<PreparedBag | PrepareRefusal> {
  const orderSettings = await loadOrderSettings(payload)
  if (!orderSettings.checkoutEnabled) return { ok: false, refusal: 'checkout_disabled' }

  const bag = parseBag(input.bagCookie, input.bagKey)
  if (bag.length === 0) return { ok: false, refusal: 'empty_bag' }

  const [{ catalogue, settings, welcome: named }, record] = await Promise.all([
    loadPricingInputs(payload, bag),
    loadWelcomeDiscount(payload, orderSettings.welcomeCode),
  ])
  // 6.2's adapter reads `welcomeDiscount` as a relationship; while it is a code, this module's read.
  const welcome = named ?? record

  let discount: EligibleDiscount | null = null
  const entered = typeof input.welcomeCode === 'string' ? input.welcomeCode.trim() : ''
  if (entered !== '') {
    const check = await checkWelcomeCode({
      enteredCode: entered,
      welcome,
      now: input.now,
      contact: input.contact,
      hasBeenUsedBy: hasBeenUsedByFor(payload),
    })
    if (!check.ok) return { ok: false, refusal: 'code_refused', code: check.refusal }
    discount = check.discount
  }

  const quote = quoteBag(bag, catalogue, settings, { distanceKm: null, discount })
  if (quote.refusal === 'empty_bag') return { ok: false, refusal: 'empty_bag' }
  if (quote.refusal === 'out_of_stock') {
    return { ok: false, refusal: 'out_of_stock', lines: quote.lines.map(ref) }
  }
  if (quote.discountRefusal !== null) {
    return { ok: false, refusal: 'code_refused', code: quote.discountRefusal }
  }
  return {
    ok: true,
    lines: buyableLines(quote),
    catalogue,
    settings,
    discount,
    orderSettings,
  }
}
