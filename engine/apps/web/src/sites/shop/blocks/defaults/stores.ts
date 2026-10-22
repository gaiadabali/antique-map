/**
 * The stores page as it reads before the CMS holds a published `stores` page: the directory, its
 * title the lexicon's; the lede and the empty note stay unset so the directory takes the lexicon's
 * plural forms for the count.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ShopBlockVM } from '../../../../server/shop/pages/blocks'
import { storesText } from '../../stores/copy'

export function defaultStoresBlocks(locale: SiteLocale): readonly ShopBlockVM[] {
  const t = storesText(locale)
  return [
    { type: 'storeDirectory', id: 'stores', title: t('stores.title'), lede: null, empty: null },
  ]
}
