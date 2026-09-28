/**
 * @contract C2 — the fixture registry, entry `@engine/view-models/fixtures` · owner: ARC
 * Consumers: WEB (the fixture loader source, TASKS.md 3.6), UXG, UXE (style guides, 3.8).
 *
 * Every fixture by name. Each is typed against its view model where it is declared, and this
 * map is checked again against `SurfaceVM`, so a fixture that drifts from its VM fails to
 * compile twice. Development, style guides and component tests only: the boot check refuses
 * `LOADERS_SOURCE=fixtures` in production. The per-surface state matrix (TASKS.md 3.8) adds
 * `./states/**` beside these.
 */
import type { Surface } from '@engine/config/routes'

import type { SurfaceVM } from '../loaders'
import type { ShellVM } from '../shell'
import type { PurchaseVM } from '../surfaces/purchase'
import * as account from './account'
import * as cart from './cart'
import {
  checkoutExport,
  checkoutConflict,
  checkoutLockExpired,
  checkoutPriceChanged,
} from './checkout-export'
import { checkoutId } from './checkout-id'
import { design } from './design'
import { makerDirectory, placeDirectory } from './directory'
import * as discovery from './discovery'
import * as editorial from './editorial'
import * as form from './form'
import { giftCard, giftCardBalance } from './gift-card'
import { homeGallery, homeShop } from './home'
import { itemEnquiryOnly } from './item-enquiry-only'
import { itemLongContent, itemWithoutHookTitle } from './item-long-content'
import { itemOnHold } from './item-on-hold'
import { itemPriceOnRequest, itemPriceRevealed } from './item-price-on-request'
import { itemSoldPriceRealised, itemSoldWithAlternative } from './item-sold-with-alternative'
import { itemUnique, itemUniqueStreaming } from './item-unique'
import { itemVariants, itemVariantsSelected } from './item-variants'
import { listing, listingEmpty, search } from './listing'
import * as order from './order'
import * as lookup from './order-lookup'
import { pay, payPaid, quoteProforma, quoteRequested } from './pay'
import { purchaseStates } from './purchase-states'
import { shell } from './shell'
import { gone, notFoundLegacy, serverError } from './status'

export const SHELL_FIXTURES = { shell } as const satisfies Readonly<Record<string, ShellVM>>

/** The purchase panel's state matrix: panels, not pages (TASKS.md 6.4). */
export const PURCHASE_STATES: Readonly<Record<string, PurchaseVM>> = purchaseStates

export const FIXTURES = {
  'home-gallery': homeGallery,
  'home-shop': homeShop,
  listing,
  'listing-empty': listingEmpty,
  search,
  'item-unique': itemUnique,
  'item-unique-streaming': itemUniqueStreaming,
  'item-sold-with-alternative': itemSoldWithAlternative,
  'item-sold-price-realised': itemSoldPriceRealised,
  'item-on-hold': itemOnHold,
  'item-price-on-request': itemPriceOnRequest,
  'item-price-revealed': itemPriceRevealed,
  'item-enquiry-only': itemEnquiryOnly,
  'item-variants': itemVariants,
  'item-variants-selected': itemVariantsSelected,
  'item-long-content': itemLongContent,
  'item-without-hook-title': itemWithoutHookTitle,
  design,
  maker: discovery.maker,
  'maker-directory': makerDirectory,
  place: discovery.place,
  'place-directory': placeDirectory,
  source: discovery.source,
  collection: discovery.collection,
  catalogue: discovery.catalogue,
  story: editorial.story,
  page: editorial.page,
  exhibition: editorial.exhibition,
  location: editorial.location,
  ig: editorial.ig,
  'newsletter-archive': editorial.newsletterArchive,
  'gift-card': giftCard,
  'gift-card-balance': giftCardBalance,
  cart: cart.cart,
  'cart-empty': cart.cartEmpty,
  'cart-problems': cart.cartWithProblems,
  'cart-unique-held': cart.cartUniqueHeld,
  'checkout-id': checkoutId,
  'checkout-export': checkoutExport,
  'checkout-conflict': checkoutConflict,
  'checkout-price-changed': checkoutPriceChanged,
  'checkout-lock-expired': checkoutLockExpired,
  'order-paid': order.orderPaid,
  'order-pending-va': order.orderPendingVa,
  'order-pending-qris': order.orderPendingQris,
  'order-retry': order.orderRetry,
  'order-manual': order.orderManual,
  'order-lookup': lookup.orderLookup,
  'order-lookup-found': lookup.orderLookupFound,
  'order-lookup-not-found': lookup.orderLookupNotFound,
  'order-lookup-rate-limited': lookup.orderLookupRateLimited,
  pay,
  'pay-paid': payPaid,
  'quote-proforma': quoteProforma,
  'quote-requested': quoteRequested,
  'account-signed-out': account.accountSignedOut,
  'account-overview': account.accountOverview,
  'account-wishlist': account.accountWishlist,
  'account-want-lists': account.accountWantLists,
  'account-offers': account.accountOffers,
  'account-price-requests': account.accountPriceRequests,
  'account-viewings': account.accountViewings,
  'account-consignments': account.accountConsignments,
  'form-enquiry': form.formEnquiry,
  'form-offer': form.formOffer,
  'form-consignment': form.formConsignment,
  'form-appointment': form.formAppointment,
  'form-wholesale': form.formWholesale,
  'form-invalid': form.formInvalid,
  'not-found-legacy': notFoundLegacy,
  gone,
  error: serverError,
} as const satisfies Readonly<Record<string, SurfaceVM>>

export type FixtureName = keyof typeof FIXTURES

// ─── Type-level test: every surface has at least one fixture ─────────────────────────────

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T
type _EverySurfaceHasAFixture = Assert<Equals<(typeof FIXTURES)[FixtureName]['surface'], Surface>>
