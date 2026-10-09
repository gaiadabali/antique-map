/**
 * The gallery item page's words (5.2.b): the keys and neutral defaults here, the values in the
 * gallery's lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — a component never
 * holds a word. The record's labels, the vocabularies (`objectType.*`, `colouring.*`,
 * `maker.role.*`, `maker.certainty.*`, `image.role.*`, `image.synthetic.*`), the statuses and
 * `price.onRequest` are the app lexicon's (`@/messages/keys`); this module adds only what the
 * item page alone says, and the technique vocabulary the lexicon does not carry yet.
 */
import {
  createMessages,
  defineMessages,
  type MessageParams,
  type Messages,
  type PluralBase,
} from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { LEXICON_MESSAGES, lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import type { ItemCredit } from '../../../server/gallery/item/view-model'
import { SITE_COPY } from '../../../shell/copy'

export const ITEM_PAGE_KEYS = defineMessages({
  'item.ask': 'Ask about this',
  'item.askOnHold': 'Ask to be told if it becomes available',
  'item.browse': 'Browse the collection',
  'item.dateUnknown': 'Date unknown',
  'item.fullScreen': 'Full screen',
  'item.heldIn': 'Held in Singapore',
  'item.lowResolution':
    'This is a low-resolution photograph from the old site, so it cannot zoom further.',
  'item.maker': 'Maker',
  'item.onHoldExplain': 'Another buyer is in conversation about this work.',
  'item.place': 'Place',
  'item.proofCertificate': 'A certificate with every original',
  'item.proofGuarantee': 'Lifetime authenticity guarantee',
  'item.proofOriginals': 'Originals only',
  'item.record': 'About this work',
  'item.replyPromise': 'We reply the same working day, Singapore time.',
  'item.shipping':
    'Shipping and duties are quoted after we agree the price, and paid before the work is sent.',
  'item.subjects': 'Subjects',
  'item.viewerFailed': 'This image cannot be opened in the viewer just now.',
  'item.viewerHint': 'Scroll or pinch to zoom. Keys: +, −, 0, arrows.',
  'item.viewerOpen': 'Zoom into the image',
  'item.viewerTitle': 'The images of this work',
  'item.zoomIn': 'Zoom in',
  'item.zoomOut': 'Zoom out',
  'item.zoomReset': 'Reset zoom',
  // the technique, by its code (works `TECHNIQUES`, packages/cms/src/collections/works/vocabulary.ts)
  'technique.woodcut': 'Woodcut',
  'technique.wood-engraving': 'Wood engraving',
  'technique.copperplate-engraving': 'Copperplate engraving',
  'technique.etching': 'Etching',
  'technique.steel-engraving': 'Steel engraving',
  'technique.mezzotint': 'Mezzotint',
  'technique.aquatint': 'Aquatint',
  'technique.lithograph': 'Lithograph',
  'technique.chromolithograph': 'Chromolithograph',
  'technique.offset-lithograph': 'Offset lithograph',
  'technique.screenprint': 'Screenprint',
  'technique.salt-print': 'Salt print',
  'technique.albumen-print': 'Albumen print',
  'technique.gelatin-silver-print': 'Gelatin silver print',
  'technique.collotype': 'Collotype',
  'technique.photogravure': 'Photogravure',
  'technique.cyanotype': 'Cyanotype',
  'technique.manuscript': 'Manuscript',
  'technique.other': 'Other',
})

export type ItemMessageKey = keyof typeof ITEM_PAGE_KEYS

/** Every word the item page can say: this module's keys and the app lexicon's. */
export type ItemKey = ItemMessageKey | LexiconMessageKey

export type ItemText = {
  (key: ItemKey | PluralBase<ItemKey>, params?: MessageParams): string
  /** A vocabulary code's words (`objectType.map`), or the code itself when the lexicon has none. */
  readonly code: (prefix: string, code: string, params?: MessageParams) => string
}

const isKnown = (key: string, ...sets: readonly Record<string, unknown>[]) =>
  sets.some((set) => set[key] !== undefined)

/** The gallery item's words for one locale: this module's keys plus the shared lexicon's. */
export function itemText(locale: SiteLocale): ItemText {
  const mine: Messages<ItemMessageKey> = createMessages({
    defaults: ITEM_PAGE_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  const shared = lexiconMessages('gallery', locale)
  const t = ((key: string, params?: MessageParams) =>
    isKnown(key, ITEM_PAGE_KEYS)
      ? mine.t(key as ItemMessageKey, params)
      : shared.t(key as LexiconMessageKey, params)) as ItemText
  const code = (prefix: string, value: string, params?: MessageParams) => {
    const key = `${prefix}.${value}`
    return isKnown(key, ITEM_PAGE_KEYS, LEXICON_MESSAGES) ? t(key as ItemKey, params) : value
  }
  return Object.assign(t, { code })
}

/** A credit as the page says it: "Attributed to VALENTIJN, François (Cartographer)". */
export function creditLine(t: ItemText, maker: ItemCredit): string {
  const name = t.code('maker.certainty', maker.certainty || 'certain', { name: maker.name })
  return maker.role === '' ? name : `${name} (${t.code('maker.role', maker.role)})`
}
