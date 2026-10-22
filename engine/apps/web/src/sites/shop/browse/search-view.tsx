/**
 * The search page's results (the redesign of 2026-10-20): the breadcrumb, the words as the title
 * with the count raised beside it, then the same framed cards and grid as the listing. No category
 * tabs here: the search is over the whole shop. It renders inside the page's <Suspense>, so the
 * shell answers while the query runs.
 */
import type { SiteLocale } from '@engine/config/sites'
import { createHref, SITES } from '@engine/config/sites'

import type { ListingVM, ProductCardVM } from '../../../server/shop/catalogue/view-models'
import { shopShellText } from '../shell/shell-messages'
import { Crumb } from '../ui/crumb'
import { browseText } from './copy'
import styles from './browse.module.css'
import { ProductCard } from './product-card'

/** The phone's first row (two columns): its cards hold the listing's LCP candidates. */
const LEAD_CARDS = 2

export function SearchView({
  query,
  listing,
  locale,
  productHref,
}: {
  readonly query: string
  readonly listing: ListingVM
  readonly locale: SiteLocale
  /** A result's product page, built by the page (the route helper stays on the server). */
  readonly productHref: (product: ProductCardVM) => string
}): React.ReactElement {
  const text = browseText(locale)
  const shell = shopShellText(locale)
  return (
    <section className={styles.browse} aria-labelledby="search-title">
      <Crumb
        homeHref={createHref(SITES.shop)('home', {}, locale)}
        homeLabel={shell('shell.shop.home')}
        label={shell('shell.shop.breadcrumb')}
        steps={[{ label: text('search.title') }]}
      />
      <div className={`${styles.head} ${styles.searchHead}`}>
        <h1 id="search-title" className={styles.title}>
          “{query}”
          {listing.items.length > 0 && <sup className={styles.total}>({listing.total})</sup>}
        </h1>
      </div>
      {listing.items.length === 0 ? (
        <p className={styles.empty}>{text('search.empty', { query })}</p>
      ) : (
        <ul className={styles.grid}>
          {listing.items.map((product, index) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                locale={locale}
                href={productHref(product)}
                lead={index < LEAD_CARDS}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
