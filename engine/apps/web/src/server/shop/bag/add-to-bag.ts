/**
 * Adding one line to the bag, checked against live availability (TASKS.md 6.1.c, 6.2.a): the
 * same answer `availabilityFor` gives the product loader ("any active store has stock") decides
 * whether a forced post can add a line at all. No `server-only` import — unlike `./actions` — so
 * a plain test can call it with a pushed database's `Payload`, no cookie or request needed.
 */
import type { Payload } from 'payload'

import { addToBag, parseBagLine, type BagEdit, type BagLine } from '@engine/cms/shop/pricing'

import { availabilityFor, type ProductAvailability } from '../catalogue/availability'

export type AddToBagResult = BagEdit | { readonly outcome: 'refused' }

/**
 * Whether a line's product, or its chosen variant, can be sold — never for a product
 * `availabilityFor` was given no answer for (not found, or not asked about).
 */
export function lineIsSellable(
  line: Pick<BagLine, 'productId' | 'variantSku'>,
  availability: ProductAvailability | undefined,
): boolean {
  if (availability === undefined) return false
  return line.variantSku === null
    ? availability.product
    : availability.variants.get(line.variantSku) === true
}

/**
 * Merges untrusted `input` into `lines` (`addToBag`), refusing — `lines` left untouched — a
 * product or variant with no stock in any active store. A malformed `input` still reaches
 * `addToBag`'s own `invalid` outcome, never a false refusal.
 */
export async function addToBagChecked(
  payload: Payload,
  lines: readonly BagLine[],
  input: unknown,
): Promise<AddToBagResult> {
  const line = parseBagLine(input)
  if (line !== null) {
    const availability = (await availabilityFor(payload, [line.productId])).get(line.productId)
    if (!lineIsSellable(line, availability)) return { outcome: 'refused' }
  }
  return addToBag(lines, input)
}
