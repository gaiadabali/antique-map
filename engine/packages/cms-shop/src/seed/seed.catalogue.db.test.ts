/**
 * The shop seed's catalogue on the shop's own database (TASKS.md 24.1): the mock shop and the
 * designs load through the shop's import, the mocks retire, and a second run changes nothing
 * (`./catalogue/db-checks.test-support`, the same checks today's one CMS runs). Without
 * `CMS_TEST_POSTGRES_URL` it skips — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../db/staff-stack.test-support'
import { checkCatalogueLayer } from './catalogue/db-checks.test-support'
import { seedShopLayer } from './run'

describe.skipIf(!server)('the shop seed: the catalogue, on the shop database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_shop_seed_catalogue_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('loads the designs, retires the mock products, and is idempotent', async () => {
    await checkCatalogueLayer(stack.payload, seedShopLayer)
    // The mock shop's 7,227 stock rows dominate (`@engine/cms`'s twin has the same budget).
  }, 900_000)
})
