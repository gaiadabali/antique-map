/**
 * A shop page's sections as the CMS holds them (TASKS.md 27.5.b): the published page at that
 * address — or, for a signed-in owner or editor previewing in draft mode, its latest draft
 * (`server/shop/pages/preview`). There are no built-in words behind it: a page the CMS does not
 * publish is `null`, and its route shows an honest empty state or a 404. What the admin shows is
 * what the site shows.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ShopPageVM } from '../../../server/shop/pages/blocks'
import { loadShopPage, loadShopPageDraft } from '../../../server/shop/pages/load-page'
import { previewReader } from '../../../server/shop/pages/preview'

export type ShopPageRead = {
  /** The page, or `null` when the CMS holds none at this address with a section. */
  readonly page: ShopPageVM | null
  /** True when this is a staff member's draft preview. */
  readonly preview: boolean
}

/** The shop page at `slug` for this request: the published one, or a staff member's draft. */
export async function readShopPage(slug: string, locale: SiteLocale): Promise<ShopPageRead> {
  const reader = await previewReader()
  const page =
    reader === null
      ? await loadShopPage(slug, locale)
      : await loadShopPageDraft(slug, locale, reader)
  return { page: page !== null && page.blocks.length > 0 ? page : null, preview: reader !== null }
}

/** A page's first words, for a description the editor left empty. */
export function firstWords(page: ShopPageVM): string | null {
  for (const block of page.blocks) {
    if (block.type === 'text' || block.type === 'imageText') return block.paragraphs[0] ?? null
    if ('lede' in block && block.lede) return block.lede
    if ('body' in block && typeof block.body === 'string' && block.body) return block.body
  }
  return null
}

/** A page's first picture, for a sharing picture the editor left empty. */
export function firstPicture(page: ShopPageVM) {
  for (const block of page.blocks) {
    if (block.type === 'imageText' && block.image) return block.image
    if (block.type === 'homeHero' && block.image) return block.image
  }
  return null
}
