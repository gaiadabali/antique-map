/**
 * The payment routes' Payload-backed ports: the one module under `http/` that reaches the process's
 * Payload (`../../../instance`), loaded with `import()` by `./webhook` once a notification has
 * passed its signature check, and by `./cron` once the crontab's bearer has — so a mount, `next
 * build` and the routes' unit tests never evaluate the Payload config (ARCHITECTURE.md §15).
 */
import { cms } from '../../../instance'
import { applyPaymentStatus } from '../apply'
import type { PaymentsConfig } from '../config'
import { createPaymentProvider } from '../create-provider'
import { runPaymentReconcile, runPaymentSweep } from '../jobs'
import type { JobsPort } from './cron'
import type { WebhookPort } from './webhook'

export function webhookPort(config: PaymentsConfig): WebhookPort {
  const provider = createPaymentProvider(config)
  return {
    confirm: (midtransOrderId) => provider.getStatus(midtransOrderId),
    apply: async (status, source, payloadHash) =>
      applyPaymentStatus(await cms(), { status, source, payloadHash }),
  }
}

export function jobsPort(): JobsPort {
  return {
    async run(job, config) {
      const payload = await cms()
      const provider = createPaymentProvider(config)
      return job === 'sweep'
        ? runPaymentSweep(payload, provider)
        : runPaymentReconcile(payload, provider)
    },
  }
}
