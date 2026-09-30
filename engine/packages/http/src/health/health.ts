/**
 * What `/api/health` answers (DEPLOYMENT.md §3, §7; TASKS.md 4.1.b, 4.6.a), decided from ports so
 * it is tested without a database: the app, the boot check — and the environment it judged
 * (`production`, `staging` or `local`), so the release flow's check at the brand's domain sees
 * what the process decided (DEPLOYMENT.md §8) — the database (reached through `@engine/cms`'s
 * `cms()`, which initialises Payload and, in the web process of a production build with
 * `RUN_MIGRATIONS=1`, applies pending migrations under the advisory lock), media storage and the
 * job queue.
 *
 * The status gates on the app, the boot check, the database and storage: 200 when each passes,
 * 503 otherwise. The queue is **reported, never gating** (`./queue`): a failing queue makes the
 * answer `degraded`, still 200, since a failed health check rolls a deploy back. The answer is
 * public, so it names each check and whether it passed, never a finding's text: a missing
 * secret's name is for the process log (`formatBootReport`), not for anyone who asks.
 *
 * A database that does not answer is the database check's failure alone: the boot check marks it
 * an outage, not a refusal (`isRefused()`), so `boot` stays ok and counts only the configuration's
 * problems — a refused start is never reported for a process that booted (qa's phase 4 gate L1,
 * TASKS.md 5.3.f). A configuration fault beside an outage is still `refused`.
 */
import {
  isRefused,
  type BootReport,
  type DatabaseProbe,
  type DeploymentEnvironment,
} from '@engine/config/boot-check'
import { describeError } from '@engine/config/loader'

import type { QueueCheck } from './queue'

export type CheckResult = {
  readonly ok: boolean
  /** A short, secret-free word on why — `unreachable`, `not-configured`, `unmigrated` … */
  readonly detail?: string
}

export type HealthPorts = {
  /**
   * `runBootCheck()`, given the database probe: the port's own once the database answers, or one
   * that rethrows the port's error, so the boot check's `checkDatabase()` turns the cause into a
   * finding with its credentials redacted — logged, never in the body (senior-be #1).
   */
  readonly boot: (database: DatabaseProbe | null) => Promise<BootReport>
  /**
   * Initialises Payload and probes its database once (`./payload-ports`). The probe it returns
   * answers from that one probe, so the boot check's own database check sends no second query.
   */
  readonly database: () => Promise<DatabaseCheck>
  readonly storage: (environment: DeploymentEnvironment) => CheckResult
  /** Asked only once the database answered. */
  readonly queue: () => Promise<QueueCheck>
  /** Where the full boot report goes: the process log. */
  readonly log: (report: BootReport) => void
}

/** The database check, and the probe the boot check re-uses (READ COMMITTED, ARCHITECTURE.md §6). */
export type DatabaseCheck = CheckResult & {
  readonly probe?: DatabaseProbe
}

export type HealthStatus = 'ok' | 'degraded' | 'fail'

export type HealthBody = {
  /** `fail` (503) on a gating check; `degraded` (200) when only the queue is failing. */
  readonly status: HealthStatus
  readonly environment: DeploymentEnvironment
  readonly checks: {
    readonly app: CheckResult
    readonly boot: CheckResult & { readonly problems: number; readonly warnings: number }
    readonly database: CheckResult
    readonly storage: CheckResult
    readonly queue: QueueCheck
  }
}

export async function checkHealth(
  ports: HealthPorts,
): Promise<{ status: number; body: HealthBody }> {
  const database = await settleDatabase(ports.database)
  const boot = await settleBoot(ports.boot, database.probe ?? null)
  ports.log(boot)
  const storage = await settle(async () => ports.storage(boot.environment))
  const refused = isRefused(boot)
  const outages = boot.problems.filter((problem) => problem.outage === true).length
  // Fails closed: an outage the boot check saw fails the database even if its port said ok.
  const databaseResult =
    database.ok && outages > 0 ? { ok: false, detail: 'unreachable' } : publicResult(database)
  const queue = databaseResult.ok ? await settle(ports.queue) : { ok: false, detail: 'no-database' }
  const checks = {
    app: { ok: true },
    boot: {
      ok: !refused,
      problems: boot.problems.length - outages,
      warnings: boot.warnings.length,
      ...(refused ? { detail: 'refused' } : {}),
    },
    database: databaseResult,
    storage,
    queue,
  }
  const gating = [checks.app, checks.boot, checks.database, checks.storage]
  const status: HealthStatus = !gating.every((check) => check.ok)
    ? 'fail'
    : queue.ok
      ? 'ok'
      : 'degraded'
  return {
    status: status === 'fail' ? 503 : 200,
    body: { status, environment: boot.environment, checks },
  }
}

/**
 * A database port that throws is a failed check whose cause is kept — as a probe that rethrows it,
 * for the boot check to redact and report — never swallowed and never a failed health route.
 */
async function settleDatabase(port: () => Promise<DatabaseCheck>): Promise<DatabaseCheck> {
  try {
    return await port()
  } catch (error) {
    return { ok: false, detail: 'error', probe: () => Promise.reject(error) }
  }
}

/** A boot check that throws fails closed: judged production, refused, its cause redacted. */
async function settleBoot(
  boot: HealthPorts['boot'],
  probe: DatabaseProbe | null,
): Promise<BootReport> {
  try {
    return await boot(probe)
  } catch (error) {
    const finding = { subject: 'boot check', message: `threw: ${describeError(error)}` }
    return {
      ok: false,
      environment: 'production',
      loadersSource: 'payload',
      problems: [finding],
      warnings: [],
    }
  }
}

/** A port that throws is a failed check, never a failed health route. */
async function settle<T extends CheckResult>(port: () => Promise<T>): Promise<T | CheckResult> {
  try {
    return await port()
  } catch {
    return { ok: false, detail: 'error' }
  }
}

function publicResult(result: CheckResult): CheckResult {
  return result.detail === undefined ? { ok: result.ok } : { ok: result.ok, detail: result.detail }
}
