/**
 * @contract C12 Sister archive API · owner: ARC · entry `@engine/sister/contract`
 *
 * Copy with provenance, never join across databases on a request path (BRANDS.md §5). The
 * origin brand exposes a signed, read-only archive API and signed webhooks; the sister stores a
 * provenance copy of each work it uses and renders its links from that copy. A work snapshot
 * holds PUBLISHED, PUBLIC fields only: it is built by a published-only, projected read
 * (`overrideAccess: false`, `_status: 'published'`, `select`) and never carries `physical`
 * (location, export status, acquisition cost, consignor), draft or cataloguing-internal data —
 * the foot of this file proves the shape has no such field. SIS implements (TASKS.md 27.1).
 *
 * Master scans are the one asset the sisters share (ARCHITECTURE.md §7, BRANDS.md §5): stored
 * once, by the origin, in the private masters bucket, under C9's `masterKey(workUid, checksum,
 * extension)`. A snapshot carries that key — the only name for a master both databases can
 * resolve, where an origin record id would mean nothing to the sister — and never a presigned
 * URL; the sister reads the master through its own scoped credentials (C9's master access,
 * every read logged) and writes only under `print-files/`.
 */
import type { CountryCode, LocaleCode, ObjectType } from '@engine/config/schema'
import type { AvailabilityState } from '@engine/domain/machines/availability'
import type { IsoDate, IsoInstant } from '@engine/domain/api'
import type { Money } from '@engine/domain/money'

/** Text per locale, as the origin published it. */
export type Localised = { readonly [L in LocaleCode]?: string }

/** `works.objectType`: C1's catalogue vocabulary (`schema/catalogue`), imported, never repeated. */
export type { ObjectType } from '@engine/config/schema'

/** A master's key in the private masters bucket: exactly what C9's `masterKey()` returns. */
export type MasterKey = `masters/${string}/${string}.${string}`

export type SnapshotMaker = {
  readonly name: string
  readonly sortName: string
  readonly slug: string
  readonly lifeDates: string | null
  readonly role:
    | 'cartographer'
    | 'engraver'
    | 'publisher'
    | 'author'
    | 'artist'
    | 'photographer'
    | 'studio'
    | 'printer'
  /** Never implied certain (CONTENT-MODEL.md §1). */
  readonly certainty: 'certain' | 'attributed' | 'after' | 'workshop'
}

export type SnapshotPlace = {
  readonly name: Localised
  readonly slug: string
  readonly historicalNames: readonly string[]
  readonly role: 'depicts' | 'published-at' | 'photographed-at'
  readonly primary: boolean
}

export type FuzzyDate = {
  readonly from: IsoDate | null
  readonly to: IsoDate | null
  readonly precision: 'exact' | 'circa' | 'before' | 'after' | 'range' | 'unknown'
  readonly display: string | null
}

/**
 * The original's listing at the origin, as a sister link shows it: its state, its prices per
 * currency (a visitor delivering to Indonesia sees the IDR one alone — the rupiah rule holds on
 * sister links too) and where it can be bought. `sellsTo` is the public consequence of the export
 * status the origin's item page already states — never the status itself, never the location.
 */
export type OriginalListing = {
  readonly productPublicId: number
  readonly urls: Localised
  readonly availability: AvailabilityState
  readonly pricing: 'fixed' | 'on-request' | 'offer-only'
  /** One per currency the origin prices in; empty when on request or sold. */
  readonly prices: readonly Money[]
  readonly sellsTo:
    | { readonly kind: 'anywhere' }
    /** Deliverable only within `country` ("… can only be delivered within Indonesia"). */
    | { readonly kind: 'domestic-only'; readonly country: CountryCode }
    /** No recorded location or export status: the link offers an enquiry, never a buy route. */
    | { readonly kind: 'enquiry-only' }
  /** How fresh this is: a link never claims more certainty than its copy has. */
  readonly asOf: IsoInstant
}

/** A work as the origin published it — the source of a provenance copy's read-only fields. */
export type WorkSnapshot = {
  /** Stable for ever: sync, redirects and the copy's `origin.workUid` key on it. */
  readonly workUid: string
  /** The shared Archive No. / stock number tag. */
  readonly stockNumber: string | null
  readonly title: Localised
  readonly originalTitle: string | null
  readonly objectType: ObjectType
  readonly makers: readonly SnapshotMaker[]
  readonly date: FuzzyDate
  readonly publication: {
    readonly place: string | null
    readonly publisher: string | null
    readonly sourceWork: string | null
    readonly edition: string | null
  }
  readonly technique: string | null
  readonly colour: string | null
  /** Millimetres; inches are derived, never sent. */
  readonly dimensions: {
    readonly image: { readonly height: number; readonly width: number } | null
    readonly sheet: { readonly height: number; readonly width: number } | null
  }
  readonly places: readonly SnapshotPlace[]
  readonly subjects: readonly { readonly slug: string; readonly label: Localised }[]
  readonly references: readonly { readonly source: string; readonly ref: string }[]
  /** A public derivative of the primary image (C9), with its alt text. */
  readonly primaryImage: {
    readonly url: string
    readonly width: number
    readonly height: number
    readonly alt: Localised
  } | null
  /**
   * What a reproduction needs to know. `printAllowed` false blocks publishing a reproduction
   * (COMPLIANCE.md §8).
   */
  readonly rights: {
    readonly status: string
    readonly holder: string | null
    readonly printAllowed: boolean
    readonly territories: readonly string[]
    readonly expires: IsoDate | null
  }
  /**
   * The master scan by its C9 key in the shared private bucket — never a presigned URL — with the
   * checksum the key embeds (the copy verifies what it fetched) and the pixels the print-size
   * ceiling is computed from (ARCHITECTURE.md §7).
   */
  readonly master: {
    readonly key: MasterKey
    readonly checksum: string
    readonly widthPx: number
    readonly heightPx: number
  } | null
  /** Null when the work has no listing at the origin. */
  readonly original: OriginalListing | null
  readonly updatedAt: IsoInstant
}

// ─── Webhooks: origin → sister, signed ───────────────────────────────────────────────────────

/**
 * Signed with HMAC-SHA256 over `${timestamp}.${rawBody}` using the pair's shared secret; the
 * receiver rejects a bad signature (401 + alert) and a timestamp outside the replay window.
 */
export const SISTER_SIGNATURE_HEADER = 'x-sister-signature'
export const SISTER_TIMESTAMP_HEADER = 'x-sister-timestamp'
export const SISTER_REPLAY_WINDOW_SECONDS = 300

/**
 * BRANDS.md §5 names three; `work.unpublished` is the fourth, so a copy stops linking to an
 * original the origin took down, without waiting for the nightly reconcile.
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

// ─── The archive API: the nightly reconcile pulls ────────────────────────────────────────────

/** The most works one archive page returns; a larger `limit` is answered with this many. */
export const ARCHIVE_LIST_MAX_LIMIT = 100

export type ArchiveListRequest = {
  readonly updatedSince: IsoInstant | null
  readonly cursor: string | null
  /** A positive integer, at most ARCHIVE_LIST_MAX_LIMIT. */
  readonly limit: number
}

export type ArchiveListResponse = {
  readonly works: readonly WorkSnapshot[]
  /** Works unpublished since `updatedSince`: the copy hides its link. */
  readonly tombstones: readonly { readonly workUid: string; readonly at: IsoInstant }[]
  readonly nextCursor: string | null
}

// ─── Type-level tests: nothing private can be in a snapshot ──────────────────────────────────

type PrivateKey =
  | 'physical'
  | 'location'
  | 'exportStatus'
  | 'acquisition'
  | 'cost'
  | 'consignor'
  | 'coaIssued'
  | 'offerFloorPct'
  | '_status'
  | 'cataloguing'
  | 'aiDraft'
  | 'legacy'
  | 'presignedUrl'
  | 'signedUrl'
type Assert<T extends true> = T
type Accepts<T, U extends T> = U
type AllTrue<R> = false extends R[keyof R] ? false : true
type IsPublicShape<T> = T extends readonly (infer E)[]
  ? IsPublicShape<E>
  : T extends object
    ? [Extract<keyof T, PrivateKey>] extends [never]
      ? AllTrue<{ [K in keyof T]-?: IsPublicShape<T[K]> }>
      : false
    : true

type _SnapshotIsPublic = Assert<IsPublicShape<SisterWebhook>>
type _ListIsPublic = Assert<IsPublicShape<ArchiveListResponse>>
type _AcquisitionCostRejected = Assert<
  // @ts-expect-error — acquisition cost and consignor never leave the origin
  IsPublicShape<WorkSnapshot & { readonly physical: { readonly acquisition: { cost: Money } } }>
>
type _PresignedUrlRejected = Assert<
  // @ts-expect-error — a master travels by its key; a presigned URL never enters a snapshot
  IsPublicShape<{ readonly master: { readonly key: MasterKey; readonly presignedUrl: string } }>
>
type _MasterByKey = Accepts<
  NonNullable<WorkSnapshot['master']>['key'],
  // @ts-expect-error — an origin record id is not a key the sister's database can resolve
  'master-123'
>
