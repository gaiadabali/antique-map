/**
 * The orders inbox and order page's entry in the admin views registry (TASKS.md 27.3): one view at
 * `/admin/orders` and `/admin/orders/:id`, its component named by the package specifier the import
 * map resolves.
 */
import type { RegistryEntry } from '@engine/cms-core/registries/entries'
import type { AdminViewConfig } from 'payload'

export const ordersViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'orders-panel',
    owner: 'ADM',
    value: {
      path: '/orders/:id?',
      Component: '@engine/cms-shop/admin/orders#OrdersPanelView',
      exact: true,
    },
  },
]
