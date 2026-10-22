/**
 * The read itself: a breadth-first walk from robots.txt, the sitemaps (if the
 * site has any) and the seeds, one polite request at a time. Pages and
 * listings go first, then products, then product images, so an interrupted
 * run has the whole URL list and as many products as it reached.
 *
 * The cache is the state. Nothing else is persisted: a second run replays the
 * same walk from disk — every answer it already has costs no request — and
 * carries on where the last one stopped. `onPage` sees every HTML page, cached
 * or fresh, so the product records are built from the same walk.
 */
import { discoverUrls, extractCategoryTree, type LegacyCategory } from './discover.ts'
import type { ReaderConfig } from './config.ts'
import type { PoliteFetcher } from './polite-fetch.ts'
import { createClassifier, pathAndQuery, type UrlClass } from './urls.ts'

export type InventoryEntry = {
  path: string
  kind: UrlClass['kind']
  listing: string | null
  referrers: number
  fetched: boolean
  status: number | null
  location: string | null
  /** Why it was not fetched, or how the fetch ended when there is no status. */
  note: 'not-fetched' | 'never' | 'robots' | 'failed' | 'offline' | null
}

export type PageVisit = { url: URL; klass: UrlClass; html: string }

export type CrawlOptions = {
  config: ReaderConfig
  fetcher: PoliteFetcher
  log?: (line: string) => void
  onPage?: (visit: PageVisit) => void
  /** Stop after this many network requests (cached answers are free). */
  maxRequests?: number
  shouldStop?: () => boolean
}

export type CrawlResult = {
  inventory: Map<string, InventoryEntry>
  categories: LegacyCategory[]
  sitemapFound: boolean
  stoppedEarly: boolean
}

const PRIORITY: Record<UrlClass['kind'], number> = {
  page: 0,
  listing: 0,
  product: 1,
  image: 2,
  asset: 3,
}

function extractSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1] ?? '')
}

export async function crawl(options: CrawlOptions): Promise<CrawlResult> {
  const { config, fetcher } = options
  const log = options.log ?? (() => {})
  const classifier = createClassifier(config)
  const inventory = new Map<string, InventoryEntry>()
  const queues: URL[][] = [[], [], []]
  const queued = new Set<string>()
  let categories: LegacyCategory[] = []
  let sitemapFound = false
  const requestsAtStart = fetcher.stats.requests

  function record(url: URL): InventoryEntry {
    const path = pathAndQuery(url)
    let entry = inventory.get(path)
    if (entry === undefined) {
      const klass = classifier.classify(url)
      entry = {
        path,
        kind: klass.kind,
        listing: klass.kind === 'listing' ? klass.listing : null,
        referrers: 0,
        fetched: false,
        status: null,
        location: null,
        note: 'not-fetched',
      }
      inventory.set(path, entry)
    }
    return entry
  }

  function offer(url: URL, fromReferrer: boolean): void {
    const entry = record(url)
    if (fromReferrer) entry.referrers += 1
    const klass = classifier.classify(url)
    if (!classifier.isFetched(url, klass) || queued.has(url.href)) return
    queued.add(url.href)
    queues[Math.min(PRIORITY[klass.kind], 2)]?.push(url)
  }

  function next(): URL | undefined {
    for (const queue of queues) if (queue.length > 0) return queue.shift()
    return undefined
  }

  await fetcher.init()
  if (config.trySitemaps) {
    const candidates = new Set([`${config.baseUrl}/sitemap.xml`, ...fetcher.robotsPolicy.sitemaps])
    for (const candidate of candidates) {
      const outcome = await fetcher.get(candidate, 'application/xml', {
        maxAttempts: 1,
        recordFailure: true,
      })
      if (outcome.kind !== 'response' || outcome.entry.status !== 200) continue
      const type = outcome.entry.contentType ?? ''
      if (!type.includes('xml')) continue
      sitemapFound = true
      const xml = fetcher.readText(outcome.entry) ?? ''
      for (const loc of extractSitemapLocs(xml)) {
        const url = classifier.normalise(loc, config.baseUrl)
        if (url !== null) offer(url, false)
      }
    }
  }
  for (const seed of config.seeds) {
    const url = classifier.normalise(seed, config.baseUrl)
    if (url !== null) offer(url, false)
  }

  let stoppedEarly = false
  for (let url = next(); url !== undefined; url = next()) {
    if (options.shouldStop?.() === true) {
      stoppedEarly = true
      break
    }
    if (
      options.maxRequests !== undefined &&
      fetcher.stats.requests - requestsAtStart >= options.maxRequests
    ) {
      stoppedEarly = true
      break
    }
    const klass = classifier.classify(url)
    const entry = record(url)
    const accept = klass.kind === 'image' ? 'image/*' : 'text/html'
    const outcome = await fetcher.get(url.href, accept)
    if (outcome.kind === 'skipped') {
      entry.note = outcome.reason === 'offsite' ? 'not-fetched' : outcome.reason
      continue
    }
    if (outcome.kind === 'failed') {
      entry.note = outcome.message.startsWith('offline') ? 'offline' : 'failed'
      entry.status = outcome.status
      continue
    }
    const response = outcome.entry
    if (!outcome.fromCache && fetcher.stats.requests % 25 === 0) {
      const pending = queues.reduce((sum, queue) => sum + queue.length, 0)
      log(
        `requests ${fetcher.stats.requests} · inventory ${inventory.size} · queued ${pending} · interval ${fetcher.currentIntervalMs} ms`,
      )
    }
    entry.fetched = true
    entry.status = response.status
    entry.location = response.location
    entry.note = null
    if (response.status >= 300 && response.status < 400 && response.location) {
      const target = classifier.normalise(response.location, url.href)
      if (target !== null) offer(target, true)
      continue
    }
    const type = response.contentType ?? ''
    if (response.status !== 200 || !type.includes('html')) continue
    const html = fetcher.readText(response) ?? ''
    if (config.categoryTree !== null && categories.length === 0) {
      categories = extractCategoryTree(html, config.categoryTree)
    }
    for (const found of discoverUrls(html, config.categoryTree)) {
      const target = classifier.normalise(found.href, url.href)
      if (target === null) continue
      // A URL inside a script is code, not a link: often a form's or an XHR's endpoint. Only
      // the viewer's images are taken from scripts; anything else there is never requested.
      if (found.via === 'script' && classifier.classify(target).kind !== 'image') continue
      offer(target, found.via !== 'tree')
    }
    options.onPage?.({ url, klass, html })
  }
  return { inventory, categories, sitemapFound, stoppedEarly }
}
