/**
 * A built-in shop page's sections: the CMS's published page at that address when there is one with
 * at least one section, else the page's built-in sections from the lexicon (`./defaults`). A read
 * that fails draws the built-in page too — the home never answers an error because the CMS is down.
 */
import type { SiteLocale } from '@engine/config/sites'

import { loadShopPage } from '../../../server/shop/pages/load-page'
import type { CatalogueImage } from '../../../server/shop/catalogue/view-models'
import type { ShopBlockVM } from '../../../server/shop/pages/blocks'

export type PageBlocks = {
  readonly blocks: readonly ShopBlockVM[]
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly seoImage: CatalogueImage | null
}

export async function pageBlocks(
  slug: 'home' | 'partnership' | 'stores',
  locale: SiteLocale,
  defaults: () => readonly ShopBlockVM[],
): Promise<PageBlocks> {
  try {
    const page = await loadShopPage(slug, locale)
    if (page !== null && page.blocks.length > 0) {
      return {
        blocks: page.blocks,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        seoImage: page.seoImage,
      }
    }
  } catch {
    // The built-in page below.
  }
  return { blocks: defaults(), seoTitle: null, seoDescription: null, seoImage: null }
}
