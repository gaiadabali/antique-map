/**
 * The client-preview seed (the admin's "Client preview" button): sample content that makes a
 * staging shop look like the local preview the client reviews. The shop's built-in Home and
 * Partnership pages are the caller's first step (`@engine/storefront`'s page seed, which only the
 * app reaches); this runs everything after, in order:
 *
 * 1. the storefront vocabulary of 28.1 (`../vocabulary/storefront`: the four themes, published,
 *    and the promotions' words), and the newsletter pop-up on with the preview's WhatsApp;
 * 2. product types and themes, then exactly seven best sellers (`./catalogue`);
 * 3. store regions and the two flagships (`./stores`);
 * 4. the Map of Bali Island 1724's four sizes and their stock (`./sizes`);
 * 5. two articles with their PDFs (`./articles`).
 *
 * It overwrites these sample fields wherever they differ and touches nothing else; a second run
 * finds everything in place and writes nothing. Only the shop's records: the gallery's are never
 * read. Never on the live site — the caller (the admin's seed runner) refuses production.
 */
import type { Payload, RequestContext } from 'payload'

import { reqOf } from '../req'
import { renderStorefront, seedStorefront } from '../vocabulary/storefront'
import { seedArticles } from './articles'
import { seedBestSellers, seedProductTypes } from './catalogue'
import { seedSizes } from './sizes'
import { seedPreviewSettings, seedStoreRegions } from './stores'
import type { Step } from './shared'

export { PREVIEW_ARTICLES } from './articles'
export { BEST_SELLER_COUNT, BEST_SELLER_FIRST, PRINTS, SUBJECT_CATEGORIES } from './catalogue'
export { SIZES, SIZED_PRODUCT } from './sizes'
export { PREVIEW_WHATSAPP, regionOf } from './stores'

/** The run's report, one line per step. */
export async function seedClientPreview(
  payload: Payload,
  options: { readonly context: RequestContext },
): Promise<string[]> {
  const step: Step = { payload, context: options.context }
  const lines: string[] = []
  const storefront = await seedStorefront(payload, reqOf(payload, 'en', options.context), {
    publish: true,
  })
  lines.push(renderStorefront(storefront))
  const settings = await seedPreviewSettings(step)
  lines.push(`settings: newsletter pop-up and WhatsApp ${settings ? 'set' : 'already set'}`)
  const types = await seedProductTypes(step)
  lines.push(
    `product types: ${types.moved} moved to Mounted Art Prints, ${types.themed} given themes,` +
      ` ${types.subjectsDrafted} subject categories set to draft`,
  )
  const best = await seedBestSellers(step)
  lines.push(`best sellers: ${best.count} (${best.changed} changed)`)
  const stores = await seedStoreRegions(step)
  lines.push(
    `stores: ${stores.stores} read, ${stores.changed} changed, ${stores.flagships} flagships`,
  )
  const sizes = await seedSizes(step)
  lines.push(
    sizes.product
      ? `map of bali 1724: sizes ${sizes.variantsWritten ? 'written' : 'already set'},` +
          ` ${sizes.stockAdded} stock rows added`
      : 'map of bali 1724: not on record, skipped',
  )
  const articles = await seedArticles(step)
  lines.push(`articles: ${articles.created} created, ${articles.present} present`)
  return lines
}
