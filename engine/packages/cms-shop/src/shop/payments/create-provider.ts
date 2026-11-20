/**
 * The provider a config names: the simulator in simulate mode (which refuses production itself),
 * Snap on sandbox or live keys otherwise. The one place the choice is made.
 */
import type { PaymentsConfig } from './config'
import type { PaymentProvider } from './provider'
import { simulatorProvider } from './simulator'
import { snapProvider, type Fetch } from './snap'

export function createPaymentProvider(config: PaymentsConfig, fetchImpl?: Fetch): PaymentProvider {
  return config.mode === 'simulate' ? simulatorProvider(config) : snapProvider(config, fetchImpl)
}
