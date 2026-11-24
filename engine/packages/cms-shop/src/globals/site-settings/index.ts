/**
 * The shop's `site-settings` (CONTENT-MODEL.md §6; COMMERCE.md §2, §4), from the shared factory
 * (`@engine/cms-core/globals/site-settings`): one group, `shop` — contact and social, checkout and
 * delivery, notifications and email, the chat helper, the product page's words and stock
 * (`./shop`). A save expires the shop's settings tag. Owner-only read and update.
 *
 * Today's one CMS holds this group as one tab beside the gallery's (`@engine/cms`).
 */
import { settingsTag } from '@engine/cache'
import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { siteSettingsGlobal } from '@engine/cms-core/globals/site-settings'

import { shopTab } from './shop'

export { SITE_SETTINGS_ACCESS } from '@engine/cms-core/globals/site-settings'

export const SiteSettings = siteSettingsGlobal({
  group: ADMIN_GROUPS.settings,
  invalidates: [settingsTag('shop')],
  fields: [...shopTab.fields],
})
