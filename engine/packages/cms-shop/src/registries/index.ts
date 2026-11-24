/**
 * The shop CMS's registries: its collections and globals checked
 * (`@engine/cms-core/registries/checks`), its admin views (`../admin/registry`), its plugins — the
 * media storage, every upload collection to the shop's own bucket (PLAN-V2 Q3) — and its jobs:
 * none yet (the payment sweeps and reconcile run from the cron routes, `../shop/payments/http`).
 */
import { checkedCollections, checkedGlobals } from '@engine/cms-core/registries/checks'
import { uniqueEntries, type RegistryEntry } from '@engine/cms-core/registries/entries'
import { mediaStoragePlugin } from '@engine/cms-core/registries/storage'
import type { AdminViewConfig, CollectionConfig, GlobalConfig, Plugin } from 'payload'

import { SHOP_ADMIN_VIEWS } from '../admin/registry'
import { SHOP_COLLECTIONS } from '../collections'
import { SHOP_GLOBALS } from '../globals'

type Env = Readonly<Record<string, string | undefined>>

export const shopCollections = (): CollectionConfig[] => checkedCollections(SHOP_COLLECTIONS)

export const shopGlobals = (): GlobalConfig[] => checkedGlobals(SHOP_GLOBALS)

/** `admin.components.views`, keyed by each entry's name. */
export function shopAdminViews(
  entries: readonly RegistryEntry<AdminViewConfig>[] = SHOP_ADMIN_VIEWS,
): Record<string, AdminViewConfig> {
  const views = uniqueEntries('admin.views', entries)
  return Object.fromEntries(entries.map((entry, i) => [entry.name, views[i]!]))
}

export function shopPlugins(env: Env): Plugin[] {
  return uniqueEntries('plugins', [
    { name: 'media-storage', owner: 'SCH', value: mediaStoragePlugin(env) },
  ])
}
