/**
 * Redirect builder public surface.
 */
export {
  buildRedirects,
  type RedirectBuildResult,
  type RedirectInput,
  type RedirectRow,
} from './build'
export { dedupeLegacyUrls, redirectKey, normalisePathname, type SiteKey } from './normalise'
export {
  galleryRule,
  resolveRule,
  shopRule,
  type RedirectDecision,
  type RuleContext,
  type WorkLookup,
} from './rules'
