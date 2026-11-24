/**
 * `shop-header` — the shop's "Header" (the plan's §3.5; TASKS.md 27.1.a, split from the one
 * "Menu and footer" global in 27.6 so each is its own menu entry): the dated announcement above
 * the header, the main menu and the logo. Each link is picked (a page, a category, a product) or a
 * web address, labelled in both languages, in the order dragged (`../shop-links`).
 *
 * - **Who** — the owner and the editors (`SHOP_CHROME_ACCESS`); the site reads it on the Local
 *   API with a `select` of what it shows (TASKS.md 27.5).
 * - **One screen**: the announcement and the menu, what changes week to week; the logo, set once,
 *   folded under them.
 * - **No drafts**: a save is live. A dated announcement is how a change is scheduled.
 * - **Cache** — a save expires the shop's `settings:shop` tag, which the site's read carries.
 */
import { hiddenFromAllButCatalogueStaff } from '@engine/cms-core/access'
import { invalidatingSettings } from '@engine/cms-core/hooks'
import { settingsTag } from '@engine/cache'
import type { GlobalConfig } from 'payload'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { linkList, SHOP_CHROME_ACCESS } from '../shop-links'
import { announcementGroup, logoGroup } from './fields'

export const ShopHeader: GlobalConfig & { slug: 'shop-header' } = {
  slug: 'shop-header',
  label: { en: 'Header', id: 'Header' },
  admin: {
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromAllButCatalogueStaff,
    description: {
      en: 'Old East Indies. The announcement and the menu at the top of every shop page. A save is live at once.',
      id: 'Old East Indies. Pengumuman dan menu di bagian atas setiap halaman toko. Simpan langsung tayang.',
    },
  },
  access: SHOP_CHROME_ACCESS,
  hooks: { afterChange: [invalidatingSettings([settingsTag('shop')])] },
  fields: [
    announcementGroup,
    {
      ...linkList('mainMenu', { en: 'Main menu', id: 'Menu utama' }, 10),
      admin: {
        description: {
          en: 'The links in the header, in this order. Drag to reorder.',
          id: 'Tautan di header, sesuai urutan ini. Seret untuk mengubah urutan.',
        },
      },
    },
    {
      type: 'collapsible',
      label: { en: 'Logo (optional)', id: 'Logo (opsional)' },
      admin: { initCollapsed: true },
      fields: [logoGroup],
    },
  ],
}
