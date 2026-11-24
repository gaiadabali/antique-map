/**
 * The data of the owner's feedback on today's one database (TASKS.md 28.1.b), with the shop's own
 * suite (`@engine/cms-shop`'s `collections/articles/feedback-access`): articles read published-only
 * and projected by the public, none by a store user; newsletter leads created by the server alone;
 * themes, best sellers, flagships and regions stored. Without `CMS_TEST_POSTGRES_URL` it skips — a
 * setup state.
 */
import { feedbackAccessSuite } from '@engine/cms-shop/collections/articles/feedback-access.test-support'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe } from 'vitest'

import { server, startStaffStack, type StaffStack } from './users/staff.test-support'

describe.skipIf(!server)('the feedback’s data, by role, on today’s database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_feedback_test', (config, key) => getPayload({ config, key }))
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  feedbackAccessSuite({ stack: () => stack, leadExtra: { site: 'shop' } })
})
