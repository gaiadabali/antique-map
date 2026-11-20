/**
 * `@engine/storefront/shell`: the shop's shell and what a shop root layout needs to draw it — the
 * shop as a request sees it (its origin, its links, its words) and the `[locale]` check.
 */
export { siteLocale } from './messages'
export { ShopShell } from './shop-shell'
export {
  currentSite,
  shellText,
  shopOrigin,
  siteAsset,
  siteHref,
  type CurrentSite,
  type ShellText,
} from './site'
