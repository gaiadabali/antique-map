/**
 * `bootCheck()` — what a process checks as it starts (BRANDS.md §3, TASKS.md 3.1.a): the
 * environment it runs in, every secret it needs present and well-formed (per seller for each
 * payment provider, the link-key ring), sandbox vs live keys against that environment, the
 * loader source, and nothing draft or synthetic where buyers pay. A problem refuses the start
 * and fails the health check; the build never runs it (it has no brand and no secrets).
 *
 * `bootCheck()` itself is pure — an environment and a config in, a report out. `runBootCheck()`
 * loads the brand first, and takes an optional database probe for the checks that need one
 * (reachable; READ COMMITTED, which `reserve()`'s lock order assumes — ARCHITECTURE.md §6).
 * This package imports no database driver: the caller, which owns the connection, passes the
 * probe (TASKS.md 3.2, 4.1).
 */
import { loadBrand, type LoadOptions } from '../loader/load'
import type { BrandConfig } from '../schema'
import { deploymentEnvironment } from './environment'
import { collectFindings, type BootFinding, type DeploymentEnvironment } from './findings'
import { checkPlatform, type LoadersSource } from './platform'
import { checkProviderSecrets } from './provider-secrets'

type Env = Readonly<Record<string, string | undefined>>

export type BootCheckInput = {
  readonly env: Env
  readonly config: BrandConfig
  /** The config came from a per-storefront brand folder — the synthetic brand, never deployed. */
  readonly perStorefront?: boolean
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
  const { env, config } = input
  const environment = deploymentEnvironment(env, config, findings)
  if (input.perStorefront && environment !== 'local') {
    findings.refuse(
      'BRAND',
      `"${config.slug}" keeps one config per storefront — the synthetic brand, which is never deployed`,
    )
  }
  const loadersSource = checkPlatform(env, config, environment, findings, input.now ?? new Date())
  checkProviderSecrets(env, config, environment, findings)
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
        message: `default_transaction_isolation is "${transactionIsolation}"; the engine runs on READ COMMITTED, which reserve()'s lock order assumes (ARCHITECTURE.md §6)`,
      },
    ]
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    // A driver's message can quote the connection string; its credentials never reach the log.
    const safe = reason.replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s@/]*@/gi, '$1…@')
    return [{ subject: 'DATABASE_URL', message: `the database did not answer: ${safe}` }]
  }
}

/** Loads the brand, checks it and the environment, and probes the database if given one. */
export async function runBootCheck(
  options: LoadOptions & { readonly database?: DatabaseProbe; readonly now?: Date } = {},
): Promise<BootReport> {
  const env = options.env ?? process.env
  let loaded
  try {
    loaded = loadBrand({ ...options, env })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const environment = env.NODE_ENV === 'production' ? 'production' : 'local'
    return report(environment, 'payload', [{ subject: 'BRAND', message }], [])
  }
  const checked = bootCheck({
    env,
    config: loaded.config,
    perStorefront: loaded.paths.perStorefront !== null,
    ...(options.now ? { now: options.now } : {}),
  })
  if (!options.database) return checked
  const database = await checkDatabase(options.database)
  return report(
    checked.environment,
    checked.loadersSource,
    [...checked.problems, ...database],
    checked.warnings,
  )
}

/** Throws `BootCheckError` — whose message lists every problem — unless the report is clean. */
export function assertBootable(bootReport: BootReport): void {
  if (!bootReport.ok) throw new BootCheckError(bootReport)
}

export function formatBootReport(bootReport: BootReport): string {
  const head = bootReport.ok
    ? `boot check passed (${bootReport.environment}, loaders from ${bootReport.loadersSource})`
    : `boot check refused to start (${bootReport.environment}): ${bootReport.problems.length} problem(s)`
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
