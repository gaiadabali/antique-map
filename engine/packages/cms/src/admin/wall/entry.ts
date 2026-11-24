/**
 * The wall's `ADMIN_VIEWS` entry: the Catalogue Wall at `/admin/wall` (TASKS.md 27.6.a moved it
 * off the home). The component is exported from `../views.ts` (the import map resolves it).
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '@engine/cms-core/registries/entries'

export const wallViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'catalogue-wall',
    owner: 'ADM',
    value: {
      path: '/wall',
      Component: '@engine/cms/admin/views#CatalogueWallView',
      exact: true,
    },
  },
]
