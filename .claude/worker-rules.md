# Worker rules — Indies Platform (antique-map)

Read by every headless worker the global launcher starts here (`~/.claude/workers/run.sh`). The plan is
`.claude/specs/indies-platform/WORKERS.md`; the dispatch rules are `docs/WORKFLOW.md` and `DISPATCH.md`.

- **Setup:** run `pnpm worktree:env` once for your own `PORT` and `DB_SUFFIX`; create your database with
  `pnpm db:fresh` (your suffix only). Never drop another suffix's database.
- **Database tests:** `*.db.test.ts` need `CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres`
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
- **Report:** the format of `docs/WORKFLOW.md` §5, at the path the ticket names.
