/**
 * @contract C11 Analytics events — to GA4 and Meta · owner: ARC · via `@engine/analytics/events`
 *
 * Which of our events the consented client tags send, and as what (ANALYTICS.md §2 mapping):
 * loaded only after marketing consent, with the brand's runtime ids (C2 `ShellVM.analytics`).
 * Values go in the charge currency, as the event carries them. GA4 and Meta take MAJOR units, so
 * the tag divides a Money's minor units by 10 to the power of `CURRENCY_EXPONENT[currency]` (C1)
 * at the call — IDR is 0, never a hard-coded 100 — and sends nothing it would have to round.
 */
import type { CheckoutStepId } from '@engine/domain/api'

import type { BeaconEventName } from './beacon'
import type { DomainAnalyticsEvent } from './domain'

type Named = BeaconEventName | DomainAnalyticsEvent

/** To GA4, consented only. Shipping and payment steps map by step. */
export const GA4_EVENTS = {
  'listing.viewed': 'view_item_list',
  'item.viewed': 'view_item',
  'item.saved': 'add_to_wishlist',
  // GA4 recommends no event for a removal: a custom one, so an audience can drop the item (D35).
  'item.unsaved': 'remove_from_wishlist',
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
  'retailerApplication.submitted': 'generate_lead',
  'search.submitted': 'search',
  'newsletter.confirmed': 'sign_up',
} as const satisfies { readonly [N in Named]?: string }
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
  'retailerApplication.submitted': 'Lead',
  'search.submitted': 'Search',
  'newsletter.confirmed': 'Subscribe',
} as const satisfies { readonly [N in Named]?: string }
export const META_CHECKOUT_STEPS = {
  payment: 'AddPaymentInfo',
} as const satisfies { readonly [S in CheckoutStepId]?: string }
