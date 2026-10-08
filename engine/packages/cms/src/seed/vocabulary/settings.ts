/** The accounts the owner's old pages named (10.6.e); the footer lists what a site's `social` holds. */
const GALLERY_SOCIAL = [
  { platform: 'Instagram', url: 'https://www.instagram.com/indiesgalleryantiques/' },
  { platform: 'Facebook', url: 'https://www.facebook.com/IndiesGallery/' },
] as const
const SHOP_SOCIAL = [
  { platform: 'Instagram', url: 'https://www.instagram.com/oldeastindiesart/' },
  { platform: 'Facebook', url: 'https://www.facebook.com/OldEastIndies' },
] as const

/** The settings a fresh environment starts on: the schema's own defaults, written once (`./seed`). */
export const SETTINGS_DEFAULTS = {
  gallery: {
    social: GALLERY_SOCIAL,
    ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
  },
  shop: {
    social: SHOP_SOCIAL,
    ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
    checkoutEnabled: true,
    delivery: { bands: [], freeOverIdr: 500000 },
    welcomeDiscount: '',
    orderExpiryMinutes: 60,
    storeAlerts: true,
  },
} as const
