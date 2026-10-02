# Worker rules — Indies Platform (antique-map)

Read by every headless worker the global launcher starts here (`~/.claude/workers/run.sh`). The plan is
`.claude/specs/indies-platform/WORKERS.md`; the dispatch rules are `docs/WORKFLOW.md` and `DISPATCH.md`.

- **Setup:** run `pnpm worktree:env` once for your own `PORT` and `DB_SUFFIX`; create your database with
  `pnpm db:fresh` (your suffix only). Never drop another suffix's database.
- **Board:** your first command is `pnpm tasks:start <task> --agent <type>`; after each subtask you can evidence,
  `pnpm tasks:report <subtask ids>`. Never edit `TASKS.md` by hand; you cannot tick a **Check**.
- **Generated files:** never commit a migration, `payload-types.ts`, `importMap.js` or `next-env.d.ts` unless the
  ticket names you the schema lead; report the tables and indexes you need instead. Never hand-edit
  `pnpm-lock.yaml` (change it only with `pnpm install`, and only if the ticket owns it).
- **Framework:** Next 16.3 with Cache Components (`proxy`, not `middleware`), Payload 3.90. Read
  `node_modules/next/dist/docs/` before framework code. Public reads go through `src/server` loaders with
  `overrideAccess: false`, `_status: 'published'` and `select`. Engine routes live under `/api/x/`.
- **UI:** tokens and shared components only (a lint fails raw colours and font families); copy in the lexicon
  files, both `en` and `id`; no file over 300 lines.
- **Fresh-clone verify:** after `pnpm install --frozen-lockfile`, run `pnpm worktree:env` in the clone, then the
  ticket's Verify commands (at least `pnpm verify`).
- **Report:** the format of `docs/WORKFLOW.md` §5, at the path the ticket names.
