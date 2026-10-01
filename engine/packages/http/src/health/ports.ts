/**
 * The health route's ports. The boot check, storage and the log are this package's own; the
 * database and the queue are Payload's, built by `./payload-ports` — which the route loads with
 * `import()` once it has read its request (ARCHITECTURE.md §15), so this module, the route and
 * their tests never load Payload.
 */
import { formatBootReport, runBootCheck, type BootReport } from '@engine/config/boot-check'

import type { HealthPorts } from './health'

type Env = Readonly<Record<string, string | undefined>>

/** What `./payload-ports` supplies. */
export type PayloadHealthPorts = Pick<HealthPorts, 'database' | 'queue'>

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

/**
 * Payload's ports when their module could not be loaded at all — the config failed to evaluate,
 * say: the database check fails with that cause, which the boot check redacts and logs.
 */
export function unloadedPayloadPorts(error: unknown): PayloadHealthPorts {
  const fail = async (): Promise<never> => {
    throw error
  }
  return { database: fail, queue: fail }
}

export function healthPorts(payload: PayloadHealthPorts, env: Env = process.env): HealthPorts {
  return {
    boot: (database) => (database ? runBootCheck({ env, database }) : runBootCheck({ env })),
    database: payload.database,
    storage: storageCheck(env),
    queue: payload.queue,
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
