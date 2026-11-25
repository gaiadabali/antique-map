/**
 * The shop's left panel (the UI/UX revision of 2026-11-25, "like Tokopedia"): the five views in
 * the owner's order — Best sellers, Shop by theme, Shop by product type, Wall decor, Shop all —
 * the current one marked, and under Shop all, while it is the view, its Sort by branch. On a phone
 * (≤ 900 px) the views are one row that scrolls sideways and Sort by a second row under it
 * (`./shop-panel.module.css`). Every control is a link, so the shop works without JavaScript and
 * never prefetches, and each state has one address.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ListingSort } from '../../../server/shop/catalogue/queries'
import { sectionsText } from '../sections/copy'
import { SHOP_VIEWS, shopViewHref, type ShopView } from '../sections/links'
import { browseText } from './copy'
import styles from './shop-panel.module.css'

/** The sorts Shop all offers, in the order its branch lists them. */
export const SHOP_SORTS = [
  'featured',
  'newest',
  'priceAsc',
  'priceDesc',
] as const satisfies readonly ListingSort[]

type Props = {
  readonly locale: SiteLocale
  /** The view the page shows. */
  readonly view: ShopView
  /** `false` on a page inside a view (a theme's prints, a product type's): marked, not "this page". */
  readonly exact?: boolean
  /** Shop all's Sort by branch: the sort in force and each sort's address. */
  readonly sorts?: {
    readonly current: ListingSort
    readonly hrefOf: (sort: ListingSort) => string
  }
}

export function ShopPanel({ locale, view, exact = true, sorts }: Props): React.ReactElement {
  const t = sectionsText(locale)
  const text = browseText(locale)
  const labels: Record<ShopView, string> = {
    'best-sellers': t('shopBy.bestSellers'),
    themes: t('shopBy.themes'),
    'product-types': t('shopBy.productTypes'),
    'wall-decor': t('shopBy.wallDecor'),
    all: text('browse.title'),
  }
  return (
    <nav className={styles.panel} aria-label={t('shopBy.panel')}>
      <ul className={styles.views}>
        {SHOP_VIEWS.map((each) => (
          <li key={each}>
            <a
              href={shopViewHref(each, locale)}
              className={styles.view}
              aria-current={each === view ? (exact ? 'page' : 'true') : undefined}
            >
              {labels[each]}
            </a>
          </li>
        ))}
      </ul>
      {view === 'all' && sorts ? (
        <div className={styles.branch}>
          <p className={styles.branchTitle} id="shop-sort">
            {text('listing.sortBy')}
          </p>
          <ul className={styles.sorts} aria-labelledby="shop-sort">
            {SHOP_SORTS.map((sort) => (
              <li key={sort}>
                <a
                  href={sorts.hrefOf(sort)}
                  className={styles.sort}
                  aria-current={sorts.current === sort ? 'true' : undefined}
                >
                  {text(`sort.${sort}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  )
}
