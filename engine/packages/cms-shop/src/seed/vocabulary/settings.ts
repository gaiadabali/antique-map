/**
 * The shop's `site-settings` group as a fresh environment starts on (`./seed`; today's one CMS
 * writes it beside the gallery's, `@engine/cms`'s vocabulary settings): the schema's own defaults,
 * the accounts the owner's old pages named (10.6.e), the shop's WhatsApp number as the local
 * shop held it. Written once.
 */
import { PRODUCT_PAGE_COPY } from '../../globals/site-settings/shop/product-page'

const SHOP_SOCIAL = [
  { platform: 'Instagram', url: 'https://www.instagram.com/oldeastindiesart/' },
  { platform: 'Facebook', url: 'https://www.facebook.com/OldEastIndies' },
] as const

/**
 * No distance bands: staff enter each order's courier fee (TASKS.md OA13, superseded
 * 2026-10-06); the free-delivery threshold is the product page's `{freeOver}`.
 */
export const SHOP_SETTINGS_DEFAULTS = {
  social: SHOP_SOCIAL,
  contact: { whatsapp: '+6281299253712' },
  ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
  checkoutEnabled: true,
  delivery: { bands: [], freeOverIdr: 500000 },
  welcomeDiscount: '',
  orderExpiryMinutes: 60,
  storeAlerts: true,
} as const

/**
 * The same group's Indonesian words, written once beside it in the `id` locale: the product page's
 * fixed words (`PRODUCT_PAGE_COPY`). The first write fills only English, and a read in Indonesian
 * would otherwise fall back to it.
 */
export const SHOP_SETTINGS_DEFAULTS_ID = {
  productPage: Object.fromEntries(
    Object.entries(PRODUCT_PAGE_COPY).map(([name, words]) => [name, words.id]),
  ),
}
