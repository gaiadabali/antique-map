/**
 * The shop's tab of `site-settings` (the plan's §3.6; TASKS.md 27.1.b): one named group, `shop`,
 * whose data paths the site, the chat and the order code read, laid out in unnamed tabs — one per
 * screen of the plan: contact and social, checkout and delivery, notifications and email,
 * promotions (the same-day promise and the newsletter pop-up, `./storefront`, TASKS.md 28.1), the
 * chat, the product page's words, stock. The tabs are presentation only; moving a field between them
 * moves no data.
 *
 * The menu, the footer, the logo and the dated announcement are not settings: they are
 * `shop-header` and `shop-footer`, which editors keep too. This global stays the owner's alone.
 */
import { aiGroup, contactGroup, socialField } from '@engine/cms-core/globals/site-settings'
import type { Field, Tab } from 'payload'

import {
  AI,
  announcement,
  CONTACT,
  hours,
  leadNotifyEmails,
  replyPromise,
} from '@engine/cms-core/globals/site-settings/common'
import { checkoutFields } from './checkout'
import { notificationFields } from './notifications'
import { productPageFields } from './product-page'
import { storefrontFields } from './storefront'

export { keepCodeInStep } from './checkout'
export { ORDER_EMAILS, type EmailCopy, type OrderEmail } from './notifications'
export { PRODUCT_PAGE_COPY } from './product-page'
export {
  PROMO_CUTOFF_DEFAULT,
  PROMO_TIME_ZONE_DEFAULT,
  PROMO_TIME_ZONES,
  STOREFRONT_COPY,
} from './storefront'

/** The global low-stock line (the plan's K8): the stock matrix and the "Today" home flag at or below it. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 2

const stockFields: Field[] = [
  {
    name: 'lowStockThreshold',
    type: 'number',
    min: 0,
    defaultValue: DEFAULT_LOW_STOCK_THRESHOLD,
    label: { en: 'Low stock at', id: 'Stok menipis pada' },
    validate: (value: unknown) =>
      value === null || value === undefined || (Number.isSafeInteger(value) && Number(value) >= 0)
        ? true
        : 'A whole number, 0 or more.',
    admin: {
      step: 1,
      description: {
        en: 'A store’s count at or below this number is shown as low stock.',
        id: 'Jumlah stok toko pada atau di bawah angka ini ditandai sebagai stok menipis.',
      },
    },
  },
]

export const shopTab: Tab = {
  label: { en: 'Old East Indies', id: 'Old East Indies' },
  description: {
    en: 'Settings for the online shop: contact, checkout and delivery, emails, promotions, the chat helper, the product page’s words and stock. The menu and footer are under Menu and footer.',
    id: 'Pengaturan toko daring: kontak, checkout dan pengiriman, email, promosi, asisten chat, teks halaman produk, dan stok. Menu dan footer ada di Menu dan footer.',
  },
  fields: [
    {
      name: 'shop',
      type: 'group',
      label: { en: 'Old East Indies', id: 'Old East Indies' },
      fields: [
        {
          type: 'tabs',
          tabs: [
            {
              label: { en: 'Contact and social', id: 'Kontak dan sosial' },
              fields: [
                contactGroup(CONTACT, { address: true }),
                replyPromise(),
                hours(),
                socialField(),
                leadNotifyEmails(),
                announcement({ moved: true }),
              ],
            },
            {
              label: { en: 'Checkout and delivery', id: 'Checkout dan pengiriman' },
              fields: checkoutFields,
            },
            {
              label: { en: 'Notifications and email', id: 'Notifikasi dan email' },
              fields: notificationFields,
            },
            { label: { en: 'Promotions', id: 'Promosi' }, fields: storefrontFields },
            { label: { en: 'Chat and AI', id: 'Chat dan AI' }, fields: [aiGroup(AI)] },
            {
              label: { en: 'Product page', id: 'Halaman produk' },
              fields: productPageFields,
            },
            { label: { en: 'Stock', id: 'Stok' }, fields: stockFields },
          ],
        },
      ],
    },
  ],
}
