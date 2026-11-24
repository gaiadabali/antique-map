/**
 * `events` — first-party analytics (ANALYTICS.md §4, §7), from the shared factory
 * (`@engine/cms-core/collections/events`): append-only on the server, read by the dashboard,
 * owner-only. This one CMS records both sites' events, so each names its site (indexed).
 */
import { eventsCollection } from '@engine/cms-core/collections/events'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { recordSiteField } from '../../fields/site'

export {
  EVENT_NAME_LABELS,
  EVENT_NAMES,
  EVENTS_ACCESS,
  SOURCE_LABELS,
  type EventName,
} from '@engine/cms-core/collections/events'

export const Events = eventsCollection({
  group: ADMIN_GROUPS.technical,
  site: recordSiteField({ index: true }),
}) satisfies { slug: 'events' }
