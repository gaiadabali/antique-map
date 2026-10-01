/**
 * The lexicon: the app’s message keys and neutral defaults for every status, purchase mode,
 * configurator label, checkout step, error, empty state, prefilled WhatsApp message and image label
 * its surfaces show (TASKS.md 6.3.b), and the contracts’ value lists — facets, sorts, object types,
 * maker roles, account sections, enquiry topics, returns (6.3.f) — one module per area in
 * `./lexicon/`. Apps own keys; brands own words (BRANDS.md §2): the values are
 * `<brand>/site/copy/<locale>.json`, and how they sound is `docs/design/gallery/voice.md`. A key
 * whose last segment names a contract code spells it as the code (`order.status.${status}`), and a
 * loader’s `MessageVM` reads `message.<code>`. Money, dates, counts and hours are placeholders the
 * page fills: copy never carries a figure of its own.
 */
import { defineMessages, type Messages } from '@engine/i18n'
import { loadMessages } from '@engine/i18n/copy'
import type { LocaleCode } from '@engine/config/schema'

import { currentBrand } from '../shell/brand'
import { ITEM_KEYS } from './lexicon/item'
import { LISTING_KEYS } from './lexicon/listing'
import { RECORD_KEYS } from './lexicon/record'
import { ACCOUNT_KEYS } from './lexicon/account'
import { BAG_AND_CHECKOUT_KEYS } from './lexicon/bag-and-checkout'
import { PAYMENT_AND_ORDER_KEYS } from './lexicon/payment-and-order'
import { CONVERSATION_KEYS } from './lexicon/conversations'
import { WHATSAPP_AND_NOTE_KEYS } from './lexicon/whatsapp-and-notes'

export const LEXICON_MESSAGES = defineMessages({
  ...ITEM_KEYS,
  ...LISTING_KEYS,
  ...RECORD_KEYS,
  ...BAG_AND_CHECKOUT_KEYS,
  ...PAYMENT_AND_ORDER_KEYS,
  ...CONVERSATION_KEYS,
  ...ACCOUNT_KEYS,
  ...WHATSAPP_AND_NOTE_KEYS,
})

export type LexiconMessageKey = keyof typeof LEXICON_MESSAGES

export async function lexiconMessages(locale: LocaleCode): Promise<Messages<LexiconMessageKey>> {
  const { config, paths } = await currentBrand()
  return loadMessages({
    defaults: LEXICON_MESSAGES,
    locale,
    defaultLocale: config.locales.default,
    copyDir: paths.copyDir,
  })
}
