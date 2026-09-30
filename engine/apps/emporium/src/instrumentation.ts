/**
 * The boot check at process start (TASKS.md 3.1.a, wired here in 4.1) — `./boot`. Next compiles
 * this file for every runtime, so the Node-only part is imported only in Node, and never while
 * `next build` runs: the build has no brand and no secrets (CONVENTIONS.md §12).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  const { bootOrExit } = await import('./boot')
  await bootOrExit()
}
