/**
 * @contract C7 Provider interfaces — fulfilment · owner: ARC · entry `@engine/fulfilment/contract`
 *
 * Who makes and sends each merchandise line (COMMERCE.md §8, "Fulfilment routing"). The router
 * walks the rungs in order, per line; print-on-demand abroad is NOT part of the launch (D23) — it
 * switches on in v2 as a provider, with no change to the router. Never ship an Indonesian order
 * from abroad (import duty above USD 3, COMPLIANCE.md §5); never ship an international POD order
 * from Bali when a partner is closer. Providers are stateless; the domain stores the jobs.
 * Provider ids are C1's, imported, never redeclared.
 */
import type { CountryCode, Destination, FulfilmentProviderId } from '@engine/config/schema'
import type { AddressInput, EventIdRule, RawWebhook } from '@engine/domain/api'
import type { Money } from '@engine/domain/money'

/** The fulfilment routes a brand's config selects — C1's (`fulfilment.providers`). */
export type { FulfilmentProviderId } from '@engine/config/schema'

/** A print-on-demand partner near the buyer (v2, D23). */
export type PodProviderId = Extract<FulfilmentProviderId, 'prodigi' | 'gelato'>

/** The router's rungs, in the order it tries them; the first that serves the line wins. */
export const FULFILMENT_ROUTES = [
  /** Stocked at a location that serves the destination (the showroom first for Bali). */
  'own-stock',
  /** Made to order locally, for an Indonesian destination. */
  'local-production',
  /** Abroad, near the buyer, where a POD route exists (v2). */
  'print-on-demand',
] as const
export type FulfilmentRoute = (typeof FULFILMENT_ROUTES)[number]

/**
 * A line's route for a destination — or not offered there, with the reason shown in the bag. Own
 * stock names its location: that is the variant-at-location the checkout lock is taken on.
 */
export type FulfilmentDecision =
  | { readonly route: 'own-stock'; readonly provider: 'own-stock'; readonly locationId: string }
  | { readonly route: 'local-production'; readonly provider: 'local-production' }
  | { readonly route: 'print-on-demand'; readonly provider: PodProviderId }
  | { readonly route: 'not-offered'; readonly reason: 'no-route-for-destination' | 'out-of-stock' }

export type RouteFulfilmentInput = {
  readonly variantId: number
  readonly quantity: number
  readonly destination: CountryCode
}

/**
 * Everything the router reads, loaded before it runs — so it is pure: no I/O, no clock, no config
 * lookups of its own.
 */
export type RouteFulfilmentContext = {
  /** This variant's stock per location, tried in this order after `preferred`. */
  readonly stock: readonly {
    readonly locationId: string
    /** On hand minus reserved when the context was loaded; reserve() has the final word. */
    readonly available: number
    /** The destinations served from this location (its seller's `serves.destinations`, C1). */
    readonly serves: readonly Destination[]
  }[]
  /**
   * Locations to try first, in order — the showroom for a delivery on its own island ("showroom
   * first for Bali"). The caller decides it from the address; the router never reads a place name.
   */
  readonly preferred: readonly string[]
  /** Made to order locally: whether this variant can be, and where local production delivers. */
  readonly localProduction: {
    readonly enabled: boolean
    readonly destinations: readonly CountryCode[]
  }
  /** Print-on-demand routes for this variant, near the buyer (v2, D23 — empty at launch). */
  readonly printOnDemand: readonly {
    readonly provider: PodProviderId
    readonly destinations: readonly CountryCode[]
  }[]
}

/** Pure over its input and context; DOM implements it (TASKS.md 5.12). */
export type RouteFulfilment = (
  input: RouteFulfilmentInput,
  context: RouteFulfilmentContext,
) => FulfilmentDecision

export type ProductionLine = {
  readonly providerSku: string
  readonly quantity: number
  /** The colour-managed file under the private `print-files/` prefix (C9), by storage key. */
  readonly printFileKey: string
  readonly options: { readonly [axis: string]: string }
}

export type FulfilmentJobInput = {
  readonly orderRef: string
  /** Idempotent: submitting twice with one key makes one job. */
  readonly idempotencyKey: string
  readonly lines: readonly ProductionLine[]
  readonly shipTo: AddressInput
}

export type FulfilmentJob = {
  readonly jobRef: string
  /** What the provider charges the seller — a cost, never the buyer's price. */
  readonly cost: Money | null
}

export type FulfilmentStatus =
  'accepted' | 'in-production' | 'shipped' | 'delivered' | 'cancelled' | 'failed'

/** A provider's news, normalised. `providerEventId` dedupes a repeated delivery. */
export type FulfilmentEvent = {
  readonly provider: FulfilmentProviderId
  readonly providerEventId: string
  readonly jobRef: string
  readonly status: FulfilmentStatus
  readonly tracking: {
    readonly carrier: string
    readonly trackingNumber: string
    readonly trackingUrl: string | null
  } | null
  readonly occurredAt: Date
}

export type ParsedFulfilmentWebhook =
  | { readonly kind: 'events'; readonly events: readonly FulfilmentEvent[] }
  | { readonly kind: 'bad-signature' }
  | { readonly kind: 'ignored'; readonly reason: string }

export type FulfilmentProvider = {
  readonly id: FulfilmentProviderId
  /** Whether the provider can make this SKU for this destination, and how long it takes. */
  availability(input: {
    readonly providerSku: string
    readonly destination: CountryCode
  }): Promise<{
    readonly available: boolean
    readonly leadTimeDays: { readonly min: number; readonly max: number } | null
  }>
  submit(input: FulfilmentJobInput): Promise<FulfilmentJob>
  cancel?(jobRef: string): Promise<void>
  parseWebhook?(request: RawWebhook): Promise<ParsedFulfilmentWebhook>
}

// ─── The providerEventId rule, per adapter ───────────────────────────────────────────────────

/** A production notification's fields, named for what they mean; each adapter maps its paths. */
export type FulfilmentHashField = 'job-id' | 'status' | 'occurred-at' | 'tracking-number'

/**
 * How each adapter derives `FulfilmentEvent.providerEventId` (C5–C8 `EventIdRule`). The partners
 * arrive in v2 (D23): LOG confirms against recorded sandbox fixtures whether each sends a native
 * event id, and until then the state hash, which is always safe — a multi-parcel job's second
 * shipment differs by its tracking number. Own stock and local production are recorded by staff.
 */
export const FULFILMENT_EVENT_ID_RULES = {
  prodigi: { kind: 'state-hash', fields: ['job-id', 'status', 'occurred-at', 'tracking-number'] },
  gelato: { kind: 'state-hash', fields: ['job-id', 'status', 'occurred-at', 'tracking-number'] },
  'own-stock': { kind: 'staff-entry' },
  'local-production': { kind: 'staff-entry' },
} as const satisfies { readonly [P in FulfilmentProviderId]: EventIdRule<FulfilmentHashField> }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Accepts<T, U extends T> = U
type _OwnStockNamesItsLocation = Accepts<
  FulfilmentDecision,
  // @ts-expect-error — own stock without a location leaves the checkout lock nothing to hold
  { route: 'own-stock'; provider: 'own-stock' }
>
type _PodIsAPartner = Accepts<
  FulfilmentDecision,
  // @ts-expect-error — print-on-demand is a partner's job, never own stock's
  { route: 'print-on-demand'; provider: 'own-stock' }
>
