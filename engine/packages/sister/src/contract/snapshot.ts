/**
 * @contract C12 Sister archive API — the work snapshot · owner: ARC · via `@engine/sister/contract`
 *
 * A work as the origin published it: the source of a provenance copy's read-only fields. It holds
 * PUBLISHED, PUBLIC fields only — built by a published-only, projected read, never carrying
 * `physical` (location, export status, acquisition cost, consignor), draft or cataloguing-internal
 * data (the entry's type tests prove it) — and its master scan by C9 key, never a presigned URL.
 */
import type { ObjectType } from '@engine/config/schema'
import type { IsoDate, IsoInstant } from '@engine/domain/api'

import type { Localised, OriginalListing, SnapshotImage } from './listings'

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
  /** The primary image's public derivatives (C9), at the origin's absolute URLs. */
  readonly primaryImage: SnapshotImage | null
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
