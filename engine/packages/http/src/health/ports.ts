/**
 * The health route's ports as this package can build them today.
 *
 * `database` and `queue` are **not wired**: they need `getPayload()` and the one Payload config,
 * and `@engine/http` does not yet declare `payload` or `@engine/cms` as dependencies — a change to
 * `engine/packages/http/package.json` outside TASKS.md 4.1's paths, reported as blocked. Until
 * then both answer `not-wired`, so `/api/health` answers 503 and no deploy can pass its health
 * check on a route that never reached the database. Wiring them is one file: a port that calls
 * `getPayload({ config })`, probes `payload.db.pool` with `@engine/cms/db/probe`, and reads the
 * queue's oldest pending job.
 */
import { formatBootReport, runBootCheck, type BootReport } from '@engine/config/boot-check'

import type { CheckResult, DatabaseCheck, HealthPorts } from './health'

type Env = Readonly<Record<string, string | undefined>>

/** Media goes to the brand's bucket, never the host's disk (DEPLOYMENT.md §2): configured, or local. */
export function storageCheck(env: Env): HealthPorts['storage'] {
  return (environment) => {
    const configured = Boolean(env.S3_BUCKET?.trim() && env.S3_ENDPOINT?.trim())
    if (configured) return { ok: true }
    return environment === 'local'
      ? { ok: true, detail: 'local-disk' }
      : { ok: false, detail: 'not-configured' }
  }
}

const notWired = async (): Promise<DatabaseCheck & CheckResult> => ({
  ok: false,
  detail: 'not-wired',
})

export function defaultHealthPorts(env: Env = process.env): HealthPorts {
  return {
    boot: (database) => (database ? runBootCheck({ env, database }) : runBootCheck({ env })),
    database: notWired,
    storage: storageCheck(env),
    queue: notWired,
    log: logBootReport,
  }
}

let lastLogged: string | undefined

/** The full report, once per change, to the process log — where a secret's name may appear. */
function logBootReport(report: BootReport): void {
  const text = formatBootReport(report)
  if (text === lastLogged) return
  lastLogged = text
  if (report.ok) console.info(`[health] ${text}`)
  else console.error(`[health] ${text}`)
}
