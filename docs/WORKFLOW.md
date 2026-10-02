# Workflow — how agents and the orchestrator work

**Status:** current as of 2026-10-01. Rules for running tasks in parallel without collisions. The plan is
[PLAN.md](PLAN.md), the board is [`TASKS.md`](../TASKS.md), the code conventions are [CONVENTIONS.md](CONVENTIONS.md).

## 1. Lanes and what they own

A **lane** is an area of the repo. A task lists its lane and the exact paths it **Owns**; an agent edits only those.
Two tasks in the same wave never own the same path (a subdirectory counts as its parent).

| Lane | Owns |
| --- | --- |
| **PLT** platform | `engine/apps/web/src/{proxy.ts,server/**}`, `engine/apps/web/next.config.ts`, `engine/packages/{config,http,cache,i18n}/**` |
| **CMS** data and admin | `engine/packages/cms/**`, `engine/packages/migrate/**`, `engine/apps/web/src/app/(payload)/**` |
| **MED** media | `engine/packages/media/**`, derivative, tile and zoom code |
| **GAL** gallery site | `engine/apps/web/src/{gallery/**,app/(gallery)/**,messages/gallery/**}` |
| **SHP** shop site | `engine/apps/web/src/{shop/**,app/(shop)/**,messages/shop/**}` |
| **DSG** design | `engine/apps/web/src/{ui/**,styles/**}`, `DESIGN.md`, `docs/design/**` |
| **AIX** AI | `engine/apps/web/src/{chat/**,app/api/x/chat/**}`, `engine/packages/cms/src/ai/**` |
| **OPS** operations | `.github/**`, `.gaiadeploy.yml`, `scripts/**`, `docker-compose.dev.yml`, `docs/ops/**` |
| **DOC** documents | `docs/**` outside the above, `README.md` |
| **QA** | `tests/**`, `docs/gates/**` (QA edits tests and gate evidence, never product code) |

Files nobody owns (root `package.json`, `eslint.config.mjs`, `pnpm-workspace.yaml`) are changed by the task that
needs it, named in its **Owns**, and only one task per wave may name them. Never hand-edit `pnpm-lock.yaml`.

## 2. Schema and migrations

One migration set, one database. **Only the wave's schema lead generates a migration**, once per wave, in a clean
worktree on merged `main` — never one a dev server pushed. Tasks in a wave that change collections report the
tables and indexes they need; the lead commits the migration, regenerates `payload-types.ts` and `importMap.js`
(`pnpm generate:types`, `pnpm generate:importmap`) and runs `pnpm check:generated`. Hand-written DDL (extensions,
the last-owner trigger) lives in the initial migration and is tested by a `*.db.test.ts`.

## 3. Standing rules

- Work in your own worktree (`pnpm worktree`) with its own port and database suffix. Commit explicit paths; never
  `git add -A`.
- Public reads go through `src/server` loaders (`overrideAccess:false`, published only, `select`).
- Add a test with the code: a unit test for logic, a `*.db.test.ts` for anything that depends on a Postgres
  constraint or access rule, a Playwright check for a user-visible path.
- A UI task is not done until it is opened on a production build at 390 px and 1280 px with axe clean.
- Docs change with the code that makes them untrue — the task that changes behaviour updates the doc in the same
  branch, but only if the doc is in its **Owns**; otherwise it reports the doc as a **Found** item.
- Anything marked 👤 needs the owner: an agent drops it from its wave rather than stalling.

## 4. Dispatch (the orchestrator)

1. Open a phase when every phase in its heading's `needs` is ✅; at most **three** phases are open at once.
   _Since 2026-10-03 the build runs contract-first on three model lanes and phases overlap — see
   `.claude/specs/indies-platform/WORKERS.md`, which overrides this step and step 3's agent choice._
2. Take the phase's first wave that is not all ✅. `pnpm tasks:lint` must be green. Mark each task
   `— 🔄 N·Wk`, add its row to **Now**.
3. One agent per task: the task's agent type, `model: "opus"`, `isolation: "worktree"`, the prompt in
   `.claude/specs/indies-platform/DISPATCH.md`.
4. The board is live: each agent has already run `pnpm tasks:start` and `pnpm tasks:report`, so `TASKS.md` shows its
   progress as it happens. As reports arrive, review the diff like a pull request, merge each branch in a clean
   worktree, re-run `pnpm verify`, have **qa** drive the user-visible
   criteria, then close the task (the board closes it when every subtask is ticked) and add a **Log** line.
5. When a phase's last task closes, qa opens its **Done when** on merged `main` (production build, phone viewport)
   and the orchestrator logs `✅ phase N — <evidence>`.

## 5. Report

**Progress is live.** An agent runs `pnpm tasks:start <task> --agent <type>` as its first step and `pnpm tasks:report <subtask ids>` after each subtask it can evidence. From any worktree these update the main checkout's `TASKS.md`; neither can tick a **Check**, which the orchestrator ticks after merge and qa. Agents never edit `TASKS.md` by hand. An agent ends with exactly this report, which repeats the ticks as evidence:

```text
Task / Status (done | blocked | partial)
Subtasks   ✅ or ❌ per subtask id, with evidence for each ✅ (a test name, a command output, a screenshot path)
Check      ✅ or ❌ per clause, with evidence
Files      every path changed
Found      anything that contradicts a doc (doc + section)
Follow-ups discovered work, proposed as new subtasks
```

## 6. The real risk of parallel work

Review capacity, not agent capacity. Run as many agents as one reviewer can read the same day; halve it when the
wave touches money, access rules or the AI. Anything touching `cms/src/access`, payments, the stock decrement or
the chat's tools gets a second reviewer (`senior-be` or `senior-integrator`) and a test that fails on the planted
violation.

## 7. Gates that need a human

The owner's go-ahead is required for: production deploys, DNS, live payment credentials, publishing the real
catalogue, counsel's legal text, and each launch. They appear in `TASKS.md` as 👤 and in **Decisions for the owner**.
