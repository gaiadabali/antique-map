// The client-safe gate's API (TASKS.md 4.2.a), for the gate's CLI and for a package test that
// asserts its own entry is browser-safe (`engine/packages/i18n/test/client-safe.test.ts`).
export { checkClientSafe, formatViolation } from './check.mjs'
export { findClientModules, isClientModule } from './discover.mjs'
export { forbiddenReason, RULES } from './rules.mjs'
export {
  BROWSER_CONDITIONS,
  directReach,
  findReaches,
  follow,
  importsOf,
  moduleFile,
  resolvePackage,
  runtimeReach,
  specifiersOf,
} from './walk.mjs'
