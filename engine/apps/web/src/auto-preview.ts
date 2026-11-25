/**
 * The admin's "Client preview" seed, run by itself on staging (2026-11-25): a short while after
 * each start — so after every deploy — the staging server runs the same `preview` step the
 * admin's button runs (`app/(payload)/admin/seeds/runner`), so new seeded copy (Home,
 * Collaboration, the sample data) goes live with the release instead of waiting for someone to
 * press a button. Staging only: never on a workstation or in CI (the e2e make their own data)
 * and never in production. Like the button, it overwrites the shop's Home and Collaboration
 * pages; an edit made in the staging admin lasts until the next deploy. `AUTO_PREVIEW=off` in the
 * environment switches it off.
 */
import { deploymentEnvironment } from '@engine/config/boot-check'

/** Long enough for the poller's health check to pass first and Payload to be up. */
const DELAY_MS = 30_000

/** Whether this process runs the preview by itself: staging, and not switched off. */
export function autoPreviewWanted(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  if ((env.AUTO_PREVIEW ?? '').trim().toLowerCase() === 'off') return false
  const ignore = { refuse() {}, warn() {}, require() {}, problems: [], warnings: [] }
  return (
    deploymentEnvironment(env, ignore as Parameters<typeof deploymentEnvironment>[1]) === 'staging'
  )
}

/** Schedules the run; never throws, never holds the start. */
export function scheduleAutoPreview(): void {
  if (!autoPreviewWanted()) return
  const timer = setTimeout(() => {
    void (async () => {
      try {
        const [{ cms }, { startSeed }] = await Promise.all([
          import('@engine/cms/instance'),
          import('./app/(payload)/admin/seeds/runner'),
        ])
        const started = startSeed('preview', await cms())
        if (started === null) {
          console.warn('[auto-preview] skipped: another seed run holds the process')
          return
        }
        await started.run
        console.info('[auto-preview] preview seed finished')
      } catch (error) {
        console.error(`[auto-preview] failed: ${error instanceof Error ? error.message : error}`)
      }
    })()
  }, DELAY_MS)
  timer.unref?.()
}
