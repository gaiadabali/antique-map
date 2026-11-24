/**
 * The gallery's public read API for its originals (PLAN-V2 §4.3, TASKS.md 23.5) — the one place the
 * shop reaches the gallery's catalogue. Both ends read this contract: the gallery answers with it
 * (`./route`, mounted by the app that serves the gallery: today's, until phase 25 moves it) and the
 * shop's client parses with it (`apps/shop/src/originals`), so neither end spells the JSON twice.
 *
 * - `GET /api/x/originals/{stockNumber}?locale=en|id` — one published work by its stock number:
 *   `{ "work": OriginalWork }`, or a 404 for an unknown, unpublished or malformed number.
 * - `GET /api/x/originals/featured?locale=en|id` — two published, pictured works for the shop
 *   home's bridge: `{ "works": FeaturedOriginal[] }`.
 *
 * Projected: a title, the public picture and the work's page on the gallery's own origin. Never a
 * price, a note, a draft or anything staff-only; the shop's client keeps nothing it does not name.
 * Pure: no Payload, no Next.
 */
export const ORIGINALS_PATH = '/api/x/originals'
export const FEATURED_SEGMENT = 'featured'

export type OriginalsLocale = 'en' | 'id'

/** A work's public picture: only a published derivative (an absolute URL), never the staff file. */
export type OriginalImage = {
  readonly url: string
  readonly alt: string
  readonly width: number | null
  readonly height: number | null
}

export type OriginalWork = {
  readonly stockNumber: string
  readonly title: string
  /** The work's page on the gallery's canonical origin, in the asked locale. */
  readonly url: string
  readonly image: OriginalImage | null
}

export type FeaturedOriginal = {
  readonly title: string
  readonly date: string | null
  readonly maker: string | null
  readonly url: string
  readonly image: OriginalImage
}

/**
 * A stock number a request may ask for: the gallery's `M.` / `P.` / `F.` numbers and nothing that
 * could be a path or a query (`@engine/cms` `STOCK_NUMBER_PATTERN` is the stricter write rule).
 */
const STOCK_NUMBER = /^[A-Za-z0-9][A-Za-z0-9.-]{0,39}$/

export function isStockNumber(value: unknown): value is string {
  return typeof value === 'string' && STOCK_NUMBER.test(value) && value !== FEATURED_SEGMENT
}

export function originalsLocaleOf(value: string | null | undefined): OriginalsLocale {
  return value === 'id' ? 'id' : 'en'
}

/** The lookup's path for a stock number (encoded, though a valid one needs no escaping). */
export function originalPath(stockNumber: string, locale: OriginalsLocale): string {
  return `${ORIGINALS_PATH}/${encodeURIComponent(stockNumber)}?locale=${locale}`
}

export function featuredPath(locale: OriginalsLocale): string {
  return `${ORIGINALS_PATH}/${FEATURED_SEGMENT}?locale=${locale}`
}

type Doc = Record<string, unknown>
const isDoc = (value: unknown): value is Doc => typeof value === 'object' && value !== null
const text = (value: unknown, max = 400): string | null =>
  typeof value === 'string' && value.trim() !== '' && value.length <= max ? value : null
const size = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null

/** `value` when it is an absolute http(s) URL, else `null`. */
export function absoluteUrl(value: unknown): string | null {
  const raw = text(value, 2_000)
  if (raw === null) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function parseImage(value: unknown): OriginalImage | null {
  if (!isDoc(value)) return null
  const url = absoluteUrl(value.url)
  if (url === null) return null
  return { url, alt: text(value.alt) ?? '', width: size(value.width), height: size(value.height) }
}

/** The lookup's answer, as the shop reads it: only the named fields, each checked; else `null`. */
export function parseOriginal(body: unknown): OriginalWork | null {
  const work = isDoc(body) ? body.work : null
  if (!isDoc(work)) return null
  const stockNumber = isStockNumber(work.stockNumber) ? work.stockNumber : null
  const title = text(work.title)
  const url = absoluteUrl(work.url)
  if (stockNumber === null || title === null || url === null) return null
  return { stockNumber, title, url, image: parseImage(work.image) }
}

/** The featured answer, as the shop reads it: each well-formed, pictured work. */
export function parseFeatured(body: unknown): FeaturedOriginal[] {
  const works = isDoc(body) && Array.isArray(body.works) ? body.works : []
  return works.flatMap((work: unknown): FeaturedOriginal[] => {
    if (!isDoc(work)) return []
    const title = text(work.title)
    const url = absoluteUrl(work.url)
    const image = parseImage(work.image)
    if (title === null || url === null || image === null) return []
    return [{ title, date: text(work.date, 80), maker: text(work.maker, 200), url, image }]
  })
}
