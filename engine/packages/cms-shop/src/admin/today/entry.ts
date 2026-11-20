/**
 * Today's `ADMIN_VIEWS` entry: the shop's "Today" numbers at `/admin/today`, off the home since the
 * home took Payload's dashboard look (2026-11-16). The component is exported from `../views.ts`
 * (the import map resolves it).
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '@engine/cms-core/registries/entries'

export const todayViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'today',
    owner: 'ADM',
    value: {
      path: '/today',
      Component: '@engine/cms-shop/admin/views#TodayPageView',
      exact: true,
    },
  },
]
