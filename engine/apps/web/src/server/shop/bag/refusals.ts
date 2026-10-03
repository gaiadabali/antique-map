/**
 * The bag page's words for what the quote refuses (TASKS.md 6.2): lexicon keys, never copy, so
 * the view stays word-free (CONVENTIONS.md §6). `beyond_reach` and `no_delivery_table` carry the
 * WhatsApp handoff copy (EXPERIENCE-SHOP.md §6); on the bag page itself they cannot fire — there
 * is no pin yet — but the mapping is the contract the checkout's delivery step (6.3) reuses.
 */
import type { QuoteRefusal } from '@engine/cms/shop/pricing'

/** The bag lexicon's refusal keys (`../sites/shop/lexicon/{en,id}.json`). */
export type BagRefusalKey =
  'cart.empty' | 'bag.bagProblem' | 'bag.beyondReach' | 'bag.deliveryUnavailable'

export function refusalKey(refusal: QuoteRefusal): BagRefusalKey {
  switch (refusal) {
    case 'empty_bag':
      return 'cart.empty'
    case 'out_of_stock':
      return 'bag.bagProblem'
    case 'beyond_reach':
      return 'bag.beyondReach'
    case 'no_delivery_table':
      return 'bag.deliveryUnavailable'
  }
}
