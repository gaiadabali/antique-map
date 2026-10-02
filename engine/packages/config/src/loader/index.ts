/**
 * The brand-config loader (PLT, TASKS.md 3.1.a): where the brand lives (`resolveBrandPaths`),
 * its config read and checked from the file (`loadBrandConfig`), and the editorial globals laid
 * over the file's floors (`getBrandConfig`). None of it touches a database.
 */
export {
  getBrandConfig,
  mergeEditorialGlobals,
  type GlobalsLog,
  type MergedBrandConfig,
} from './globals'
export {
  EDITORIAL_PARTS,
  parseEditorialGlobals,
  type EditorialOverrides,
  type EditorialPart,
  type ParsedGlobals,
} from './globals-parts'
export { loadBrand, loadBrandConfig, type LoadedBrand, type LoadOptions } from './load'
export { BrandConfigError, resolveBrandPaths, type BrandEnv, type BrandPaths } from './paths'
export { describeError, redactCredentials } from '../boot-check/redact'
