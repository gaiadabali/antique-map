/**
 * `/api/x/geocode` (TASKS.md 6.3.a): the checkout pin's helper. It parses a pasted Google Maps
 * link into a pin, checks the pin is a real coordinate inside Indonesia (`@engine/cms/shop/orders`'s
 * `isValidPin` + the Indonesia bounds), and — only when `GOOGLE_MAPS_SERVER_KEY` is set — asks
 * Google for a display address. Without the key the pin is answered with `address: null` and
 * nothing leaves the machine. Rate-limited to 30 a minute per address (SECURITY.md §2.10), on its
 * own limiter: a Google bill is at stake, which the beacon's looser bucket does not protect.
 *
 * This file is the handler; `route.ts` only hands it the request's pieces, so it is unit-tested
 * without a server (`app/api/x/geocode/geocode.test.ts`).
 */
import { isInIndonesia, isValidPin, type Pin } from '@engine/cms/shop/orders'

import { limiters } from '../../../security/rate-limit'

export type GeocodeInput = {
  readonly lat?: unknown
  readonly lng?: unknown
  readonly link?: unknown
}

export type GeocodeAnswer =
  | {
      readonly ok: true
      readonly lat: number
      readonly lng: number
      readonly address: string | null
    }
  | { readonly ok: false; readonly status: 400 | 429; readonly message: string }

export type GeocodeDeps = {
  /** The caller's address, for the rate limit: the one nginx appended to `x-forwarded-for`. */
  readonly address: string | null
  /** `GOOGLE_MAPS_SERVER_KEY`; absent in dev and CI, where nothing is fetched. */
  readonly serverKey: string | null
  /** Injectable for the tests; the real one is `fetch`. */
  readonly fetchJson?: (
    url: string,
  ) => Promise<{ status: number; body: { results?: { formatted_address?: unknown }[] } | null }>
}

/** One decimal degree: up to three integer digits and up to twelve decimals. */
const DEGREE = /^-?\d{1,3}(\.\d{1,12})?$/
const LAT_MAX = 90
const LNG_MAX = 180

/**
 * A pasted Google Maps link → its pin, or `null`. The shapes buyers paste:
 * `…/@-8.65,115.22,13z` (the map's centre, also inside `/place/…` links), `…/?q=-8.65,115.22`,
 * and the bare `lat,lng` a buyer types straight in.
 */
export function parseMapsLink(input: string): Pin | null {
  const text = input.trim()
  if (text === '' || text.length > 2000) return null
  const candidates: string[] = []
  try {
    const url = new URL(text)
    const q = url.searchParams.get('q') ?? url.searchParams.get('query')
    if (q !== null) candidates.push(q)
  } catch {
    // Not a URL — the `@` and bare-coordinates shapes below still apply.
  }
  const at = text.match(/@(-?\d{1,3}(?:\.\d{1,12})?),(-?\d{1,3}(?:\.\d{1,12})?)/)
  if (at !== null) {
    candidates.push(`${at[1]},${at[2]}`)
  }
  candidates.push(text)
  for (const candidate of candidates) {
    const [latText, lngText] = candidate.split(',')
    if (latText === undefined || lngText === undefined) continue
    const lat = latText.trim()
    const lng = lngText.trim()
    if (!DEGREE.test(lat) || !DEGREE.test(lng)) continue
    const pin = { lat: Number(lat), lng: Number(lng) }
    if (
      Number.isFinite(pin.lat) &&
      Number.isFinite(pin.lng) &&
      Math.abs(pin.lat) <= LAT_MAX &&
      Math.abs(pin.lng) <= LNG_MAX
    ) {
      return pin
    }
  }
  return null
}

/** Google answers a reverse geocode in a few KB; anything near this is not Google's answer. */
export const MAX_GEOCODE_BYTES = 64 * 1024
/** The upstream call's whole budget (SECURITY.md S3). */
export const GEOCODE_TIMEOUT_MS = 5_000

/** The body as text, never buffered past `max` bytes; `null` when it is longer. */
async function readCapped(response: Response, max: number): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > max) return null
  if (response.body === null) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * The real upstream call (SECURITY.md S3): a timeout, no redirect followed, a capped body. A
 * redirect, an overlong answer or a timeout is a refusal to the caller, which shows no address.
 */
export async function fetchGeocodeJson(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<{ status: number; body: { results?: { formatted_address?: unknown }[] } | null }> {
  const response = await fetcher(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
  })
  const text = await readCapped(response, MAX_GEOCODE_BYTES)
  if (text === null) return { status: response.status, body: null }
  try {
    return { status: response.status, body: JSON.parse(text) as never }
  } catch {
    return { status: response.status, body: null }
  }
}

/** The display address Google holds for the pin, or `null` — never an error to the buyer. */
async function reverseGeocode(
  pin: Pin,
  serverKey: string,
  fetchJson: NonNullable<GeocodeDeps['fetchJson']>,
): Promise<string | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pin.lat},${pin.lng}` +
      `&key=${encodeURIComponent(serverKey)}`
    const { status, body } = await fetchJson(url)
    if (status !== 200 || body === null) return null
    const address = body.results?.[0]?.formatted_address
    return typeof address === 'string' && address !== '' ? address : null
  } catch {
    return null
  }
}

/** The geocode answer for one request. Never throws on visitor input. */
export async function geocode(input: GeocodeInput, deps: GeocodeDeps): Promise<GeocodeAnswer> {
  if (limiters.geocode.hit(deps.address ?? 'unknown') > 0) {
    return { ok: false, status: 429, message: 'Too many requests — try again in a moment.' }
  }

  let pin: Pin | null = null
  if (
    typeof input.lat === 'number' ||
    typeof input.lng === 'number' ||
    typeof input.lat === 'string'
  ) {
    const lat = typeof input.lat === 'number' ? input.lat : Number(String(input.lat).trim())
    const lng = typeof input.lng === 'number' ? input.lng : Number(String(input.lng).trim())
    const candidate = { lat, lng }
    if (isValidPin(candidate)) pin = candidate
  }
  if (pin === null && typeof input.link === 'string') {
    pin = parseMapsLink(input.link)
  }
  if (pin === null) {
    return {
      ok: false,
      status: 400,
      message: 'Paste a Google Maps link, or send lat and lng as decimal degrees.',
    }
  }
  if (!isInIndonesia(pin.lat, pin.lng)) {
    return { ok: false, status: 400, message: 'We deliver within Indonesia only, for now.' }
  }

  const { serverKey } = deps
  const display =
    serverKey === null
      ? null
      : await reverseGeocode(pin, serverKey, deps.fetchJson ?? fetchGeocodeJson)
  return { ok: true, lat: pin.lat, lng: pin.lng, address: display }
}
