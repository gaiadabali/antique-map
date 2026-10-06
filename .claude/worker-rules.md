# Worker rules — Indies Platform (antique-map)

Read by every headless worker the global launcher starts here (`~/.claude/workers/run.sh`). The plan is
`.claude/specs/indies-platform/WORKERS.md`; the dispatch rules are `docs/WORKFLOW.md` and `DISPATCH.md`.

- **Setup:** run `pnpm install --frozen-lockfile`, then `pnpm worktree:env <phase> <ticket id without dots>` once
  (e.g. `pnpm worktree:env 3 w34`) for your own `PORT` and `DB_SUFFIX`; create your database with `pnpm db:fresh`
  (your suffix only). Never drop another suffix's database. `pnpm --filter @engine/cms test` runs nothing — run
  tests with `pnpm vitest run <path>` (database tests with `--maxWorkers=2`; full parallelism overloads Postgres).
- **Migrated-database tests** (`admins.db.test.ts`, `instance.db.test.ts`, `owner-backstop.db.test.ts`) fail on any
  branch that adds or changes collections until the schema lead's migration lands (3.5). Report them as expected;
  do not try to fix them and never write a migration to make them pass.
- **Never manage the dev stack's containers.** No `docker compose up/down/restart/rm`, `docker restart` or `docker run` for Postgres, Mailpit or RustFS — they are shared by every session, and a worktree's older `docker-compose.dev.yml` recreates the container for everyone (two outages on 2026-10-05/06). If the database is unreachable, stop and report it; do not try to fix it.
- **Database tests:** `*.db.test.ts` need `CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres` (use `127.0.0.1`, never `localhost`: a WSL relay answers `[::1]:5432` and `[::1]:9000` on this host, so `localhost` times out or hits the wrong server; the same goes for `S3_ENDPOINT`)
  (the local dev stack's container `indies-platform-dev-postgres-1`; each test creates and drops its own pushed
  database). Never touch any other container — the other Postgres servers on this machine belong to other projects.
- **Board (mandatory — the user tracks progress from `TASKS.md` live):** your first command is `pnpm tasks:start <task> --agent <type>`; after each subtask you can evidence,
  `pnpm tasks:report <subtask ids>`. Report each subtask the moment it is evidenced, not at the end — including when your ticket covers only part of a task. Never edit `TASKS.md` by hand; you cannot tick a **Check**.
- **Generated files:** never write a migration unless the ticket names you the schema lead — report the tables and
  indexes you need instead. If you change a collection or global, regenerate (never hand-edit) the types and import
  map with `pnpm --filter @engine/cms generate:types` and `pnpm --filter @engine/cms generate:importmap`, commit
  them, and confirm `pnpm check:generated` is clean; the orchestrator regenerates them again on merge. Never
  hand-edit `pnpm-lock.yaml` (change it only with `pnpm install`, and only if the ticket owns it).
- **Collection registry:** a new collection or global gets its own folder and one line in
  `engine/packages/cms/src/registries/collections.ts` (that one file is shared; the orchestrator merges the lines).
- **Framework:** Next 16.3 with Cache Components (`proxy`, not `middleware`), Payload 3.90. Read
  `node_modules/next/dist/docs/` before framework code. Public reads go through `src/server` loaders with
  `overrideAccess: false`, `_status: 'published'` and `select`. Engine routes live under `/api/x/`.
- **UI:** tokens and shared components only (a lint fails raw colours and font families); copy in the lexicon
  files, both `en` and `id`; no file over 300 lines.
- **Fresh-clone verify:** after `pnpm install --frozen-lockfile`, run `pnpm worktree:env` in the clone, then the
  ticket's Verify commands (at least `pnpm verify`).
- **Never background, never "wait":** you run headless — ending your turn ends your session, and no background
  notification ever comes back. Run long commands (`pnpm verify`, db tests, `pnpm build`, Playwright) in the
  **foreground** with a long timeout; never `run_in_background`; never stop "to wait" for a job. **Commit after every
  step, before any long run**, so nothing is lost if you are cut off (four runs on 2026-10-05/06 ended with their
  work uncommitted this way).
- **Report:** the format of `docs/WORKFLOW.md` §5, at the path the ticket names (always under `docs/reports/workers/` — you cannot write under `.claude/`). Commit it.
