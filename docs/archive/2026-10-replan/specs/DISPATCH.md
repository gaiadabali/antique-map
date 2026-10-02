# Dispatching a wave

The orchestrator's checklist and the prompt it gives each agent. The rules behind
it are `docs/PARALLEL-TRACKS.md`; the tasks are the root `TASKS.md`.

## Before a wave

A wave is one of a phase's waves in `TASKS.md` — **W1**, **W2** or **W3** of that
phase, listed on the phase's **Waves** line and written `17·W2` outside it. A
wave may be split into smaller batches when review capacity is short; it may
never be merged with the next wave. A wave is dispatched only when its phase is
open (every phase in its heading's needs is ✅, at most three phases open) and
every earlier wave of the phase is merged.

- [ ] `pnpm tasks:lint --phase {P} --wave {K}` is green (once 2.2.f has landed;
      before that, check the two items below by hand): every task's `needs:` is
      ✅, and no two tasks in the wave share an **Owns** path (subdirectories
      count — §1 of PARALLEL-TRACKS.md; contract files stay ARC's).
- [ ] Each task in the wave is marked `— 🔄 {P}·W{K}` in `TASKS.md` and has its row in
      **Now**.
- [ ] At most one task in the wave is the **SCH lead's migration step**.
- [ ] 👤 items the wave needs (keys, decisions, access) are in hand — otherwise
      drop the task from the wave rather than letting an agent stall on it.
- [ ] A reviewer is named per lane family (senior-be for DOM/PAY/LOG, senior-fe
      for WEB and apps, senior-uiux for craft, senior-db for migrations **and for
      every transaction in `domain/**` and `payments/**`**).
- [ ] The wave's agent count respects review capacity (halve it for one reviewer).

## The agent prompt (one per task)

Dispatch with the task's agent type, `model: "opus"` and `isolation: "worktree"`.

```text
You are implementing task {ID} — "{TITLE}" — of the Indies Platform plan.

Read first, in this order:
1. AGENTS.md
2. .claude/specs/indies-platform/design.md
3. TASKS.md (at the repo root) — your task {ID}, its subtasks and its **Check**
4. docs/PARALLEL-TRACKS.md §1–§5 and docs/CONVENTIONS.md
5. {READ LIST FROM THE TASK}

Your lane is {LANE}. You may edit ONLY these paths:
{OWNS FROM THE TASK}
If you need a change anywhere else, stop and report it as blocked — do not edit it.

Setup: you are in your own git worktree. Run `pnpm worktree:env {PHASE} {LANE}`
so you have your own PORT and database suffix in .env.local (in phases 1–2, before
task 1.3 lands, set PORT and the suffix by hand); create your databases with
`pnpm db:fresh --brand <slug> --suffix {LANE}` (for the test brand, add
`--storefront gallery|emporium`).
Schema: if you are not the SCH lead, never commit a generated migration; if you
need an engine table or an index, specify it in your report — SCH writes the DDL.
Framework: Next is 16.3 with Cache Components — no route segment config, runtime
reads inside <Suspense>, 'use cache' + cacheTag. Public reads go through the
loaders' read helper (overrideAccess: false, published only, select). Engine
routes live under /api/x/. Read node_modules/next/dist/docs/ before framework code.

Your subtasks, in order (the last one is the Check):
{SUBTASKS FROM THE TASK}

The Check (verify every clause with evidence — a test name, a command output,
or a screenshot of the opened screen on a production build on your own port):
{CHECK FROM THE TASK}

Requirements this task satisfies: {REQUIREMENTS}.

Do not edit TASKS.md — the orchestrator ticks it from your report. Finish with
exactly this report:
Task / Status (done | blocked | partial) / Subtasks (✅ or ❌ per subtask id,
with evidence for each ✅) / Check (✅ or ❌ per clause, with evidence) / Files
(every path changed) / Contracts (none changed, or what you need changed and
why) / Found (anything contradicting a doc, with doc + section) / Follow-ups
(discovered work, proposed as new subtasks).
```

## After a wave

- [ ] Read every report; anything `blocked` or `partial` goes back to its lane or
      to ARC — never patched by the orchestrator in another lane's files.
- [ ] Merge each branch in a **clean worktree** (`git worktree add --detach`),
      one at a time, re-running `pnpm verify` after each.
- [ ] If the wave changed schema: the SCH lead runs `migrate:create` once,
      `generate:types`, and `pnpm db:schema-hash --all`.
- [ ] Full gate: `pnpm verify` (which includes `check:generated` and
      `tasks:lint`), e2e for `indies-gallery`, `old-east-indies` and both `test`
      configs on a production build, Lighthouse for touched surfaces.
- [ ] Dispatch **qa** to drive the wave's user-visible criteria in a browser.
- [ ] If it was the phase's last wave: have **qa** open the phase's **Done when**
      on merged `main` (a production build, a phone viewport) and log
      `✅ phase N — <evidence>`; then open the next phase whose needs are ✅.
- [ ] In `TASKS.md` (the main checkout's copy): tick each subtask a report
      evidences (`pnpm tasks:tick <ids…>`), ticking a **Check** only once it
      passed on merged `main` — the board then closes the task (`✅ YYYY-MM-DD
      <sha>`), drops its **Now** rows and rebuilds the table by itself; add a
      **Log** line; add follow-ups as new subtasks with the next free
      letter (or new tasks with the next free number); record anything that
      changed a decision in the doc that owns it (CONVENTIONS.md §14).

## Example — phase 1 and phase 2, wave by wave

| Wave | Task | Agent | Owns (abridged) |
| ---- | ---- | ----- | --------------- |
| 1·W1 | 1.1 Initialise the repository and workspace | devops | root configs |
| 1·W1 | 1.2 Freeze contracts — platform and UI (ARC-P) | architect | `config/src/{schema,routes}.ts`, `view-models/**`, `ui/src/tokens/contract.ts`, `media/src/contract.ts`, `http/src/manifest.ts` |
| 1·W1 | 1.2 Freeze contracts — domain (ARC-D) | architect | `domain/src/{money/contract.ts,contracts/**,*/machine.ts,reservations/contract.ts}`, `{payments,shipping,fulfilment,analytics,sister}/src/contract.ts` |
| 1·W2 | 1.3 Agent workspace | junior | `engine/tooling/worktree/**`, `.claude/skills/**` |
| 2·W1 | 2.1 Local infrastructure | devops | `docker-compose.dev.yml`, `.env.example`, `engine/tooling/db/**` |
| 2·W1 | 2.2 Quality-gate tooling | devops | `engine/tooling/{check-file-size,…,tasks-lint,config-drift,brand-create}/**` |
| 2·W2 | 2.3 CI pipeline, artifact and deploy manifest | devops | `.github/**`, `.gaiadeploy.yml` |

Phase 2 opens when phase 1 closes; inside each phase the waves run in order, and
a wave's agents are on disjoint paths. The two architects in 1·W1 split the contracts by package so neither edits
the other's files; each signs the other's contracts off with a senior reviewer
before phase 1 closes.
