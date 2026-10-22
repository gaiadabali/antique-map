/**
 * The lexicon: the app’s message keys and neutral defaults for every status, purchase mode,
 * configurator label, checkout step, error, empty state, prefilled WhatsApp message and image label
 * its surfaces show (TASKS.md 6.3.b), and the contracts’ value lists — facets, sorts, object types,
 * maker roles, account sections, enquiry topics, returns (6.3.f), colourings, place roles,
 * directories (6.3.i) — and the form fields' labels (6.3.h), one module per area in `./lexicon/`.
 * Keys in code, values in files (CONVENTIONS.md §6): the values are each site's
 * `src/sites/<site>/lexicon/<locale>.json`, and how they sound is `docs/design/gallery/voice.md` and
 * `docs/design/emporium/voice.md`. The shop's own area (`./lexicon/shop`) came over from the
 * emporium app when the two apps became one (TASKS.md 2.1.a). A key
 * whose last segment names a contract code spells it as the code (`order.status.${status}`), a
 * loader’s `MessageVM` reads `message.<code>`, and a form field's label is its C2 `name`. Money,
 * dates, counts and hours are placeholders the page fills: copy never carries a figure of its own.
 */
import { SITES, type SiteKey, type SiteLocale } from '@engine/config/sites'
import { createMessages, defineMessages, type Messages } from '@engine/i18n'

import { SITE_COPY } from '../shell/copy'
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

export function lexiconMessages(site: SiteKey, locale: SiteLocale): Messages<LexiconMessageKey> {
  return createMessages({
    defaults: LEXICON_MESSAGES,
    locale,
    defaultLocale: SITES[site].locales.default,
    copy: SITE_COPY[site],
  })
}
