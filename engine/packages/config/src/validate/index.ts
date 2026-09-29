/**
 * Brand-config validation (PLT, TASKS.md 3.1.a): `validateBrandConfig()` for one config —
 * the loader's check at boot — and `validateBrandConfigs()` for CI, over every committed brand
 * folder. The rules are C1's header list (`../schema.ts`); each issue names its field.
 */
export {
  discoverBrandConfigs,
  formatReport,
  readConfigJson,
  validateBrandConfigs,
  type BrandConfigFile,
  type BrandConfigResult,
  type BrandConfigsReport,
  type SupportsByApp,
} from './committed'
export { formatIssue, formatPath, type ConfigIssue, type ConfigPath } from './issues'
export { validateBrandConfig, type ValidateOptions, type ValidationResult } from './validate'
