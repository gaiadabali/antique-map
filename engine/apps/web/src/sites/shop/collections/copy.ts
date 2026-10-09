/** The collections index's words (13.1): keys and defaults here, values in the shop's lexicon. */
import { createMessages, defineMessages, type Messages, type PluralBase } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const COLLECTIONS_KEYS = defineMessages({
  'collections.eyebrow': 'Gallery walls',
  'collections.title': 'Collections',
  'collections.lede': 'Our prints gathered by subject — choose a wall to browse.',
  'collections.count.one': '{count} print',
  'collections.count.other': '{count} prints',
  'collections.empty': 'The gallery walls are being hung — please look again soon.',
  'collections.noPicture': 'Picture to come',
})

export type CollectionsMessageKey = keyof typeof COLLECTIONS_KEYS

export type CollectionsText = (
  key: CollectionsMessageKey | PluralBase<CollectionsMessageKey>,
  params?: Record<string, string | number>,
) => string

export function collectionsText(locale: SiteLocale): CollectionsText {
  const messages: Messages<CollectionsMessageKey> = createMessages({
    defaults: COLLECTIONS_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return messages.t.bind(messages) as CollectionsText
}
