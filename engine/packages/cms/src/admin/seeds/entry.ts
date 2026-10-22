/**
 * This lane's `ADMIN_VIEWS` entry: the seed screen at `/admin/seeds`. The component is exported
 * from `../views.ts` (the import map resolves it).
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '../../registries/entries'

export const seedsViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'seeds',
    owner: 'ADM',
    value: {
      path: '/seeds',
      Component: '@engine/cms/admin/views#SeedsView',
      exact: true,
    },
  },
]
