/**
 * The brand-config loader (PLT, TASKS.md 3.1.a): where the brand lives (`resolveBrandPaths`),
 * its config read and checked from the file (`loadBrandConfig`), and the editorial globals laid
 * over the file's floors (`getBrandConfig`). None of it touches a database.
 */
export {
  editorialOverridesSchema,
  getBrandConfig,
  mergeEditorialGlobals,
  type EditorialOverrides,
  type GlobalsLog,
  type MergedBrandConfig,
} from './globals'
export { loadBrand, loadBrandConfig, type LoadedBrand, type LoadOptions } from './load'
export { BrandConfigError, resolveBrandPaths, type BrandEnv, type BrandPaths } from './paths'
