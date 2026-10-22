/**
 * This lane's `ADMIN_VIEWS` entry: the stock import screen at `/admin/stock-import` (TASKS.md
 * 10.8.a). The component is exported from `../views.ts` (the import map resolves it).
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '../../registries/entries'

export const stockImportViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'stock-import',
    owner: 'ADM',
    value: {
      path: '/stock-import',
      Component: '@engine/cms/admin/views#StockImportView',
      exact: true,
    },
  },
]
