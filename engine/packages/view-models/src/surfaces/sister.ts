/**
 * @contract C2 — view models: sister links · owner: ARC · consumers: WEB, UXG, UXE, SIS
 *
 * The cross-links between the sisters (BRANDS.md §5), rendered from the provenance copy —
 * never a cross-database read — and obeying the destination rules of the page they sit on:
 * the original's price in this visitor's market currency, no buy route abroad for a
 * `domestic-only` original, and a link that never claims more certainty than its sync.
 */
import type { CardVM } from '../cards'
import type { ImageVM, IsoDateTime, PriceVM } from '../common'

export type SisterVM = {
  name: string
  /** The sister's home page — a separate shop with its own account, and the link says so. */
  href: string
  /** When the copy was last synced: the link never claims more certainty than that. */
  syncedAt: IsoDateTime
}

export type SisterLinkVM =
  /** On an original: the exact products the sister makes from its work. */
  | { kind: 'prints'; sister: SisterVM; products: readonly CardVM[] }
  /** On a reproduction: the original, priced in this visitor's market currency. */
  | {
      kind: 'original'
      sister: SisterVM
      original: {
        title: string
        href: string
        image: ImageVM | null
        status: 'available' | 'onHold' | 'sold' | 'enquire'
        price: PriceVM | null
        /** False for a `domestic-only` original seen from abroad: no buy route is offered. */
        canBuy: boolean
      }
    }
