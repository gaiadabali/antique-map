/**
 * One of the home's featured prints, framed on a grey well, standing in for a photograph the owner
 * has not sent yet (the trade story's shop and hotel, the sister gallery's wall). The read is the
 * same cached `loadFeaturedProducts()` the rail uses, so no second query; while it streams, or when
 * there is no print at that place, the bare well holds the space. Decorative: the rail and the hero
 * already name every print, so the image here is hidden from assistive technology.
 */
import { Suspense } from 'react'

import { PrintTile, ResponsiveImage, printAspectOf, printRatioOf } from '../../../shared/ui'
import {
  loadFeaturedProducts,
  type FeaturedProduct,
} from '../../../server/shop/home/load-featured-products'

type Props = {
  readonly locale: 'en' | 'id'
  /** Which featured product, counting only those with an image (wraps round a short list). */
  readonly index: number
  readonly sizes: string
  readonly className?: string
}

export function FeaturedPrint(props: Props) {
  return (
    <Suspense fallback={<Well className={props.className} />}>
      <Print {...props} />
    </Suspense>
  )
}

function Well({ className }: { readonly className?: string }) {
  return (
    <PrintTile className={className}>
      <span />
    </PrintTile>
  )
}

async function Print({ locale, index, sizes, className }: Props) {
  let products: readonly FeaturedProduct[] = []
  try {
    products = await loadFeaturedProducts(locale)
  } catch {
    products = []
  }
  const pictured = products.filter((product) => product.image !== null)
  const image = pictured.length === 0 ? null : pictured[index % pictured.length]!.image
  if (image === null) return <Well className={className} />
  const ratio = printRatioOf(image)
  return (
    <PrintTile ratio={ratio} className={className}>
      <ResponsiveImage
        variant="fill"
        aspectRatio={printAspectOf(ratio)}
        src={image.url}
        srcSet={image.srcSet}
        alt=""
        sizes={sizes}
        unoptimized
      />
    </PrintTile>
  )
}
