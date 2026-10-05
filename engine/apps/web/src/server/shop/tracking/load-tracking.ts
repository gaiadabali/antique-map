/**
 * The tracking page's loader (TASKS.md 7.3.a): the process's Payload, handed to `./tracking-query`'s
 * `loadTrackingWith` — the real query logic, kept free of `'server-only'` so a database test can
 * call it with a pushed test stack's own instance (the catalogue's own `catalogue.ts`/`queries.ts`
 * split, `server/shop/catalogue`).
 */
import 'server-only'

import { cms } from '@engine/cms/instance'

import { loadTrackingWith, type TrackingView } from './tracking-query'

export {
  TRACKING_STEPS,
  type TrackingStep,
  type TrackingStepKey,
  type TrackingView,
} from './tracking-query'

/** `loadTracking(token)` → a projected view, or `null` for a wrong or missing token. */
export async function loadTracking(token: string): Promise<TrackingView | null> {
  return loadTrackingWith(await cms(), token)
}
