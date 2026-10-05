/**
 * One in-process redirect map per site, held for a TTL and loaded single-flight (TASKS.md 9.4.b):
 * two requests that find the map missing or expired wait on one load. A load that throws is not
 * kept — the next request tries again — and is logged once, however many requests were waiting.
 * Nothing runs at import time and nothing is `'use cache'`d: the route answers per request.
 */
import { describeError } from '@engine/config/boot-check'
import type { SiteKey } from '@engine/config/sites'

import type { RedirectMap } from './redirect-map'

export const REDIRECT_MAP_TTL_MS = 5 * 60 * 1000

export type RedirectMapSource = (site: SiteKey) => Promise<RedirectMap>

/** `null` when the load failed: the caller answers 404 for this request. */
export function redirectMapCache(
  source: () => Promise<RedirectMapSource>,
  now: () => number,
  ttlMs: number = REDIRECT_MAP_TTL_MS,
): (site: SiteKey) => Promise<RedirectMap | null> {
  const held = new Map<SiteKey, { readonly map: RedirectMap; readonly expires: number }>()
  const loading = new Map<SiteKey, Promise<RedirectMap | null>>()

  const load = async (site: SiteKey): Promise<RedirectMap | null> => {
    try {
      const map = await (await source())(site)
      held.set(site, { map, expires: now() + ttlMs })
      return map
    } catch (error) {
      console.error(`[legacy] the redirect map for ${site} did not load: ${describeError(error)}`)
      return null
    }
  }

  return async (site) => {
    const hit = held.get(site)
    if (hit !== undefined && now() < hit.expires) return hit.map
    const inflight = loading.get(site)
    if (inflight !== undefined) return inflight
    const started = load(site) // never rejects
    loading.set(site, started)
    void started.then(() => loading.delete(site))
    return started
  }
}
