/**
 * This lane's `ADMIN_VIEWS` entry: the stock matrix at `/admin/stock` (TASKS.md 27.4.b). The
 * component is exported from `../views.ts` (the import map resolves it).
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '@engine/cms-core/registries/entries'

export const stockMatrixViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'stock-matrix',
    owner: 'ADM',
    value: {
      path: '/stock',
      Component: '@engine/cms-shop/admin/views#StockMatrixView',
      exact: true,
    },
  },
]
