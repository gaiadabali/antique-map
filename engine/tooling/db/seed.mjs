// The `db:fresh` seed step: a no-op — `db:fresh` makes and migrates a database, and seeding is its
// own command, `pnpm data:seed [--app shop]` (engine/packages/cms-shop/src/seed/app.mjs), run
// after it. Kept as a hook so `db:fresh` never changes shape if it ever seeds itself.
export async function runSeed({ database, log = console.log } = {}) {
  log(
    `[db] seed ${database}: not part of db:fresh — run \`pnpm data:seed\` (--app shop for the shop)`,
  )
}
