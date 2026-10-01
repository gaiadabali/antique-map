/**
 * What this storefront app declares it can render (TASKS.md 4.1.c, C1 `AppSupports`): every module
 * but these, which no brand on this app can turn on:
 * - `accounts.retailers` — the Partnership surface and partner accounts are the emporium's;
 * - `purchase.checkout`, `purchase.offers` and `purchase.holds` — the gallery is enquiry-only
 *   (D50): no bag or checkout, no online offer and no reserve button; every original leads to a
 *   conversation, and an agreed price is paid on the invoice staff issue, on the pay page (D51);
 * - `accounts.buyers`, `retention.wishlist` and `retention.wantList` — the gallery signs no one
 *   in (D54): saved items stay on the device (`retention.deviceWishlist`) and want lists are kept
 *   by email (`retention.emailWantList`, D39).
 * `validateBrandConfigs()` refuses a brand on this app whose modules are not a subset, and this
 * process refuses to load one (`loadBrandConfig({ supports })`), so a module the app cannot render
 * fails CI and the boot instead of rendering as a blank section (BRANDS.md §6).
 *
 * A declaration, not a census: each surface a module switches on is built in its own phase against
 * fixtures (22–35), and this list is the commitment those phases are held to.
 */
import { MODULE_KEYS, type AppSupports, type ModuleKey } from '@engine/config/schema'

const NOT_RENDERED: readonly ModuleKey[] = [
  'accounts.retailers',
  'purchase.checkout',
  'purchase.offers',
  'purchase.holds',
  'accounts.buyers',
  'retention.wishlist',
  'retention.wantList',
]

export const supports = {
  storefront: 'gallery',
  modules: MODULE_KEYS.filter((key) => !NOT_RENDERED.includes(key)),
} as const satisfies AppSupports
