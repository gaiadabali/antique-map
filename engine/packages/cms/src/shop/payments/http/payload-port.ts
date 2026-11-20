/**
 * The payment routes' ports (`@engine/cms-shop/payments/http/ports`) bound to this CMS's one
 * Payload (`../../../instance`), loaded with `import()` only after a request has passed its check.
 */
import { jobsPortWith, webhookPortWith } from '@engine/cms-shop/payments/http/ports'
import type { PaymentsConfig } from '@engine/cms-shop/payments'

import { cms } from '../../../instance'

export const webhookPort = (config: PaymentsConfig) => webhookPortWith(cms, config)

export const jobsPort = () => jobsPortWith(cms)
