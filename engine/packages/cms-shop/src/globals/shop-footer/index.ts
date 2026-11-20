/**
 * `shop-footer` — the shop's "Footer" (the plan's §3.5; TASKS.md 27.1.a, split from the one
 * "Menu and footer" global in 27.6 so each is its own menu entry): the titled columns of links,
 * the legal links, and — folded, as they rarely change — the line at the very bottom and the words
 * of the link to Indies Gallery. The contact block is the settings' Contact and social.
 *
 * Who, drafts and cache as `../shop-header`: the owner and the editors, a save is live, and it
 * expires the shop's `settings:shop` tag.
 */
import { hiddenFromAllButCatalogueStaff } from '@engine/cms-core/access'
import { invalidatingSettings } from '@engine/cms-core/hooks'
import { settingsTag } from '@engine/cache'
import type { GlobalConfig } from 'payload'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { SHOP_CHROME_ACCESS } from '../shop-links'
import { footerFields } from './fields'

export const ShopFooter: GlobalConfig & { slug: 'shop-footer' } = {
  slug: 'shop-footer',
  label: { en: 'Footer', id: 'Footer' },
  admin: {
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromAllButCatalogueStaff,
    description: {
      en: 'Old East Indies. The columns of links and the legal links at the foot of every shop page. A save is live at once.',
      id: 'Old East Indies. Kolom tautan dan tautan legal di kaki setiap halaman toko. Simpan langsung tayang.',
    },
  },
  access: SHOP_CHROME_ACCESS,
  hooks: { afterChange: [invalidatingSettings([settingsTag('shop')])] },
  fields: footerFields,
}
