// The pending-order reconcile (TASKS.md 6.4.c), on this app's own CMS: cms-shop's handler and port.
import { paymentReconcileRoute } from '@engine/cms-shop/payments/http'
import { refuseCron } from '@engine/http/cron/refuse'

export const POST = paymentReconcileRoute({ refuse: refuseCron })
