/**
 * The boot check at process start: the environment this process runs in, every secret it needs,
 * sandbox against live keys, the loader source, and a brand config the loader accepts (the one
 * app renders either brand, so no per-app `supports` narrows it — TASKS.md 2.1).
 * A problem refuses the start — the process exits, so pm2's reload and the deploy's health check
 * fail and the release rolls back — and the report, whose findings name secrets but never hold
 * one, goes to the log. The database is checked by `/api/health`, which owns the first
 * `getPayload()`.
 */
import { formatBootReport, runBootCheck } from '@engine/config/boot-check'

export async function bootOrExit(): Promise<void> {
  const report = await runBootCheck()
  if (report.ok) {
    console.info(formatBootReport(report))
    return
  }
  console.error(formatBootReport(report))
  process.exit(1)
}
