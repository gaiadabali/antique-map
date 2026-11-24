/**
 * The lexicon's message keys and neutral defaults, shared by both sites (PLAN-V2 §4.2: shared keys
 * in `@engine/i18n`): every status, purchase mode, configurator label, checkout step, error, empty
 * state, prefilled WhatsApp message and image label a surface shows, one module per area in
 * `./lexicon/` (TASKS.md 6.3). Each site's lexicon files hold the values (CONVENTIONS.md §6).
 */
import { defineMessages } from './messages'
import { ITEM_KEYS } from './lexicon/item'
import { LISTING_KEYS } from './lexicon/listing'
import { RECORD_KEYS } from './lexicon/record'
import { ACCOUNT_KEYS } from './lexicon/account'
import { BAG_AND_CHECKOUT_KEYS } from './lexicon/bag-and-checkout'
import { PAYMENT_AND_ORDER_KEYS } from './lexicon/payment-and-order'
import { CONVERSATION_KEYS } from './lexicon/conversations'
import { FIELD_KEYS } from './lexicon/fields'
import { SHOP_KEYS } from './lexicon/shop'
import { WHATSAPP_AND_NOTE_KEYS } from './lexicon/whatsapp-and-notes'

export const LEXICON_MESSAGES = defineMessages({
  ...ITEM_KEYS,
  ...LISTING_KEYS,
  ...RECORD_KEYS,
  ...BAG_AND_CHECKOUT_KEYS,
  ...PAYMENT_AND_ORDER_KEYS,
  ...CONVERSATION_KEYS,
  ...FIELD_KEYS,
  ...ACCOUNT_KEYS,
  ...SHOP_KEYS,
  ...WHATSAPP_AND_NOTE_KEYS,
})

export type LexiconMessageKey = keyof typeof LEXICON_MESSAGES
