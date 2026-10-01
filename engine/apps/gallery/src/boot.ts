/**
 * The boot check at process start: the environment this process runs in, every secret it needs,
 * sandbox against live keys, the loader source, and a brand this app can render (`./supports`).
 * A problem refuses the start — the process exits, so pm2's reload and the deploy's health check
 * fail and the release rolls back — and the report, whose findings name secrets but never hold
 * one, goes to the log. The database is checked by `/api/health`, which owns the first
 * `getPayload()`. This app adds one rule of its own: the spike's flags run on a workstation or in
 * CI only (`./spike/flags`).
 */
import { formatBootReport, runBootCheck, type BootReport } from '@engine/config/boot-check'

import { SPIKE_FLAGS } from './spike/flags'
import { supports } from './supports'

/** The report with the spike's rule applied: a flag set anywhere but locally is a problem. */
export function withSpikeRule(
  report: BootReport,
  env: Readonly<Record<string, string | undefined>>,
): BootReport {
  if (report.environment === 'local') return report
  const set = SPIKE_FLAGS.filter((flag) => env[flag]?.trim())
  if (set.length === 0) return report
  const problems = set.map((flag) => ({
    subject: flag,
    message: `is set on a ${report.environment} host: the spike's fixture routes and their disk writes run on a workstation or in CI only`,
  }))
  return { ...report, ok: false, problems: [...report.problems, ...problems] }
}

export async function bootOrExit(): Promise<void> {
  const report = withSpikeRule(await runBootCheck({ supports }), process.env)
  if (report.ok) {
    console.info(formatBootReport(report))
    return
  }
  console.error(formatBootReport(report))
  process.exit(1)
}
