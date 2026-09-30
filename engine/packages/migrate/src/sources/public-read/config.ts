/**
 * The reader's configuration. Everything store-specific — the origin, the
 * route shapes, the paths never to request — is data, read from the brand's
 * `content/legacy/inventory/` folder or given on the command line; this file
 * holds only the rules any configuration must satisfy (D41).
 */

/** D41: about one request every two seconds. A config may ask for slower, never faster. */
export const MIN_INTERVAL_FLOOR_MS = 2000

export type RoutePatterns = {
  /** A product page; named groups `id` and `slug`. */
  product: string
  /** A product image; named groups `productId`, `imageId` and an optional `size` (empty = the original). */
  image: string
  /** Listing pages by name (a category, a maker); named groups `id` and `slug`. */
  listings: Record<string, string>
}

/** CSS selectors for the product page's label/value panel (`panel`'s rows of dark labels over values). */
export type ProductPageSelectors = {
  panel: string
  panelRow: string
  panelLabel: string
  panelHeading: string
  longTitle: string
  description: string
  soldMarker: string
}

/** CSS selectors for one product card on a listing page. */
export type CardSelectors = {
  item: string
  title: string
  maker: string
  categories: string
  field: string
  fieldLabel: string
  price: string
  soldMarker: string
}

export type PageSelectors = { product: ProductPageSelectors; card: CardSelectors }

/** A category tree the old pages embed as a script variable (`var db = [...]`). */
export type CategoryTreeConfig = { variable: string; pathTemplate: string }

export type ReaderConfig = {
  /** The origin read, `https://host` — no path, no query. */
  baseUrl: string
  /** Honest: names the reader and its purpose; never a browser's string. */
  userAgent: string
  minIntervalMs: number
  /** Attempts per URL, the first included, before a transient failure is recorded. */
  maxAttempts: number
  /** Consecutive URLs that exhaust their attempts before the whole read stops. */
  maxConsecutiveFailures: number
  seeds: string[]
  routes: RoutePatterns
  /**
   * The only query parameters a fetched URL may carry, each with the values it may take (`'*'`:
   * any). A URL with any other parameter — a sort order, say — is inventoried, never fetched.
   */
  fetchQuery: Record<string, string[] | '*'>
  categoryTree: CategoryTreeConfig | null
  /** Paths (regular expressions over path + query) never requested: sign-in, account, forms, search. */
  never: string[]
  fetchImages: boolean
  /** How product records are read from the cached pages; null: the crawl runs, the build refuses. */
  pages: PageSelectors | null
  /** Try `/sitemap.xml` and robots.txt's Sitemap lines before crawling links. */
  trySitemaps: boolean
}

const BROWSER_MARKERS = /\b(mozilla|chrome|safari|applewebkit|gecko|edg)\b/i

export class ConfigError extends Error {}

function requireString(input: Record<string, unknown>, key: string): string {
  const value = input[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigError(`public-read config: "${key}" must be a non-empty string`)
  }
  return value
}

function stringList(input: Record<string, unknown>, key: string, fallback: string[]): string[] {
  const value = input[key]
  if (value === undefined) return fallback
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new ConfigError(`public-read config: "${key}" must be a list of strings`)
  }
  return value as string[]
}

function positiveInteger(input: Record<string, unknown>, key: string, fallback: number): number {
  const value = input[key] ?? fallback
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new ConfigError(`public-read config: "${key}" must be a positive integer`)
  }
  return value
}

function compiles(pattern: string, key: string): void {
  try {
    new RegExp(pattern)
  } catch {
    throw new ConfigError(`public-read config: "${key}" is not a valid regular expression`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRoutes(raw: unknown): RoutePatterns {
  if (!isRecord(raw) || !isRecord(raw.listings)) {
    throw new ConfigError('public-read config: "routes" must name product, image and listings')
  }
  const listings: Record<string, string> = {}
  for (const [name, pattern] of Object.entries(raw.listings)) {
    if (typeof pattern !== 'string') {
      throw new ConfigError(`public-read config: "routes.listings.${name}" must be a string`)
    }
    compiles(pattern, `routes.listings.${name}`)
    listings[name] = pattern
  }
  const routes = {
    product: requireString(raw, 'product'),
    image: requireString(raw, 'image'),
    listings,
  }
  compiles(routes.product, 'routes.product')
  compiles(routes.image, 'routes.image')
  return routes
}

function parseFetchQuery(raw: unknown): Record<string, string[] | '*'> {
  if (raw === undefined) return {}
  if (!isRecord(raw)) throw new ConfigError('public-read config: "fetchQuery" must be an object')
  const out: Record<string, string[] | '*'> = {}
  for (const [param, values] of Object.entries(raw)) {
    if (values === '*') out[param] = '*'
    else if (Array.isArray(values) && values.every((v) => typeof v === 'string')) {
      out[param] = values as string[]
    } else {
      throw new ConfigError(`public-read config: "fetchQuery.${param}" must be "*" or a list`)
    }
  }
  return out
}

function parseCategoryTree(raw: unknown): CategoryTreeConfig | null {
  if (raw === undefined || raw === null) return null
  if (!isRecord(raw)) throw new ConfigError('public-read config: "categoryTree" must be an object')
  const variable = requireString(raw, 'variable')
  if (!/^[A-Za-z_$][\w$]*$/.test(variable)) {
    throw new ConfigError('public-read config: "categoryTree.variable" must be an identifier')
  }
  return { variable, pathTemplate: requireString(raw, 'pathTemplate') }
}

function selectors<K extends string>(raw: unknown, keys: readonly K[], where: string) {
  if (!isRecord(raw)) throw new ConfigError(`public-read config: "${where}" must be an object`)
  const out = {} as Record<K, string>
  for (const key of keys) out[key] = requireString(raw, key)
  return out
}

function parsePages(raw: unknown): PageSelectors | null {
  if (raw === undefined || raw === null) return null
  if (!isRecord(raw)) throw new ConfigError('public-read config: "pages" must be an object')
  const productKeys = [
    'panel',
    'panelRow',
    'panelLabel',
    'panelHeading',
    'longTitle',
    'description',
    'soldMarker',
  ] as const
  const cardKeys = [
    'item',
    'title',
    'maker',
    'categories',
    'field',
    'fieldLabel',
    'price',
    'soldMarker',
  ] as const
  return {
    product: selectors(raw.product, productKeys, 'pages.product'),
    card: selectors(raw.card, cardKeys, 'pages.card'),
  }
}

/** Validates a parsed JSON config; `overrides` (from the CLI) win over the file. */
export function parseReaderConfig(
  raw: unknown,
  overrides: Partial<Pick<ReaderConfig, 'baseUrl' | 'userAgent' | 'minIntervalMs'>> = {},
): ReaderConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new ConfigError('public-read config: expected a JSON object')
  }
  const input: Record<string, unknown> = { ...(raw as Record<string, unknown>), ...overrides }
  const baseUrl = requireString(input, 'baseUrl')
  const parsed = new URL(baseUrl)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ConfigError('public-read config: "baseUrl" must be http(s)')
  }
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    throw new ConfigError('public-read config: "baseUrl" is an origin — no path, query or hash')
  }
  const userAgent = requireString(input, 'userAgent')
  if (BROWSER_MARKERS.test(userAgent)) {
    throw new ConfigError('public-read config: "userAgent" must not pass for a browser (D41)')
  }
  const minIntervalMs = positiveInteger(input, 'minIntervalMs', MIN_INTERVAL_FLOOR_MS)
  if (minIntervalMs < MIN_INTERVAL_FLOOR_MS) {
    throw new ConfigError(
      `public-read config: "minIntervalMs" may not be below ${MIN_INTERVAL_FLOOR_MS} (D41)`,
    )
  }
  const routes = parseRoutes(input.routes)
  const never = stringList(input, 'never', [])
  never.forEach((pattern, index) => compiles(pattern, `never[${index}]`))

  return {
    baseUrl: parsed.origin,
    userAgent,
    minIntervalMs,
    maxAttempts: positiveInteger(input, 'maxAttempts', 4),
    maxConsecutiveFailures: positiveInteger(input, 'maxConsecutiveFailures', 3),
    seeds: stringList(input, 'seeds', ['/']),
    routes,
    fetchQuery: parseFetchQuery(input.fetchQuery),
    categoryTree: parseCategoryTree(input.categoryTree),
    never,
    fetchImages: input.fetchImages !== false,
    pages: parsePages(input.pages),
    trySitemaps: input.trySitemaps !== false,
  }
}
