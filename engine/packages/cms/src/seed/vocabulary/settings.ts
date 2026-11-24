import { SHOP_SETTINGS_DEFAULTS, SHOP_SETTINGS_DEFAULTS_ID } from '@engine/cms-shop/seed'

/** The accounts the owner's old pages named (10.6.e); the footer lists what a site's `social` holds. */
const GALLERY_SOCIAL = [
  { platform: 'Instagram', url: 'https://www.instagram.com/indiesgalleryantiques/' },
  { platform: 'Facebook', url: 'https://www.facebook.com/IndiesGallery/' },
] as const

/**
 * The settings a fresh environment starts on: the schema's own defaults, written once (`./seed`).
 * The shop's group is the shop seed's own (`@engine/cms-shop/seed`, which writes it alone into the
 * shop's database); today's one database holds it beside the gallery's.
 */
export const SETTINGS_DEFAULTS = {
  gallery: {
    social: GALLERY_SOCIAL,
    ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
  },
  shop: SHOP_SETTINGS_DEFAULTS,
} as const

/** The same settings' Indonesian words, written once beside them in the `id` locale. */
export const SETTINGS_DEFAULTS_ID = { shop: SHOP_SETTINGS_DEFAULTS_ID }
