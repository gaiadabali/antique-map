/**
 * @contract C2 — the fixture registry, entry `@engine/view-models/fixtures` · owner: ARC
 * Consumers: WEB (the fixture loader source, TASKS.md 11.3), UXG, UXE (style guides, 11.4).
 *
 * Every fixture by name. Each is typed against its view model where it is declared, and this
 * map is checked again against `SurfaceVM`, so a fixture that drifts from its VM fails to
 * compile twice. Development, style guides and component tests only: the boot check refuses
 * `LOADERS_SOURCE=fixtures` in production. The per-surface state matrix (TASKS.md 11.4) adds
 * `./states/**` beside these.
 */
import type { Surface } from '@engine/config/routes'

import type { SurfaceVM } from '../loaders'
import type { ShellVM } from '../shell'
import type { PurchaseVM } from '../surfaces/purchase'
import * as account from './account'
import * as entry from './account-entry'
import * as retailer from './account-retailer'
import * as cart from './cart'
import {
  checkoutExport,
  checkoutConflict,
  checkoutInstitution,
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
import { itemAvailabilityUnverified } from './item-availability-unverified'
import { itemEnquiryOnly } from './item-enquiry-only'
import { itemLongContent, itemWithoutHookTitle } from './item-long-content'
import { itemOnHold } from './item-on-hold'
import { itemPriceOnRequest, itemPriceRevealed } from './item-price-on-request'
import { itemSoldPriceRealised, itemSoldWithAlternative } from './item-sold-with-alternative'
import { itemUnique, itemUniqueStreaming } from './item-unique'
import { itemVariants, itemVariantsForPartner, itemVariantsSelected } from './item-variants'
import { listing, listingEmpty, search } from './listing'
import * as order from './order'
import * as lookup from './order-lookup'
import * as partnership from './partnership'
import { pay, payPaid, payTransferPending, quoteProforma, quoteRequested, quoteTrade } from './pay'
import { purchaseStates } from './purchase-states'
import { shell, shellShop } from './shell'
import { gone, notFoundLegacy, serverError } from './status'
import * as wantList from './want-list'
import { wishlist, wishlistEmpty } from './wishlist'

export const SHELL_FIXTURES = { shell, 'shell-shop': shellShop } as const satisfies Readonly<
  Record<string, ShellVM>
>

/** The purchase panel's state matrix: panels, not pages (TASKS.md 34.1). */
export const PURCHASE_STATES = purchaseStates satisfies Readonly<Record<string, PurchaseVM>>

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
  'item-availability-unverified': itemAvailabilityUnverified,
  'item-variants': itemVariants,
  'item-variants-selected': itemVariantsSelected,
  'item-variants-partner': itemVariantsForPartner,
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
  'checkout-institution': checkoutInstitution,
  'order-paid': order.orderPaid,
  'order-pending-va': order.orderPendingVa,
  'order-pending-qris': order.orderPendingQris,
  'order-retry': order.orderRetry,
  'order-manual': order.orderManual,
  'order-lookup': lookup.orderLookup,
  'order-lookup-found': lookup.orderLookupFound,
  'order-lookup-not-found': lookup.orderLookupNotFound,
  'order-lookup-rate-limited': lookup.orderLookupRateLimited,
  'order-lookup-invalid': lookup.orderLookupInvalid,
  pay,
  'pay-paid': payPaid,
  'pay-transfer-pending': payTransferPending,
  'quote-proforma': quoteProforma,
  'quote-requested': quoteRequested,
  'quote-trade': quoteTrade,
  'account-signed-out': account.accountSignedOut,
  'account-overview': account.accountOverview,
  'account-wishlist': account.accountWishlist,
  'account-want-lists': account.accountWantLists,
  'account-offers': account.accountOffers,
  'account-price-requests': account.accountPriceRequests,
  'account-viewings': account.accountViewings,
  'account-consignments': account.accountConsignments,
  'account-set-password': entry.accountSetPassword,
  'account-set-password-expired': entry.accountSetPasswordExpired,
  'account-reset': entry.accountReset,
  'account-reset-sent': entry.accountResetSent,
  'account-retailer-signed-out': retailer.accountRetailerSignedOut,
  'account-retailer-approved': retailer.accountRetailerApproved,
  'account-retailer-terms': retailer.accountRetailerTerms,
  'account-retailer-quotes': retailer.accountRetailerQuotes,
  partnership: partnership.partnership,
  'partnership-received': partnership.partnershipReceived,
  'partnership-apply-failed': partnership.partnershipApplyFailed,
  'partnership-sign-in-failed': partnership.partnershipSignInFailed,
  'partnership-applied': partnership.partnershipApplied,
  'partnership-declined': partnership.partnershipDeclined,
  'partnership-retailer': partnership.partnershipRetailer,
  wishlist,
  'wishlist-empty': wishlistEmpty,
  'want-list': wantList.wantListSubscribe,
  'want-list-received': wantList.wantListReceived,
  'want-list-account': wantList.wantListForAccount,
  'want-list-pending': wantList.wantListPending,
  'want-list-active': wantList.wantListActive,
  'want-list-gone': wantList.wantListGone,
  'want-list-invalid': wantList.wantListInvalid,
  'want-list-rate-limited': wantList.wantListRateLimited,
  'want-list-confirmed': wantList.wantListConfirmed,
  'want-list-stopped': wantList.wantListStopped,
  'want-list-link-expired': wantList.wantListLinkExpired,
  'form-enquiry': form.formEnquiry,
  'form-offer': form.formOffer,
  'form-consignment': form.formConsignment,
  'form-appointment': form.formAppointment,
  'form-invalid': form.formInvalid,
  'form-hold': form.formHold,
  'form-refused': form.formRefused,
  'form-quote': form.formQuote,
  'form-quote-partner': form.formQuotePartner,
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
