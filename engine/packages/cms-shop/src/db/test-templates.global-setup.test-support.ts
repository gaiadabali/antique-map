/**
 * Vitest `globalSetup` for the shop's real-database tests (`pnpm --filter @engine/cms-shop test:db`):
 * the shop CMS's two template databases, one migrated by its own migrations and one pushed from its
 * config (`@engine/cms-core/db/test-templates`), named `indies_shop_tpl_…`.
 */
import { templatesSetup } from '@engine/cms-core/db/test-templates'

import { migrations } from '../migrations'
import { buildShopConfig, shopConfig } from '../payload.config'

export default function setup() {
  return templatesSetup({ config: shopConfig, build: buildShopConfig, migrations }, 'indies_shop')
}
