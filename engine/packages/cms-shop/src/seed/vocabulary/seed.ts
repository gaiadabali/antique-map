/**
 * The shop's vocabulary layer (DATA.md §2, PLAN-V2 §4.4): what the shop's own database starts on —
 * its product categories (`./categories`, matched by English name, Indonesian beside it) and the
 * `site-settings` shop group's defaults (`./settings`), Indonesian product-page words included,
 * then the themes and the promotions' words (`./storefront`).
 * The gallery's places, makers and terms have no home here (`@engine/cms`'s vocabulary seeds them
 * into today's one database).
 *
 * **Seeded once**: a second run creates nothing and overwrites nothing — a category or setting a
 * person has edited in the admin is theirs. With `publish`, the categories still in draft are
 * published (`./publish`), and nothing else about them changes.
 *
 * Every write's request carries the caller's cache collector (the CLI's, posted once the run
 * returns), or with none a batch of its own that posts nothing.
 */
import { invalidationBatch } from '@engine/cache'
import type { Payload, RequestContext } from 'payload'

import { reqOf } from '../req'
import { ensureCategory } from './category'
import { categorySeeds } from './categories'
import { publishVocabulary } from './publish'
import { SHOP_SETTINGS_DEFAULTS, SHOP_SETTINGS_DEFAULTS_ID } from './settings'
import { renderStorefront, seedStorefront, type StorefrontReport } from './storefront'

export type ShopVocabularyReport = {
  categories: { created: number; present: number }
  siteSettings: 'seeded' | 'present'
  /** The themes and the promotions' words (`./storefront`, TASKS.md 28.1). */
  storefront?: StorefrontReport
  /** With `publish`: the categories this run moved from draft to published, and any held. */
  published?: { categories: number; held: string[] }
}

export async function seedShopVocabulary(
  payload: Payload,
  context?: RequestContext,
  options: { publish?: boolean } = {},
): Promise<ShopVocabularyReport> {
  const req = reqOf(payload, 'en', context ?? invalidationBatch().context())
  const report: ShopVocabularyReport = {
    categories: { created: 0, present: 0 },
    siteSettings: 'present',
  }
  const ids: number[] = []
  for (const [position, seed] of categorySeeds().entries()) {
    const category = await ensureCategory(payload, req, seed, position)
    if (category.created) report.categories.created += 1
    else report.categories.present += 1
    ids.push(category.id)
  }

  const settings = (await payload.findGlobal({ slug: 'site-settings', req })) as unknown as {
    updatedAt?: string
  }
  if (settings?.updatedAt === undefined) {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { shop: SHOP_SETTINGS_DEFAULTS } as never,
      req,
    })
    await payload.updateGlobal({
      slug: 'site-settings',
      locale: 'id',
      data: { shop: SHOP_SETTINGS_DEFAULTS_ID } as never,
      req: reqOf(payload, 'id', req.context),
    })
    report.siteSettings = 'seeded'
  }
  report.storefront = await seedStorefront(payload, req, options)

  if (options.publish) {
    const published = await publishVocabulary(payload, req, {
      places: [],
      terms: [],
      makers: [],
      categories: ids,
    })
    report.published = { categories: published.categories, held: published.held }
  }
  return report
}

/** One line for the CLI's report. */
export function renderShopVocabulary(report: ShopVocabularyReport): string[] {
  const lines = [
    `vocabulary: categories ${report.categories.created} created / ` +
      `${report.categories.present} present, site-settings ${report.siteSettings}`,
    ...(report.storefront ? [renderStorefront(report.storefront)] : []),
  ]
  if (report.published) {
    lines.push(
      `vocabulary published: categories ${report.published.categories}, ` +
        `held ${report.published.held.length}`,
      ...report.published.held.map((line) => `  held: ${line}`),
    )
  }
  return lines
}
