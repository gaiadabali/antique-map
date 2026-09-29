/**
 * @contract C13 — the HTTP handler manifest: form posts and saved items · owner: ARC · entry: `@engine/http/manifest`
 *
 * How every form's post is read (`FORM_DECODING`) and comes back to its page (`FORM_RESULT`), and
 * the forms route's own operations (`/api/x/forms/<path>`; WEB), beside C6's commerce API and the
 * auth routes.
 */
import type { SubRoute } from './types'

/**
 * How an HTML form post becomes its operation's request (C6's, or an auth or forms operation's):
 * one decoder for every handler, driven by that operation's request schema — which says each
 * path's type — after which the request is validated exactly as a script's JSON body is, one
 * validator whichever way it came.
 * - The body is `application/x-www-form-urlencoded` in UTF-8, at most `maxBodyBytes`; or
 *   `multipart/form-data` where a form takes files: `maxBodyBytes` of fields, plus the form's
 *   `uploads.maxFiles` × `maxMegabytes` of files (C2), each streamed to the upload store as it
 *   arrives, checked there, and replaced by its C6 `UploadId`. A larger body, or more than
 *   `maxFields` fields, is refused unread (413): no page renders such a form.
 * - A field's name is its request path. Dots nest and a numeric segment is an array index
 *   (`lines.0.productId`). An array element whose every posted field is empty — a photo slot left
 *   blank — is dropped, and the rest keep their order; a gap among the indices left is `format` on
 *   the array's path. A name posted twice is `invalid`, never the last one winning, and a name
 *   outside the schema is dropped, never passed on.
 * - Text is trimmed, but never a `password` field's, taken exactly as typed; an empty field is
 *   `null`. A field not posted at all is `false` where the schema holds a boolean (a tick box
 *   posts `'true'`), else `null` (an unchosen radio) — `required` where the schema needs a value.
 * - A number — an id, a quantity — is ASCII digits for a safe integer: anything else is `format`,
 *   and past a safe integer `out-of-range`. (A map pin's coordinates, the one fractional number a
 *   request holds, come only from a script's JSON: the pin needs the map.)
 * - Money is only ever the offer's bid (C6 `proposal`), one text field matching
 *   `^[0-9]+(\.[0-9]{1,e})?$` for its currency's exponent e (C1 `CURRENCY_EXPONENT`), or
 *   `^[0-9]+$` when e is 0 — so IDR takes no separator at all, and `4200000.`, `.50`, `4.200.000`,
 *   `4,20` and `1e6` are `format`. It converts on the digit string, never through a float
 *   (`4200.15 * 100` is `420014.99999…`): the fraction padded to e digits and joined to the whole
 *   part, then read as a safe integer — USD `4200.50` is `420050`, IDR `4200000` is `4200000`.
 *   Its currency is the ship-to market's (the `shipTo` cookie), never the post's; with no cookie
 *   the bid is `required`, and a bid of zero is `out-of-range`.
 * - `idempotencyKey` is the hidden field the page minted as it rendered the form (C6
 *   `IdempotencyKey`), and `returnTo` is taken only as one of this site's pages (`FORM_RESULT`).
 * - One request is built from its URL instead: RFC 8058's one-click unsubscribe
 *   (`ONE_CLICK_UNSUBSCRIBE`, `./commerce`), whose body carries no field of its request.
 */
export const FORM_DECODING = {
  /** A larger urlencoded body, or a multipart post's fields past it, is refused unread (413). */
  maxBodyBytes: 64 * 1024,
  /** More fields than this is refused unread (413). */
  maxFields: 200,
  /** A money field's one separator: the decimal point, whatever the page's locale writes. */
  decimalSeparator: '.',
} as const

/**
 * How a post comes back (C2 `FormResultVM`, on every form). A script's `fetch` asks for JSON
 * and gets the operation's answer. An HTML form post — sent without JavaScript, `Accept:
 * text/html` — answers 303 See Other to its `returnTo`: a hidden field holding the page's
 * public path, taken only if it parses as one of this site's pages (C10 `parsePublicPath`),
 * else the home page. The outcome waits on the server as a form result — the answer, and for a
 * failed post every entry kept — named by an opaque id in `cookie` (HttpOnly, Secure,
 * SameSite=Lax, Path=/). The cookie holds that id alone: never an entry, an NPWP or any other
 * personal data. The page's loader awaits it at request time and the page renders it in its
 * own body (C2 `FormResultVM`). It is deleted once the response showing it has been sent, or
 * after `maxAgeSeconds` — never on first read, so a second render or a prefetch in the same
 * request finds it still there. `received` is the same for everyone who posts that form, so it
 * names no one and admits nothing about an account. A tick box posts `'true'` when ticked and
 * nothing when not; the decoder reads the absence as `false` (`FORM_DECODING`).
 */
export const FORM_RESULT = { cookie: 'form_result', maxAgeSeconds: 600 } as const

/**
 * `wishlist.set` saves a product or removes it (C2 `CardVM.wishlist`): in the buyer's account
 * with `retention.wishlist`, on this device (`DEVICE_WISHLIST`) with `retention.deviceWishlist`
 * — the module decides which, never the brand — and it answers 404 with neither.
 */
export const FORM_OPERATIONS = {
  'wishlist.set': { method: 'POST', path: 'wishlist', auth: ['public', 'customer'] },
} as const satisfies Record<string, SubRoute>
export type FormOperation = keyof typeof FORM_OPERATIONS

export function formsUrl(operation: FormOperation): string {
  return `/api/x/forms/${FORM_OPERATIONS[operation].path}`
}

/**
 * A guest's saved items where they live on the device (D35): product public ids, newest
 * first, at most `maxItems` (the oldest drops out), in an HttpOnly, Secure, SameSite=Lax
 * cookie only `wishlist.set` writes — set by the guest's own first save, holding no identifier
 * and no personal data, and nothing of it kept on the server. Loaders read it at request time,
 * so a heart's state and the Wishlist page stream. Each save and removal is tracked under
 * ANALYTICS.md §1's consent rule (C11, D38): counted by the cookieless beacon, and sent to GA4
 * and Meta only after consent.
 */
export const DEVICE_WISHLIST = { cookie: 'wishlist', maxItems: 100, maxAgeDays: 365 } as const
