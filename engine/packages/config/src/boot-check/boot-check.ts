/**
 * `bootCheck()` — what a process checks as it starts (DEPLOYMENT.md §7–§8): the environment it
 * runs in, judged from its site allow-list; every secret it needs present and well-formed (the
 * link-key ring included); the loader source; and the allow-list itself. A problem refuses the
 * start and fails the health check; the build never runs it (it has no secrets).
 *
 * `bootCheck()` itself is pure — an environment in, a report out. `runBootCheck()` takes an
 * optional database probe for the checks that need one (reachable; READ COMMITTED, which the
 * domain transactions assume — ARCHITECTURE.md §7). A database that does not answer is an outage,
 * not a refusal: the report fails, but it says the database is unavailable, never that the boot
 * check refused to start (`isRefused()`). This package imports no database driver: the caller,
 * which owns the connection, passes the probe.
 */
import { deploymentEnvironment } from './environment'
import { collectFindings, type BootFinding, type DeploymentEnvironment } from './findings'
import { checkHostname } from './hostname'
import { checkPlatform, type LoadersSource } from './platform'
import { describeError } from './redact'

type Env = Readonly<Record<string, string | undefined>>

export type BootCheckInput = {
  readonly env: Env
  readonly now?: Date
}

export type BootReport = {
  readonly ok: boolean
  readonly environment: DeploymentEnvironment
  readonly loadersSource: LoadersSource
  readonly problems: readonly BootFinding[]
  readonly warnings: readonly BootFinding[]
}

/** Answers the database's own settings; throws when it cannot connect. */
export type DatabaseProbe = () => Promise<{ readonly transactionIsolation: string }>

export class BootCheckError extends Error {
  override readonly name = 'BootCheckError'
  constructor(readonly report: BootReport) {
    super(formatBootReport(report))
  }
}

export function bootCheck(input: BootCheckInput): BootReport {
  const findings = collectFindings()
  const { env } = input
  const environment = deploymentEnvironment(env, findings)
  checkHostname(env, findings)
  const loadersSource = checkPlatform(env, environment, findings, input.now ?? new Date())
  return report(environment, loadersSource, findings.problems, findings.warnings)
}

/** The database checks: it answers, and its default isolation is READ COMMITTED. */
export async function checkDatabase(probe: DatabaseProbe): Promise<BootFinding[]> {
  try {
    const { transactionIsolation } = await probe()
    if (transactionIsolation.trim().toLowerCase() === 'read committed') return []
    return [
      {
        subject: 'DATABASE_URL',
        message: `default_transaction_isolation is "${transactionIsolation}"; the domain transactions run READ COMMITTED (ARCHITECTURE.md §7)`,
      },
    ]
  } catch (error) {
    // A driver's message can quote the connection string; its credentials never reach the log.
    // An outage, not a refusal: the configuration may be sound and the database merely down.
    const message = `the database did not answer: ${describeError(error)}`
    return [{ subject: 'DATABASE_URL', message, outage: true }]
  }
}

/** Checks the environment, and probes the database if given one. */
export async function runBootCheck(
  options: { readonly env?: Env; readonly database?: DatabaseProbe; readonly now?: Date } = {},
): Promise<BootReport> {
  const env = options.env ?? process.env
  const checked = bootCheck({ env, ...(options.now ? { now: options.now } : {}) })
  if (!options.database) return checked
  const database = await checkDatabase(options.database)
  return report(
    checked.environment,
    checked.loadersSource,
    [...checked.problems, ...database],
    checked.warnings,
  )
}

/**
 * The report refuses this configuration: a problem that is not an outage. A report whose only
 * problems are outages (the database did not answer) fails, but the process booted.
 */
export function isRefused(bootReport: BootReport): boolean {
  return bootReport.problems.some((problem) => problem.outage !== true)
}

/** Throws `BootCheckError` — whose message lists every problem — unless the report is clean. */
export function assertBootable(bootReport: BootReport): void {
  if (!bootReport.ok) throw new BootCheckError(bootReport)
}

export function formatBootReport(bootReport: BootReport): string {
  const passed = `boot check passed (${bootReport.environment}, loaders from ${bootReport.loadersSource})`
  const unavailable = [...new Set(bootReport.problems.map((problem) => problem.subject))]
  const head = bootReport.ok
    ? passed
    : isRefused(bootReport)
      ? `boot check refused to start (${bootReport.environment}): ${bootReport.problems.length} problem(s)`
      : `${passed}, but ${unavailable.join(', ')} is unavailable: an outage, not a refused start`
  const lines = (label: string, findings: readonly BootFinding[]) =>
    findings.map((finding) => `  ${label} ${finding.subject}: ${finding.message}`)
  return [head, ...lines('✗', bootReport.problems), ...lines('!', bootReport.warnings)].join('\n')
}

function report(
  environment: DeploymentEnvironment,
  loadersSource: LoadersSource,
  problems: readonly BootFinding[],
  warnings: readonly BootFinding[],
): BootReport {
  return { ok: problems.length === 0, environment, loadersSource, problems, warnings }
}
