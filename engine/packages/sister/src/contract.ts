/**
 * @contract C12 Sister archive API · owner: ARC · entry `@engine/sister/contract`
 *
 * Copy with provenance, never join across databases on a request path (BRANDS.md §5). Both ways:
 * the origin brand exposes a signed, read-only archive API and signed webhooks, and the outlet
 * stores a provenance copy of each work it uses and renders "own the original" from it
 * (`./contract/snapshot`); the outlet sends back what it makes from each work, and the origin
 * renders "Prints of this map" from its copy of that (`PrintsFeed`, TASKS.md 27.1.d). Everything
 * sent is PUBLISHED and PUBLIC, read by a published-only, projected read (`overrideAccess: false`,
 * `_status: 'published'`, `select`): never `physical` (location, export status, acquisition cost,
 * consignor), draft or cataloguing-internal data — the foot of this file proves no shape has such
 * a field. Prices travel per market and URLs absolute (`./contract/listings`); transport and the
 * nightly reconcile are `./contract/transport`. SIS implements (TASKS.md 27.1).
 *
 * Master scans are the one asset the sisters share (ARCHITECTURE.md §7, BRANDS.md §5): stored
 * once, by the origin, in the private masters bucket, under C9's `masterKey(workUid, checksum,
 * extension)`. A snapshot carries that key — the only name for a master both databases can
 * resolve, where an origin record id would mean nothing to the sister — and never a presigned
 * URL; the sister reads the master through its own scoped credentials (C9's master access,
 * every read logged) and writes only under `print-files/`. Display images are the brand's public
 * derivatives, rendered where they are (`SnapshotImage`), never copied.
 */
import type { Money } from '@engine/domain/money'

import type { AbsoluteUrl } from './contract/listings'
import type { MasterKey, WorkSnapshot } from './contract/snapshot'
import type {
  ArchiveListResponse,
  PrintsListResponse,
  PrintsWebhook,
  SisterWebhook,
} from './contract/transport'

export * from './contract/listings'
export * from './contract/snapshot'
export * from './contract/transport'

// ─── Type-level tests: nothing private can be in a snapshot or a feed ────────────────────────

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
type _PrintsArePublic = Assert<IsPublicShape<PrintsWebhook>>
type _PrintsListIsPublic = Assert<IsPublicShape<PrintsListResponse>>
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
type _UrlsAreAbsolute = Accepts<
  AbsoluteUrl,
  // @ts-expect-error — a root-relative path would resolve against the other brand's domain
  '/product/1001-isle-of-contoh'
>
