/** The settings a fresh environment starts on: the schema's own defaults, written once (`./seed`). */
export const SETTINGS_DEFAULTS = {
  gallery: {
    ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
  },
  shop: {
    ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
    checkoutEnabled: true,
    delivery: { bands: [], freeOverIdr: 500000 },
    welcomeDiscount: '',
    orderExpiryMinutes: 60,
    storeAlerts: true,
  },
} as const
