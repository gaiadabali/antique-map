/**
 * The admin views registry (PARALLEL-TRACKS.md §1). ADM owns `engine/packages/cms/src/admin/**`
 * and exports its custom views from one barrel, `@engine/cms/admin/views`; this file spreads it
 * into `admin.components.views` once. None exists yet — the SCH lead adds the barrel's line when
 * ADM ships its first view.
 *
 * A view is referenced by a component path the import map resolves (`@engine/cms/admin/…#Name`
 * — a package specifier, never a path relative to one app), so both apps' generated
 * `importMap.js` come out identical. A component missing from the import map renders as nothing
 * with no error (KOI), which is why CI regenerates both maps and fails on a diff (TASKS.md 2.2.g).
 */
import type { AdminViewConfig } from 'payload'

import { uniqueEntries, type RegistryEntry } from './entries'

// Barrels, one line each when they exist:
//   ...admViews,  // ADM — @engine/cms/admin/views (the desk, the merch wizard, dashboards)
export const ADMIN_VIEWS: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'orders-panel',
    owner: 'ADM',
    value: {
      path: '/orders/:id?',
      Component: '@engine/cms/admin/orders#OrdersPanelView',
      exact: true,
    },
  },
]

/** `admin.components.views`, keyed by each entry's name. */
export function adminViews(
  entries: readonly RegistryEntry<AdminViewConfig>[] = ADMIN_VIEWS,
): Record<string, AdminViewConfig> {
  const views = uniqueEntries('admin.views', entries)
  return Object.fromEntries(entries.map((entry, i) => [entry.name, views[i]!]))
}
