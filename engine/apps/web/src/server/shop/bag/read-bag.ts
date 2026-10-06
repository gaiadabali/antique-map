/**
 * The bag page's read (TASKS.md 6.2; COMMERCE.md §3): the cookie bag, priced by the server from
 * the database on every request. Nothing here is cached — the bag decides a purchase — and no
 * price the visitor could name is ever read: the cookie holds ids and quantities only
 * (`@engine/cms/shop/pricing`'s `parseBag`), so a tampered price simply is not there.
 *
 * The applied welcome code travels in its own signed cookie (`./code-cookie`) and is re-validated
 * against `discounts` on every read (`checkWelcomeCode` with no contact — the once-per-buyer rule
 * is checkout's to finish). Its single rounding and the discount are the pricing core's, never
 * the page's.
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
  type BagCookieKey,
  type Quote,
  type QuoteLine,
} from '@engine/cms/shop/pricing'

import { CODE_COOKIE_NAME, parseCodeCookie } from './code-cookie'
import { displayFor, type BagDisplay } from './display'
import { refusalKey } from './refusals'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'

export type BagLineVM = {
  readonly productId: number
  readonly variantSku: string | null
  readonly qty: number
  readonly status: 'ok' | 'out_of_stock' | 'unavailable'
  /** The product's public address; `null` when it was unpublished since the line was added. */
  readonly slug: string | null
  readonly name: string
  readonly variantLabel: string | null
  readonly imageUrl: string | null
  readonly imageAlt: string | null
  /** The server's figures, formatted; `null` on an unavailable line. */
  readonly unitText: string | null
  readonly lineText: string | null
}

/** The applied code, as the page shows it and as checkout will re-check it. */
export type BagCodeVM = {
  readonly code: string
  /** Why the stored code was refused, by lexicon key; `null` while it stands. */
  readonly problem: { readonly key: string; readonly amountText?: string } | null
  /** The rupiah the code took off, formatted; `null` while it took none. */
  readonly discountText: string | null
}

export type BagVM = {
  readonly lines: readonly BagLineVM[]
  readonly subtotalText: string
  readonly code: BagCodeVM | null
  readonly totalText: string
  /** Why the bag cannot go to payment, by lexicon key; `null` when its lines can be bought. */
  readonly refusal: { readonly key: string } | null
  /** The checkout CTA only goes live with something to buy (the bag page has no pin yet). */
  readonly canCheckout: boolean
}

/** The checked signing key the bag's cookies use, from `BAG_COOKIE_KEY`. */
export function bagCookieKey(): BagCookieKey {
  return bagCookieKeyFromEnv()
}

/**
 * The bag as the page renders it. Never throws on visitor input: an absent, forged or malformed
 * cookie reads as the empty bag, and a stale code reads as a refused one, priced without.
 */
export async function readBag(): Promise<BagVM> {
  const jar = await cookies()
  const key = bagCookieKey()
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
    distanceKm: null, // the bag page has no pin; delivery is checkout's question (6.3)
    discount: checked?.ok === true ? checked.discount : null,
  })

  const display = await displayFor(quote.lines.map((line) => line.productId))
  const byId = new Map<number, BagDisplay>(display.map((each) => [each.productId, each]))

  return {
    lines: quote.lines.map((line) => lineVM(line, byId)),
    subtotalText: formatRupiah(quote.subtotalIdr),
    code: codeVM(storedCode, checked, quote),
    totalText: formatRupiah(quote.totalIdr),
    refusal: quote.refusal === undefined ? null : { key: refusalKey(quote.refusal) },
    canCheckout: quote.refusal === undefined,
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
    imageUrl: product?.image?.url ?? null,
    imageAlt: product?.image?.alt ?? product?.name ?? '',
    unitText: line.unitIdr === null ? null : formatRupiah(line.unitIdr),
    lineText: line.status === 'ok' ? formatRupiah(line.lineIdr) : null,
  }
}

function codeVM(
  storedCode: string | null,
  checked: Awaited<ReturnType<typeof checkWelcomeCode>> | null,
  quote: Pick<Quote, 'discountIdr' | 'discountRefusal'>,
): BagCodeVM | null {
  if (storedCode === null) return null
  if (checked === null) return { code: storedCode, problem: null, discountText: null }
  if (!checked.ok) {
    return { code: storedCode, problem: problemOf(checked.refusal), discountText: null }
  }
  // The code stands but the bag may not meet it yet: `quoteBag` refuses the minimum spend as a
  // value, and the page says what is still to add (EXPERIENCE-SHOP.md §5).
  const problem = quote.discountRefusal === null ? null : problemOf(quote.discountRefusal)
  return {
    code: storedCode,
    problem,
    discountText: quote.discountIdr > 0 ? formatRupiah(quote.discountIdr) : null,
  }
}

function problemOf(refusal: {
  readonly messageKey: string
  readonly amountIdr?: number
}): BagCodeVM['problem'] {
  return {
    key: refusal.messageKey,
    ...(refusal.amountIdr === undefined ? {} : { amountText: formatRupiah(refusal.amountIdr) }),
  }
}
