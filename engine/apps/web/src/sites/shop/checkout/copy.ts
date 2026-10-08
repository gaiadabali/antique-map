/**
 * The checkout's words (6.3.a): the keys and neutral defaults here, the values in the shop's
 * lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6). The shared keys the checkout
 * borrows (`cart.*`, `bag.*`, `checkout.*`, `codeInvalid.*`) come from the app's lexicon
 * (`@/messages/keys`) — only the keys this page adds by itself live here.
 */
import { createMessages, defineMessages, type PluralBase } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'
import { BAG_KEYS } from '../bag/copy'

export const CHECKOUT_KEYS = defineMessages({
  'checkout.reviewTitle': 'Your order',
  'checkout.contactTitle': 'Contact',
  'checkout.deliveryTitle': 'Delivery',
  'checkout.itemsTotal': 'Items total',
  'checkout.deliveryConfirmedNote':
    "Delivery price confirmed by our team — usually within 2 hours. You pay nothing until you've seen the final total.",
  'checkout.mapPinRequired': 'Pin your delivery spot on the map',
  'checkout.pinLatLng': 'Or type latitude and longitude',
  'checkout.notes': 'Notes for the driver (landmark, villa name) — optional',
  'checkout.giftNote': 'Gift note for the parcel (optional)',
  'checkout.backToBag': 'Back to the bag',
  'checkout.placing': 'Placing your order…',
  'checkout.problem.price-changed':
    'The total changed since you last saw it: it is now {total}. Check it before you pay.',
  'checkout.problem.invalid-details': 'Please check the highlighted fields.',
  'checkout.problem.invalid-pin': 'That pin does not look right — drop it again inside Indonesia.',
  'checkout.problem.checkout-disabled':
    'Online checkout is switched off for now. Message us on WhatsApp and we will take your order.',
  'checkout.problem.no-single-store':
    'No single store can send this whole bag. Remove {items} and try again, or ask us on WhatsApp and we will find a way.',
  'checkout.problem.out-of-stock':
    'Just sold out: {items}. Remove them to continue, or ask us on WhatsApp.',
  'checkout.problem.busy':
    'Many people are checking out right now. Nothing was charged or held — please try again in a moment.',
  'checkout.problem.outside-indonesia':
    'We deliver within Indonesia only, for now. Message us on WhatsApp and we will find a way.',
})

export type CheckoutMessageKey = keyof typeof CHECKOUT_KEYS

/**
 * The checkout's words: this module's own keys and the shared lexicon's (`bag.*`, `cart.*`,
 * `checkout.*`, `codeInvalid.*`, `action.*`). `(string & {})` keeps literal keys checked while
 * letting a refusal's key arrive as a plain string.
 */
export type CheckoutText = {
  (
    key: CheckoutMessageKey | PluralBase<CheckoutMessageKey> | LexiconMessageKey | (string & {}),
    params?: Record<string, string | number>,
  ): string
}

/** The shop's checkout words for one locale: this module's keys, the bag's, and the shared lexicon's. */
export function checkoutText(locale: SiteLocale): CheckoutText {
  // The bag's keys (`bag.beyondReach`, `bag.subtotal`, …) join the defaults so a refusal can reuse
  // the bag page's exact words for the same reason.
  const mine = createMessages({
    defaults: { ...CHECKOUT_KEYS, ...BAG_KEYS },
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  const shared = lexiconMessages('shop', locale)
  const mineT = mine.t.bind(mine)
  const sharedT = shared.t.bind(shared)
  return ((key: string, params?: Record<string, string | number>) =>
    key in BAG_KEYS || key in CHECKOUT_KEYS
      ? mineT(key as keyof typeof CHECKOUT_KEYS, params)
      : sharedT(key as LexiconMessageKey, params)) as CheckoutText
}
