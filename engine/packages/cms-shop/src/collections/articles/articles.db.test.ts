/**
 * The data of the owner's feedback on the shop's own database (TASKS.md 28.1.b): articles read
 * published-only and projected by the public, none by a store user; newsletter leads created by the
 * server alone; themes, best sellers, flagships and regions stored (`./feedback-access`). Without
 * `CMS_TEST_POSTGRES_URL` it skips — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'
import { feedbackAccessSuite } from './feedback-access.test-support'

describe.skipIf(!server)('the feedback’s data, by role, on the shop database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_shop_feedback_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  feedbackAccessSuite({ stack: () => stack })
})
