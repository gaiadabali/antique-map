/**
 * @contract C7 Provider interfaces — payments · owner: ARC · entry `@engine/payments/contract`
 *
 * One seam for every gateway (PAYMENTS.md §2). Adapters are stateless translators: a priced
 * payment attempt into a provider session, a provider webhook into normalised events. All state
 * lives in @engine/domain — which also defines the vocabulary re-exported below (method ids,
 * SessionResult, NormalizedPaymentEvent, ProviderState, refunds; provider ids are C1's) — so this
 * package depends on the domain and never the reverse. An adapter never writes an order, and never
 * reads a price from anywhere but the attempt it was handed.
 */
import type {
  CountryCode,
  CurrencyCode,
  PaymentMethodFamily,
  SellerConfig,
} from '@engine/config/schema'
import type { Duration, EventIdRule, RawWebhook } from '@engine/domain/api'
import type {
  NormalizedPaymentEvent,
  PaymentLookup,
  PaymentMethodId,
  PaymentPorts,
  PaymentProviderId,
  ProviderState,
  RefundRequest,
  RefundResult,
  RetailMethod,
  SessionResult,
} from '@engine/domain/machines/payment'
import type { FxSnapshot, Money } from '@engine/domain/money'

export type {
  BankDetails,
  LocalisedText,
  NormalizedPaymentEvent,
  PaymentEventBody,
  PaymentEventType,
  PaymentFailureClass,
  PaymentLookup,
  PaymentMethodId,
  PaymentProviderId,
  ProviderState,
  RefundIdempotencyKey,
  RefundRequest,
  RefundResult,
  RetailMethod,
  SessionResult,
  VirtualAccountMethod,
} from '@engine/domain/machines/payment'

/**
 * C1 ⇄ C7: the family each granular method belongs to — what a seller's `methodOrder` sorts and
 * what routing groups. Exhaustive both ways: a new method needs a family, and C1's families are
 * each reached by at least one method.
 */
export const PAYMENT_METHOD_FAMILY = {
  card: 'card',
  'apple-pay': 'express-wallet',
  'google-pay': 'express-wallet',
  gopay: 'ewallet',
  shopeepay: 'ewallet',
  ovo: 'ewallet',
  dana: 'ewallet',
  paypal: 'paypal',
  qris: 'qris',
  paynow: 'paynow',
  'va-bca': 'va',
  'va-mandiri': 'va',
  'va-bni': 'va',
  'va-bri': 'va',
  'va-permata': 'va',
  alfamart: 'retail',
  indomaret: 'retail',
  kredivo: 'paylater',
  akulaku: 'paylater',
  'bank-transfer': 'bank-transfer',
  ideal: 'ideal',
  'sepa-debit': 'sepa-debit',
  manual: 'manual',
} as const satisfies { readonly [M in PaymentMethodId]: PaymentMethodFamily }

/** Who is buying, for routing: cards above the seller's ceiling steer to transfer or invoice. */
export type BuyerKind = 'retail' | 'institution' | 'trade'

export type CapabilityContext = {
  readonly seller: SellerConfig
  /** The order's computed total in the seller's charge currency. */
  readonly charge: Money
  readonly destination: CountryCode
  readonly buyer: BuyerKind
  /** A unique item never gets cash at a retail counter: it cannot complete inside any hold. */
  readonly hasUniqueItem: boolean
}

/** One method a provider can offer for this checkout. */
export type MethodCapability<AuthCapture extends boolean = boolean> = {
  readonly method: PaymentMethodId
  /**
   * How long this method can take — per method, because a QRIS code lasts minutes and a virtual
   * account hours. The domain extends the checkout lock to this plus a margin (extend()).
   */
  readonly sessionTtl: Duration
  /** Authorise now, capture while the reservation is live — only where the gateway can capture. */
  readonly authCapture: AuthCapture extends true ? boolean : false
  readonly refunds: 'full' | 'partial' | 'manual-only'
  /** The provider's per-transaction cap, from the dated caps data (payments/src/limits.ts). */
  readonly cap: Money | null
}

export type Capabilities<AuthCapture extends boolean = boolean> = {
  readonly chargeCurrency: CurrencyCode
  readonly methods: readonly MethodCapability<AuthCapture>[]
}

/** One summary line for the provider's page. The lines' amounts sum to `charge` exactly. */
export type LineSummary = {
  readonly title: string
  readonly quantity: number
  readonly amount: Money
}

export type SessionInput = {
  /**
   * Our reference, one per attempt, sent so the provider echoes it back (`attemptRef` on every
   * event): Midtrans `order_id`, Stripe `client_reference_id`, Xendit `external_id`, PayPal
   * `custom_id`. The attempt row is committed before this call, so no event can outrun it.
   */
  readonly attemptId: string
  readonly orderRef: string
  /** The order's computed total in the charge currency — never the browser's (PAYMENTS.md §1). */
  readonly charge: Money
  /** A display-only estimate in the market currency, where the rules allow one. */
  readonly display: Money | null
  readonly fx: FxSnapshot | null
  readonly method: PaymentMethodId | null
  readonly customer: {
    readonly name: string
    readonly email: string | null
    readonly phone: string | null
  }
  /**
   * Built by the domain from the stored figures (discounts, shipping and tax as lines where the
   * provider wants them), so they sum to `charge`: an adapter never re-derives or rounds them.
   */
  readonly lines: readonly LineSummary[]
  readonly returnUrls: { readonly success: string; readonly cancel: string }
  /** Always before the reservation's end: the session dies before the lock does. */
  readonly expiresAt: Date
}

/**
 * A webhook, parsed. A bad signature is a value, not an exception: the handler answers 401 and
 * alerts — a thrown error that escaped would answer 5xx and the provider would retry forever.
 */
export type ParsedWebhook =
  | { readonly kind: 'events'; readonly events: readonly NormalizedPaymentEvent[] }
  | { readonly kind: 'bad-signature' }
  /** A notification type the engine does not use: 200, nothing applied. */
  | { readonly kind: 'ignored'; readonly reason: string }

type GatewayCore<AuthCapture extends boolean> = {
  readonly id: PaymentProviderId
  readonly authCapture: AuthCapture
  /**
   * Where the provider advises it (Midtrans), a notification is confirmed with `retrieve()` before
   * it is applied — the webhook alone is not trusted. The applied event keeps the delivery's
   * `providerEventId` (a redelivery still dedupes) and takes its body from what `retrieve()` said.
   */
  readonly confirmWebhooksByRetrieve: boolean
  /** What this provider can do for this checkout, or null if it cannot serve it at all. */
  capabilities(context: CapabilityContext): Capabilities<AuthCapture> | null
  /** The domain stores the result and replays it on a retry; the adapter keeps nothing. */
  createSession(input: SessionInput): Promise<SessionResult>
  /** By the provider's id once it has named the payment, by our reference before (a Snap token). */
  retrieve(lookup: PaymentLookup): Promise<ProviderState>
  /**
   * Verifies the signature on the raw body, then normalises each event (see the id rules). A
   * provider serving several sellers is verified with the secret of the seller whose attempt the
   * echoed reference names.
   */
  parseWebhook(request: RawWebhook): Promise<ParsedWebhook>
  /** Idempotent by `idempotencyKey`: a retried refund refunds once. */
  refund(input: RefundRequest): Promise<RefundResult>
}

/**
 * A gateway. One that authorises must be able to capture and void — the type will not let an
 * adapter declare authorise-capture methods without both. `capture` and `cancel` are idempotent:
 * an already-captured payment or already-voided authorisation is a success (the domain calls them
 * inside a transaction a rollback may repeat).
 */
export type PaymentGateway =
  | (GatewayCore<true> & {
      capture(providerRef: string, amount: Money): Promise<void>
      cancel(lookup: PaymentLookup): Promise<void>
    })
  | (GatewayCore<false> & {
      readonly capture?: never
      /** Expire an unpaid session (a VA, a QR) when the order is cancelled. */
      cancel?(lookup: PaymentLookup): Promise<void>
    })

// ─── The providerEventId rule, per adapter ───────────────────────────────────────────────────

/** A payment notification's fields, named for what they mean; each adapter maps its own paths. */
export type StateHashField =
  | 'payment-id'
  | 'status'
  | 'fraud-status'
  | 'status-code'
  | 'amount'
  | 'refunded-total'
  | 'refund-id'

/**
 * How an adapter derives a webhook's `providerEventId`, the dedupe key unique per provider in
 * `engine.payment_events` (PAYMENTS.md §2). Events the reconciler builds and staff entries carry
 * their own prefixes (`retrieve:`, `staff:`), so no rule below can collide with them.
 */
export type ProviderEventIdRule = EventIdRule<StateHashField>

export const PROVIDER_EVENT_ID_RULES = {
  stripe: { kind: 'provider-event-id', source: 'Event.id (evt_…)' },
  paypal: { kind: 'provider-event-id', source: 'webhook event id (WH-…)' },
  // PAYMENTS.md §2: transaction_id | transaction_status | fraud_status | status_code, so "pending"
  // and the later "settlement" never dedupe each other — plus the cumulative refunded amount,
  // because two partial refunds share every other field and the second would be swallowed.
  midtrans: {
    kind: 'state-hash',
    fields: ['payment-id', 'status', 'fraud-status', 'status-code', 'refunded-total'],
  },
  // Only if chosen (Phase 9): PAY confirms against recorded sandbox fixtures whether a native
  // event id exists; until then the state hash, which is always safe.
  xendit: { kind: 'state-hash', fields: ['payment-id', 'status', 'amount', 'refunded-total'] },
  doku: { kind: 'state-hash', fields: ['payment-id', 'status', 'amount', 'refunded-total'] },
  manual: { kind: 'staff-entry' },
  'bank-transfer': { kind: 'staff-entry' },
} as const satisfies { readonly [P in PaymentProviderId]: ProviderEventIdRule }

/**
 * Events the reconciler builds from `retrieve()` (source `retrieve`) key on the state they report,
 * as `retrieve:` + the hash, so re-reading an unchanged state every ten minutes dedupes instead of
 * piling up.
 */
export const RECONCILIATION_EVENT_ID_RULE = {
  kind: 'state-hash',
  fields: ['payment-id', 'status', 'amount', 'refunded-total'],
} as const satisfies ProviderEventIdRule

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Assert<T extends true> = T
type Accepts<T, U extends T> = U
type Gateway = Extract<PaymentGateway, { authCapture: true }>
// The webhook handler builds applyPaymentEvent()'s ports from a gateway without adapting them.
type _PortsFromAGateway = Accepts<
  PaymentPorts,
  {
    capture: Gateway['capture']
    cancel: Gateway['cancel']
    refund: Gateway['refund']
    retrieve: Gateway['retrieve']
  }
>
type _RetailIsNamed = Assert<RetailMethod extends PaymentMethodId ? true : false>
type FamilyReached = (typeof PAYMENT_METHOD_FAMILY)[PaymentMethodId]
type _EveryFamilyReached = Assert<[PaymentMethodFamily] extends [FamilyReached] ? true : false>
type NoCapture = Extract<PaymentGateway, { authCapture: false }>
type _ImmediateGateway = Accepts<
  Capabilities<false>['methods'][number]['authCapture'],
  // @ts-expect-error — a gateway that cannot capture cannot offer an authorise-capture method
  true
>
type _AuthoriseNeedsCapture = Accepts<
  PaymentGateway,
  // @ts-expect-error — declaring authorise-capture without capture() and cancel() does not compile
  Omit<Gateway, 'capture'>
>
type _NoCaptureOnImmediate = Assert<NoCapture['capture'] extends undefined ? true : false>
