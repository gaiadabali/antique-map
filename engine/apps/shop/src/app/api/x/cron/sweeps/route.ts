// The expiry sweep (TASKS.md 6.4.c), on this app's own CMS: cms-shop's handler, today's crontab bearer.
import { paymentSweepsRoute } from '@engine/cms-shop/payments/http'
import { refuseCron } from '@engine/http/cron/refuse'

export const POST = paymentSweepsRoute({ refuse: refuseCron })
