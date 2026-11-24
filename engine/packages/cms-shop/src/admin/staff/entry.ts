/**
 * The staff screen's `ADMIN_VIEWS` entry: "Add a staff member" at `/admin/staff/new` (TASKS.md
 * 27.6.c). The component is exported from `../views.ts` (the import map resolves it).
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '@engine/cms-core/registries/entries'

export const staffViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'staff-new',
    owner: 'ADM',
    value: {
      path: '/staff/new',
      Component: '@engine/cms-shop/admin/views#AddStaffView',
      exact: true,
    },
  },
]
