/**
 * @contract C12 Sister archive API — webhooks and the reconcile · owner: ARC · via `@engine/sister/contract`
 *
 * Both directions over `/api/x/sister/…` (C13, module `sister.links`), signed with the pair's
 * shared secret (C1 `sisters`, `SISTER_WEBHOOK_SECRET`): the origin tells the outlet about its
 * works, and the outlet tells the origin what it makes from each. Delivery is at least once, so
 * every receiver dedupes on `id`; each side's nightly reconcile pulls the other's list, so a lost
 * webhook costs at most a day.
 *
 * Deduping stops repeats, not reordering, so a copy only ever moves forward. It keeps, per work,
 * the newest instant it has applied for each of the work's parts: its own fields (a snapshot's
 * `updatedAt`), its original's listing (an `OriginalListing`'s `asOf`, whether it came alone or
 * inside a snapshot as `original`) and, at the origin, the outlet's feed (a `PrintsFeed`'s
 * `asOf`). A delivery or a pulled item no newer than its part's instant is acknowledged (200) and
 * dropped. A snapshot's parts are judged apart: one whose fields are newer than the copy's but
 * whose `original` is older than the listing applied updates the fields alone. A tombstone's
 * `at` or an unpublishing's `occurredAt` moves every part's instant: nothing older brings the work
 * back. A retried "available" that arrives after "sold" leaves the copy sold. Prices derived by
 * FX move with each day's rate without any webhook: the origin's (and the outlet's) FX refresh
 * stamps a new `asOf` on every listing whose price it moved, so the next nightly pull carries it
 * — and a copy's price is display only: the selling brand prices again when it sells.
 */
import type { IsoInstant } from '@engine/domain/api'

import type { OriginalListing, PrintsFeed } from './listings'
import type { WorkSnapshot } from './snapshot'

/**
 * Signed with HMAC-SHA256 over `${timestamp}.${rawBody}` using the pair's shared secret; the
 * receiver rejects a bad signature (401 + alert) and a timestamp outside the replay window.
 */
export const SISTER_SIGNATURE_HEADER = 'x-sister-signature'
export const SISTER_TIMESTAMP_HEADER = 'x-sister-timestamp'
export const SISTER_REPLAY_WINDOW_SECONDS = 300

/**
 * Origin → outlet. BRANDS.md §5 names three; `work.unpublished` is the fourth, so a copy stops
 * linking to an original the origin took down, without waiting for the nightly reconcile.
 */
export type SisterWebhookEvent =
  | { readonly type: 'work.published'; readonly snapshot: WorkSnapshot }
  | { readonly type: 'work.updated'; readonly snapshot: WorkSnapshot }
  /** A sale, a hold, a release, a price change: only the listing moves. */
  | {
      readonly type: 'work.availability'
      readonly workUid: string
      readonly original: OriginalListing
    }
  | { readonly type: 'work.unpublished'; readonly workUid: string }

export type SisterWebhookType = SisterWebhookEvent['type']

/** The body of one delivery. The receiver dedupes on `id` (delivery is at least once). */
export type SisterWebhook = SisterWebhookEvent & {
  readonly id: string
  readonly occurredAt: IsoInstant
  readonly origin: { readonly brand: string }
}

/**
 * Outlet → origin: a product made from a work was published, changed (a price, its stock, an
 * image) or withdrawn — sent as that work's whole feed, which replaces the origin's copy.
 */
export type PrintsWebhookEvent = { readonly type: 'prints.updated'; readonly feed: PrintsFeed }

/** The body of one outlet delivery, deduped on `id` like the origin's. */
export type PrintsWebhook = PrintsWebhookEvent & {
  readonly id: string
  readonly occurredAt: IsoInstant
  readonly outlet: { readonly brand: string }
}

// ─── The reconcile: each side pulls the other's list nightly ─────────────────────────────────

/** The most works, or feeds, one page returns; a larger `limit` is answered with this many. */
export const ARCHIVE_LIST_MAX_LIMIT = 100

export type ArchiveListRequest = {
  readonly updatedSince: IsoInstant | null
  readonly cursor: string | null
  /** A positive integer, at most ARCHIVE_LIST_MAX_LIMIT. */
  readonly limit: number
}

/** The origin's archive, which the outlet pulls. */
export type ArchiveListResponse = {
  readonly works: readonly WorkSnapshot[]
  /** Works unpublished since `updatedSince`: the copy hides its link. */
  readonly tombstones: readonly { readonly workUid: string; readonly at: IsoInstant }[]
  readonly nextCursor: string | null
}

/** The outlet's feeds changed since `updatedSince`, which the origin pulls; the paging is the archive's. */
export type PrintsListRequest = ArchiveListRequest

/** A work whose products were all withdrawn comes back with an empty feed, never a tombstone. */
export type PrintsListResponse = {
  readonly feeds: readonly PrintsFeed[]
  readonly nextCursor: string | null
}
