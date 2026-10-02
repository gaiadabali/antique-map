/**
 * Pure functions that turn one legacy URL shape into a redirect decision.
 *
 * Each rule returns `{ kind: 'redirect', to, code: 301 }` for a row the builder
 * writes, `{ kind: 'gone' }` for a 410, or `{ kind: 'unresolved', reason }` when
 * the destination is not yet known (unpublished or unmapped).
 *
 * The rules know the URL shapes from DATA.md §6–§7 and the archived inventories,
 * not a brand's content: content lookups arrive as data (`works`, `categories`).
 */
import type { SiteKey } from './normalise'

export type RedirectDecision =
  | { kind: 'redirect'; to: string; code: 301 }
  | { kind: 'gone' }
  | { kind: 'unresolved'; reason: string }

export type WorkLookup = {
  readonly legacyId: number
  readonly publicId: number
  readonly slug: string
  readonly published: boolean
}

export type RuleContext = {
  readonly site: SiteKey
  readonly works: readonly WorkLookup[]
  readonly categories: Readonly<Record<string, string>>
}

const ID_SLUG = /^([1-9]\d*)-(.+)$/
const IMAGE = /^\/storage\/products\/([1-9]\d*)-([1-9]\d*)([SM]?)\.(?:jpe?g|png|webp|gif)$/i

function findWork(ctx: RuleContext, legacyId: number): WorkLookup | undefined {
  return ctx.works.find((work) => work.legacyId === legacyId)
}

/** `/product/{id}-{slug}` — the gallery item route resolves by public id. */
export function galleryProductRule(
  path: string,
  _search: string,
  ctx: RuleContext,
): RedirectDecision {
  const match = ID_SLUG.exec(path.slice('/product/'.length))
  if (!match) return { kind: 'unresolved', reason: 'product path does not match id-slug shape' }
  const legacyId = Number(match[1])
  const work = findWork(ctx, legacyId)
  if (!work) return { kind: 'unresolved', reason: `no work for legacy id ${legacyId}` }
  if (!work.published) return { kind: 'unresolved', reason: `work ${legacyId} is not published` }
  const target = `/product/${work.publicId}-${work.slug}`
  if (path === target) return { kind: 'unresolved', reason: 'already the canonical URL' }
  return { kind: 'redirect', to: target, code: 301 }
}

/**
 * `/category/{id}-{slug}` — the reviewed mapping turns the legacy category into
 * a browse selection. Query handling: `?s=sold`, `?o=newest` kept; `?p=`,
 * `?page=` dropped.
 */
export function galleryCategoryRule(
  path: string,
  search: string,
  ctx: RuleContext,
): RedirectDecision {
  const rest = path.slice('/category/'.length)
  const match = ID_SLUG.exec(rest)
  if (!match) return { kind: 'unresolved', reason: 'category path does not match id-slug shape' }
  const legacyId = match[1]!
  const target = ctx.categories[legacyId]
  if (!target) return { kind: 'unresolved', reason: `no mapping for category ${legacyId}` }
  return { kind: 'redirect', to: target + (search ? `?${search}` : ''), code: 301 }
}

/** `/mapmaker/{id}-{name}` — mapped to `/makers/{slug}` after de-duplication. */
export function galleryMakerRule(
  path: string,
  _search: string,
  ctx: RuleContext,
): RedirectDecision {
  const rest = path.slice('/mapmaker/'.length)
  const match = ID_SLUG.exec(rest)
  if (!match) return { kind: 'unresolved', reason: 'maker path does not match id-slug shape' }
  const legacyId = match[1]!
  const target = ctx.categories[legacyId]
  if (!target) return { kind: 'unresolved', reason: `no mapping for maker ${legacyId}` }
  return { kind: 'redirect', to: target, code: 301 }
}

/** `/storage/products/{product}-{image}.jpg` and its S/M variants → media derivative. */
export function galleryImageRule(
  path: string,
  _search: string,
  _ctx: RuleContext,
): RedirectDecision {
  const match = IMAGE.exec(path)
  if (!match) return { kind: 'unresolved', reason: 'image path does not match storage shape' }
  // The runtime handler builds this from MEDIA_PUBLIC_URL by old product/image ids.
  return { kind: 'unresolved', reason: 'image rule is answered by the legacy handler, not a row' }
}

/** `/account/…` — the new gallery has no accounts. */
export function galleryAccountRule(
  _path: string,
  _search: string,
  _ctx: RuleContext,
): RedirectDecision {
  return { kind: 'gone' }
}

/** Static legacy paths (`/catalogue`, `/new-additions` …) — hand map. */
export function galleryStaticRule(
  path: string,
  _search: string,
  ctx: RuleContext,
): RedirectDecision {
  const target = ctx.categories[path]
  if (!target) return { kind: 'unresolved', reason: `no hand map for ${path}` }
  return { kind: 'redirect', to: target, code: 301 }
}

/** Shop product paths `/products/<slug>` and `/our-collection/p/<slug>`. */
export function shopProductRule(path: string, _search: string, ctx: RuleContext): RedirectDecision {
  let slug: string | undefined
  if (path.startsWith('/products/')) slug = path.slice('/products/'.length)
  else if (path.startsWith('/our-collection/p/')) slug = path.slice('/our-collection/p/'.length)
  if (!slug || slug.includes('/')) {
    return { kind: 'unresolved', reason: 'shop product path does not match a known shape' }
  }
  const work = ctx.works.find((w) => w.slug === slug)
  if (!work) return { kind: 'unresolved', reason: `no product for slug "${slug}"` }
  if (!work.published) return { kind: 'unresolved', reason: `product "${slug}" is not published` }
  return { kind: 'redirect', to: `/product/${work.slug}`, code: 301 }
}

/** Shop category paths `/collection/…` and `/products/category/…`. */
export function shopCategoryRule(
  path: string,
  _search: string,
  ctx: RuleContext,
): RedirectDecision {
  const target = ctx.categories[path]
  if (!target) return { kind: 'unresolved', reason: `no mapping for shop category "${path}"` }
  return { kind: 'redirect', to: target, code: 301 }
}

/** `/account/…` and shop platform paths are gone on both sites. */
export function accountRule(_path: string, _search: string, _ctx: RuleContext): RedirectDecision {
  return { kind: 'gone' }
}

/**
 * Dispatch a gallery legacy path to its rule. `path` is the normalised
 * pathname; `search` is the kept query string already filtered for this site.
 */
export function galleryRule(path: string, search: string, ctx: RuleContext): RedirectDecision {
  if (path.startsWith('/product/')) return galleryProductRule(path, search, ctx)
  if (path.startsWith('/category/')) return galleryCategoryRule(path, search, ctx)
  if (path.startsWith('/mapmaker/')) return galleryMakerRule(path, search, ctx)
  if (path.startsWith('/storage/products/')) return galleryImageRule(path, search, ctx)
  if (path.startsWith('/account/') || path === '/account')
    return galleryAccountRule(path, search, ctx)
  return galleryStaticRule(path, search, ctx)
}

/** Dispatch a shop legacy path to its rule. */
export function shopRule(path: string, search: string, ctx: RuleContext): RedirectDecision {
  if (path.startsWith('/products/') || path.startsWith('/our-collection/p/')) {
    return shopProductRule(path, search, ctx)
  }
  if (path.startsWith('/collection/') || path.startsWith('/products/category/')) {
    return shopCategoryRule(path, search, ctx)
  }
  if (path.startsWith('/account/') || path === '/account') return accountRule(path, search, ctx)
  return shopCategoryRule(path, search, ctx)
}

/** Pick a rule for a site. */
export function resolveRule(
  site: SiteKey,
  path: string,
  search: string,
  ctx: RuleContext,
): RedirectDecision {
  return site === 'gallery' ? galleryRule(path, search, ctx) : shopRule(path, search, ctx)
}
