// The `db:fresh` seed step. No-ops cleanly until the seed content and script
// land (TASKS.md phase 3) — same shape as migrate.mjs, so `db:fresh` never
// changes when this stops being a no-op.
export async function runSeed({ database, log = console.log } = {}) {
  log(`[db] seed ${database}: no-op until seeding lands (phase 3)`)
}
