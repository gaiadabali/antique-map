/**
 * The landing page's order (TASKS.md 28.2; the owner's feedback of 2026-11-19): the hero, the
 * same-day promise, Shop by, Wall Decor, How We Make Them, Our Latest Articles, Partnerships,
 * Stores, and the Antiques at the bottom. The CMS's `home` page holds the hero, Shop by (the
 * category rail), How We Make Them (the steps), Partnerships (the story) and the Antiques (the
 * originals) in the order its editor set; the four sections that are not blocks — the promise,
 * Wall Decor, the articles and the stores — are placed beside the blocks they follow, and the
 * Antiques always end the page. Pure, so a test reads the order without a database.
 */
import type { ShopBlockVM } from '../../../server/shop/pages/blocks'

export type BuiltInSection = 'promo' | 'wallDecor' | 'articles' | 'stores'

export type HomeItem =
  { readonly kind: 'block'; readonly block: ShopBlockVM } | { readonly kind: BuiltInSection }

const block = (each: ShopBlockVM): HomeItem => ({ kind: 'block', block: each })

/** Inserts `section` after the first block of `type`, or else before the first of `before`. */
function place(
  items: HomeItem[],
  section: BuiltInSection,
  after: ShopBlockVM['type'],
  before: readonly ShopBlockVM['type'][],
): void {
  const is = (item: HomeItem, type: ShopBlockVM['type']) =>
    item.kind === 'block' && item.block.type === type
  const at = items.findIndex((item) => is(item, after))
  if (at >= 0) {
    items.splice(at + 1, 0, { kind: section })
    return
  }
  const next = items.findIndex((item) => before.some((type) => is(item, type)))
  items.splice(next >= 0 ? next : items.length, 0, { kind: section })
}

export function homeOrder(blocks: readonly ShopBlockVM[]): readonly HomeItem[] {
  const last = blocks.filter((each) => each.type === 'originals').map(block)
  const items = blocks.filter((each) => each.type !== 'originals').map(block)
  // The promise straight under the hero (or first, without one).
  const hero = items.findIndex((item) => item.kind === 'block' && item.block.type === 'homeHero')
  items.splice(hero + 1, 0, { kind: 'promo' })
  place(items, 'wallDecor', 'categoryRail', ['productRail', 'steps', 'story'])
  place(items, 'articles', 'steps', ['story'])
  place(items, 'stores', 'story', [])
  return [...items, ...last]
}
