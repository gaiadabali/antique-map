/**
 * @contract C2 — view models: the guest's wishlist · owner: ARC · consumers: WEB, UXE
 *
 * Where saved items live on the device and not in an account (D35, module
 * `retention.deviceWishlist`): the page lists what this device saved, newest first, each card
 * with its heart to remove it and its own way to the bag. The list is C13's `DEVICE_WISHLIST`
 * cookie, read at request time, so it streams; an item no longer published drops out. Nothing
 * here is shared with an account or another device, and each save and removal is tracked under
 * ANALYTICS.md §1's consent rule (C11, D38).
 */
import type { CardVM } from '../cards'
import type { LinkVM, MessageVM, SeoVM, Streamed } from '../common'

export type WishlistVM = {
  surface: 'wishlist'
  title: string
  items: Streamed<readonly CardVM[]>
  /** "Saved on this device only": where the list lives, said plainly. */
  note: MessageVM
  /** Where to look next, above all when the list is empty. */
  browse: LinkVM
  seo: SeoVM
}
