/**
 * What `bootCheck()` finds. A problem refuses the start (and so fails the health check); a
 * warning is logged and the process runs. Every finding names its subject — an environment
 * variable or a config field — and never a secret's value: the report goes to the log
 * (CONVENTIONS.md §13).
 */

export const DEPLOYMENT_ENVIRONMENTS = ['local', 'staging', 'production'] as const
/**
 * Where the process runs. `local` is a workstation or CI (sandbox keys, fixtures allowed);
 * `staging` the `.gaiada.com` hosts (sandbox keys, DEPLOYMENT.md §1); `production` the
 * brand's own domain (live keys, nothing draft).
 */
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number]

export type BootFinding = {
  /** The environment variable or config field at fault: `LINK_TOKEN_KEYS`, `sellers[0].draft`. */
  readonly subject: string
  readonly message: string
  /**
   * A service the process needs did not answer — the database, today. An outage fails the report
   * (`ok` is false, so a health check fails) but is not a configuration the check refuses: a
   * process whose only problems are outages booted, and is reported as unavailable, never as a
   * refused start (`isRefused()`; qa's phase 4 gate L1, TASKS.md 5.3.f).
   */
  readonly outage?: true
}

export type Findings = {
  readonly problems: BootFinding[]
  readonly warnings: BootFinding[]
  refuse(subject: string, message: string): void
  warn(subject: string, message: string): void
  /** A requirement a deployed process must meet and a workstation may skip (CONVENTIONS.md §8). */
  require(subject: string, message: string, environment: DeploymentEnvironment): void
}

export function collectFindings(): Findings {
  const problems: BootFinding[] = []
  const warnings: BootFinding[] = []
  return {
    problems,
    warnings,
    refuse: (subject, message) => void problems.push({ subject, message }),
    warn: (subject, message) => void warnings.push({ subject, message }),
    require: (subject, message, environment) =>
      void (environment === 'local' ? warnings : problems).push({ subject, message }),
  }
}

/** A value from the environment, `undefined` when unset or blank. */
export function read(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const value = env[name]?.trim()
  return value === undefined || value === '' ? undefined : value
}
