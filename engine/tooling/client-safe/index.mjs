// What is left of the client-safe gate once `check:client-safe` went (TASKS.md 1.3.b): the import
// walk, kept only because a package test asserts its own entry is browser-safe with it
// (`engine/packages/i18n/test/client-safe.test.ts`). The gate itself is now `import 'server-only'`
// in every `apps/*/src/server/**` module plus the ESLint import rule. Delete this folder with that
// test.
export { forbiddenReason, RULES } from './rules.mjs'
export { dynamicImports } from './scan.mjs'
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
  UNRESOLVABLE,
} from './walk.mjs'
