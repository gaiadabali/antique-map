// The Midtrans notification (COMMERCE.md §6; TASKS.md 6.4.b): verified, idempotent, one transaction
// — cms-shop's handler bound to cms-shop's own Payload (`indies_shop`), never today's CMS.
import { midtransWebhookRoute } from '@engine/cms-shop/payments/http'

export const POST = midtransWebhookRoute()
