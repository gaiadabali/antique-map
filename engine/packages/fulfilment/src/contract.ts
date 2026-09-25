/**
 * @contract C7 Provider interfaces — fulfilment · owner: ARC · entry `@engine/fulfilment/contract`
 *
 * Who makes and sends each merchandise line (COMMERCE.md §8, "Fulfilment routing"). The router
 * walks the rungs in order, per line; print-on-demand abroad is NOT part of the launch (D23) — it
 * switches on in v2 as a provider, with no change to the router. Never ship an Indonesian order
 * from abroad (import duty above USD 3, COMPLIANCE.md §5); never ship an international POD order
 * from Bali when a partner is closer. Providers are stateless; the domain stores the jobs.
 */
import type { CountryCode } from '@engine/config/schema'
import type { AddressInput, RawWebhook } from '@engine/domain/api'
import type { Money } from '@engine/domain/money'

/** The fulfilment routes a brand's config selects (BRANDS.md §3 `fulfilment.providers`). */
export type FulfilmentProviderId = 'own-stock' | 'local-production' | 'prodigi' | 'gelato'

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

/** A line's route for a destination — or not offered there, with the reason shown in the bag. */
export type FulfilmentDecision =
  | { readonly route: FulfilmentRoute; readonly provider: FulfilmentProviderId }
  | { readonly route: 'not-offered'; readonly reason: 'no-route-for-destination' | 'out-of-stock' }

export type RouteFulfilmentInput = {
  readonly variantId: number
  readonly quantity: number
  readonly destination: CountryCode
}

/** Pure over loaded stock and routes; DOM implements it (TASKS.md 5.12). */
export type RouteFulfilment = (input: RouteFulfilmentInput) => FulfilmentDecision

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
