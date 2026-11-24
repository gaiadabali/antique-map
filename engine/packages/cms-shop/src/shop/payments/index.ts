/**
 * The shop's payments (TASKS.md 6.4; COMMERCE.md §6): the provider interface with Midtrans Snap
 * and the simulator behind it, the one function that applies a confirmed status to an order, the
 * expiry release, and the sweep and reconcile jobs. The routes are `./http` (no Payload at import).
 *
 * The pay step (6.5), per request:
 *   const configured = paymentsConfigFromEnv()                  // refuses simulate in production
 *   if (!configured.ok) …                                        // a designed error, not a stack
 *   const provider = createPaymentProvider(configured.config)
 *   const opened = await openPaymentAttempt(payload, provider, { orderId, finishUrl })
 *   // opened.ok → Snap with opened.token (client key: configured.config.clientKey), or
 *   //             opened.redirectUrl; simulate mode → the simulator page, whose buttons call
 *   //             simulatorProvider(config).emit(midtransOrderId, action) and POST `.body` to
 *   //             /api/x/webhooks/midtrans
 */
export { applyPaymentStatus, type ApplyInput, type ApplyResult, type PaymentSource } from './apply'
export { openPaymentAttempt, type OpenedPayment } from './attempts'
export {
  MIDTRANS_HOSTS,
  MIDTRANS_MODES,
  SIMULATOR_SERVER_KEY,
  assertSimulatorAllowed,
  judgedEnvironment,
  paymentsConfigFromEnv,
  type MidtransMode,
  type PaymentsConfig,
  type PaymentsConfigResult,
} from './config'
export { createPaymentProvider } from './create-provider'
export {
  OUTCOMES,
  decide,
  isSuccess,
  type Decision,
  type LockedOrder,
  type Outcome,
} from './decide'
export {
  EXPIRY_GRACE_MINUTES,
  JOB_BATCH,
  RECONCILE_AFTER_MINUTES,
  runPaymentReconcile,
  runPaymentSweep,
  type JobRun,
} from './jobs'
export {
  attemptOrderId,
  dedupeKeyOf,
  parseAttemptOrderId,
  parseGrossAmount,
  parseStatus,
  readSignedFields,
  type MidtransStatus,
} from './notification'
export { DEFAULT_WINDOW_MINUTES } from './order-sql'
export {
  ITEM_TEXT_MAX,
  paymentItems,
  type CreatedPayment,
  type PaymentItem,
  type PaymentProvider,
  type PaymentRequest,
  type PricedOrder,
  type StatusAnswer,
} from './provider'
export { isValidSignature, midtransSignature, type SignedFields } from './signature'
export {
  SIMULATOR_ACTIONS,
  SIMULATOR_PAY_PATH,
  simulatorProvider,
  type SimulatedNotification,
  type SimulatorAction,
  type SimulatorProvider,
} from './simulator'
export { SNAP_PAYMENT_METHODS, snapProvider, type Fetch } from './snap'
