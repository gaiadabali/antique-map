// The `db:fresh` seed step. No-ops cleanly until the seed content and script
// land (TASKS.md 10.2) — same shape as migrate.mjs, so `db:fresh` never
// changes when this stops being a no-op.
export async function runSeed({ database, brand, log = console.log } = {}) {
  log(`[db] seed ${brand}/${database}: no-op until seeding lands (10.2)`)
}
