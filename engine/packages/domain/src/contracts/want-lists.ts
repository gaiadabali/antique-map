/**
 * @contract C6 Commerce API — want lists · owner: ARC · via `@engine/domain/api`
 * The values `WANT_LIST_PENDING_DAYS`, `WANT_LIST_PENDING_PER_ADDRESS` and `WANT_LIST_EMAIL_LIMIT`
 * are at `@engine/domain/want-lists`.
 *
 * "Alert me about new maps of Bali under US$2,000", "Tell me when another example arrives"
 * (EXPERIENCE-GALLERY.md §8): a saved search or an item alert, matched against what is published
 * and sent by email, at once or in a daily digest (TASKS.md 29.1). Its holder is the brand's
 * modules' to decide (C1), never the brand's: a signed-in buyer's account (`retention.wantList`,
 * with `accounts.buyers`), or an email address with no account (`retention.emailWantList`, D39) —
 * the shop's only kind, and the gallery's for a visitor who is not signed in. Every list is sent
 * by email, so the address's kind is the base the account's builds on.
 *
 * An address's list starts only once confirmed (double opt-in). Subscribing stores it `pending`
 * and emails a link through the outbox after commit, so the answer and its timing are the same
 * whoever subscribes. The link opens the want-list page (C10 `wantList`, C13 `WANT_LIST_ACCESS`),
 * whose button confirms it — a POST, so a mail scanner that follows the link confirms nothing. A
 * list never confirmed is erased after `WANT_LIST_PENDING_DAYS`, and at most
 * `WANT_LIST_PENDING_PER_ADDRESS` of an address's lists wait at once. Every email about a list —
 * the confirmation, a resend, each alert — carries its token, in the page's link and in RFC 8058's
 * one-click unsubscribe: a derived capability link (`./links`, purpose `want-list`) NTF computes as
 * it sends each email, never stored and never in an outbox row. Stopping a list erases it — its
 * address, its query and its consent — so its links name nothing, and starting again is a new
 * subscription, confirmed again. An account's list needs no confirmation: its address is proven.
 */
import type { LocaleCode } from '@engine/config/schema'

import type { Money } from '../money/contract'
import type { ProductPublicId } from './requests'
import type { IdempotencyKey } from './results'
import type { IsoInstant } from './scalars'
import type { Accepts, Assert, Equals } from './type-assertions'

/** Within 15 minutes of publishing, or one digest a day (requirement 13.3, TASKS.md 29.1.b). */
export type WantListFrequency = 'instant' | 'daily'

/**
 * What a list watches. A listing, by the public path of its browse or search page, which C10's
 * `parsePublicPath` must read as one (else `invalid`): its facets and words are the query, and its
 * price range is the budget — in the ship-to market's currency, from the `shipTo` cookie, never
 * the request — stored with the list (TASKS.md 9.4.c); a listing with no price facet, as where
 * unique prices are on request (D50), gives none. Or a product: another example of its work or
 * edition ("Tell me when another example arrives") — and the product itself, should it be
 * available again: a held piece whose invoice lapses unpaid at its due date (D45) alerts every
 * list that likes it, as an example arriving does (v1.5). An unknown or unpublished one is
 * `not-found`.
 */
export type WantListSubject =
  | { readonly kind: 'listing'; readonly path: string }
  | { readonly kind: 'like'; readonly productId: ProductPublicId }

/** An address's contact: an email alone, since an alert never goes by WhatsApp (D39). */
export type WantListContactInput = { readonly email: string; readonly locale: LocaleCode }

/**
 * Save a search or an item alert. `contact` is null only for a signed-in buyer where
 * `retention.wantList` is on: the list is the account's and starts at once — and a signed-in buyer
 * there who sends a contact anyway saves to the account too, the contact ignored. From anyone else
 * a contact is required (`invalid` without one); a holder whose module is off is `not-offered`.
 * Asking again for a subject its holder already watches: an account's list takes the new
 * frequency, since the session is its holder; an address's changes nothing — the post proves no
 * one owns the address, so it never edits a list — and the address gets its list's link again
 * (`wantList.repeated`), from which its holder may stop it and save it anew.
 */
export type WantListSubscribeRequest = {
  readonly subject: WantListSubject
  readonly frequency: WantListFrequency
  readonly contact: WantListContactInput | null
  /**
   * The subscriber agrees to these alerts or does not subscribe, recorded with the policy
   * version and the time (COMPLIANCE.md §7); the newsletter is a separate choice, unticked.
   */
  readonly consent: { readonly alerts: true; readonly marketingEmail: boolean }
  readonly idempotencyKey: IdempotencyKey
}

export type WantListStatus = 'pending' | 'active'

/** A list as its holder reads it. */
export type WantListView = {
  /** The list's `ref` (./storage.ts): a random UUID — what its token names, never a sequence. */
  readonly id: string
  readonly status: WantListStatus
  readonly subject: WantListSubject
  readonly frequency: WantListFrequency
  /** The watched listing's price range as a budget, in the market currency it was saved in. */
  readonly budget: Money | null
  readonly createdAt: IsoInstant
  readonly lastNotifiedAt: IsoInstant | null
}

/**
 * An address's answer is the same whoever subscribes and whatever it already watches — a link is
 * on its way; the email says what applies (new, still pending, already on), within
 * `WANT_LIST_EMAIL_LIMIT`, and the answer admits none of it. An account's is its list, saved.
 */
export type WantListSubscribeReceipt =
  | { readonly holder: 'email'; readonly received: true }
  | { readonly holder: 'account'; readonly list: WantListView }

/**
 * How a caller proves a list is theirs, as `OrderAccess` does for an order: the account's session
 * and the list's id; the want-list page's cookie (C13 `WANT_LIST_ACCESS`), which an email's link
 * fills with the list's token, so the token never enters the page; or the token itself, which only
 * RFC 8058's one-click unsubscribe sends — from the mail client, in the URL its header names.
 */
export type WantListAccess =
  | { readonly kind: 'account'; readonly wantListId: string }
  | { readonly kind: 'access-cookie' }
  | { readonly kind: 'token'; readonly token: string }

/**
 * "Confirm this alert", on the want-list page: an address's pending list starts. An active list
 * answers as it is; one the cookie no longer names (never confirmed in time, or stopped) is
 * `not-found`.
 */
export type WantListConfirmRequest = { readonly access: { readonly kind: 'access-cookie' } }

/**
 * "Stop this alert": the list is erased. The answer is the same whether it was still there, or
 * ever the caller's, or not — so a second click or a mail client's retry never meets an error,
 * and an id tried at random reveals nothing.
 */
export type WantListUnsubscribeRequest = { readonly access: WantListAccess }
export type WantListUnsubscribeReceipt = { readonly stopped: true }

/** A list never confirmed is erased this many days after it was asked for, and its link with it. */
export const WANT_LIST_PENDING_DAYS = 7

/**
 * The most of one address's lists that wait for confirmation at once — `WANT_LIST_EMAIL_LIMIT`'s
 * `perAddress`, so a script cannot park a stranger's address, unconsented, on more lists than it
 * could email. Past it, subscribing stores nothing, sends nothing and answers the same receipt.
 */
export const WANT_LIST_PENDING_PER_ADDRESS = 10

/**
 * The emails subscribing can cause, in every case, reach one address at most `perList` times for
 * one list and `perAddress` times in all within `windowHours` — counted by NTF at dispatch, on top
 * of C13's per-IP limit on the route, and silent: a post past it gets the same receipt.
 */
export const WANT_LIST_EMAIL_LIMIT = { perList: 1, perAddress: 10, windowHours: 24 } as const

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type _AlertsAreAgreedTo = Accepts<
  WantListSubscribeRequest['consent'],
  // @ts-expect-error — the subscriber agrees to the alerts, or does not subscribe
  { alerts: false; marketingEmail: false }
>
// An address's receipt names, admits and links nothing: the same for everyone who subscribes.
type _AddressReceiptAdmitsNothing = Assert<
  Equals<keyof Extract<WantListSubscribeReceipt, { holder: 'email' }>, 'holder' | 'received'>
>
// The pending cap is the email cap: no address waits on more lists than it could be written about.
type _PendingCapIsTheEmailCap = Assert<
  Equals<typeof WANT_LIST_PENDING_PER_ADDRESS, (typeof WANT_LIST_EMAIL_LIMIT)['perAddress']>
>
// Only the page's cookie confirms: a scanner holding a link, or a stranger holding an id, cannot.
type _ConfirmByTheCookieOnly = Assert<
  Equals<WantListConfirmRequest['access']['kind'], 'access-cookie'>
>
