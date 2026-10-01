/**
 * The cache tags (ARCHITECTURE.md §9, CONVENTIONS.md §12): one builder per content kind known
 * today, each with the expiry its invalidation uses, and the grammar `/api/x/revalidate` checks a
 * posted tag against (C13 `REVALIDATE_REQUEST`, TASKS.md 4.6.f). A tag is always made here —
 * by a builder, or by `parseCacheTag()` from a string that is one — and never written by hand,
 * so a loader's `cacheTag()` and a hook's `invalidate()` cannot spell one tag two ways.
 *
 * - `item:<publicId>` — a product's editorial record (the item page, a card's text);
 * - `work:<workUid>` — a work's record, and whatever renders it;
 * - `availability:<publicId>` — a status a cached scope shows (a card's *Sold*); never the
 *   availability that decides a purchase, which is read live (ARCHITECTURE.md §9);
 * - `price:<publicId>` — a product's prices.
 *
 * Editorial tags expire `'max'` — stale-while-revalidate: the next request is served the old
 * entry once while a fresh one is computed. Availability and price expire `{ expire: 0 }`: the
 * next request waits for the new answer. The profile is the kind's, never a caller's, so no
 * caller can make an availability tag go stale-while-revalidate. The process serves one brand,
 * so a tag names no brand. Another lane's new kind is SCH's to add here, on request, as a
 * registry entry is (ARCHITECTURE.md §15).
 */

declare const cacheTagBrand: unique symbol

/** A tag one of this module's builders made; a plain string is not one until parsed. */
export type CacheTag = string & { readonly [cacheTagBrand]: true }

/** How an invalidated tag's entries expire: `revalidateTag()`'s second argument. */
export type TagExpiry = 'max' | { readonly expire: 0 }

/** Stale-while-revalidate, for editorial content. */
export const EDITORIAL_EXPIRY: TagExpiry = 'max'
/** Gone at once: the next request recomputes. */
export const IMMEDIATE_EXPIRY: TagExpiry = Object.freeze({ expire: 0 as const })

/** `0`, or a safe integer written without a sign, a leading zero or an exponent. */
const PUBLIC_ID = /^(?:0|[1-9][0-9]{0,15})$/
/**
 * `<prefix>-<digits>` (CONTENT-MODEL.md §1 `workUid`): the prefix is C1's `ids.workUidPrefix`,
 * `^[A-Z][A-Z0-9]{1,7}$` — a test holds the two together.
 */
const WORK_UID = /^[A-Z][A-Z0-9]{1,7}-[0-9]{1,16}$/

type Kind = {
  /** What the tag's value is, for an error message. */
  readonly value: string
  readonly valid: (value: string) => boolean
  readonly expiry: TagExpiry
}

const isPublicId = (value: string) => PUBLIC_ID.test(value) && Number.isSafeInteger(Number(value))

/** Every content kind known today. */
export const TAG_KINDS = {
  item: { value: 'a publicId', valid: isPublicId, expiry: EDITORIAL_EXPIRY },
  work: { value: 'a workUid', valid: (value) => WORK_UID.test(value), expiry: EDITORIAL_EXPIRY },
  availability: { value: 'a publicId', valid: isPublicId, expiry: IMMEDIATE_EXPIRY },
  price: { value: 'a publicId', valid: isPublicId, expiry: IMMEDIATE_EXPIRY },
} as const satisfies Record<string, Kind>

export type TagKind = keyof typeof TAG_KINDS

const KINDS: Readonly<Record<string, Kind>> = TAG_KINDS

/**
 * Longer than any tag the grammar accepts (`work:` with an eight-character prefix and sixteen
 * digits is 30), and far below Next's 256-character limit: `parseCacheTag()` reads no further.
 */
export const MAX_TAG_LENGTH = 64

function build(kind: TagKind, value: string): CacheTag {
  if (!TAG_KINDS[kind].valid(value)) {
    throw new TypeError(`${kind} tag: ${JSON.stringify(value)} is not ${TAG_KINDS[kind].value}`)
  }
  return `${kind}:${value}` as CacheTag
}

/** A publicId as a tag spells it: a non-negative safe integer, in decimal. */
function byPublicId(kind: 'item' | 'availability' | 'price', publicId: number): CacheTag {
  if (!Number.isSafeInteger(publicId) || publicId < 0) {
    throw new TypeError(`${kind} tag: ${publicId} is not a publicId (a non-negative safe integer)`)
  }
  return build(kind, String(publicId))
}

export const itemTag = (publicId: number): CacheTag => byPublicId('item', publicId)
export const availabilityTag = (publicId: number): CacheTag => byPublicId('availability', publicId)
export const priceTag = (publicId: number): CacheTag => byPublicId('price', publicId)
export const workTag = (workUid: string): CacheTag => build('work', workUid)

/**
 * The tag `value` spells, or `null` when no builder makes it — the check `/api/x/revalidate`
 * runs on every posted tag before it expires any (400 on one `null`).
 */
export function parseCacheTag(value: unknown): CacheTag | null {
  if (typeof value !== 'string' || value.length > MAX_TAG_LENGTH) return null
  const colon = value.indexOf(':')
  if (colon < 0) return null
  const kind = Object.hasOwn(KINDS, value.slice(0, colon)) ? KINDS[value.slice(0, colon)] : null
  return kind?.valid(value.slice(colon + 1)) ? (value as CacheTag) : null
}

/** `value` as a tag, or a throw naming it: for a value that must already be one. */
export function requireCacheTag(value: unknown): CacheTag {
  const tag = parseCacheTag(value)
  if (tag === null) {
    throw new TypeError(`not a cache tag @engine/cache makes: ${JSON.stringify(value)}`)
  }
  return tag
}

export function tagKind(tag: CacheTag): TagKind {
  return requireCacheTag(tag).slice(0, tag.indexOf(':')) as TagKind
}

/** How `tag`'s entries expire when it is invalidated: its kind's, never the caller's. */
export function tagExpiry(tag: CacheTag): TagExpiry {
  return TAG_KINDS[tagKind(tag)].expiry
}
