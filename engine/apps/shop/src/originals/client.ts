/**
 * The shop's client of the gallery's public read API (PLAN-V2 §4.3, §7; TASKS.md 23.5.b): the one
 * way the shop learns about an antique. The gallery is another process that may be down, slow or
 * wrong, so every answer is one of three — found, absent (the gallery says it has no such
 * published work), or unavailable (no answer in time, an error, a malformed body) — and the caller
 * shows a link only for the first. Nothing here throws.
 *
 * Trusting nothing it is sent: the body is read through `@engine/site/originals`' parsers (named
 * fields only), a work's page must be on the gallery's own origin, and a picture must come from the
 * media origin the shop's CSP allows (`img-src`), else it is dropped. Pure, apart from `fetch`;
 * `./cached` caches it.
 */
import {
  featuredPath,
  originalPath,
  parseFeatured,
  parseOriginal,
  type FeaturedOriginal,
  type OriginalImage,
  type OriginalsLocale,
  type OriginalWork,
} from '@engine/site/originals'

/** How long the shop waits for the gallery before it draws no link. */
export const ORIGINALS_TIMEOUT_MS = 1_500

export type GalleryAnswer<T> =
  | { readonly kind: 'found'; readonly value: T }
  | { readonly kind: 'absent' }
  | { readonly kind: 'unavailable' }

export type ClientOptions = {
  /** The gallery's origin (`sisterOrigin('shop')`); `null` asks nothing. */
  readonly origin: string | null
  /** The media origin the shop's pages may load pictures from; `null` keeps no picture. */
  readonly mediaOrigin: string | null
  readonly timeoutMs?: number
  readonly fetch?: typeof fetch
}

const UNAVAILABLE = { kind: 'unavailable' } as const
const ABSENT = { kind: 'absent' } as const

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/** One GET to the gallery: its JSON on a 200, `absent` on a 404, else `unavailable`. */
async function ask(path: string, options: ClientOptions): Promise<GalleryAnswer<unknown>> {
  if (options.origin === null) return UNAVAILABLE
  const get = options.fetch ?? fetch
  try {
    const response = await get(`${options.origin}${path}`, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(options.timeoutMs ?? ORIGINALS_TIMEOUT_MS),
    })
    if (response.status === 404) return ABSENT
    if (response.status !== 200) return UNAVAILABLE
    return { kind: 'found', value: await response.json() }
  } catch {
    // A refused connection, a timeout (the abort), a body that is not JSON.
    return UNAVAILABLE
  }
}

function keptImage<T extends OriginalImage | null>(image: T, options: ClientOptions): T | null {
  if (image === null || options.mediaOrigin === null) return null
  return originOf(image.url) === options.mediaOrigin ? image : null
}

const onGallery = (url: string, options: ClientOptions) =>
  options.origin !== null && originOf(url) === options.origin

/** The published work with `stockNumber`, as the gallery answers it. */
export async function fetchOriginal(
  stockNumber: string,
  locale: OriginalsLocale,
  options: ClientOptions,
): Promise<GalleryAnswer<OriginalWork>> {
  const answer = await ask(originalPath(stockNumber, locale), options)
  if (answer.kind !== 'found') return answer
  const work = parseOriginal(answer.value)
  if (work === null || work.stockNumber !== stockNumber || !onGallery(work.url, options)) {
    return UNAVAILABLE
  }
  return { kind: 'found', value: { ...work, image: keptImage(work.image, options) } }
}

/** The gallery's featured works whose page is on its origin and picture one the shop may show. */
export async function fetchFeatured(
  locale: OriginalsLocale,
  options: ClientOptions,
): Promise<GalleryAnswer<readonly FeaturedOriginal[]>> {
  const answer = await ask(featuredPath(locale), options)
  if (answer.kind !== 'found') return answer
  const works = parseFeatured(answer.value).filter(
    (work) => onGallery(work.url, options) && keptImage(work.image, options) !== null,
  )
  return { kind: 'found', value: works }
}
