/**
 * The shop-catalogue seed layer on a real database. Split out of `seed.db.test.ts` so the heavy seed runs go in parallel, each on a database
 * of its own. Without `CMS_TEST_POSTGRES_URL` it skips — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../collections/users/staff.test-support'
import { checkCatalogueLayer } from './catalogue/db-checks.test-support'

describe.skipIf(!server)('the shop-catalogue seed layer, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_seed_catalogue_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('the shop-catalogue layer loads the designs, retires the mock products, and is idempotent', async () => {
    await checkCatalogueLayer(stack.payload)
    // The mock shop's stock rows (7,227, written twice) dominate: the budget matches the test above.
  }, 900_000)
})
