/**
 * The `site-settings` global factory — the contact, AI, delivery and alert settings of a site
 * (CONTENT-MODEL.md §6, AI.md §1, COMMERCE.md §2, §4). Owner-only read and update; editors and
 * store staff cannot read it. A save expires the cache tags the CMS names
 * (`../../hooks/settings-invalidate`).
 *
 * What the settings are is the CMS's: one group per site, built from the shared groups here
 * (`./fields`: contact, AI, delivery; `./social`: social links). Today's one CMS holds both sites' groups, a tab
 * each (PLAN-V2.md §4.1).
 */
import type { CacheTag } from '@engine/cache'
import type { Field, GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { hiddenFromAllButOwner } from '../../access/hidden'
import { isOwner } from '../../access/user-roles'
import type { AdminGroup } from '../../collections/options'
import { invalidatingSettings } from '../../hooks/settings-invalidate'

export { aiGroup, contactGroup, deliveryGroup } from './fields'
export {
  networkAndName,
  networkOfName,
  SOCIAL_NETWORK_NAMES,
  SOCIAL_NETWORKS,
  socialField,
  type SocialNetwork,
} from './social'

export const SITE_SETTINGS_ACCESS = {
  read: isOwner,
  update: isOwner,
} as const

export type SiteSettingsOptions = {
  /** The admin sidebar group (the CMS's own labels). */
  readonly group: AdminGroup
  /** The settings themselves: a site's groups, or a tab per site. */
  readonly fields: Field[]
  /**
   * What a save expires: the CMS's `settings:<site>` tags, or its own hook that expires them
   * (`invalidatingSettings(tags)`, kept as one constant so it can be tested alone).
   */
  readonly invalidates: readonly CacheTag[] | GlobalAfterChangeHook
}

export function siteSettingsGlobal(
  options: SiteSettingsOptions,
): GlobalConfig & { slug: 'site-settings' } {
  const { invalidates } = options
  return {
    slug: 'site-settings',
    label: { en: 'Site settings', id: 'Pengaturan situs' },
    admin: { group: options.group, hidden: hiddenFromAllButOwner },
    access: SITE_SETTINGS_ACCESS,
    hooks: {
      afterChange: [
        typeof invalidates === 'function' ? invalidates : invalidatingSettings(invalidates),
      ],
    },
    fields: options.fields,
  }
}
