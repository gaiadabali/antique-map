/**
 * The gallery item page's words (5.2.b): the keys and neutral defaults here, the values in the
 * gallery's lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — a component never
 * holds a word. The shared keys the page borrows (`status.*`, `price.onRequest`) come from the
 * app's lexicon (`@/messages/keys`).
 */
import {
  createMessages,
  defineMessages,
  type MessageParams,
  type Messages,
  type PluralBase,
} from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'

export const ITEM_KEYS = defineMessages({
  'item.ask': 'Ask about this',
  'item.askOnHold': 'Ask to be told if it becomes available',
  'item.askSold': 'Ask for another example',
  'item.browse': 'Browse the collection',
  'item.condition': 'Condition',
  'item.conditionDefects': 'Defects',
  'item.conditionRestoration': 'Restoration',
  'item.date': 'Date',
  'item.dateUnknown': 'Date unknown',
  'item.dimensions': 'Dimensions',
  'item.heldIn': 'Held in Singapore',
  'item.images': 'Images',
  'item.maker': 'Maker',
  'item.mockup': 'Digital mockup',
  'item.objectType': 'Type',
  'item.onHold': 'On hold',
  'item.onHoldExplain': 'Another buyer is in conversation about this work.',
  'item.originalTitle': 'Original title',
  'item.place': 'Place',
  'item.provenance': 'Provenance',
  'item.provenanceNote': '{holder}, {period}. {note}',
  'item.provenancePlain': '{holder}',
  'item.technique': 'Technique',
  'item.colouring': 'Colouring',
  'item.references': 'References',
  'item.shipping': 'Shipping and duties are quoted after we agree the price, and paid before the work is sent.',
  'item.sold': 'Sold',
  'item.stockNumber': 'Stock number',
  'item.subjects': 'Subjects',
  'item.versatile': 'Verso',
  'item.viewerClose': 'Close the viewer',
  'item.viewerHint': 'Scroll or pinch to zoom. Keys: +, −, 0, arrows.',
  'item.viewerOpen': 'Zoom',
  'item.viewerTitle': 'The deep-zoom viewer',
  'item.lowResolution':
    'This is a low-resolution photograph from the old site, so it cannot zoom further.',
})

export type ItemMessageKey = keyof typeof ITEM_KEYS

/** Every word the item page can say: this module's keys and the app lexicon's. */
export type ItemKey = ItemMessageKey | LexiconMessageKey

export type ItemText = {
  (key: ItemKey | PluralBase<ItemKey>, params?: MessageParams): string
}

/** The gallery item's words for one locale: this module's keys plus the shared lexicon's. */
export function itemText(locale: SiteLocale): ItemText {
  const mine: Messages<ItemMessageKey> = createMessages({
    defaults: ITEM_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  const shared = lexiconMessages('gallery', locale)
  const mineT = mine.t.bind(mine)
  const sharedT = shared.t.bind(shared)
  const t = (key: ItemKey, params?: MessageParams) =>
    (ITEM_KEYS as Record<string, unknown>)[key] !== undefined
      ? mineT(key as ItemMessageKey, params)
      : sharedT(key as LexiconMessageKey, params)
  return t as ItemText
}
