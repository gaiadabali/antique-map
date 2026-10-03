/**
 * The bag page's words (6.2): the keys and neutral defaults here, the values in the shop's
 * lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6). The shared keys the bag borrows
 * (`cart.*`, `codeInvalid.*`, `action.whatsapp`) come from the app's lexicon (`@/messages/keys`).
 */
import { createMessages, defineMessages, type Messages, type PluralBase } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'

export const BAG_KEYS = defineMessages({
  'bag.subtotal': 'Subtotal',
  'bag.discount': 'Discount {code}',
  'bag.total': 'Total',
  'bag.deliveryAtCheckout': 'Delivery is calculated at checkout, from your delivery pin.',
  'bag.update': 'Update',
  'bag.qtyRange': 'Choose between {min} and {max}.',
  'bag.qtyCapped': 'You can have at most {max} of one item.',
  'bag.bagProblem': 'Nothing in your bag can be bought right now.',
  'bag.lineOutOfStock': 'Sold out since you added it — remove it to continue.',
  'bag.lineUnavailable': 'No longer for sale online — remove it to continue.',
  'bag.beyondReach':
    'We deliver within our delivery area for now. Message us on WhatsApp and we will find a way.',
  'bag.deliveryUnavailable':
    'Online delivery is temporarily unavailable. Message us on WhatsApp and we will sort it out.',
  'bag.codeApplied': 'Code {code} applied — it is checked again at checkout.',
  'bag.codeCleared': 'The code was removed.',
})

export type BagMessageKey = keyof typeof BAG_KEYS

export type BagText = {
  (key: BagMessageKey | PluralBase<BagMessageKey>, params?: Record<string, string | number>): string
  shared(key: LexiconMessageKey, params?: Record<string, string | number>): string
}

/** The shop's bag words for one locale: this module's keys plus the shared lexicon's. */
export function bagText(locale: SiteLocale): BagText {
  const mine: Messages<BagMessageKey> = createMessages({
    defaults: BAG_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  const shared = lexiconMessages('shop', locale)
  const t = mine.t.bind(mine)
  return Object.assign(t, { shared: shared.t.bind(shared) }) as BagText
}
