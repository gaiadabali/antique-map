/**
 * `POST /api/x/webhooks/midtrans` — `@engine/http/webhooks/midtrans` (TASKS.md 6.4.b): the Midtrans
 * notification. Bounded raw body, signature checked in constant time before anything else is read,
 * confirmed against the status API, then applied in one transaction (`@engine/cms/shop/payments`).
 */
import { midtransWebhookRoute } from '@engine/cms/shop/payments/http'

export const POST = midtransWebhookRoute()
