/**
 * The payment routes' Payload-backed ports, for a given Payload: the webhook's confirm-and-apply and
 * the sweep and reconcile jobs. Bound to a process's own instance by `./payload-port` (the shop app)
 * and by today's one CMS (`@engine/cms`), each loaded with `import()` only once a request has passed
 * its check — so a mount, `next build` and the routes' unit tests never evaluate a Payload config.
 */
import type { Payload } from 'payload'

import { applyPaymentStatus } from '../apply'
import type { PaymentsConfig } from '../config'
import { createPaymentProvider } from '../create-provider'
import { runPaymentReconcile, runPaymentSweep } from '../jobs'
import type { JobsPort } from './cron'
import type { WebhookPort } from './webhook'

export type Instance = () => Promise<Payload>

export function webhookPortWith(instance: Instance, config: PaymentsConfig): WebhookPort {
  const provider = createPaymentProvider(config)
  return {
    confirm: (midtransOrderId) => provider.getStatus(midtransOrderId),
    apply: async (status, source, payloadHash) =>
      applyPaymentStatus(await instance(), { status, source, payloadHash }),
  }
}

export function jobsPortWith(instance: Instance): JobsPort {
  return {
    async run(job, config) {
      const payload = await instance()
      const provider = createPaymentProvider(config)
      return job === 'sweep'
        ? runPaymentSweep(payload, provider)
        : runPaymentReconcile(payload, provider)
    },
  }
}
