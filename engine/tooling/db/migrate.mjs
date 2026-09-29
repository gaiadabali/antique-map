// The `db:fresh` migrate step. No-ops cleanly until Payload lands (TASKS.md
// 3.2, SCH's `migrate:create`/`migrate` scripts) — `db:fresh` calls this
// unconditionally so a lane's workflow does not change once it stops being a
// no-op; only this file's body does.
export async function runMigrations({ database, brand, log = console.log } = {}) {
  log(`[db] migrate ${brand}/${database}: no migrations yet — no-op until Payload lands (3.2)`)
}
