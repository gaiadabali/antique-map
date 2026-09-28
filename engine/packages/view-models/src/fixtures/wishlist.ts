/**
 * @contract C2 — fixtures `wishlist` (saved, empty) · owner: ARC
 *
 * The shop's wishlist on a guest's device (D35): two saved prints, and the list before
 * anything is saved. It says where the list lives, and each card's heart removes its item.
 */
import type { WishlistVM } from '../surfaces/wishlist'
import { card, seo, streamed } from './_shared'

const saved = (publicId: number, title: string) =>
  card(publicId, title, { wishlist: { productId: publicId, saved: true } })

export const wishlist: WishlistVM = {
  surface: 'wishlist',
  title: 'Saved for later',
  items: streamed([
    saved(7001, 'Harbour of Contoh — Giclée print'),
    saved(7003, 'Old Contoh — Poster'),
  ]),
  note: { code: 'wishlistOnThisDevice' },
  browse: { label: 'Browse the shop', href: '/browse' },
  seo: { ...seo('Saved for later', '/wishlist'), noindex: true },
}

export const wishlistEmpty: WishlistVM = { ...wishlist, items: streamed([]) }
