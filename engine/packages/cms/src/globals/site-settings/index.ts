/**
 * `site-settings` — one global holding the contact, AI, delivery and alert settings for each site
 * (CONTENT-MODEL.md §6, AI.md §1, COMMERCE.md §2, §4).
 *
 * Owner-only read and update. Editors and store staff cannot read it.
 */
import type { GlobalConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { hiddenFromAllButOwner } from '../../admin/hidden'
import { isOwner } from '../../collections/users/roles'
import { invalidateSettingsOnChange } from '../../hooks/settings-invalidate'
import { galleryTab, shopTab } from './sites'

export const SITE_SETTINGS_ACCESS = {
  read: isOwner,
  update: isOwner,
} as const

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { en: 'Site settings', id: 'Pengaturan situs' },
  admin: { group: ADMIN_GROUPS.settings, hidden: hiddenFromAllButOwner },
  access: SITE_SETTINGS_ACCESS,
  hooks: { afterChange: [invalidateSettingsOnChange] },
  fields: [{ type: 'tabs', tabs: [galleryTab, shopTab] }],
}
