/**
 * The stores page's first content, seeded once into the CMS (`../pages`) and never drawn by the
 * site itself (TASKS.md 27.5.b): the directory, its title the lexicon's; the lede and the empty
 * note stay unset so the directory takes the lexicon's plural forms for the count.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ShopBlockVM } from '../../blocks'
import { storesText } from '../../../../../sites/shop/stores/copy'

export function defaultStoresBlocks(locale: SiteLocale): readonly ShopBlockVM[] {
  const t = storesText(locale)
  return [
    { type: 'storeDirectory', id: 'stores', title: t('stores.title'), lede: null, empty: null },
  ]
}
