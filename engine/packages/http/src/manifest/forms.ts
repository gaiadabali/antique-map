/**
 * @contract C13 — the HTTP handler manifest: form posts and saved items · owner: ARC · entry: `@engine/http/manifest`
 *
 * How every form's post comes back to its page, and the forms route's own operations
 * (`/api/x/forms/<path>`; WEB), beside C6's commerce API and the auth routes.
 */
import type { SubRoute } from './types'

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
 * nothing when not; the handler's decoder reads the absence as `false`.
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
