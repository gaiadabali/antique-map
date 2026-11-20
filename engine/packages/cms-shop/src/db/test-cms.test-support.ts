/**
 * Test support only — registers the shop's CMS for the shared real-database stacks
 * (`@engine/cms-core/db/test-cms`): every support path of this package imports this first, so a
 * shop test runs on the shop's own schema (`indies_shop_<suffix>` databases, no `site`).
 */
import { useTestCms } from '@engine/cms-core/db/test-cms'

import { migrations } from '../migrations'
import { buildShopConfig, shopConfig } from '../payload.config'

useTestCms({
  config: shopConfig,
  build: buildShopConfig,
  migrations,
  databasePrefix: 'indies_shop_',
})
