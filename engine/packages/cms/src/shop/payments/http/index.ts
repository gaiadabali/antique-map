/**
 * `@engine/cms/shop/payments/http` — the payment routes (`@engine/cms-shop/payments/http`) bound to
 * this CMS's own Payload (`./payload-port`), for today's app's mounts in `@engine/http` until phase
 * 26. A caller's own `load` still wins (the routes' tests).
 */
import {
  midtransWebhookRoute as webhookRoute,
  paymentReconcileRoute as reconcileRoute,
  paymentSweepsRoute as sweepsRoute,
  type CronOptions,
  type JobsPortLoader,
  type WebhookOptions,
  type WebhookPortLoader,
} from '@engine/cms-shop/payments/http'

export * from '@engine/cms-shop/payments/http'

const loadWebhook: WebhookPortLoader = async (config) =>
  (await import('./payload-port')).webhookPort(config)
const loadJobs: JobsPortLoader = async () => (await import('./payload-port')).jobsPort()

export const midtransWebhookRoute = (options: WebhookOptions = {}) =>
  webhookRoute({ load: loadWebhook, ...options })
export const paymentSweepsRoute = (options: CronOptions) =>
  sweepsRoute({ load: loadJobs, ...options })
export const paymentReconcileRoute = (options: CronOptions) =>
  reconcileRoute({ load: loadJobs, ...options })
