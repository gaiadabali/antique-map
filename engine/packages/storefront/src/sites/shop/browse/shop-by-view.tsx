/**
 * Shop by theme and Shop by product type on the shop page (TASKS.md 28.2; the UI/UX revision of
 * 2026-11-25): inside the shop's frame, beside the left panel, the themes' or the product types'
 * framed cards, three to a row (two on a phone). A theme leads to the shop narrowed to it, a
 * product type to its category page; both keep the panel, the view marked. The reads are the
 * page's (`pages/browse`), published-only and projected; an empty one says so.
 */
import type { ReactNode } from 'react'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'
import { printAspectOf, printRatioOf } from '@engine/ui/print-tile'
import { ResponsiveImage } from '@engine/ui/responsive-image'

import type { CatalogueImage } from '../../../server/shop/catalogue/view-models'
import { collectionsText } from '../collections/copy'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { sectionsText } from '../sections/copy'
import { shopFilterHref } from '../sections/links'
import { ShopCard } from '../ui/shop-card'
import { browseText } from './copy'
import styles from './browse.module.css'
import { ShopFrame } from './shop-frame'
import { ShopPanel } from './shop-panel'

/** A theme or a product type as its card needs it. */
export type ShopByCard = {
  readonly slug: string
  readonly label: string
  readonly image: CatalogueImage | null
  /** A product type's count of prints; a theme has none. */
  readonly count?: number
}

type Props = {
  readonly locale: SiteLocale
  readonly view: 'themes' | 'product-types'
  readonly cards: readonly ShopByCard[]
  readonly banner?: ReactNode
}

function Picture({ image, locale }: { image: CatalogueImage | null; locale: SiteLocale }) {
  if (image === null) return null
  return (
    <ResponsiveImage
      variant="fill"
      aspectRatio={printAspectOf(printRatioOf(image))}
      src={image.url}
      srcSet={image.srcSet}
      alt={imageAlt(productText(locale), image)}
      sizes="(max-width: 56.25rem) 45vw, 24vw"
      unoptimized
    />
  )
}

export function ShopByView({ locale, view, cards, banner }: Props): React.ReactElement {
  const t = sectionsText(locale)
  const count = collectionsText(locale)
  const href = createHref(SITES.shop)
  const hrefOf = (card: ShopByCard) =>
    view === 'themes'
      ? shopFilterHref({ kind: 'theme', slug: card.slug }, locale)
      : href('collection', { slug: card.slug }, locale)
  return (
    <ShopFrame
      locale={locale}
      panel={<ShopPanel locale={locale} view={view} />}
      title={view === 'themes' ? t('shopBy.themes') : t('shopBy.productTypes')}
      banner={banner}
    >
      {cards.length === 0 ? (
        <p className={styles.empty}>{browseText(locale)('browse.empty')}</p>
      ) : (
        <ul className={`${styles.grid} ${styles.gridBeside}`}>
          {cards.map((card) => (
            <li key={card.slug}>
              <ShopCard
                href={hrefOf(card)}
                ratio={printRatioOf(card.image)}
                title={card.label}
                {...(card.count !== undefined
                  ? { aside: count('collections.count', { count: card.count }) }
                  : {})}
                picture={<Picture image={card.image} locale={locale} />}
              />
            </li>
          ))}
        </ul>
      )}
    </ShopFrame>
  )
}
