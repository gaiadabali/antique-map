/**
 * The collections index (the redesign of 2026-10-20, the handoff's `Collections`): the listing's
 * breadcrumb and head, then one framed card per category — its lead print at its own shape, its
 * name and its count — four to a row, two on a phone. Each is a plain link (a storefront link never
 * prefetches) to the category's listing. It wears the browse listing's layout.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { CollectionVM } from '../../../server/shop/catalogue/collections-of'
import { ResponsiveImage, printAspectOf, printRatioOf } from '../../../shared/ui'
import styles from '../browse/browse.module.css'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { shopShellText } from '../shell/shell-messages'
import { Crumb } from '../ui/crumb'
import { ShopCard } from '../ui/shop-card'
import { collectionsText } from './copy'

export function CollectionsView({
  collections,
  locale,
}: {
  readonly collections: readonly CollectionVM[]
  readonly locale: SiteLocale
}): React.ReactElement {
  const text = collectionsText(locale)
  const words = productText(locale)
  const shell = shopShellText(locale)
  const href = createHref(SITES.shop)
  return (
    <section className={styles.browse} aria-labelledby="collections-title">
      <Crumb
        homeHref={href('home', {}, locale)}
        homeLabel={shell('shell.shop.home')}
        label={shell('shell.shop.breadcrumb')}
        steps={[{ label: text('collections.title') }]}
      />
      <div className={styles.head}>
        <h1 id="collections-title" className={styles.title}>
          {text('collections.title')}
        </h1>
        <p className={styles.description}>{text('collections.lede')}</p>
      </div>
      {collections.length === 0 ? (
        <p className={styles.empty}>{text('collections.empty')}</p>
      ) : (
        <ul className={styles.grid}>
          {collections.map((collection, index) => {
            const ratio = printRatioOf(collection.image)
            return (
              <li key={collection.slug}>
                <ShopCard
                  as="h2"
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
                        sizes="(max-width: 56.25rem) 47vw, 24vw"
                        priority={index === 0}
                        unoptimized
                      />
                    ) : null
                  }
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
