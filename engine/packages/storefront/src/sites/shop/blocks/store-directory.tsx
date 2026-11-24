/**
 * The stores directory block: the listed stores — the flagships, then by region — from the public
 * projection (`server/shop/stores`), drawn by the stores page's view with the block's title and
 * lede.
 */
import type { StoreDirectoryVM } from '../../../server/shop/pages/blocks'
import { storeDirectory } from '../../../server/shop/stores'
import { StoresView } from '../stores/stores-view'

export async function StoreDirectory({
  locale,
  block,
}: {
  readonly locale: 'en' | 'id'
  readonly block: StoreDirectoryVM
}) {
  return <StoresView data={await storeDirectory(locale)} locale={locale} block={block} />
}
