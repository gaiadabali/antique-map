/**
 * The checkout page's read (TASKS.md 6.3.a; COMMERCE.md §3): the cookie bag, priced by the server
 * from the database on every request. Never cached — the review decides a purchase — and no price
 * the visitor could name is ever read. The figures here are the ones the review shows and the pay
 * button echoes back as `expectedTotalIdr`; the delivery fee is checkout's second question, asked
 * by the fee action (`./actions`) once a pin exists. The welcome code travels in its own signed
 * cookie (`../bag/code-cookie`) and is re-validated here, without contact — the once-per-buyer
 * rule is `createOrder`'s to finish.
 */
import 'server-only'

import { cookies } from 'next/headers'

import { cms } from '@engine/cms/instance'
import {
  BAG_COOKIE_NAME,
  bagCookieKeyFromEnv,
  checkWelcomeCode,
  hasBeenUsedByFor,
  loadPricingInputs,
  parseBag,
  quoteBag,
  type QuoteLine,
} from '@engine/cms/shop/pricing'

import { CODE_COOKIE_NAME, parseCodeCookie } from '../bag/code-cookie'
import { displayFor, type BagDisplay } from '../bag/display'
import { refusalKey } from '../bag/refusals'
import type { BagLineVM } from '../bag/read-bag'

export type CheckoutRead = {
  readonly lines: readonly BagLineVM[]
  readonly code: string | null
  /** The server's figures, whole rupiah, as the review shows them. */
  readonly subtotalIdr: number
  readonly discountIdr: number
  readonly totalIdr: number
  /** Why the bag cannot go to payment, by lexicon key; `null` when its lines can be bought. */
  readonly refusal: { readonly key: string } | null
}

/** The checkout read: the bag as the review shows it, with the numbers the pay button echoes. */
export async function readCheckout(): Promise<CheckoutRead> {
  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const lines = parseBag(jar.get(BAG_COOKIE_NAME)?.value, key)
  const storedCode = parseCodeCookie(jar.get(CODE_COOKIE_NAME)?.value, key)

  const payload = await cms()
  const inputs = await loadPricingInputs(payload, lines)
  const checked =
    storedCode === null
      ? null
      : await checkWelcomeCode({
          enteredCode: storedCode,
          welcome: inputs.welcome,
          now: new Date(),
          contact: null,
          hasBeenUsedBy: hasBeenUsedByFor(payload),
        })
  const quote = quoteBag(lines, inputs.catalogue, inputs.settings, {
    distanceKm: null, // no pin yet: delivery is the fee action's question (6.3.a)
    discount: checked?.ok === true ? checked.discount : null,
  })

  const display = await displayFor(quote.lines.map((line) => line.productId))
  const byId = new Map<number, BagDisplay>(display.map((each) => [each.productId, each]))

  return {
    lines: quote.lines.map((line) => lineVM(line, byId)),
    code: storedCode,
    subtotalIdr: quote.subtotalIdr,
    discountIdr: quote.discountIdr,
    totalIdr: quote.totalIdr,
    refusal: quote.refusal === undefined ? null : { key: refusalKey(quote.refusal) },
  }
}

function lineVM(line: QuoteLine, byId: ReadonlyMap<number, BagDisplay>): BagLineVM {
  const product = byId.get(line.productId)
  const variantLabel =
    line.variantSku === null ? null : (product?.variantLabels[line.variantSku] ?? line.variantSku)
  return {
    productId: line.productId,
    variantSku: line.variantSku,
    qty: line.qty,
    status: line.status,
    slug: product?.slug ?? null,
    name: product?.name ?? '',
    variantLabel,
    image: product?.image ?? null,
    unitText: line.unitIdr === null ? null : String(line.unitIdr),
    lineText: line.status === 'ok' ? String(line.lineIdr) : null,
  }
}
