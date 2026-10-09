/**
 * The product page's words (6.1.b): the keys and neutral defaults here, the values in the shop's
 * lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6). The keys the page shares with
 * the app's lexicon (`price.from`, `label.reproduction`, `action.whatsapp`) come from
 * `@/messages/keys`, which the same files supply.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createMessages, defineMessages, type Messages, type PluralBase } from '@engine/i18n'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'

export const PRODUCT_KEYS = defineMessages({
  'product.meta': 'A reproduction from the Old East Indies archive, sent from Bali.',
  'product.options': 'Choose an option',
  'product.optionSoldOut': 'Sold out',
  'product.inStock': 'In stock',
  'product.outOfStock': 'Out of stock',
  'product.addToBag': 'Add to bag',
  'product.addingFailed': 'We could not add it just now — try again.',
  'product.added': 'Added to your bag.',
  'product.viewBag': 'View your bag',
  'product.refused': "That's just sold out — we could not add it.",
  'product.capped': 'You already have the most you can buy of this.',
  'product.delivery':
    'Sent from the nearest store by Gojek or Grab. The fee shows at checkout once you drop a pin — free over Rp 500.000.',
  'product.original': 'Made from {title}, an original at Indies Gallery',
  'product.originalSold': 'Made from our scan of the original, now sold',
  'product.description': 'About this product',
  'product.signalPaper': '300gsm cotton · archival inks',
  'product.signalWorkshop': 'Printed in our own workshop',
  'product.sku': 'SKU {sku}',
  'product.breadcrumbShop': 'Shop',
})

export type ProductMessageKey = keyof typeof PRODUCT_KEYS

export type ProductText = {
  (
    key: ProductMessageKey | PluralBase<ProductMessageKey>,
    params?: Record<string, string | number>,
  ): string
  shared(key: LexiconMessageKey, params?: Record<string, string | number>): string
}

/** The shop's product-page words for one locale: this module's keys plus the shared lexicon's. */
export function productText(locale: SiteLocale): ProductText {
  const mine: Messages<ProductMessageKey> = createMessages({
    defaults: PRODUCT_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  const shared = lexiconMessages('shop', locale)
  const t = mine.t.bind(mine)
  return Object.assign(t, { shared: shared.t.bind(shared) }) as ProductText
}

/**
 * The words the variant picker (a Client Component) shows, resolved here on the server and passed
 * down as props: the picker never imports this module, so the lexicon files (both sites, both
 * locales) stay out of the browser's JavaScript.
 */
export type VariantPickerText = {
  readonly options: string
  readonly optionSoldOut: string
  readonly addToBag: string
  readonly outOfStock: string
  readonly inStock: string
  readonly added: string
  readonly capped: string
  readonly refused: string
  readonly addingFailed: string
  readonly viewBag: string
}

export function variantPickerText(text: ProductText): VariantPickerText {
  return {
    options: text('product.options'),
    optionSoldOut: text('product.optionSoldOut'),
    addToBag: text('product.addToBag'),
    outOfStock: text('product.outOfStock'),
    inStock: text('product.inStock'),
    added: text('product.added'),
    capped: text('product.capped'),
    refused: text('product.refused'),
    addingFailed: text('product.addingFailed'),
    viewBag: text('product.viewBag'),
  }
}
