/**
 * @contract C2 — view models: sister links · owner: ARC · consumers: WEB, UXG, UXE, SIS
 *
 * The cross-links between the sisters (BRANDS.md §5), rendered from the copy each keeps of the
 * other's (C12: the work snapshot on the outlet, the prints feed on the origin) — never a
 * cross-database read — and obeying the destination rules of the page they sit on:
 * the original's price in this visitor's market currency, no buy route abroad for a
 * `domestic-only` original, and a link that never claims more certainty than its sync. Both
 * carry the `workUid` their records key on (C12), which `sister.clicked` reports (C11); how an
 * original's C12 listing becomes `status`, `price` and `canBuy` is C12's `OriginalListing` rule.
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
  | { kind: 'prints'; sister: SisterVM; workUid: string; products: readonly CardVM[] }
  /** On a reproduction: the original, priced in this visitor's market currency. */
  | {
      kind: 'original'
      sister: SisterVM
      workUid: string
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
