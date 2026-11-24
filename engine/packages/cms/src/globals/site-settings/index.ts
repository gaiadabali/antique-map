/**
 * `site-settings` — one global holding the contact, AI, delivery and alert settings for each site
 * (CONTENT-MODEL.md §6, AI.md §1, COMMERCE.md §2, §4), from the shared factory
 * (`@engine/cms-core/globals/site-settings`). This one CMS holds both sites' groups, a tab each
 * (`./sites`), and a save expires both sites' settings tags (`../../hooks/settings-invalidate`).
 *
 * Owner-only read and update. Editors and store staff cannot read it.
 */
import { siteSettingsGlobal } from '@engine/cms-core/globals/site-settings'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { invalidateSettingsOnChange } from '../../hooks/settings-invalidate'
import { galleryTab, shopTab } from './sites'

export { SITE_SETTINGS_ACCESS } from '@engine/cms-core/globals/site-settings'

export const SiteSettings = siteSettingsGlobal({
  group: ADMIN_GROUPS.settings,
  invalidates: invalidateSettingsOnChange,
  fields: [{ type: 'tabs', tabs: [galleryTab, shopTab] }],
})
