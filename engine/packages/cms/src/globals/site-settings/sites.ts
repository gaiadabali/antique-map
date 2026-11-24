/**
 * The two per-site tabs of `site-settings`. Each site's named group (`gallery`, `shop`) keeps its
 * data path; the tabs around it, and the tabs inside the shop's group (`./shop`), are unnamed —
 * presentation only.
 */
import { aiGroup, contactGroup, socialField } from '@engine/cms-core/globals/site-settings'
import type { Tab } from 'payload'

import {
  AI,
  announcement,
  CONTACT,
  hours,
  leadNotifyEmails,
  replyPromise,
} from '@engine/cms-core/globals/site-settings/common'

export { shopTab } from '@engine/cms-shop/globals/site-settings/shop'

export const galleryTab: Tab = {
  label: { en: 'Indies Gallery', id: 'Indies Gallery' },
  description: {
    en: 'Settings for the antiques site. It has no checkout, so there is no delivery here.',
    id: 'Pengaturan situs barang antik. Situs ini tanpa checkout, jadi tidak ada pengiriman.',
  },
  fields: [
    {
      name: 'gallery',
      type: 'group',
      label: { en: 'Indies Gallery', id: 'Indies Gallery' },
      fields: [
        contactGroup(CONTACT),
        replyPromise(),
        hours(),
        announcement(),
        socialField(),
        leadNotifyEmails(),
        aiGroup(AI),
      ],
    },
  ],
}
