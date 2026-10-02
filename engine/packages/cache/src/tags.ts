/**
 * The cache tags (ARCHITECTURE.md §6, CONVENTIONS.md §12): one builder per content kind, each with
 * the expiry its invalidation uses, and the grammar `/api/x/revalidate` checks a posted tag against
 * (`@engine/http/manifest` `REVALIDATE_REQUEST`). A tag is always made here — by a builder, or by
 * `parseCacheTag()` from a string that is one — and never written by hand, so a loader's
 * `cacheTag()` and a hook's `invalidate()` cannot spell one tag two ways.
 *
 * One process serves both sites (TASKS.md 2.2), so a tag is namespaced by the collection whose
 * record it names, and a record's tag names no site: one invalidation reaches every site and
 * locale that shows the record, whose cache keys carry the site and locale as loader arguments.
 * Only a record that holds a part for each site — the `site-settings` global, a group per site;
 * each site's map of `redirects` — carries the site, so editing one site's part leaves the other's
 * cache alone:
 *
 * - `work:<workUid>` — a gallery work (`works`), and whatever renders it;
 * - `product:<id>` — a shop product's editorial record (its page, a card's text);
 * - `product-stock:<id>` — a stock status a cached scope shows (a card's *Sold out*); never the
 *   stock that decides a purchase, which is read live (ARCHITECTURE.md §6);
 * - `product-price:<id>` — a product's prices;
 * - `settings:<site>` — one site's group of `site-settings`;
 * - `redirects:<site>` — one site's cached map of `redirects`.
 *
 * Editorial tags expire `'max'` — stale-while-revalidate: the next request is served the old entry
 * once while a fresh one is computed. Stock and price expire `{ expire: 0 }`: the next request
 * waits for the new answer. The profile is the kind's, never a caller's, so no caller can make a
 * stock tag go stale-while-revalidate.
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

/** A Payload id: a positive safe integer, written without a sign, a leading zero or an exponent. */
const RECORD_ID = /^[1-9][0-9]{0,15}$/
/**
 * `<prefix>-<digits>` (CONTENT-MODEL.md §3 `workUid`): the prefix is `SITES.gallery.works`'s,
 * `^[A-Z][A-Z0-9]{1,7}$` — a test holds the two together.
 */
const WORK_UID = /^[A-Z][A-Z0-9]{1,7}-[0-9]{1,16}$/
/** The sites a site-scoped tag may name (`SITES`); restated, as this leaf imports no package. */
export const TAG_SITES = ['gallery', 'shop'] as const
export type TagSite = (typeof TAG_SITES)[number]

type Kind = {
  /** What the tag's value is, for an error message. */
  readonly value: string
  readonly valid: (value: string) => boolean
  readonly expiry: TagExpiry
}

const isRecordId = (value: string) => RECORD_ID.test(value) && Number.isSafeInteger(Number(value))
const isSite = (value: string) => (TAG_SITES as readonly string[]).includes(value)
const record = (expiry: TagExpiry): Kind => ({ value: 'a record id', valid: isRecordId, expiry })
const site = { value: 'a site', valid: isSite, expiry: EDITORIAL_EXPIRY } as const

/** Every content kind known today. */
export const TAG_KINDS = {
  work: { value: 'a workUid', valid: (value) => WORK_UID.test(value), expiry: EDITORIAL_EXPIRY },
  product: record(EDITORIAL_EXPIRY),
  'product-stock': record(IMMEDIATE_EXPIRY),
  'product-price': record(IMMEDIATE_EXPIRY),
  settings: site,
  redirects: site,
} as const satisfies Record<string, Kind>

export type TagKind = keyof typeof TAG_KINDS

const KINDS: Readonly<Record<string, Kind>> = TAG_KINDS

/**
 * Longer than any tag the grammar accepts (`product-price:` and sixteen digits is 30), and far
 * below Next's 256-character limit: `parseCacheTag()` reads no further.
 */
export const MAX_TAG_LENGTH = 64

function build(kind: TagKind, value: string): CacheTag {
  if (!TAG_KINDS[kind].valid(value)) {
    throw new TypeError(`${kind} tag: ${JSON.stringify(value)} is not ${TAG_KINDS[kind].value}`)
  }
  return `${kind}:${value}` as CacheTag
}

/** A Payload id as a tag spells it: a positive safe integer, in decimal. */
function byRecordId(kind: 'product' | 'product-stock' | 'product-price', id: number): CacheTag {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new TypeError(`${kind} tag: ${id} is not a record id (a positive safe integer)`)
  }
  return build(kind, String(id))
}

export const workTag = (workUid: string): CacheTag => build('work', workUid)
export const productTag = (id: number): CacheTag => byRecordId('product', id)
export const productStockTag = (id: number): CacheTag => byRecordId('product-stock', id)
export const productPriceTag = (id: number): CacheTag => byRecordId('product-price', id)
export const settingsTag = (site: TagSite): CacheTag => build('settings', site)
export const redirectsTag = (site: TagSite): CacheTag => build('redirects', site)

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
