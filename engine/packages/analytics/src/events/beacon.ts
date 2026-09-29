/**
 * @contract C11 Analytics events — the beacon: what a page sends · owner: ARC · via `@engine/analytics/events`
 *
 * Events a page sends to `POST /api/x/collect` (cookieless until consent, ANALYTICS.md §1), each
 * with props the page can know: they come from its own view model (C2), never from a guess — the
 * item's price band and availability from the streamed purchase panel, a sister link's work from
 * the link. What only the server knows — the session, the anonymous id, the ship-to market — the
 * page never sends: `/api/x/collect` stamps it on arrival (`CollectedContext`).
 */
import type { Surface } from '@engine/config/routes'
import type { InventoryModel, LocaleCode, ProductKind, PurchaseBand } from '@engine/config/schema'
import type { CheckoutStepId, EnquiryTopic, IsoInstant, RetailerShopType } from '@engine/domain/api'
import type { IsPiiFree } from '@engine/domain/events'
import type { AvailabilityState } from '@engine/domain/machines/availability'
import type { PaymentFailureClass, PaymentMethodId } from '@engine/domain/machines/payment'
import type { Money } from '@engine/domain/money'
import type { ImageRole } from '@engine/media/contract'

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

/** A purchase tier of the brand's config, by position, or why there is none — never an amount. */
export type PriceBand = PurchaseBand

type NoProps = Record<never, never>
/** A product by its public id — the number in its URL. */
type OnItem = { readonly productId: number }
/** Which item, which form of it, and how many the list holds after the change. */
type WishlistChange = OnItem & { readonly variantId: number | null; readonly listSize: number }

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
  /**
   * Sent once the purchase panel resolves: `priceBand` and `status` are its `analytics` (C2
   * `PurchaseVM`), which only the streamed part knows; `status` is null when availability could
   * not be read (the `unverified` panel).
   */
  readonly 'item.viewed': OnItem & {
    readonly kind: ProductKind
    readonly inventoryModel: InventoryModel
    readonly priceBand: PriceBand
    readonly status: AvailabilityState | null
  }
  /** The image's C9 role, as its view model gives it (`ImageVM.role`). */
  readonly 'item.zoomed': OnItem & {
    readonly imageRole: ImageRole | null
    readonly maxZoom: number
  }
  readonly 'item.versoViewed': OnItem
  readonly 'item.roomViewOpened': OnItem
  readonly 'item.factsheetDownloaded': OnItem
  readonly 'item.shared': OnItem & {
    readonly channel: 'whatsapp' | 'email' | 'copy-link' | 'native' | 'facebook' | 'pinterest'
  }
  /**
   * The wishlist (D35). On the shop it lives on the guest's device — no account, no C6 operation
   * — so these are the only record the server keeps of it, and only as consent allows
   * (ANALYTICS.md §1: cookieless before analytics consent; GA4 and Meta after marketing consent).
   * The surface it happened on is the context's; the list itself is never sent as an event.
   */
  readonly 'item.saved': WishlistChange
  readonly 'item.unsaved': WishlistChange
  /**
   * A want list asked for (C6 `wantList.subscribe`; an address's is pending until confirmed), with
   * the surface of what it watches — a listing's, an item's. The demand dashboard counts the
   * domain's `wantList.started` (`./domain`), never this.
   */
  readonly 'alert.created': {
    readonly kind: 'want-list' | 'item-alert'
    readonly surface: SurfaceName
  }
  /** `workUid` is the link's own (C2 `SisterLinkVM.workUid`). */
  readonly 'sister.clicked': {
    readonly direction: 'to-original' | 'to-prints'
    readonly workUid: string
  }
  readonly 'configurator.changed': OnItem & { readonly axis: string }
  readonly 'configurator.completed': OnItem & { readonly variantId: number }
  // Leads — the gallery's real funnel: GA4's `generate_lead` and the funnel's steps. The Leads
  // dashboard counts the domain's records (`./domain`), which a failed post or a blocked script
  // cannot move.
  readonly 'price.requested': OnItem
  readonly 'offer.submitted': OnItem
  readonly 'hold.requested': OnItem
  readonly 'enquiry.submitted': { readonly topic: EnquiryTopic; readonly productId: number | null }
  readonly 'viewing.booked': { readonly locationId: string }
  readonly 'consignment.submitted': NoProps
  /** `business`: the Partnership page (D36), the one place a business buyer is addressed. */
  readonly 'whatsapp.clicked': { readonly context: 'item' | 'checkout' | 'footer' | 'business' }
  /** The Partnership application sent (D31, D36): the kind of business, never who it is. */
  readonly 'retailerApplication.submitted': { readonly shopType: RetailerShopType }
  // Purchase
  /**
   * `value` is the added line's `subtotal` as the cart's answer states it (C6 `CartLineView`) —
   * the unit's `charge` × quantity, in the charge currency, before discounts: the server's
   * figure, never an estimate and never multiplied in the page. GA4's add_to_cart only.
   */
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
  /** The method and class the page's retry state names (C2 `payment-failed`, `retry`), C7's classes. */
  readonly 'payment.failed': {
    readonly method: PaymentMethodId
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

/** What a page sends with every event besides its props: only what the page knows. */
export type BeaconContext = {
  readonly at: IsoInstant
  readonly surface: SurfaceName
  readonly locale: LocaleCode
  readonly deviceClass: DeviceClass
}

/**
 * What `/api/x/collect` stamps on each event it stores — read from the request, never taken from
 * the page, which cannot know it or could forge it:
 * - `sessionId` — cookieless: a hash of a secret salt that rotates daily and is then discarded,
 *   the site, the client's address and its user agent. Nothing is stored that could reverse it.
 * - `anonymousId` — the persistent id collect keeps in its own HttpOnly cookie
 *   (`ANONYMOUS_ID_COOKIE`), set and read only while the visitor's consent allows analytics.
 * - `market` — the ship-to market's id, from the `shipTo` cookie; null before one is set.
 */
export type CollectedContext = {
  readonly sessionId: string
  readonly anonymousId: string | null
  readonly market: string | null
}
export const ANONYMOUS_ID_COOKIE = { cookie: 'anon_id', maxAgeDays: 390 } as const

export type BeaconEvent = {
  [N in BeaconEventName]: { readonly name: N; readonly props: BeaconEventProps[N] }
}[BeaconEventName] &
  BeaconContext

/** A beacon event as stored in `analytics_events`: what the page sent, stamped by collect. */
export type CollectedEvent = BeaconEvent & CollectedContext

/** One `POST /api/x/collect`: batched, at most one request per 5 s per tab, fire-and-forget. */
export type CollectRequest = { readonly events: readonly BeaconEvent[] }
export const COLLECT_MAX_EVENTS_PER_REQUEST = 50

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Assert<T extends true> = T
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
// `IsPiiFree` is the outbox's (C8 `PiiKey`): one list of names no event may carry.

type _BeaconPropsArePiiFree = Assert<IsPiiFree<BeaconEventProps>>
type _BeaconContextIsPiiFree = Assert<IsPiiFree<BeaconContext & CollectedContext>>
type _EmailRejected = Assert<
  // @ts-expect-error — an email address never enters the events table
  IsPiiFree<BeaconEventProps['cart.viewed'] & { readonly email: string }>
>
// The page sends nothing collect stamps: a session, an anonymous id or a market is the server's.
type _PageSendsNoServerFact = Assert<
  Equals<Extract<keyof BeaconContext, keyof CollectedContext>, never>
>
// D35: a wishlist change names one item and a count — the list's contents never leave the device.
type _WishlistNamesOneItem = Assert<
  Equals<keyof BeaconEventProps['item.unsaved'], 'productId' | 'variantId' | 'listSize'>
>
