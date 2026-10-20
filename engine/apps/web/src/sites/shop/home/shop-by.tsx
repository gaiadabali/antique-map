/**
 * The shop home's "Shop by" (the redesign of 2026-10-20): the shop's real collections as a rail of
 * framed cards, each one link to its collection, with "See the gallery walls" under it. The read is
 * `collections()` (published-only, projected, cached), streamed inside `<Suspense>` so the build
 * never touches a database; on an error or with no collection the section is left out. Every word
 * is the home's lexicon or the collections' own copy.
 */
import { Suspense } from 'react'

import { createHref, SITES } from '@engine/config/sites'

import { collections } from '../../../server/shop/catalogue/collections'
import type { CollectionVM } from '../../../server/shop/catalogue/collections-of'
import { ResponsiveImage, printAspectOf, printRatioOf } from '../../../shared/ui'
import { collectionsText } from '../collections/copy'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { CapsLink } from '../ui/caps-link'
import { Rail } from '../ui/rail'
import { RailSkeleton } from '../ui/rail-skeleton'
import { ShopCard } from '../ui/shop-card'
import type { HomeText } from './home-messages'

type Props = {
  readonly locale: 'en' | 'id'
  readonly t: HomeText
  /** The collections index (`href('collection', {}, locale)`), reached from the link under it. */
  readonly allHref: string
}

export function ShopBy(props: Props) {
  return (
    <Suspense fallback={<RailSkeleton title={props.t('home.shop.chipsEyebrow')} />}>
      <Tiles {...props} />
    </Suspense>
  )
}

async function Tiles({ locale, t, allHref }: Props) {
  let list: readonly CollectionVM[] = []
  try {
    list = await collections()
  } catch {
    list = []
  }
  if (list.length === 0) return null
  const text = collectionsText(locale)
  const words = productText(locale)
  const href = createHref(SITES.shop)
  return (
    <Rail
      id="home-shop-by"
      title={t('home.shop.chipsEyebrow')}
      previousLabel={t('home.shop.railPrevious')}
      nextLabel={t('home.shop.railNext')}
      more={<CapsLink href={allHref}>{t('home.shop.setsCta')}</CapsLink>}
    >
      {list.map((collection) => {
        const ratio = printRatioOf(collection.image)
        return (
          <ShopCard
            key={collection.slug}
            href={href('collection', { slug: collection.slug }, locale)}
            ratio={ratio}
            title={collection.label}
            aside={text('collections.count', { count: collection.count })}
            picture={
              collection.image ? (
                <ResponsiveImage
                  variant="fill"
                  aspectRatio={printAspectOf(ratio)}
                  src={collection.image.url}
                  srcSet={collection.image.srcSet}
                  alt={imageAlt(words, collection.image)}
                  sizes="(max-width: 56.25rem) 45vw, 24vw"
                  unoptimized
                />
              ) : null
            }
          />
        )
      })}
    </Rail>
  )
}
