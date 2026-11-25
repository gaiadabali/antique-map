/**
 * The shop's left panel (the UI/UX revision of 2026-11-25, "like Tokopedia"): the shop page's
 * sections in the owner's order — Best sellers, Shop by theme, Shop by product type, Wall decor —
 * then Shop all, whose Sort by branch opens under it while it is the section being read. On the
 * shop page the panel follows the sections as they scroll (`./shop-panel-nav`, a client island);
 * on a narrowed page it marks the section the page belongs under and leads back to it. On a phone
 * (≤ 900 px) it is one row that sticks under the header and scrolls sideways, and Sort by a second
 * row under it (`./shop-panel.module.css`). The words are resolved here, on the server.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ListingSort } from '../../../server/shop/catalogue/queries'
import { sectionsText } from '../sections/copy'
import {
  SECTION_ANCHORS,
  SHOP_SECTIONS,
  shopSectionHref,
  type ShopSection,
} from '../sections/links'
import { ShopPanelNav } from '../ui/lazy-islands'
import { browseText } from './copy'

/** The sorts Shop all offers, in the order its branch lists them. */
export const SHOP_SORTS = [
  'featured',
  'newest',
  'priceAsc',
  'priceDesc',
] as const satisfies readonly ListingSort[]

type Props = {
  readonly locale: SiteLocale
  /** The section marked at first: on the shop page the server's guess, elsewhere the page's. */
  readonly section: ShopSection
  /** The shop page itself: the links are its anchors, and the panel follows the scroll. */
  readonly onShopPage?: boolean
  /** Shop all's Sort by: the sort in force and each sort's address (the shop page only). */
  readonly sorts?: {
    readonly current: ListingSort
    readonly hrefOf: (sort: ListingSort) => string
  }
}

export function ShopPanel({ locale, section, onShopPage = false, sorts }: Props) {
  const t = sectionsText(locale)
  const text = browseText(locale)
  const labels: Record<ShopSection, string> = {
    'best-sellers': t('shopBy.bestSellers'),
    themes: t('shopBy.themes'),
    'product-types': t('shopBy.productTypes'),
    'wall-decor': t('shopBy.wallDecor'),
    all: text('browse.title'),
  }
  return (
    <ShopPanelNav
      label={t('shopBy.panel')}
      items={SHOP_SECTIONS.map((each) => ({
        key: each,
        anchor: SECTION_ANCHORS[each],
        href: onShopPage ? `#${SECTION_ANCHORS[each]}` : shopSectionHref(each, locale),
        label: labels[each],
      }))}
      current={section}
      follow={onShopPage}
      branchOf="all"
      {...(sorts
        ? {
            sorts: {
              title: text('listing.sortBy'),
              current: sorts.current,
              items: SHOP_SORTS.map((sort) => ({
                key: sort,
                href: sorts.hrefOf(sort),
                label: text(`sort.${sort}`),
              })),
            },
          }
        : {})}
    />
  )
}
