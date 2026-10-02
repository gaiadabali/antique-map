/**
 * `POST /api/x/cron/sweeps` — `@engine/http/cron/sweeps` (TASKS.md 6.4.c): expires unpaid orders past
 * their window and returns their stock once, after one last status check. Behind `CRON_SECRET`.
 */
import { paymentSweepsRoute } from '@engine/cms/shop/payments/http'

import { refuseCron } from '../auth'

export const POST = paymentSweepsRoute({ refuse: refuseCron })
