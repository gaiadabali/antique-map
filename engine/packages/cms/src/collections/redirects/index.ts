/**
 * `redirects` — per-site URL redirects (CONTENT-MODEL.md §6), from the shared factory
 * (`@engine/cms-core/collections/redirects`). Managed by owner and editor; public reads none.
 * This one CMS keeps both sites' redirects, so each row names its site: unique `(site, from)`.
 */
import { redirectsCollection } from '@engine/cms-core/collections/redirects'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { recordSiteField } from '../../fields/site'

export {
  REDIRECT_CODE_LABELS,
  REDIRECT_SOURCE_LABELS,
  REDIRECTS_ACCESS,
  validateTo,
} from '@engine/cms-core/collections/redirects'

export const Redirects = redirectsCollection({
  group: ADMIN_GROUPS.technical,
  site: recordSiteField(),
}) satisfies { slug: 'redirects' }
