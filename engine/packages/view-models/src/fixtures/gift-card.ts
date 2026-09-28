/**
 * @contract C2 — fixture `gift-card` (and a balance check) · owner: ARC
 *
 * Emporium gift cards in rupiah for an Indonesian ship-to: three amounts, each a variant of
 * the gift-card product; scheduled delivery to a recipient by email or WhatsApp.
 */
import type { GiftCardVM } from '../surfaces/gift-card'
import { image, money, price, seo } from './_shared'

const amount = (idr: number, variantId: number) => ({
  price: price(money(idr, 'IDR')),
  line: { productId: 9500, variantId, quantity: 1, options: null, wraps: null },
})

export const giftCard: GiftCardVM = {
  surface: 'giftCard',
  title: 'Gift cards',
  intro: [],
  image: image('gift-card', 1600, 1000, 'A gift card printed with an archive map of the harbour'),
  currency: 'IDR',
  amounts: [amount(250000, 95001), amount(500000, 95002), amount(1000000, 95003)],
  delivery: {
    channels: ['email', 'whatsapp'],
    earliest: '2026-09-25',
    latest: '2027-09-25',
    messageMaxLength: 240,
  },
  balance: null,
  terms: { label: 'Gift card terms', href: '/gift-card-terms' },
  seo: seo('Gift cards', '/gift-cards'),
}

export const giftCardBalance: GiftCardVM = {
  ...giftCard,
  balance: { kind: 'balance', balance: money(320000, 'IDR'), expiresOn: '2027-06-30' },
}
