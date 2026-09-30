/**
 * What this storefront app declares it can render (TASKS.md 4.1.c, C1 `AppSupports`): every module
 * but `accounts.buyers`, `retention.wishlist` and `retention.wantList` — shoppers here buy as
 * guests, save items on their device and keep want lists by email, so no brand on this app can
 * open shopper sign-up, an account wishlist or an account's want lists (D31, D35, D39).
 * `validateBrandConfigs()` refuses a brand on this app whose modules are not a subset, and this
 * process refuses to load one (`loadBrandConfig({ supports })`), so a module the app cannot render
 * fails CI and the boot instead of rendering as a blank section (BRANDS.md §6).
 *
 * A declaration, not a census: each surface a module switches on is built in its own phase against
 * fixtures (22–32), and this list is the commitment those phases are held to.
 */
import { MODULE_KEYS, type AppSupports, type ModuleKey } from '@engine/config/schema'

const NOT_RENDERED: readonly ModuleKey[] = [
  'accounts.buyers',
  'retention.wishlist',
  'retention.wantList',
]

export const supports = {
  storefront: 'emporium',
  modules: MODULE_KEYS.filter((key) => !NOT_RENDERED.includes(key)),
} as const satisfies AppSupports
