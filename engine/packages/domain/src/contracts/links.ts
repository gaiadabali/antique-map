/**
 * @contract C6 Commerce API — capability links: how every emailed or addressed token is made · owner: ARC · via `@engine/domain/api`
 * The values `LINK_PURPOSES`, `LINK_WINDOW_DAYS`, `LINK_TOKEN` and `LINK_TOKEN_VECTORS` are at
 * `@engine/domain/links`.
 *
 * A capability link is a URL whose token is the credential: a payment link's or a quote's page, a
 * record a C6 answer hands back by token, and every one-hop link an email carries (C13
 * `ORDER_ACCESS`, `APPLICATION_ACCESS`, `WANT_LIST_ACCESS`, the newsletter's). Its token is
 * DERIVED — never stored, never carried by a row — and every byte of it is fixed here:
 *
 *   token   = kid "." ref "." mac
 *   kid     = 1 to 12 characters of a–z and 0–9: its key's id in `LINK_TOKEN_KEYS`
 *   ref     = the record's `ref` (./storage.ts), a random UUID, as its 36 lowercase characters
 *   mac     = base64url, unpadded, of the first `LINK_TOKEN.macBytes` bytes of
 *             HMAC-SHA256(secret, input): 22 characters
 *   input   = purpose 0x1F ref 0x1F version, all ASCII, so its UTF-8 bytes are those: `purpose`
 *             one of `LINK_PURPOSES`, `ref` as above, `version` the record's `token_version` in
 *             decimal digits, with no sign and no leading zero
 *   secret  = the kid's key, base64url-decoded: at least 32 random bytes
 *
 * A token that is not exactly this — three parts, each in its grammar — is refused as it is,
 * never normalised (an uppercase `ref` is refused), so one record and version have one token
 * string. `LINK_TOKEN_VECTORS` are its known answers, which 18.2.g's module must reproduce.
 *
 * - Deriving: NTF derives each email's token as it sends it, from the ids its outbox row names: a
 *   row never carries a token (C8 `IsPiiFree` refuses a key named for one), because the outbox is
 *   kept and replayed. The domain derives the same token for a C6 answer that returns one, and
 *   for a stored idempotent answer it replays (./storage.ts keeps none).
 * - Verifying: parse, take the key its `kid` names, recompute, compare in constant time, load the
 *   record by `ref`, require its `token_version`, then its purpose's state rule and window below.
 *   Any failure answers as an unknown token does — `not-found`, or the dead-link page a one-hop
 *   link lands on — never which: an unknown, lapsed or revoked `kid` reads as a flipped bit.
 * - Revoking one record's links: bump its `token_version`, and every link it ever had dies at
 *   once; an erased record leaves its links naming nothing.
 * - Windows: a purpose with a time bound (`LINK_WINDOW_DAYS`) counts it from its record's
 *   `links_anchor_at` (./storage.ts), the latest instant the domain issued the link — an event
 *   whose email carries it, an answer that returns it, an order lookup. A lapse is final. A token
 *   carries no issue time, so whatever would move the anchor of a record whose window has already
 *   run out first bumps its `token_version`, in the same transaction: a lapsed link never comes
 *   back (a late refund does not revive an old order email's), and only links issued after work.
 *   The account reaches every record by its session, whatever the windows.
 * - Deterministic: one record and version give one token, so a page's address is stable and an
 *   email sent twice carries the same link.
 *
 * Keys: `LINK_TOKEN_KEYS` (DEPLOYMENT.md §8) holds one ring per brand and per environment. No key
 * is ever shared between brands, or between staging and production. It is comma-separated entries:
 *
 *   kid ":" secret                  the current key, exactly one: it derives every new token
 *   kid ":" secret ":" YYYY-MM-DD   retired on that UTC day: it verifies for
 *                                   `LINK_TOKEN.keyOverlapDays` after it, then refuses
 *   kid ":revoked"                  refuses at once: a leaked key's emergency stop
 *
 * - Rotating: add a new current key under a new `kid` and date the old one; a restart applies it,
 *   never a rebuild. Each email derives its links as it is sent, so a retirement only kills a
 *   link in an email older than the overlap.
 * - A leaked key: mark it `revoked` and add a new current one. Every link it minted dies at once,
 *   landing on the dead-link page, and each holder gets a working link from the next email, an
 *   order lookup or the account.
 * - A `kid` is never used twice. `bootCheck()` (3.1) refuses a ring with no current key or two,
 *   a repeated `kid`, a secret under 32 bytes or of one repeated byte (the vectors' test key), or a
 *   date in the future.
 *
 * Why derived rather than a token table (one random token per email, stored hashed): a copy of the
 * database holds nothing that opens a link — only the key does, kept with the other secrets; there
 * is no row per email to write from NTF or purge; and a page's address stays put. What it gives
 * up — revoking one email's link alone — no purpose below needs.
 *
 * What a forged link can do: a key alone forges links only for refs its holder already has (every
 * token carries one), and the current key with a copy of the database forges any. Such a link
 * opens its record's page, and shows what that page shows (an order's address, a quote's buyer, an
 * enquiry's message). It also does what its purpose lets a holder do: confirm or stop an alert, ask
 * for a return (`order`), answer an offer (take a counter, bid again, withdraw), accept a quote —
 * which takes `invoice` holds on its unique lines — reschedule or cancel an appointment, or pay a
 * payment link. It never sets a credential, and never moves money out: refunds and payouts are
 * staff's. The one exception is drawn on that line.
 *
 * It is C13 `PASSWORD_LINK`: a link that sets an account's password must not be forgeable from one
 * key. As NTF sends that email it asks the auth service for a random 256-bit nonce, the customer
 * record keeps only its hash and expiry, and the link consumes it: single-use, short-lived, few.
 */
import type { Assert, Equals } from './type-assertions'

/**
 * The purposes a derived link serves — its first MAC input, so one purpose's token never opens
 * another's — and the state rule that keeps each valid, checked after the MAC (its window is
 * `LINK_WINDOW_DAYS`'s):
 * - `want-list` — while the list exists; stopping erases it (D39);
 * - `application` — never once approved; the version is bumped at each acknowledgement, so the
 *   newest email's link supersedes the older;
 * - `newsletter` — its confirmation while the subscriber is pending, its stop while subscribed; the
 *   version is bumped when a stopped subscriber subscribes again;
 * - `order` — the lookup token and the order-access link, in any state of the order; a lookup
 *   (number and email, rate-limited) issues it again, so a buyer can always get a working one;
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

/**
 * How many days a purpose's links work after their record's `links_anchor_at`; `null`, as long as
 * its state rule allows. Every page a windowed link opens shows personal data, so a forwarded or
 * leaked email stops opening it; the account keeps it by session. An alert's and a newsletter's
 * links open nothing but the subscription, and live with it: an RFC 8058 stop must keep working.
 */
export const LINK_WINDOW_DAYS = {
  'want-list': null,
  application: 30,
  newsletter: null,
  order: 90,
  'pay-link': 90,
  quote: 90,
  offer: 90,
  'hold-request': 90,
  appointment: 90,
  return: 90,
  enquiry: 90,
  consignment: 90,
} as const satisfies Record<LinkPurpose, number | null>

export const LINK_TOKEN = {
  /** The MAC's length after truncation: 128 bits, far past guessing. */
  macBytes: 16,
  /** How long a retired key keeps verifying after the day it was retired, in days. */
  keyOverlapDays: 400,
} as const

/**
 * Known answers, built exactly as the grammar above says, under a TEST key — 32 bytes of 0x0b,
 * which `bootCheck()` refuses anywhere. The first two differ only in purpose, the first and the
 * third only in version.
 */
export const LINK_TOKEN_VECTORS = {
  key: { kid: 'test', secret: 'CwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCws' },
  cases: [
    {
      purpose: 'want-list',
      ref: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      version: 1,
      token: 'test.3f2504e0-4f89-41d3-9a0c-0305e82c3301.oI5pbhfMxesF0zh3bjP1Sg',
    },
    {
      purpose: 'order',
      ref: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      version: 1,
      token: 'test.3f2504e0-4f89-41d3-9a0c-0305e82c3301.Z8uVPqNjx87LcMkwm_VD-A',
    },
    {
      purpose: 'want-list',
      ref: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      version: 2,
      token: 'test.3f2504e0-4f89-41d3-9a0c-0305e82c3301.uNyu-EuqKeX2BbRkZU0I-w',
    },
  ],
} as const satisfies {
  readonly key: { readonly kid: string; readonly secret: string }
  readonly cases: readonly {
    readonly purpose: LinkPurpose
    readonly ref: string
    readonly version: number
    readonly token: string
  }[]
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// Every purpose states its window, even when it has none.
type _EveryPurposeHasAWindow = Assert<Equals<keyof typeof LINK_WINDOW_DAYS, LinkPurpose>>
