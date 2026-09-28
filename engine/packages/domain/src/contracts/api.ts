/**
 * @contract C6 Commerce API · owner: ARC · entry `@engine/domain/api`
 *
 * Every request and response shape the storefronts use to buy, ask and track (PARALLEL-TRACKS.md
 * §4): DOM implements the operations (handlers in `http/src/commerce/**`, thin), the apps call
 * them, and C13 maps each operation to its `/api/x/*` route. `CommerceApi` names every operation
 * with its request, its answer and the problems it may return — and the foot of this file proves,
 * at compile time, that no request can carry a price.
 *
 * Without JavaScript (C13): an HTML form post answers 303 back to its page, and the answer waits
 * on the server, briefly, under a cookie that holds only an opaque id. Every answer here is plain
 * JSON (proved below), so any can wait that way. One that carries a token — an order lookup's, a
 * quote's, a pay link's, a return's, an enquiry's — waits like a secret: short-lived, read once,
 * bound to the browser that posted, never logged. `retailer.apply`'s is the same for everyone.
 */
import type { Money } from '../money/contract'
import type {
  OrderLookupRequest,
  OrderLookupView,
  ProformaRequest,
  QuoteAcceptRequest,
  QuoteGetRequest,
  QuoteRequest,
  QuoteView,
  ReturnRequest,
  ReturnRequestView,
} from './after-sale'
import type * as Cart from './cart'
import type * as Checkout from './checkout'
import type * as Leads from './leads'
import type { IsServerPriced, LineInput } from './requests'
import type { ApiResult, ProblemCode, ProblemOf } from './results'
import type * as Retailers from './retailers'
import type { JsonValue } from './scalars'
import type * as Services from './services'
import type { Assert, Equals } from './type-assertions'

export type * from './after-sale'
export type * from './cart'
export type * from './checkout'
export type * from './leads'
export type * from './requests'
export type * from './results'
export type * from './retailers'
export type * from './services'
/** The wire vocabulary other contracts share (C7, C12): instants, durations, raw webhooks. */
export type * from './scalars'

/** Problems any operation may return. */
type Always = 'invalid' | 'rate-limited' | 'not-offered'

/**
 * One operation: its request, its answer, and `ClientAmounts` — the keys where a client amount is
 * allowed, each one justified in the request's own documentation. Today only the offer's bid.
 */
type Op<Req, Res, P extends ProblemCode = never, ClientAmounts extends PropertyKey = never> = {
  readonly request: Req
  readonly response: ApiResult<Res, ProblemOf<P | Always>>
  readonly clientAmounts: ClientAmounts
}

type Priced = 'price-changed' | 'reservation-conflict' | 'line-not-routable' | 'expired'

export type CommerceApi = {
  readonly 'cart.get': Op<Cart.EmptyRequest, Cart.CartView>
  readonly 'cart.addLines': Op<Cart.CartAddLinesRequest, Cart.CartView, 'not-found'>
  readonly 'cart.updateLine': Op<Cart.CartUpdateLineRequest, Cart.CartView, 'not-found'>
  readonly 'cart.removeLine': Op<Cart.CartRemoveLineRequest, Cart.CartView, 'not-found'>
  readonly 'cart.applyCode': Op<Cart.CartApplyCodeRequest, Cart.CartView, 'code-invalid'>
  readonly 'cart.removeCode': Op<Cart.CartRemoveCodeRequest, Cart.CartView, 'not-found'>
  readonly 'cart.setGiftOptions': Op<Cart.CartGiftOptionsRequest, Cart.CartView>
  readonly 'shipTo.set': Op<Cart.ShipToRequest, Cart.ShipToResult>
  readonly 'giftCard.balance': Op<
    Cart.GiftCardBalanceRequest,
    Cart.GiftCardBalanceView,
    'code-invalid'
  >
  readonly 'checkout.start': Op<
    Checkout.CheckoutStartRequest,
    Checkout.CheckoutView,
    'not-found' | 'line-not-routable'
  >
  readonly 'checkout.contact': Op<
    Checkout.CheckoutContactRequest,
    Checkout.CheckoutView,
    'not-found' | 'expired'
  >
  readonly 'checkout.delivery': Op<
    Checkout.CheckoutDeliveryRequest,
    Checkout.CheckoutView,
    'not-found' | 'expired' | 'line-not-routable'
  >
  readonly 'checkout.shipping': Op<
    Checkout.CheckoutShippingRequest,
    Checkout.CheckoutView,
    'not-found' | 'expired'
  >
  readonly 'checkout.continue': Op<
    Checkout.CheckoutContinueRequest,
    Checkout.CheckoutView,
    'not-found' | Priced
  >
  readonly 'payment.start': Op<
    Checkout.PaymentStartRequest,
    Checkout.PaymentStarted,
    'not-found' | 'method-unavailable' | Priced
  >
  readonly 'payment.status': Op<
    Checkout.PaymentStatusRequest,
    Checkout.PaymentStatusView,
    'not-found'
  >
  readonly 'payLink.get': Op<Checkout.PayLinkGetRequest, Checkout.PayLinkView, 'not-found'>
  readonly 'payLink.start': Op<
    Checkout.PayLinkStartRequest,
    Checkout.PaymentStarted,
    'not-found' | 'method-unavailable' | Priced
  >
  readonly 'offer.submit': Op<
    Leads.OfferSubmitRequest,
    Leads.OfferView,
    'not-found' | 'reservation-conflict',
    'proposal'
  >
  readonly 'offer.respond': Op<
    Leads.OfferRespondRequest,
    Leads.OfferView,
    'not-found' | 'expired' | 'reservation-conflict',
    'proposal'
  >
  readonly 'hold.request': Op<
    Leads.HoldRequest,
    Leads.HoldRequestView,
    'not-found' | 'reservation-conflict'
  >
  readonly 'priceRequest.submit': Op<Leads.PriceRequest, Leads.PriceRequestResult, 'not-found'>
  readonly 'enquiry.submit': Op<Services.EnquiryRequest, Services.EnquiryReceipt, 'not-found'>
  readonly 'consignment.submit': Op<Services.ConsignmentRequest, Services.ConsignmentReceipt>
  readonly 'retailer.apply': Op<
    Retailers.RetailerApplyRequest,
    Retailers.RetailerApplicationReceipt
  >
  readonly 'appointment.slots': Op<
    Services.AppointmentSlotsRequest,
    Services.AppointmentSlotsView,
    'not-found'
  >
  readonly 'appointment.book': Op<
    Services.AppointmentBookRequest,
    Services.AppointmentView,
    'not-found' | 'slot-unavailable'
  >
  readonly 'appointment.change': Op<
    Services.AppointmentChangeRequest,
    Services.AppointmentView,
    'not-found' | 'slot-unavailable'
  >
  readonly 'orderLookup.find': Op<OrderLookupRequest, OrderLookupView, 'not-found'>
  readonly 'return.request': Op<
    ReturnRequest,
    ReturnRequestView,
    'not-found' | 'expired' | 'not-returnable'
  >
  readonly 'quote.proforma': Op<ProformaRequest, QuoteView, 'not-found' | Priced>
  readonly 'quote.request': Op<QuoteRequest, QuoteView, 'not-found' | 'line-not-routable'>
  readonly 'quote.reorder': Op<Retailers.QuoteReorderRequest, QuoteView, 'not-found'>
  readonly 'quote.get': Op<QuoteGetRequest, QuoteView, 'not-found'>
  readonly 'quote.accept': Op<QuoteAcceptRequest, QuoteView, 'not-found' | Priced>
}

export type CommerceOperation = keyof CommerceApi
export type RequestOf<O extends CommerceOperation> = CommerceApi[O]['request']
export type ResponseOf<O extends CommerceOperation> = CommerceApi[O]['response']

// ─── Type-level tests: requests never carry a trusted price ──────────────────────────────────

type EveryRequestServerPriced = {
  [O in CommerceOperation]: IsServerPriced<RequestOf<O>, CommerceApi[O]['clientAmounts']>
}
type _NoRequestCarriesAPrice = Assert<Equals<EveryRequestServerPriced[CommerceOperation], true>>
type _OnlyTheBidIsAClientAmount = Assert<
  Equals<CommerceApi[CommerceOperation]['clientAmounts'], 'proposal'>
>

type PricedLine = LineInput & { readonly unitPrice: Money }
type _PricedLineRejected = Assert<
  // @ts-expect-error — a bag line that arrives carrying its own price buys nothing
  IsServerPriced<{ readonly lines: readonly PricedLine[] }>
>
type _BareTotalRejected = Assert<
  // @ts-expect-error — a total smuggled as a bare number is still caught, by its name
  IsServerPriced<Checkout.CheckoutContinueRequest & { readonly total: number }>
>
type _BidOnlyWhereDeclared = Assert<
  // @ts-expect-error — the bid is allowed only on the operations that declare it
  IsServerPriced<Leads.OfferSubmitRequest>
>
type _BidOnlyAtTheTop = Assert<
  // @ts-expect-error — the bid's name is exempt at the request's top level, never below it
  IsServerPriced<{ readonly offer: { readonly proposal: Money } }, 'proposal'>
>
type _NewFigureNamesCaught = Assert<
  // @ts-expect-error — a deposit is a figure only the server computes
  IsServerPriced<Leads.HoldRequest & { readonly deposit: number }>
>
type _NoTierFromARequest = Assert<
  // @ts-expect-error — a trade tier is the server's to resolve for an approved retailer (D32)
  IsServerPriced<Cart.CartAddLinesRequest & { readonly tradeTierId: string }>
>

// ─── Type-level tests: every answer can wait on the server for a page without JavaScript ─────

type EveryAnswerIsJson = {
  [O in CommerceOperation]: [ResponseOf<O>] extends [JsonValue] ? true : false
}
type _EveryAnswerIsJson = Assert<Equals<EveryAnswerIsJson[CommerceOperation], true>>
type _NoDateInAnAnswer = Assert<
  // @ts-expect-error — a Date object is not JSON: an instant crosses the wire as `IsoInstant`
  [ApiResult<{ readonly at: Date }>] extends [JsonValue] ? true : false
>
