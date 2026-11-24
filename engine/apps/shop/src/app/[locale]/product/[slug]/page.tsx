/**
 * The product page. The shop's pages are `@engine/storefront`'s, which today's app draws too until phase 26 (TASKS.md 23.3); the proxy rewrites the public address here, without today's `/shop` prefix.
 * "See the original" is the gallery client's (TASKS.md 23.5, `src/originals`): this app hands the
 * page its slot, which links the gallery's page for the product's original stock number, or draws
 * nothing when the gallery does not answer.
 */
import ShopProduct from '@engine/storefront/pages/product'

import { originalSlot } from '../../../../originals/see-original'

export { generateMetadata } from '@engine/storefront/pages/product'

export default function ProductPage(props: PageProps<'/[locale]/product/[slug]'>) {
  return <ShopProduct params={props.params} original={originalSlot} />
}
