/**
 * The dashboard's entry in the admin views registry (`../../registries/views.ts`): a plain object
 * with no React in it, so the config loads it without loading the view. The component is named by
 * the package specifier the import map resolves — never a path relative to one app.
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '../../registries/entries'

export const dashboardViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'ownerDashboard',
    owner: 'ADM',
    value: {
      Component: '@engine/cms/admin/views#DashboardView',
      path: '/dashboard',
      exact: true,
    },
  },
]
