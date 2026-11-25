/**
 * The shop page's sections (TASKS.md 28.2; the UI/UX revision of 2026-11-25): beside the left
 * panel, every section in the owner's order — Best sellers and Wall decor two rows of products
 * with "See all", Shop by theme and Shop by product type their cards, then Shop all with its pages
 * — each under its own title and count, at the anchor the panel follows (`SECTION_ANCHORS`). The
 * reads are the page's (`pages/browse`), published-only and projected; an empty one says so.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'
import { Pagination } from '@engine/ui/pagination'
import { printAspectOf, printRatioOf } from '@engine/ui/print-tile'
import { ResponsiveImage } from '@engine/ui/responsive-image'

import type { ListingSort } from '../../../server/shop/catalogue/queries'
import type { CatalogueImage, ListingVM } from '../../../server/shop/catalogue/view-models'
import { collectionsText } from '../collections/copy'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { sectionsText } from '../sections/copy'
import { SECTION_ANCHORS, shopFilterHref, type ShopSection } from '../sections/links'
import { CapsLink } from '../ui/caps-link'
import { ShopCard } from '../ui/shop-card'
import { browseText } from './copy'
import styles from './browse.module.css'
import { ProductCard } from './product-card'
import frame from './shop-panel.module.css'

/** How many products Best sellers and Wall decor show before "See all": two rows of three. */
export const SECTION_PRODUCTS = 6

/** A theme or a product type as its card needs it. */
export type ShopByCard = {
  readonly slug: string
  readonly label: string
  readonly image: CatalogueImage | null
  /** A product type's count of prints; a theme has none. */
  readonly count?: number
}

export type ShopSectionsData = {
  readonly bestSellers: ListingVM | null
  readonly themes: readonly ShopByCard[]
  readonly productTypes: readonly ShopByCard[]
  readonly wallDecor: ListingVM | null
  readonly all: ListingVM
  /** Shop all's address at a sort and a page, landing on its section. */
  readonly allHref: (sort: ListingSort, page?: number) => string
}

type Locale = { readonly locale: SiteLocale }

function Section({
  section,
  title,
  count,
  description,
  more,
  branch = false,
  children,
}: {
  readonly section: ShopSection
  /** Shop all: the section a phone's Sort by row opens over, which it lands below. */
  readonly branch?: boolean
  readonly title: string
  readonly count?: string
  readonly description?: string
  readonly more?: React.ReactNode
  readonly children: React.ReactNode
}) {
  const anchor = SECTION_ANCHORS[section]
  return (
    <section
      id={anchor}
      className={branch ? `${frame.section} ${frame.sectionBranch}` : frame.section}
      aria-labelledby={`${anchor}-title`}
    >
      <div className={frame.sectionHead}>
        <h2 id={`${anchor}-title`} className={styles.title}>
          {title}
        </h2>
        {count ? <span className={frame.sectionCount}>{count}</span> : null}
      </div>
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
      {more ? <div className={frame.more}>{more}</div> : null}
    </section>
  )
}

function Products({ list, locale, lead = 0 }: { list: ListingVM; lead?: number } & Locale) {
  if (list.items.length === 0)
    return <p className={styles.empty}>{browseText(locale)('browse.empty')}</p>
  const href = createHref(SITES.shop)
  return (
    <ul className={`${styles.grid} ${styles.gridBeside}`}>
      {list.items.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            locale={locale}
            href={href('product', { slug: product.slug }, locale)}
            lead={index < lead}
          />
        </li>
      ))}
    </ul>
  )
}

function Picture({ image, locale }: { image: CatalogueImage | null } & Locale) {
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

function Cards({
  cards,
  hrefOf,
  locale,
}: {
  cards: readonly ShopByCard[]
  hrefOf: (card: ShopByCard) => string
} & Locale) {
  if (cards.length === 0)
    return <p className={styles.empty}>{browseText(locale)('browse.empty')}</p>
  const count = collectionsText(locale)
  return (
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
  )
}

function SeeAll({ href, name, locale }: { href: string; name: string } & Locale) {
  const t = sectionsText(locale)
  return (
    <CapsLink href={href} aria-label={t('shopBy.seeAllOf', { name })}>
      {t('shopBy.seeAll')}
    </CapsLink>
  )
}

export function ShopSections({ locale, data }: Locale & { readonly data: ShopSectionsData }) {
  const t = sectionsText(locale)
  const text = browseText(locale)
  const count = collectionsText(locale)
  const href = createHref(SITES.shop)
  const prints = (list: ListingVM | null) =>
    list ? count('collections.count', { count: list.total }) : undefined
  const { all } = data
  return (
    <>
      <Section
        section="best-sellers"
        title={t('shopBy.bestSellers')}
        count={prints(data.bestSellers)}
        more={
          <SeeAll
            href={shopFilterHref({ kind: 'set', set: 'best-sellers' }, locale)}
            name={t('shopBy.bestSellers')}
            locale={locale}
          />
        }
      >
        {data.bestSellers ? (
          <Products list={data.bestSellers} locale={locale} lead={2} />
        ) : (
          <p className={styles.empty}>{text('browse.empty')}</p>
        )}
      </Section>
      <Section section="themes" title={t('shopBy.themes')}>
        <Cards
          cards={data.themes}
          hrefOf={(card) => shopFilterHref({ kind: 'theme', slug: card.slug }, locale)}
          locale={locale}
        />
      </Section>
      <Section
        section="product-types"
        title={t('shopBy.productTypes')}
        more={
          <SeeAll
            href={href('collection', {}, locale)}
            name={t('shopBy.productTypes')}
            locale={locale}
          />
        }
      >
        <Cards
          cards={data.productTypes}
          hrefOf={(card) => href('collection', { slug: card.slug }, locale)}
          locale={locale}
        />
      </Section>
      <Section
        section="wall-decor"
        title={t('shopBy.wallDecor')}
        count={prints(data.wallDecor)}
        more={
          <SeeAll
            href={shopFilterHref({ kind: 'set', set: 'wall-decor' }, locale)}
            name={t('shopBy.wallDecor')}
            locale={locale}
          />
        }
      >
        {data.wallDecor ? (
          <Products list={data.wallDecor} locale={locale} />
        ) : (
          <p className={styles.empty}>{text('browse.empty')}</p>
        )}
      </Section>
      <Section
        section="all"
        branch
        title={text('browse.title')}
        count={prints(all)}
        description={text('browse.description')}
      >
        <Products list={all} locale={locale} />
        {all.pages > 1 && (
          <div className={styles.pager}>
            <Pagination
              currentPage={all.page}
              totalPages={all.pages}
              getHref={(page) => data.allHref(all.sort, page)}
              ariaLabel={text('listing.pagination')}
              previousLabel={text('listing.previous')}
              nextLabel={text('listing.next')}
              variant="boxed"
            />
          </div>
        )}
        {all.items.length > 0 ? (
          <p className={styles.count}>{text('browse.results', { count: all.total })}</p>
        ) : null}
      </Section>
    </>
  )
}
