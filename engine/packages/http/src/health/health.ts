/**
 * What `/api/health` answers (DEPLOYMENT.md §3, §7; TASKS.md 4.1.b), decided from ports so it is
 * tested without a database: the app, the boot check — and the environment it judged
 * (`production`, `staging` or `local`), so the release flow's check at the brand's domain sees
 * what the process decided (DEPLOYMENT.md §8) — the database (reached through `getPayload()`,
 * which initialises Payload and, in the web process of a production build with
 * `RUN_MIGRATIONS=1`, applies pending migrations under the advisory lock), media storage and the
 * job queue.
 *
 * The answer is 200 when every check passes and 503 otherwise, and it is public, so it names
 * each check and whether it passed, never a finding's text: a missing secret's name is for the
 * process log (`formatBootReport`), not for anyone who asks.
 */
import type { BootReport, DatabaseProbe, DeploymentEnvironment } from '@engine/config/boot-check'
import { describeError } from '@engine/config/loader'

export type CheckResult = {
  readonly ok: boolean
  /** A short, secret-free word on why — `unreachable`, `not-configured`, `not-wired` … */
  readonly detail?: string
}

export type HealthPorts = {
  /**
   * `runBootCheck()`, given the database probe: the port's own once the database answers, or one
   * that rethrows the port's error, so the boot check's `checkDatabase()` turns the cause into a
   * finding with its credentials redacted — logged, never in the body (senior-be #1).
   */
  readonly boot: (database: DatabaseProbe | null) => Promise<BootReport>
  /** Initialises Payload (`getPayload()`) and probes its pool; `null` when it cannot be reached. */
  readonly database: () => Promise<DatabaseCheck>
  readonly storage: (environment: DeploymentEnvironment) => CheckResult
  readonly queue: () => Promise<CheckResult>
  /** Where the full boot report goes: the process log. */
  readonly log: (report: BootReport) => void
}

/** The database check, and the probe the boot check re-uses (READ COMMITTED, ARCHITECTURE.md §6). */
export type DatabaseCheck = CheckResult & {
  readonly probe?: DatabaseProbe
}

export type HealthBody = {
  readonly status: 'ok' | 'fail'
  readonly environment: DeploymentEnvironment
  readonly checks: {
    readonly app: CheckResult
    readonly boot: CheckResult & { readonly problems: number; readonly warnings: number }
    readonly database: CheckResult
    readonly storage: CheckResult
    readonly queue: CheckResult
  }
}

export async function checkHealth(
  ports: HealthPorts,
): Promise<{ status: number; body: HealthBody }> {
  const database = await settleDatabase(ports.database)
  const boot = await settleBoot(ports.boot, database.probe ?? null)
  ports.log(boot)
  const storage = await settle(async () => ports.storage(boot.environment))
  const queue = database.ok ? await settle(ports.queue) : { ok: false, detail: 'no-database' }
  const checks = {
    app: { ok: true },
    boot: {
      ok: boot.ok,
      problems: boot.problems.length,
      warnings: boot.warnings.length,
      ...(boot.ok ? {} : { detail: 'refused' }),
    },
    database: publicResult(database),
    storage,
    queue,
  }
  const ok = Object.values(checks).every((check) => check.ok)
  return {
    status: ok ? 200 : 503,
    body: { status: ok ? 'ok' : 'fail', environment: boot.environment, checks },
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
