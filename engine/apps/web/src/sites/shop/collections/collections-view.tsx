/**
 * The collections index (13.1): a grid of matted lead pictures, one per category, each a plain
 * link (a storefront link never prefetches) to the category's listing.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { CollectionVM } from '../../../server/shop/catalogue/collections-of'
import { Mat, MatNote, ResponsiveImage, SectionHead } from '../../../shared/ui'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { collectionsText } from './copy'
import styles from './collections.module.css'

export function CollectionsView({
  collections,
  locale,
}: {
  readonly collections: readonly CollectionVM[]
  readonly locale: SiteLocale
}): React.ReactElement {
  const text = collectionsText(locale)
  const words = productText(locale)
  const href = createHref(SITES.shop)
  return (
    <section className={styles.page} aria-labelledby="collections-title">
      <SectionHead
        level={1}
        id="collections-title"
        eyebrow={text('collections.eyebrow')}
        title={text('collections.title')}
        lede={text('collections.lede')}
      />
      {collections.length === 0 ? (
        <p className={styles.empty}>{text('collections.empty')}</p>
      ) : (
        <ul className={styles.grid}>
          {collections.map((collection, index) => (
            <li key={collection.slug}>
              <a
                href={href('collection', { slug: collection.slug }, locale)}
                className={styles.card}
              >
                {collection.image ? (
                  <Mat>
                    <ResponsiveImage
                      variant="fill"
                      aspectRatio="4 / 5"
                      src={collection.image.url}
                      srcSet={collection.image.srcSet}
                      alt={imageAlt(words, collection.image)}
                      sizes="(min-width: 1024px) 26vw, (min-width: 768px) 45vw, 90vw"
                      priority={index === 0}
                      unoptimized
                    />
                  </Mat>
                ) : (
                  <Mat ratio={4 / 5}>
                    <MatNote>{text('collections.noPicture')}</MatNote>
                  </Mat>
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
      )}
    </section>
  )
}
