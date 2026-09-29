/**
 * @contract C6 Commerce API — capability links: how every emailed or addressed token is made · owner: ARC · via `@engine/domain/api`
 * The values `LINK_PURPOSES` and `LINK_TOKEN` are at `@engine/domain/links`.
 *
 * A capability link is a URL whose token is the credential: a payment link's or a quote's page, a
 * record a C6 answer hands back by token, and every one-hop link an email carries (C13
 * `ORDER_ACCESS`, `APPLICATION_ACCESS`, `WANT_LIST_ACCESS`, the newsletter's). Its token is
 * DERIVED — never stored, never carried by a row:
 *
 *   token = kid "." ref "." base64url(HMAC-SHA256(key[kid], purpose 0x1F ref 0x1F version)[0..16])
 *
 * - `ref` is the record's public reference, a random UUID (never a sequential id), and `version`
 *   its `token_version` (./storage.ts): all the database holds of any of its links.
 * - NTF derives the token for each email as it sends it, from the ids its outbox row names: a row
 *   never carries a token (C8 `IsPiiFree` refuses a key named for one), because the outbox is kept
 *   and replayed. The domain derives the same token for a C6 answer that returns one, and for a
 *   stored idempotent answer it replays (./storage.ts keeps none).
 * - Verifying: split the token, take the key its `kid` names (`LINK_TOKEN_KEYS`, DEPLOYMENT.md §8),
 *   recompute, compare in constant time, load the record by `ref`, require its `token_version`,
 *   then the purpose's own rule below on the record's state and dates. Any failure answers as an
 *   unknown token does — `not-found`, or the dead-link page a one-hop link lands on — never which.
 * - Revoking: bump the record's `token_version`, and every link it ever had dies at once; an erased
 *   record leaves its links naming nothing. No token expires by itself: its purpose's rule does, so
 *   a stolen link can never outlast the record's own terms.
 * - Rotating: a new key becomes current under a new `kid`; a retired one still verifies for
 *   `LINK_TOKEN.keyOverlapDays`, then goes. Every email derives its links as it is sent, so a
 *   retirement only kills a link in an email older than that, which lands on the dead-link page.
 * - Deterministic: one record and version give one token, so a page's address is stable and an
 *   email sent twice carries the same link.
 *
 * Why derived rather than a token table (one random token per email, stored hashed): a copy of the
 * database holds nothing that opens a link — only the key does, kept with the other secrets; there
 * is no row per email to write from NTF or purge; and a page's address stays put. What it gives
 * up — revoking one email's link alone — no purpose below needs. The risk it keeps, one key forging any
 * link while it is current, is bounded by what a derived link can do: open one record's page, or
 * confirm or stop one alert — never set a credential.
 *
 * So the one exception is C13 `PASSWORD_LINK`: a link that sets an account's password must not be
 * forgeable from one key. As NTF sends that email it asks the auth service for a random 256-bit
 * nonce, the customer record keeps only its hash and expiry, and the link consumes it: single-use,
 * short-lived, few.
 */

/**
 * The purposes a derived link serves — its first MAC input, so one purpose's token never opens
 * another's — and the rule that keeps each valid, checked after the MAC:
 * - `want-list` — while the list exists; stopping erases it (D39);
 * - `application` — 30 days from the latest acknowledgement or decline, never once approved; the
 *   version is bumped at each acknowledgement, so the newest email's link supersedes the older;
 * - `newsletter` — its confirmation while the subscriber is pending, its stop while subscribed; the
 *   version is bumped when a stopped subscriber subscribes again;
 * - `order` — the lookup token and the order-access link: until `LINK_TOKEN.orderDays` after the
 *   order last changed;
 * - `pay-link`, `quote`, `offer`, `hold-request`, `appointment`, `return`, `enquiry`,
 *   `consignment` — while the record exists, its page reading its state (a paid link, a closed
 *   offer), with the version bumped when staff revoke a record's links.
 */
export const LINK_PURPOSES = [
  'want-list',
  'application',
  'newsletter',
  'order',
  'pay-link',
  'quote',
  'offer',
  'hold-request',
  'appointment',
  'return',
  'enquiry',
  'consignment',
] as const
export type LinkPurpose = (typeof LINK_PURPOSES)[number]

export const LINK_TOKEN = {
  /** The MAC's length after truncation: 128 bits, far past guessing. */
  macBytes: 16,
  /** How long a retired key keeps verifying after a rotation, in days. */
  keyOverlapDays: 400,
  /** An order-access token's life after its order last changed, in days. */
  orderDays: 90,
} as const
