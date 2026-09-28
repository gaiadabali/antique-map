/**
 * @contract C11 Analytics events · owner: ARC · entry `@engine/analytics/events`
 *
 * The event taxonomy (ANALYTICS.md §2). Names are `object.verb`, past tense: add to the list,
 * never rename one — dashboards depend on the string. Two sources, never mixed:
 * - beacon events, sent by the page to `POST /api/x/collect` (cookieless until consent);
 * - domain events, forwarded only by the outbox dispatcher after commit, so revenue that rolled
 *   back never reaches a dashboard or an ad platform (ANALYTICS.md §1).
 * No PII in any event — ids and categories only; the foot of this file proves no prop is named
 * for an email, a phone number, a name or an address.
 */
import type { Surface } from '@engine/config/routes'
import type { InventoryModel, LocaleCode, ProductKind } from '@engine/config/schema'
import type { CheckoutStepId, EnquiryTopic, IsoInstant } from '@engine/domain/api'
import type { DomainEventName } from '@engine/domain/events'
import type { AvailabilityState } from '@engine/domain/machines/availability'
import type { PaymentFailureClass, PaymentMethodId } from '@engine/domain/machines/payment'
import type { Money } from '@engine/domain/money'

/** C1's catalogue vocabularies, imported: each list has one home (`schema/catalogue`). */
export type { InventoryModel, ProductKind } from '@engine/config/schema'

/** The surfaces of DESIGN-SYSTEM.md §2 — C10's route-map keys, imported, never repeated. */
export type SurfaceName = Surface

export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

/**
 * `search.submitted.query` is the one free-text prop, and a visitor may type an email address or
 * a phone number into a search box. `/api/x/collect` redacts it before it is stored — email- and
 * phone-shaped runs become `[email]` / `[phone]` — and cuts it to this many characters; the
 * browser's copy is never trusted to have done so.
 */
export const SEARCH_QUERY_MAX_CHARS = 100

/** A purchase tier of the brand's config (`commerce.purchaseTiers`, by position) — never an amount. */
export type PriceBand = `tier-${number}` | 'on-request' | 'none'

type NoProps = Record<never, never>
/** A product by its public id — the number in its URL. */
type OnItem = { readonly productId: number }

export type BeaconEventProps = {
  // Discovery
  readonly 'listing.viewed': { readonly facets: readonly string[]; readonly resultCount: number }
  readonly 'facet.applied': { readonly facet: string; readonly value: string }
  readonly 'search.submitted': {
    /** Redacted and capped server-side (SEARCH_QUERY_MAX_CHARS) before it is stored. */
    readonly query: string
    readonly resultCount: number
    readonly zeroResults: boolean
  }
  readonly 'place.viewed': { readonly placeSlug: string }
  readonly 'maker.viewed': { readonly makerSlug: string }
  readonly 'curation.viewed': { readonly curationSlug: string }
  readonly 'story.viewed': { readonly storySlug: string }
  readonly 'reading.depth': {
    readonly depth: 25 | 50 | 75 | 100
    readonly content: 'story' | 'essay'
    readonly slug: string
  }
  // Item
  readonly 'item.viewed': OnItem & {
    readonly kind: ProductKind
    readonly inventoryModel: InventoryModel
    readonly priceBand: PriceBand
    readonly status: AvailabilityState
  }
  readonly 'item.zoomed': OnItem & { readonly imageRole: string; readonly maxZoom: number }
  readonly 'item.versoViewed': OnItem
  readonly 'item.roomViewOpened': OnItem
  readonly 'item.factsheetDownloaded': OnItem
  readonly 'item.shared': OnItem & {
    readonly channel: 'whatsapp' | 'email' | 'copy-link' | 'native' | 'facebook' | 'pinterest'
  }
  readonly 'item.saved': OnItem
  readonly 'alert.created': {
    readonly kind: 'want-list' | 'item-alert'
    readonly surface: SurfaceName
  }
  readonly 'sister.clicked': {
    readonly direction: 'to-original' | 'to-prints'
    readonly workUid: string
  }
  readonly 'configurator.changed': OnItem & { readonly axis: string }
  readonly 'configurator.completed': OnItem & { readonly variantId: number }
  // Leads — the gallery's real funnel
  readonly 'price.requested': OnItem
  readonly 'offer.submitted': OnItem
  readonly 'hold.requested': OnItem
  readonly 'enquiry.submitted': { readonly topic: EnquiryTopic; readonly productId: number | null }
  readonly 'viewing.booked': { readonly locationId: string }
  readonly 'consignment.submitted': NoProps
  readonly 'whatsapp.clicked': { readonly context: 'item' | 'checkout' | 'footer' | 'business' }
  // Purchase
  /** `value` is the price the page displayed, for GA4's add_to_cart — commerce never reads it. */
  readonly 'cart.added': OnItem & {
    readonly variantId: number | null
    readonly quantity: number
    readonly value: Money | null
  }
  readonly 'cart.removed': OnItem & { readonly variantId: number | null; readonly quantity: number }
  readonly 'cart.viewed': { readonly lineCount: number }
  readonly 'checkout.started': { readonly lineCount: number }
  readonly 'checkout.stepCompleted': { readonly step: CheckoutStepId }
  readonly 'checkout.lockTaken': { readonly lineCount: number }
  readonly 'checkout.lockExpired': NoProps
  readonly 'payment.methodSelected': { readonly method: PaymentMethodId }
  readonly 'payment.attempted': { readonly method: PaymentMethodId }
  readonly 'payment.failed': {
    readonly method: PaymentMethodId
    /** The same classes a provider's `failed` event carries (C7). */
    readonly reasonClass: PaymentFailureClass
  }
  // People and performance
  readonly 'newsletter.subscribed': { readonly surface: SurfaceName }
  readonly 'newsletter.confirmed': NoProps
  readonly 'account.created': NoProps
  readonly 'account.signedIn': NoProps
  readonly 'consent.updated': { readonly analytics: boolean; readonly marketing: boolean }
  /** Field data, per surface and device class — not just lab numbers. */
  readonly 'vitals.reported': {
    readonly metric: 'LCP' | 'INP' | 'CLS'
    readonly value: number
    readonly surface: SurfaceName
    readonly deviceClass: DeviceClass
  }
}

export type BeaconEventName = keyof BeaconEventProps

/** What every beacon event carries besides its props. */
export type BeaconContext = {
  readonly at: IsoInstant
  readonly surface: SurfaceName
  readonly locale: LocaleCode
  /** The ship-to market's id, when one is set. */
  readonly market: string | null
  readonly deviceClass: DeviceClass
  /** A per-session hashed id: all there is until analytics consent. */
  readonly sessionId: string
  /** A persistent anonymous id — only after analytics consent. */
  readonly anonymousId: string | null
}

export type BeaconEvent = {
  [N in BeaconEventName]: { readonly name: N; readonly props: BeaconEventProps[N] }
}[BeaconEventName] &
  BeaconContext

/** One `POST /api/x/collect`: batched, at most one request per 5 s per tab, fire-and-forget. */
export type CollectRequest = { readonly events: readonly BeaconEvent[] }
export const COLLECT_MAX_EVENTS_PER_REQUEST = 50

/**
 * The domain events analytics consumes, from the outbox only (ANALYTICS.md §2, "from the domain").
 * `order.refunded` and `order.partiallyRefunded` come only for the attempt that paid the order: a
 * late or duplicate payment given back reverses no revenue, so it never reaches a dashboard.
 */
export const DOMAIN_ANALYTICS_EVENTS = [
  'order.paid',
  'order.refunded',
  // GA4's refund takes a partial value too.
  'order.partiallyRefunded',
  'offer.accepted',
  'hold.granted',
  'hold.expired',
  'reservation.conflicted',
] as const satisfies readonly DomainEventName[]
export type DomainAnalyticsEvent = (typeof DOMAIN_ANALYTICS_EVENTS)[number]

/** Values in the charge currency, with the order's FX snapshot kept server-side (never recomputed). */
export type DomainAnalyticsProps = {
  readonly 'order.paid': {
    readonly orderId: number
    readonly value: Money
    readonly lineCount: number
  }
  readonly 'order.refunded': { readonly orderId: number; readonly value: Money }
  readonly 'order.partiallyRefunded': { readonly orderId: number; readonly value: Money }
  readonly 'offer.accepted': OnItem
  readonly 'hold.granted': OnItem
  readonly 'hold.expired': OnItem
  readonly 'reservation.conflicted': OnItem & { readonly state: 'held' | 'sold' }
}

export type AnalyticsEventName = BeaconEventName | DomainAnalyticsEvent

/** To GA4, consented only (ANALYTICS.md §2 mapping). Shipping and payment steps map by step. */
export const GA4_EVENTS = {
  'listing.viewed': 'view_item_list',
  'item.viewed': 'view_item',
  'item.saved': 'add_to_wishlist',
  'cart.added': 'add_to_cart',
  'cart.removed': 'remove_from_cart',
  'checkout.started': 'begin_checkout',
  'order.paid': 'purchase',
  'order.refunded': 'refund',
  'order.partiallyRefunded': 'refund',
  'price.requested': 'generate_lead',
  'offer.submitted': 'generate_lead',
  'enquiry.submitted': 'generate_lead',
  'viewing.booked': 'generate_lead',
  'search.submitted': 'search',
  'newsletter.confirmed': 'sign_up',
} as const satisfies { readonly [N in AnalyticsEventName]?: string }
export const GA4_CHECKOUT_STEPS = {
  shipping: 'add_shipping_info',
  payment: 'add_payment_info',
} as const satisfies { readonly [S in CheckoutStepId]?: string }

/** To the Meta Pixel, consented only. */
export const META_EVENTS = {
  'item.viewed': 'ViewContent',
  'item.saved': 'AddToWishlist',
  'cart.added': 'AddToCart',
  'checkout.started': 'InitiateCheckout',
  'order.paid': 'Purchase',
  'price.requested': 'Lead',
  'offer.submitted': 'Lead',
  'enquiry.submitted': 'Lead',
  'viewing.booked': 'Lead',
  'search.submitted': 'Search',
  'newsletter.confirmed': 'Subscribe',
} as const satisfies { readonly [N in AnalyticsEventName]?: string }
export const META_CHECKOUT_STEPS = {
  payment: 'AddPaymentInfo',
} as const satisfies { readonly [S in CheckoutStepId]?: string }

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Assert<T extends true> = T
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type PiiKey = 'email' | 'phone' | 'whatsapp' | 'name' | 'fullName' | 'address' | 'ip'
type AllTrue<R> = false extends R[keyof R] ? false : true
type IsPiiFree<T> = T extends readonly (infer E)[]
  ? IsPiiFree<E>
  : T extends object
    ? [Extract<keyof T, PiiKey>] extends [never]
      ? AllTrue<{ [K in keyof T]-?: IsPiiFree<T[K]> }>
      : false
    : true

// One fact is never counted twice: no beacon event shares a name with a domain event.
type _BeaconAndDomainDisjoint = Assert<Equals<Extract<BeaconEventName, DomainEventName>, never>>
// Every domain event analytics consumes has its props, and nothing else has.
type _DomainPropsCoverTheList = Assert<Equals<keyof DomainAnalyticsProps, DomainAnalyticsEvent>>
type _BeaconPropsArePiiFree = Assert<IsPiiFree<BeaconEventProps>>
type _BeaconContextIsPiiFree = Assert<IsPiiFree<BeaconContext>>
type _DomainPropsArePiiFree = Assert<IsPiiFree<DomainAnalyticsProps>>
type _EmailRejected = Assert<
  // @ts-expect-error — an email address never enters the events table
  IsPiiFree<BeaconEventProps['cart.viewed'] & { readonly email: string }>
>
