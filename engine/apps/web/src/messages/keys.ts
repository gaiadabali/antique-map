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
import { createMessages, type Messages } from '@engine/i18n'

import { SITE_COPY } from '../shell/copy'
import { LEXICON_MESSAGES, type LexiconMessageKey } from '@engine/i18n/lexicon'

export { LEXICON_MESSAGES, type LexiconMessageKey }

export function lexiconMessages(site: SiteKey, locale: SiteLocale): Messages<LexiconMessageKey> {
  return createMessages({
    defaults: LEXICON_MESSAGES,
    locale,
    defaultLocale: SITES[site].locales.default,
    copy: SITE_COPY[site],
  })
}
