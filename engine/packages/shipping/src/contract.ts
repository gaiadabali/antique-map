/**
 * @contract C7 Provider interfaces — shipping · owner: ARC · entry `@engine/shipping/contract`
 *
 * Rates, labels and tracking for every courier through one seam (COMMERCE.md §8). Adapters are
 * stateless translators, like payments': they quote, book and normalise tracking; the domain
 * prices (the pipeline's shipping stage takes the chosen rate as its input) and stores shipments.
 * A courier's price arrives in the courier's currency and the domain converts it at the
 * `fx-conversion` rounding point — an adapter never converts or rounds money. Delivery promises
 * are the domain's too: an adapter reports the courier's own estimate, and the domain moves it
 * past the holiday calendar's closures (Nyepi, Lebaran) and keeps only what arrives before a
 * visitor's deliver-before date — one calendar, applied the same way to every courier.
 */
import type { CountryCode, ShippingProviderId, SellerConfig } from '@engine/config/schema'
import type { AddressInput, EventIdRule, RawWebhook, ShipmentStatus } from '@engine/domain/api'
import type { Money } from '@engine/domain/money'

export type { ShipmentStatus } from '@engine/domain/api'
/** The rate sources a brand's config selects — C1's (`shipping.providers`), never redeclared. */
export type { ShippingProviderId } from '@engine/config/schema'

/**
 * How a product travels (COMMERCE.md §8). A const list, so the CMS select and the type are one:
 * `tube` only for sturdy posters and large wall maps; `pickup-only` for glass-glazed frames
 * outside Bali.
 */
export const SHIPPING_PROFILES = [
  'flat-portfolio',
  'framed-crate',
  'tube',
  'parcel',
  'oversize',
  'digital',
  'pickup-only',
] as const
export type ShippingProfile = (typeof SHIPPING_PROFILES)[number]

export type Parcel = {
  readonly profile: ShippingProfile
  readonly weightGrams: number
  readonly dimensionsMm: {
    readonly length: number
    readonly width: number
    readonly height: number
  }
  /** For cover and customs; above the seller's insured threshold the rate is `quote-required`. */
  readonly declaredValue: Money
}

export type RateRequest = {
  readonly seller: SellerConfig
  readonly origin: { readonly locationId: string; readonly country: CountryCode }
  /** Indonesian addresses resolve to the courier's area id; the rest by postal code and city. */
  readonly destination: {
    readonly country: CountryCode
    readonly areaId: string | null
    readonly postalCode: string | null
    readonly city: string | null
  }
  readonly parcels: readonly Parcel[]
  /** The instant the rates are asked for, for their validity. */
  readonly at: Date
}

export type RateQuote = {
  readonly provider: ShippingProviderId
  /** The provider's service code, sent back to book this exact service. */
  readonly serviceCode: string
  readonly carrier: string
  readonly service: string
  /** In the courier's currency; converted by the domain at the `fx-conversion` point. */
  readonly price: Money
  /** The courier's own estimate, in days from dispatch; closures are the domain's to add. */
  readonly eta: { readonly minDays: number; readonly maxDays: number } | null
  readonly sameDay: boolean
  /** What the courier covers, if anything: couriers cap art (FedEx USD 1,000 declared). */
  readonly coverLimit: Money | null
  /** The seller's `flat` table standing in during a courier outage — labelled as an estimate. */
  readonly isEstimate: boolean
  readonly validUntil: Date | null
}

/**
 * Rates, or why there are none. `quote-required` never guesses: originals above the insured
 * threshold, oversize and framed work are quoted with a separate fine-art transit policy.
 */
export type RatesResult =
  | { readonly kind: 'rates'; readonly quotes: readonly RateQuote[] }
  | {
      readonly kind: 'quote-required'
      readonly reason: 'insured-threshold' | 'oversize' | 'fine-art'
    }
  | { readonly kind: 'unavailable'; readonly reason: 'provider-down' | 'not-served' }

export type ShipmentInput = {
  readonly orderRef: string
  /** Idempotent: booking twice with one key books one shipment. */
  readonly idempotencyKey: string
  readonly serviceCode: string
  readonly from: { readonly locationId: string }
  readonly to: AddressInput
  readonly parcels: readonly Parcel[]
  /** International shipments carry HS codes for the generated commercial invoice. */
  readonly customs: {
    readonly hsCodes: readonly string[]
    readonly terms: 'DAP' | 'DDP'
  } | null
  /** The separate fine-art transit policy, recorded on the shipment, where one applies. */
  readonly fineArtPolicyRef: string | null
}

export type ShipmentBooked = {
  readonly shipmentRef: string
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
  readonly labelUrl: string | null
}

/** A courier's news, normalised. `providerEventId` dedupes a repeated delivery. */
export type ShipmentEvent = {
  readonly provider: ShippingProviderId
  readonly providerEventId: string
  readonly shipmentRef: string
  readonly status: ShipmentStatus
  readonly occurredAt: Date
  readonly description: string
  readonly location: string | null
}

export type ParsedShippingWebhook =
  | { readonly kind: 'events'; readonly events: readonly ShipmentEvent[] }
  | { readonly kind: 'bad-signature' }
  | { readonly kind: 'ignored'; readonly reason: string }

export type ShippingProvider = {
  readonly id: ShippingProviderId
  rates(request: RateRequest): Promise<RatesResult>
  /** Absent for `flat`, `quote` and `collect`: staff book those by hand. */
  book?(input: ShipmentInput): Promise<ShipmentBooked>
  /** Polled where a courier pushes nothing; its events dedupe by the same rule as a webhook's. */
  track?(shipmentRef: string): Promise<readonly ShipmentEvent[]>
  parseWebhook?(request: RawWebhook): Promise<ParsedShippingWebhook>
  cancel?(shipmentRef: string): Promise<void>
}

// ─── The providerEventId rule, per adapter ───────────────────────────────────────────────────

/** A tracking notification's fields, named for what they mean; each adapter maps its own paths. */
export type ShipmentHashField = 'shipment-id' | 'status' | 'occurred-at' | 'location'

/**
 * How each adapter derives `ShipmentEvent.providerEventId` (C5–C8 `EventIdRule`). Couriers rarely
 * send an event id, so the state hash is the default — always safe: a repeated delivery or a
 * re-polled event gives the same key, a new scan a new one. LOG confirms against recorded sandbox
 * fixtures whether Biteship sends a native id; a courier added later declares its rule here.
 */
export const SHIPPING_EVENT_ID_RULES = {
  biteship: { kind: 'state-hash', fields: ['shipment-id', 'status', 'occurred-at'] },
  'dhl-express': {
    kind: 'state-hash',
    fields: ['shipment-id', 'status', 'occurred-at', 'location'],
  },
  flat: { kind: 'staff-entry' },
  quote: { kind: 'staff-entry' },
  collect: { kind: 'staff-entry' },
} as const satisfies { readonly [P in ShippingProviderId]: EventIdRule<ShipmentHashField> }
