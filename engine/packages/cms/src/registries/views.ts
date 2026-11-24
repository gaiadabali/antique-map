/**
 * The admin views registry (PARALLEL-TRACKS.md §1). ADM owns `engine/packages/cms/src/admin/**`
 * and exports its custom views' components from one barrel, `@engine/cms/admin/views`; this file
 * lists each view's entry (kept beside its code) for `admin.components.views`. The owner's
 * dashboard is the first.
 *
 * A view is referenced by a component path the import map resolves (`@engine/cms/admin/…#Name`
 * — a package specifier, never a path relative to one app), so both apps' generated
 * `importMap.js` come out identical. A component missing from the import map renders as nothing
 * with no error (KOI), which is why CI regenerates both maps and fails on a diff (TASKS.md 2.2.g).
 */
import type { AdminViewConfig } from 'payload'

import { dashboardViewEntries } from '../admin/dashboard/entry'
import { leadsViewEntries } from '../admin/leads/entry'
import { seedsViewEntries } from '../admin/seeds/entry'
import { wallViewEntries } from '../admin/wall/entry'
import {
  ordersViewEntries,
  staffViewEntries,
  stockImportViewEntries,
  stockMatrixViewEntries,
  todayViewEntries,
} from '@engine/cms-shop/admin/registry'

import { uniqueEntries, type RegistryEntry } from '@engine/cms-core/registries/entries'

// One line per view, its entry kept beside its code (an entry holds no React: the config never
// loads a view). The components are exported from the barrel `@engine/cms/admin/views`, which the
// import map resolves.
export const ADMIN_VIEWS: readonly RegistryEntry<AdminViewConfig>[] = [
  ...dashboardViewEntries, // ADM, the owner's dashboard (TASKS.md 9.2.b)
  ...ordersViewEntries, // ADM, the orders inbox and page (TASKS.md 27.3; `@engine/cms-shop`)
  ...leadsViewEntries, // ADM, the leads inbox (TASKS.md 9.1.a)
  ...stockImportViewEntries, // ADM, the owner's stock import screen (TASKS.md 10.8.a)
  ...stockMatrixViewEntries, // ADM, the stock matrix (TASKS.md 27.4.b)
  ...seedsViewEntries, // ADM, the owner's seed screen (staging and local only)
  ...wallViewEntries, // ADM, the Catalogue Wall, off the home since TASKS.md 27.6.a
  ...staffViewEntries, // ADM, the owner's quick add-staff screen (TASKS.md 27.6.c)
  ...todayViewEntries, // ADM, the shop's Today numbers, off the home since 2026-11-16
]

/** `admin.components.views`, keyed by each entry's name. */
export function adminViews(
  entries: readonly RegistryEntry<AdminViewConfig>[] = ADMIN_VIEWS,
): Record<string, AdminViewConfig> {
  const views = uniqueEntries('admin.views', entries)
  return Object.fromEntries(entries.map((entry, i) => [entry.name, views[i]!]))
}
