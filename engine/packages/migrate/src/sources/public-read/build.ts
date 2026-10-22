/**
 * Builds the public read's raw product records from the cache alone — the
 * fetcher it is given is offline, so a build never reaches the old site and
 * can run while a crawl is still going. It replays the crawl's walk, reading
 * every listing card (the cards carry the category tags, the maker link and
 * the Year / Size lines the product page omits) and every product page, then
 * writes one JSON file per product, links each fetched original image into
 * `images/`, and writes the category tree.
 *
 * The records are raw: values exactly as the old pages printed them
 * (`PublicProductRecord`, documented in the package README), for the
 * normalisers (TASKS.md 7.2).
 */
import { copyFileSync, existsSync, linkSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

import type { ReaderConfig } from './config.ts'
import { crawl, type CrawlResult } from './crawl.ts'
import { discoverUrls } from './discover.ts'
import {
  parseListingCards,
  parseProductPage,
  type LabelledValue,
  type ListingCard,
} from './parse-pages.ts'
import type { PoliteFetcher } from './polite-fetch.ts'
import { createClassifier } from './urls.ts'

export type RecordRef = { legacyId: number | null; name: string; path: string }

export type PublicProductRecord = {
  source: 'public-read'
  legacyId: number
  path: string
  slug: string
  fetchedAt: string | null
  availability: 'listed' | 'sold'
  soldEvidence: Array<'page' | 'card' | 'sold-listing'>
  heading: string | null
  longTitle: string | null
  fields: LabelledValue[]
  cardTitle: string | null
  cardFields: LabelledValue[]
  cardPrice: string | null
  maker: RecordRef | null
  categories: RecordRef[]
  descriptionHtml: string | null
  images: Array<{ legacyImageId: number; path: string; file: string | null; bytes: number }>
}

export type BuildCounts = {
  products: number
  listed: number
  sold: number
  withoutImages: number
  imagesLinked: number
  imagesMissing: number
  categories: number
}

type Observed = { cards: ListingCard[]; inSoldListing: boolean }

export async function buildRecords(options: {
  config: ReaderConfig
  fetcher: PoliteFetcher
  outDir: string
  log?: (line: string) => void
}): Promise<{ crawl: CrawlResult; counts: BuildCounts }> {
  const { config, fetcher, outDir } = options
  if (config.pages === null) throw new Error('public-read config has no "pages" selectors')
  const pages = config.pages
  const classifier = createClassifier(config)
  const observed = new Map<number, Observed>()
  const productPages = new Map<number, { html: string; imagePaths: string[] }>()

  const ref = (name: string, href: string): RecordRef => {
    const url = classifier.normalise(href, config.baseUrl)
    const klass = url === null ? null : classifier.classify(url)
    const legacyId = klass !== null && 'id' in klass ? klass.id : null
    return { legacyId, name, path: url === null ? href : url.pathname }
  }

  const result = await crawl({
    config,
    fetcher,
    onPage: ({ url, klass, html }) => {
      if (klass.kind === 'listing') {
        const inSold = url.searchParams.get('s') === 'sold'
        for (const card of parseListingCards(html, pages.card)) {
          const target = classifier.normalise(card.href, url.href)
          const cardClass = target === null ? null : classifier.classify(target)
          if (cardClass?.kind !== 'product') continue
          const seen = observed.get(cardClass.id) ?? { cards: [], inSoldListing: false }
          seen.cards.push(card)
          seen.inSoldListing ||= inSold
          observed.set(cardClass.id, seen)
        }
      } else if (klass.kind === 'product') {
        const imagePaths = discoverUrls(html, null)
          .filter((found) => found.via === 'script')
          .map((found) => classifier.normalise(found.href, url.href))
          .filter((target): target is URL => target !== null)
          .filter((target) => {
            const imageClass = classifier.classify(target)
            return imageClass.kind === 'image' && imageClass.size === ''
          })
          .map((target) => target.pathname)
        productPages.set(klass.id, { html, imagePaths: [...new Set(imagePaths)] })
      }
    },
  })

  const productsDir = join(outDir, 'products')
  const imagesDir = join(outDir, 'images')
  mkdirSync(productsDir, { recursive: true })
  mkdirSync(imagesDir, { recursive: true })
  const counts: BuildCounts = {
    products: 0,
    listed: 0,
    sold: 0,
    withoutImages: 0,
    imagesLinked: 0,
    imagesMissing: 0,
    categories: result.categories.length,
  }

  for (const entry of result.inventory.values()) {
    if (entry.kind !== 'product' || entry.status !== 200) continue
    const url = new URL(entry.path, config.baseUrl)
    const klass = classifier.classify(url)
    if (klass.kind !== 'product') continue
    const page = productPages.get(klass.id)
    if (page === undefined) continue
    const parsed = parseProductPage(page.html, pages.product)
    const seen = observed.get(klass.id) ?? { cards: [], inSoldListing: false }
    const card = seen.cards[0] ?? null
    const categories = new Map<string, RecordRef>()
    for (const each of seen.cards) {
      for (const category of each.categories) {
        const categoryRef = ref(category.name, category.href)
        categories.set(categoryRef.path, categoryRef)
      }
    }
    const soldEvidence: PublicProductRecord['soldEvidence'] = []
    if (parsed.sold) soldEvidence.push('page')
    if (seen.cards.some((each) => each.sold)) soldEvidence.push('card')
    if (seen.inSoldListing) soldEvidence.push('sold-listing')

    const images: PublicProductRecord['images'] = []
    for (const imagePath of page.imagePaths) {
      const imageUrl = new URL(imagePath, config.baseUrl)
      const imageClass = classifier.classify(imageUrl)
      if (imageClass.kind !== 'image') continue
      const cached = fetcher.cachedEntry(imageUrl.href)
      const body = cached === null ? null : fetcher.bodyPath(cached)
      let file: string | null = null
      if (cached !== null && cached.status === 200 && body !== null) {
        file = `images/${imageClass.productId}-${imageClass.imageId}${extname(body)}`
        const target = join(outDir, file)
        if (!existsSync(target)) {
          try {
            linkSync(body, target)
          } catch {
            copyFileSync(body, target)
          }
        }
        counts.imagesLinked += 1
      } else {
        counts.imagesMissing += 1
      }
      images.push({
        legacyImageId: imageClass.imageId,
        path: imagePath,
        file,
        bytes: cached?.bytes ?? 0,
      })
    }

    const record: PublicProductRecord = {
      source: 'public-read',
      legacyId: klass.id,
      path: entry.path,
      slug: klass.slug,
      fetchedAt: fetcher.cachedEntry(url.href)?.fetchedAt ?? null,
      availability: soldEvidence.length > 0 ? 'sold' : 'listed',
      soldEvidence,
      heading: parsed.heading,
      longTitle: parsed.longTitle,
      fields: parsed.fields,
      cardTitle: card?.title ?? null,
      cardFields: card?.fields ?? [],
      cardPrice: card?.price ?? null,
      maker: card?.maker ? ref(card.maker.name, card.maker.href) : null,
      categories: [...categories.values()],
      descriptionHtml: parsed.descriptionHtml,
      images,
    }
    writeFileSync(join(productsDir, `${klass.id}.json`), `${JSON.stringify(record, null, 2)}\n`)
    counts.products += 1
    if (record.availability === 'sold') counts.sold += 1
    else counts.listed += 1
    if (images.length === 0) counts.withoutImages += 1
  }
  writeFileSync(join(outDir, 'categories.json'), `${JSON.stringify(result.categories, null, 2)}\n`)
  options.log?.(`built ${counts.products} product records into ${productsDir}`)
  return { crawl: result, counts }
}
