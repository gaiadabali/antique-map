/**
 * What the order page needs of the payment configuration, read at request time (TASKS.md 6.5.a;
 * COMMERCE.md §6): Snap's own script, off simulate mode — never the client key itself, which the
 * pay action alone answers once an attempt is open.
 */
import 'server-only'

import { MIDTRANS_HOSTS, paymentsConfigFromEnv } from '@engine/cms/shop/payments'

export type SnapConfig = { readonly scriptSrc: string } | null

/** `null` in simulate mode (the simulator page is used instead) or when payments are unconfigured. */
export function snapConfig(): SnapConfig {
  const configured = paymentsConfigFromEnv()
  if (!configured.ok || configured.config.mode === 'simulate') return null
  return { scriptSrc: `${MIDTRANS_HOSTS[configured.config.mode].snap}/snap/snap.js` }
}

/** Whether the simulator page may be built — `assertSimulatorAllowed` guards every call into it. */
export function simulateModeEnabled(): boolean {
  const configured = paymentsConfigFromEnv()
  return configured.ok && configured.config.mode === 'simulate'
}
