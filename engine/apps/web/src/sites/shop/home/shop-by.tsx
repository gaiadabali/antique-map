/**
 * The shop home's "Shop by" (Cobalt): the shop's real collections as picture tiles, each one link
 * to its collection. The read is `collections()` (published-only, projected, cached), streamed
 * inside `<Suspense>` so the build never touches a database; on an error or with no collection the
 * section is left out. A phone gets one rail that bleeds to both edges and snaps tile by tile
 * (the next tile peeks); a desktop gets one whole row (4, or 6 on a wide screen) and the head's
 * link reaches the rest. Every word is the home's lexicon or the collections' own copy.
 */
import { Suspense } from 'react'

import { createHref, SITES } from '@engine/config/sites'

import { collections } from '../../../server/shop/catalogue/collections'
import type { CollectionVM } from '../../../server/shop/catalogue/collections-of'
import {
  Button,
  PrintTile,
  PrintTileNote,
  ResponsiveImage,
  SectionHead,
  Skeleton,
  printAspectOf,
  printRatioOf,
} from '../../../shared/ui'
import { collectionsText } from '../collections/copy'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import type { HomeText } from './home-messages'
import styles from './shop-by.module.css'

type Props = {
  readonly locale: 'en' | 'id'
  readonly t: HomeText
  /** The collections index (`href('collection', {}, locale)`), reached from the head's link. */
  readonly allHref: string
}

export function ShopBy({ locale, t, allHref }: Props) {
  return (
    <section className={styles.section} aria-labelledby="home-shop-by">
      <SectionHead
        id="home-shop-by"
        className={styles.head}
        title={t('home.shop.chipsEyebrow')}
        action={
          <Button variant="quiet" className={styles.headLink} href={allHref}>
            {t('home.shop.setsCta')}
          </Button>
        }
      />
      <Suspense fallback={<TilesSkeleton />}>
        <Tiles locale={locale} />
      </Suspense>
    </section>
  )
}

function TilesSkeleton() {
  return (
    <ul className={styles.rail} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((at) => (
        <li key={at} className={styles.item}>
          <PrintTile>
            <Skeleton width="100%" height="100%" />
          </PrintTile>
          <span className={styles.caption}>
            <Skeleton width="70%" height="1.25rem" />
            <Skeleton width="40%" height="1rem" />
          </span>
        </li>
      ))}
    </ul>
  )
}

async function Tiles({ locale }: { readonly locale: 'en' | 'id' }) {
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
    <ul className={styles.rail}>
      {list.map((collection) => (
        <li key={collection.slug} className={styles.item}>
          <a href={href('collection', { slug: collection.slug }, locale)} className={styles.link}>
            {collection.image ? (
              <PrintTile ratio={printRatioOf(collection.image)}>
                <ResponsiveImage
                  variant="fill"
                  aspectRatio={printAspectOf(printRatioOf(collection.image))}
                  src={collection.image.url}
                  srcSet={collection.image.srcSet}
                  alt={imageAlt(words, collection.image)}
                  sizes="(min-width: 90rem) 15vw, (min-width: 48rem) 22vw, 44vw"
                  unoptimized
                />
              </PrintTile>
            ) : (
              <PrintTile>
                <PrintTileNote>{collection.label}</PrintTileNote>
              </PrintTile>
            )}
            <span className={styles.caption}>
              <span className={styles.name}>{collection.label}</span>
              <span className={styles.count}>
                {text('collections.count', { count: collection.count })}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
