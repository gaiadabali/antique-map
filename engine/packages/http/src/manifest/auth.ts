/**
 * @contract C13 — the HTTP handler manifest: customer accounts · owner: ARC · entry: `@engine/http/manifest`
 *
 * WEB's customer auth (TASKS.md 28.1), one catch-all at `/api/x/auth/[...path]` whose
 * sub-paths are `AUTH_OPERATIONS`; a customer is never staff (ARCHITECTURE.md §12). What holds
 * on every brand:
 * - one answer for every email. Sign-in says only `invalid` for an unknown email, a wrong
 *   password and a retailer who is not approved — `applied`, `declined`, or `ended` (D34: an
 *   ended partnership is deactivated) — and its lockout and rate limits count per email and
 *   per IP whether or not an account exists. A reset request always answers that a link is
 *   on its way.
 * - a retailer's first password comes only through an approval link (`PASSWORD_LINK`), and so
 *   does a reinstated one's: approving an `ended` partner sends a new one (C8). A reset
 *   request sends a link only to an account that may sign in: a reset link where it has a
 *   password; approval's link again to an approved retailer without one yet; a claim link to a
 *   migrated buyer only where `accounts.buyers` is on (none at launch: the gallery's old customers
 *   are staff-side records with no claim, D54, MIGRATION.md §5). An applicant, a declined or an
 *   ended retailer never gets one, so no one reaches trade terms around staff.
 * - no shopper sign-up where it is not a module: `auth.register` and `auth.verifyEmail` answer
 *   404 without `accounts.buyers`, so a shop whose accounts are its partners' has none (D31).
 * - no auth at all on a brand with neither `accounts.buyers` nor `accounts.retailers` — the
 *   gallery, which signs no one in (D54): every operation answers 404, as an unbuilt surface does
 *   (C10 `hasSurface()`'s `account`, open while either account module is) (v1.5).
 */
import { GET_POST, type RouteAuth, type SubRoute } from './types'

export const AUTH_OPERATIONS = {
  'auth.signIn': { method: 'POST', path: 'sign-in', auth: ['public'] },
  'auth.signOut': { method: 'POST', path: 'sign-out', auth: ['customer'] },
  'auth.register': {
    method: 'POST',
    path: 'register',
    auth: ['public'],
    module: 'accounts.buyers',
  },
  // The one-hop link a new buyer's email carries: it verifies, signs in and answers 303.
  'auth.verifyEmail': { method: 'GET', path: 'verify', auth: ['token'], module: 'accounts.buyers' },
  'auth.resetRequest': { method: 'POST', path: 'reset', auth: ['public'] },
  'auth.passwordLink': { method: 'GET', path: 'password', auth: ['token'] },
  // Sets the password `PASSWORD_LINK` names, consumes it and signs in — a retailer only while
  // it is still approved.
  'auth.setPassword': { method: 'POST', path: 'password', auth: ['token'] },
  'auth.applicationLink': {
    method: 'GET',
    path: 'application',
    auth: ['token'],
    module: 'accounts.retailers',
  },
} as const satisfies Record<string, SubRoute>
export type AuthOperation = keyof typeof AUTH_OPERATIONS

/** Who may call some auth operation: the catch-all route's `auth`. */
export const AUTH_ROUTE_AUTH = [
  ...new Set(Object.values(AUTH_OPERATIONS).flatMap((op): readonly RouteAuth[] => op.auth)),
]
export const AUTH_ROUTE_METHODS = GET_POST

/** The URL an app's client posts to, or an email links to, for an auth operation. */
export function authUrl(operation: AuthOperation): string {
  return `/api/x/auth/${AUTH_OPERATIONS[operation].path}`
}

/**
 * An applicant's read-only view of its application, without a password (D31; C2
 * `PartnershipAccessVM`). The acknowledgement email carries `link?token=…`
 * (`auth.applicationLink`): a derived capability link (C6 `links`, purpose `application`) NTF
 * computes as it sends the email — stored nowhere, valid `LINK_WINDOW_DAYS.application` days from
 * the latest acknowledgement or decline, void from approval on (the partner then signs in), its
 * version bumped at each acknowledgement so the newest email's link supersedes the older. A lapse
 * is final: a decline after the window has run out sends a fresh link, never the old one's.
 * The link stores it in `cookie` (HttpOnly, Secure, SameSite=Lax, Path=/, as long-lived as the
 * token) and answers 303 to the clean Partnership page, whose loader reads the standing there,
 * never a term or a price; a handler logs the link's path without `?token=`. No write accepts
 * the cookie, so a login CSRF that plants another applicant's token shows a stranger's status
 * and nothing more — which holds only while it stays read-only.
 */
export const APPLICATION_ACCESS = {
  cookie: 'application_access',
  link: '/api/x/auth/application',
} as const

/**
 * The one-hop links that set a password (`auth.passwordLink`): approval's (D31), a reset's, a
 * migrated buyer's claim — the one link that is NOT derived (C6 `links`), because it sets a
 * credential and must not be forgeable from one key. As NTF sends the email it asks the auth
 * service for a random 256-bit nonce, and the service keeps only its hash and expiry on the
 * customer record until the link consumes it (a new link replaces an unused one): NTF writes no
 * record, and the outbox row still carries no token. `link?token=…` stores the token in `cookie`
 * (HttpOnly, Secure, SameSite=Lax, Path=/) — an expired one too, so the page can say so and offer
 * another — and answers 303 to the account's clean `setPassword` page (C10), whose form posts
 * `auth.setPassword`. A reset's link lives an hour, approval's and a claim's seven days; each
 * is used once, and a handler logs its path without `?token=`.
 */
export const PASSWORD_LINK = {
  cookie: 'password_link',
  link: '/api/x/auth/password',
} as const
