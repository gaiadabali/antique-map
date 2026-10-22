/**
 * The stores directory block: every listed store by area, from the public projection
 * (`server/shop/stores`), drawn by the stores page's view with the block's title and lede.
 */
import type { StoreDirectoryVM } from '../../../server/shop/pages/blocks'
import { listedStores } from '../../../server/shop/stores'
import { StoresView } from '../stores/stores-view'

export async function StoreDirectory({
  locale,
  block,
}: {
  readonly locale: 'en' | 'id'
  readonly block: StoreDirectoryVM
}) {
  return <StoresView groups={await listedStores(locale)} locale={locale} block={block} />
}
