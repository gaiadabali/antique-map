/**
 * @contract C2 — fixture `item-sold-with-alternative` · owner: ARC
 * Sold and still published: no price, the available example of the same edition, and —
 * in the primary position, where Buy was — a print of it from the sister shop.
 */
import type { ItemVM } from '../surfaces/item'
import { originalItem, uniqueBase } from './_item'
import { card, image, money, NOW, price, SISTER_ORIGIN } from './_shared'

export const itemSoldWithAlternative: ItemVM = originalItem({
  ...uniqueBase,
  price: { kind: 'hidden' },
  state: {
    kind: 'sold',
    priceRealised: null,
    alternative: card(1003, 'The Isle of Contoh (another example)', {
      status: { kind: 'price', price: price(money(520000, 'USD')) },
    }),
    print: {
      kind: 'prints',
      sister: { name: 'Sample Emporium', href: SISTER_ORIGIN, syncedAt: NOW },
      products: [
        card(7001, 'Isle of Contoh — Giclée print', {
          href: `${SISTER_ORIGIN}/product/7001-isle-of-contoh-giclee`,
          image: image('print-7001', 1200, 960, 'Giclée print of the Isle of Contoh, framed'),
          status: { kind: 'from', price: price(money(9500, 'USD')) },
          isReproduction: true,
          archiveNumber: 'A-0042',
          wishlist: null,
          sister: { name: 'Sample Emporium' },
        }),
      ],
    },
  },
  actions: { primary: null, secondary: [] },
})

/** Sold, seen by a signed-in buyer: the price realised is shown. */
export const itemSoldPriceRealised: ItemVM = originalItem({
  ...uniqueBase,
  price: { kind: 'hidden' },
  state: {
    kind: 'sold',
    priceRealised: price(money(465000, 'USD')),
    alternative: null,
    print: null,
  },
  actions: { primary: null, secondary: [] },
})
