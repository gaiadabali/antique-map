/**
 * `/api/x/geocode/search` (TASKS.md 27.4.a): the store editor's address search. The owner types an
 * address — or pastes a Google Maps link or `lat, lng` — and gets up to five places in Indonesia
 * to pick from; picking one fills the store's pin. The admin's CSP loads nothing from a third party
 * (`security/csp.ts`), so the search runs here, on the server, the checkout geocoder's way
 * (`server/shop/checkout/geocode`): the same `GOOGLE_MAPS_SERVER_KEY` (`||`, a blank key is no
 * key, and then nothing leaves the machine), the same upstream call (`fetchGeocodeJson`: a
 * timeout, no redirect, a capped body) and the same 30-a-minute limiter, so the store screen
 * cannot run up a bill the checkout's limit was set to stop.
 *
 * Only the owner — the one role that edits a store (`collections/stores` `update`) — may search;
 * anyone else is refused before the limiter or Google is touched. A link or a typed pair goes
 * through the checkout geocoder itself with no key (`geocode`): its limiter, its Indonesia box,
 * and no outbound call. An address asks Google with `components=country:ID`, which answers places
 * in Indonesia only; the store's own save checks the pin against the Indonesia box again
 * (`collections/stores/pin`), so a stray answer is refused there with its reason.
 *
 * This file is the handler; `./geocode-search-route` hands it the request's pieces, so it is unit-tested
 * without a server (`./search.test.ts`).
 */
import { limiters } from '@engine/http/limits'

import { fetchGeocodeJson, geocode, parseMapsLink } from './geocode'

export const MAX_QUERY_LENGTH = 200
export const MAX_CANDIDATES = 5

export type Candidate = { readonly label: string; readonly lat: number; readonly lng: number }

export type SearchAnswer =
  | {
      readonly ok: true
      readonly candidates: readonly Candidate[]
      /** No server key: only a link or typed coordinates can be read. */
      readonly keyless: boolean
    }
  | { readonly ok: false; readonly status: 400 | 403 | 429; readonly message: string }

type UpstreamBody = {
  status?: unknown
  results?: Array<{
    formatted_address?: unknown
    geometry?: { location?: { lat?: unknown; lng?: unknown } }
  }>
}

export type SearchDeps = {
  /** Whether the caller is signed in as the owner (the route asks Payload for the session). */
  readonly isOwner: boolean
  readonly address: string | null
  readonly serverKey: string | null
  /** Injectable for the tests; the real one is `fetchGeocodeJson`. */
  readonly fetchJson?: (url: string) => Promise<{ status: number; body: unknown }>
}

const finite = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max

/** Google's answer as candidates: with a real pin and a name, at most five. */
export function candidatesOf(body: unknown): Candidate[] {
  const results = (body as UpstreamBody | null)?.results
  if (!Array.isArray(results)) return []
  const out: Candidate[] = []
  for (const result of results) {
    const lat = result?.geometry?.location?.lat
    const lng = result?.geometry?.location?.lng
    const label = result?.formatted_address
    if (!finite(lat, 90) || !finite(lng, 180) || typeof label !== 'string' || label === '') {
      continue
    }
    out.push({ label: label.slice(0, 300), lat, lng })
    if (out.length === MAX_CANDIDATES) break
  }
  return out
}

/** The search answer for one request. Never throws on input. */
export async function searchPlaces(query: unknown, deps: SearchDeps): Promise<SearchAnswer> {
  if (!deps.isOwner) {
    return { ok: false, status: 403, message: 'Only the owner sets a store’s location.' }
  }
  const text = typeof query === 'string' ? query.trim() : ''
  if (text === '' || text.length > MAX_QUERY_LENGTH) {
    return { ok: false, status: 400, message: 'Type an address, a Google Maps link or lat, lng.' }
  }
  const keyless = deps.serverKey === null

  if (parseMapsLink(text) !== null) {
    // The checkout geocoder with no key: the limiter, the Indonesia box, nothing sent anywhere.
    const answer = await geocode({ link: text }, { address: deps.address, serverKey: null })
    if (!answer.ok && answer.status === 429)
      return { ok: false, status: 429, message: answer.message }
    const candidates = answer.ok
      ? [{ label: `${answer.lat}, ${answer.lng}`, lat: answer.lat, lng: answer.lng }]
      : []
    return { ok: true, keyless, candidates }
  }
  if (limiters.geocode.hit(deps.address ?? 'unknown') > 0) {
    return { ok: false, status: 429, message: 'Too many searches — try again in a minute.' }
  }
  if (deps.serverKey === null) return { ok: true, keyless, candidates: [] }

  const url =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?address=${encodeURIComponent(text)}&components=country:ID&region=id&language=id` +
    `&key=${encodeURIComponent(deps.serverKey)}`
  try {
    const fetchJson = deps.fetchJson ?? fetchGeocodeJson
    const { status, body } = await fetchJson(url)
    return { ok: true, keyless, candidates: status === 200 ? candidatesOf(body) : [] }
  } catch {
    // A timeout or a refused upstream reads as "nothing found": the pin can still be typed.
    return { ok: true, keyless, candidates: [] }
  }
}
