/**
 * @contract C2 — view models: gift cards · owner: ARC · consumers: WEB, UXE, UXG
 *
 * `commerce.giftCards` (COMMERCE.md §10): choose an amount, schedule it for a recipient by
 * email or WhatsApp on a chosen date, check a balance. A gift card is bound to the currency it
 * is bought in — the visitor's market's — and each amount is a variant of the gift-card
 * product whose value is its server price: the line carries the variant, never the amount.
 */
import type { CurrencyCode } from '@engine/config/schema'

import type { BlockVM } from '../blocks'
import type { ImageVM, IsoDate, LineIntent, LinkVM, Money, PriceVM, SeoVM } from '../common'

/** An amount the buyer can choose; the app formats it from `price`, never from a label. */
export type GiftCardAmountVM = {
  price: PriceVM
  /** The component adds `giftCard` — C6 `GiftCardDelivery` from the recipient form. */
  line: Omit<LineIntent, 'giftCard'>
}

export type GiftCardVM = {
  surface: 'giftCard'
  title: string
  intro: readonly BlockVM[]
  image: ImageVM | null
  currency: CurrencyCode
  amounts: readonly GiftCardAmountVM[]
  delivery: {
    channels: readonly ('email' | 'whatsapp')[]
    /** The send-on dates offered. */
    earliest: IsoDate
    latest: IsoDate
    messageMaxLength: number
  }
  /** The last balance check (`giftCard.balance`, the code typed by the visitor). */
  balance:
    { kind: 'balance'; balance: Money; expiresOn: IsoDate | null } | { kind: 'invalid' } | null
  terms: LinkVM | null
  seo: SeoVM
}
