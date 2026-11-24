/**
 * `/api/x/collect` — the engine route the beacon posts to (ANALYTICS.md §3; TASKS.md 9.2.a): the
 * pipeline and its request plumbing are `@engine/site/analytics`'s (TASKS.md 23.4), for both sites.
 */
import { collectRoute } from '@engine/site/analytics/route'

export const POST = collectRoute()
