/**
 * The shop's categories (DATA.md §1): the products sheet's `category` column matches them, and the
 * catalogue's six (`../catalogue/naming`) are among them. One committed file, read by a
 * `new URL()` a bundler follows (the admin's seed screen runs this inside the built server).
 */
import { readFileSync } from 'node:fs'

import type { CategorySeed } from './category'

const CATEGORIES_FILE = new URL('./data/categories.json', import.meta.url)

export function categorySeeds(): readonly CategorySeed[] {
  return (JSON.parse(readFileSync(CATEGORIES_FILE, 'utf8')) as { categories: CategorySeed[] })
    .categories
}
