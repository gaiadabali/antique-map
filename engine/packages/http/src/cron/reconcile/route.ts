/**
 * `POST /api/x/cron/reconcile` — `@engine/http/cron/reconcile` (TASKS.md 6.4.c): asks the provider
 * about orders pending over ten minutes and applies what it hears. Behind `CRON_SECRET`.
 */
import { paymentReconcileRoute } from '@engine/cms/shop/payments/http'

import { refuseCron } from '../auth'

export const POST = paymentReconcileRoute({ refuse: refuseCron })
