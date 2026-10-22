/**
 * The collections index's shaping (13.1), free of the cache and the database so a test can drive
 * it: each category's count and lead picture come from `lookup`; a category with no product is
 * left out, and the order is the categories' own (label order).
 */
import type { CatalogueImage, CategoryVM } from './view-models'

/** A category as the index shows it: no price, ever. */
export type CollectionVM = {
  readonly slug: string
  readonly label: string
  readonly count: number
  readonly image: CatalogueImage | null
}

export async function collectionsOf(
  categories: readonly CategoryVM[],
  lookup: (category: CategoryVM) => Promise<{ count: number; image: CatalogueImage | null }>,
): Promise<readonly CollectionVM[]> {
  const found = await Promise.all(
    categories.map(async (category) => ({ category, ...(await lookup(category)) })),
  )
  return found
    .filter((each) => each.count > 0)
    .map(({ category, count, image }) => ({
      slug: category.slug,
      label: category.label,
      count,
      image,
    }))
}
