// Sorts legacy paths into the kinds the redirect map is built from:
//   product   — one thing that was for sale → its new product
//   category  — a listing of products (a store collection, a category, a
//               filtered collection) → a collection or facet URL
//   page      — a standalone page (about, contact, legal) → the hand map
//   blog      — an editorial collection, its posts and archives → a story
//   asset     — an image, file, stylesheet or script → a media derivative or 404
//   system    — the platform's own machinery (cart, account, robots.txt,
//               sitemap, probes for files that never existed) → 404 or home
//
// The rules are the URL shapes of the hosted-store platforms a small shop's
// domain has typically run on — Squarespace (`/<collection>/p/<slug>`) and the
// Indonesian store builders' `/products/<slug>` — never a brand's own paths.
// What a shape cannot tell (a store page with no archived products under it),
// the brand's discovery file settles with `kindOverrides`, which is data.

export const KINDS = ['product', 'category', 'page', 'blog', 'asset', 'system']

const SYSTEM_SEGMENTS = new Set([
  '.well-known',
  'account',
  'api',
  'auth',
  'cart',
  'cdn-cgi',
  'checkout',
  'commerce',
  'config',
  'search',
  'wp-admin',
  'wp-content',
  'wp-includes',
  'wp-login.php',
  'xmlrpc.php',
])
const SYSTEM_FILES =
  /^(robots\.txt|ads\.txt|app-ads\.txt|humans\.txt|security\.txt|crossdomain\.xml|browserconfig\.xml|site\.webmanifest|manifest\.json|sitemap[\w-]*\.xml(\.gz)?)$/i
const ASSET_SEGMENTS = new Set(['s', 'static', 'assets', 'universal', 'images', 'img', 'uploads'])
const ASSET_EXTENSION =
  /\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|pdf|css|js|mjs|map|woff2?|ttf|otf|eot|mp4|webm|mp3|zip)$/i
const ASSET_MIMETYPE =
  /^(image|font|audio|video)\/|^application\/(pdf|javascript|zip)|^text\/(css|javascript)/
const PRODUCT_SEGMENTS = new Set(['product', 'products'])
const STORE_SEGMENTS = new Set(['shop', 'store', 'collections'])
const BLOG_SEGMENTS = new Set(['blog', 'journal', 'news', 'stories', 'lookbook'])
const LISTING_SEGMENTS = new Set(['category', 'tag', 'categories', 'tags'])
const YEAR = /^\d{4}$/

/**
 * @typedef {{ host: string, path: string, query: string, mimetypes: Set<string> }} ClassifyInput
 * @typedef {{ kind: string, rule: string }} Classification
 */

/** @param {string} path */
function segmentsOf(path) {
  return path.split('/').filter((segment) => segment !== '')
}

/**
 * Collections whose role only shows in their children: a collection with a
 * `/p/` child is a store, one with a dated child is a blog.
 * @param {ClassifyInput[]} entries
 */
export function collectionRoles(entries) {
  const stores = new Set()
  const blogs = new Set()
  for (const { host, path } of entries) {
    const segments = segmentsOf(path)
    if (segments.length === 3 && segments[1] === 'p') stores.add(`${host} ${segments[0]}`)
    if (segments.length >= 2 && YEAR.test(segments[1] ?? '')) blogs.add(`${host} ${segments[0]}`)
  }
  return { stores, blogs }
}

/**
 * @param {ClassifyInput} entry
 * @param {{ stores: Set<string>, blogs: Set<string> }} roles
 * @returns {Classification}
 */
export function classifyPath(entry, roles) {
  const segments = segmentsOf(entry.path)
  const [first = '', second = ''] = segments
  const last = segments.at(-1) ?? ''
  const collection = `${entry.host} ${first}`
  if (segments.length === 0) return { kind: 'page', rule: 'home' }
  if (SYSTEM_SEGMENTS.has(first)) return { kind: 'system', rule: 'platform-path' }
  if (segments.length === 1 && SYSTEM_FILES.test(first))
    return { kind: 'system', rule: 'root-file' }
  if (ASSET_SEGMENTS.has(first)) return { kind: 'asset', rule: 'asset-path' }
  if (ASSET_EXTENSION.test(last)) return { kind: 'asset', rule: 'file-extension' }
  if ([...entry.mimetypes].some((type) => ASSET_MIMETYPE.test(type))) {
    return { kind: 'asset', rule: 'mimetype' }
  }
  if (segments.length === 3 && second === 'p') return { kind: 'product', rule: 'store-product' }
  if (PRODUCT_SEGMENTS.has(first)) {
    if (segments.length === 1 || LISTING_SEGMENTS.has(second)) {
      return { kind: 'category', rule: 'product-listing' }
    }
    if (segments.length === 2) return { kind: 'product', rule: 'product-path' }
  }
  if (roles.stores.has(collection) || STORE_SEGMENTS.has(first)) {
    return { kind: 'category', rule: entry.query === '' ? 'store-collection' : 'store-filter' }
  }
  if (roles.blogs.has(collection) || BLOG_SEGMENTS.has(first)) {
    if (segments.length === 1) return { kind: 'blog', rule: 'blog-collection' }
    const isListing =
      /^\d+$/.test(last) || segments.some((segment) => LISTING_SEGMENTS.has(segment))
    return { kind: 'blog', rule: isListing || entry.query !== '' ? 'blog-listing' : 'blog-entry' }
  }
  return { kind: 'page', rule: 'page' }
}

/**
 * Classifies every entry, the brand's overrides (`{ "/path": "kind" }`, main
 * host only) winning over the shapes.
 * @param {ClassifyInput[]} entries
 * @param {Record<string, string>} [overrides]
 * @returns {Classification[]} in the order of `entries`
 */
export function classifyAll(entries, overrides = {}) {
  for (const [path, kind] of Object.entries(overrides)) {
    if (!KINDS.includes(kind)) throw new Error(`kindOverrides["${path}"]: "${kind}" is not a kind`)
  }
  const roles = collectionRoles(entries)
  return entries.map((entry) => {
    const override = entry.host === '@' && entry.query === '' ? overrides[entry.path] : undefined
    return override === undefined
      ? classifyPath(entry, roles)
      : { kind: override, rule: 'override' }
  })
}
