/**
 * The boot check: `runBootCheck()` / `bootCheck()` at process start, `assertBootable()` to refuse
 * it, the environment it judged, the parsed `LINK_TOKEN_KEYS` ring, and `describeError()` — an
 * error's message with its credentials redacted, for a log.
 */
export {
  assertBootable,
  bootCheck,
  BootCheckError,
  checkDatabase,
  formatBootReport,
  isRefused,
  runBootCheck,
  type BootCheckInput,
  type BootReport,
  type DatabaseProbe,
} from './boot-check'
export { deploymentEnvironment, LOCAL_PRODUCTION_BUILD } from './environment'
export { isLoopbackIp, normaliseHost } from './hostname'
export { DEPLOYMENT_ENVIRONMENTS, type BootFinding, type DeploymentEnvironment } from './findings'
export {
  LINK_KEY_COMMAND,
  LINK_KEY_MIN_BYTES,
  LINK_KEY_MIN_DISTINCT_BYTES,
  LINK_KEY_OVERLAP_DAYS,
  LINK_KEY_STEPPED_RUN,
  parseLinkTokenKeys,
  type LinkKeyRing,
  type LinkKeyRingResult,
  type LinkTokenKey,
} from './link-keys'
export { LOADERS_SOURCES, type LoadersSource } from './platform'
export { describeError, redactCredentials } from './redact'
