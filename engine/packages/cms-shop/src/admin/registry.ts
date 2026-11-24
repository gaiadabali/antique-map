/**
 * The shop admin's custom views (`admin.components.views`), each entry kept beside its code (an
 * entry holds no React: the config never loads a view): the orders inbox and page, the stock import
 * and the stock matrix, the add-staff screen and Today. Today's one CMS lists the same entries
 * among its own (`@engine/cms/registries`).
 */
import type { RegistryEntry } from '@engine/cms-core/registries/entries'
import type { AdminViewConfig } from 'payload'

import { ordersViewEntries } from './orders/entry'
import { staffViewEntries } from './staff/entry'
import { stockImportViewEntries } from './stock-import/entry'
import { stockMatrixViewEntries } from './stock-matrix/entry'
import { todayViewEntries } from './today/entry'

export {
  ordersViewEntries,
  staffViewEntries,
  stockImportViewEntries,
  stockMatrixViewEntries,
  todayViewEntries,
}

export const SHOP_ADMIN_VIEWS: readonly RegistryEntry<AdminViewConfig>[] = [
  ...ordersViewEntries, // the orders inbox and page (TASKS.md 27.3)
  ...stockImportViewEntries, // the owner's import screen (TASKS.md 10.8.a, 27.4.c)
  ...stockMatrixViewEntries, // the stock matrix (TASKS.md 27.4.b)
  ...staffViewEntries, // the owner's quick add-staff screen (TASKS.md 27.6.c)
  ...todayViewEntries, // the shop's Today numbers (TASKS.md 27.6.a)
]
