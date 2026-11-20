// The beacon's writer (ANALYTICS.md §3): `@engine/site`'s pipeline, the shop's origin alone.
import { collectRoute } from '@engine/site/analytics/route'

export const POST = collectRoute({ sites: ['shop'] })
