/**
 * This lane's `ADMIN_VIEWS` entries (`../../registries/views.ts`'s "one spread line" per
 * TASKS.md 9.1ui's orchestrator note): the leads inbox, registered at `/leads`.
 */
import type { AdminViewConfig } from 'payload'

import type { RegistryEntry } from '../../registries/entries'

export const leadsViewEntries: readonly RegistryEntry<AdminViewConfig>[] = [
  {
    name: 'leads-inbox',
    owner: 'ADM',
    value: {
      path: '/leads',
      Component: '@engine/cms/admin/views#LeadsInboxView',
      exact: true,
    },
  },
]
