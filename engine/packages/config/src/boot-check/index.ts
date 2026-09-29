/**
 * The boot check (PLT, TASKS.md 3.1.a): `runBootCheck()` / `bootCheck()` at process start,
 * `assertBootable()` to refuse it, and the parsed `LINK_TOKEN_KEYS` ring the links module
 * derives with (C6 `links`, TASKS.md 18.2.g).
 */
export {
  assertBootable,
  bootCheck,
  BootCheckError,
  checkDatabase,
  formatBootReport,
  runBootCheck,
  type BootCheckInput,
  type BootReport,
  type DatabaseProbe,
} from './boot-check'
export { deploymentEnvironment } from './environment'
export { DEPLOYMENT_ENVIRONMENTS, type BootFinding, type DeploymentEnvironment } from './findings'
export {
  LINK_KEY_MIN_BYTES,
  LINK_KEY_MIN_DISTINCT_BYTES,
  LINK_KEY_OVERLAP_DAYS,
  parseLinkTokenKeys,
  type LinkKeyRing,
  type LinkKeyRingResult,
  type LinkTokenKey,
} from './link-keys'
export { LOADERS_SOURCES, type LoadersSource } from './platform'
export {
  FULFILMENT_SECRETS,
  PAYMENT_SECRETS,
  secretPrefix,
  SHIPPING_SECRETS,
} from './provider-secrets'
