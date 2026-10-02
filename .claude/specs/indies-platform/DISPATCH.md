# Dispatching a wave

The orchestrator's checklist and the prompt it gives each agent. The rules behind it are `docs/WORKFLOW.md`; the
tasks are the root `TASKS.md`.

## Before a wave

A wave is one of a phase's waves — **W1**, **W2** or **W3**, listed on the phase's **Waves** line and written
`3·W2` outside it. It is dispatched only when its phase is open (every phase in its heading's `needs` is ✅, at most
three phases open) and every earlier wave of the phase is merged.

- [ ] `pnpm tasks:lint` is green: every task's `needs:` is ✅ and no two tasks in the wave share an **Owns** path.
- [ ] Each task in the wave marks itself `— 🔄 {P}·W{K}` with its row in **Now** (agents run `pnpm tasks:start`); if an agent did not, the orchestrator does.
- [ ] At most one task in the wave generates the migration (the schema lead).
- [ ] 👤 items the wave needs (keys, decisions, access) are in hand — otherwise drop the task from the wave.
- [ ] A reviewer is named; a second reviewer for access rules, money, stock, webhooks and the chat's tools.

## The agent prompt (one per task)

Dispatch with the task's agent type, `model: "opus"` and `isolation: "worktree"`.

```text
You are implementing task {ID} — "{TITLE}" — of the Indies Platform plan.

Read first, in this order:
1. AGENTS.md
2. docs/PLAN.md and .claude/specs/indies-platform/design.md
3. TASKS.md (repo root) — your task {ID}, its subtasks and its **Check**
4. docs/WORKFLOW.md and docs/CONVENTIONS.md
5. {READ LIST FROM THE TASK}

Your lane is {LANE}. You may edit ONLY these paths:
{OWNS FROM THE TASK}
If you need a change anywhere else, stop and report it as blocked — do not edit it.

Board: your first command is `pnpm tasks:start {ID} --agent {AGENT TYPE}`; after EACH subtask you can evidence, run
`pnpm tasks:report {ID}.x` (it updates the main checkout's TASKS.md live and refuses a Check). Never edit TASKS.md by
hand.

Setup: you are in your own git worktree. Run `pnpm worktree:env` for your own PORT and database suffix; create
your database with `pnpm db:fresh --suffix {LANE}`.
Schema: unless you are the wave's schema lead, never commit a generated migration; specify the tables and indexes
you need in your report.
Framework: Next is 16.3 with Cache Components — no route segment config, runtime reads inside <Suspense>,
'use cache' + cacheTag. Public reads go through src/server loaders (overrideAccess: false, published only,
select). Engine routes live under /api/x/. Read node_modules/next/dist/docs/ before framework code.

Your subtasks, in order (the last one is the Check):
{SUBTASKS FROM THE TASK}

The Check (verify every clause with evidence — a test name, a command output, or a screenshot of the opened
screen on a production build on your own port, at 390 px and 1280 px):
{CHECK FROM THE TASK}

Requirements this task satisfies: {REQUIREMENTS}.

Do not edit TASKS.md by hand — use the two commands above. Finish with the report in docs/WORKFLOW.md §5.
```

## After a wave

- [ ] Read every report; anything `blocked` or `partial` goes back to its lane, never patched by the orchestrator
      in another lane's files.
- [ ] Review each diff like a pull request, merge each branch in a **clean worktree** one at a time, re-run
      `pnpm verify` after each.
- [ ] If the wave changed schema: the schema lead generates the migration once, regenerates types and the import
      map, and runs `pnpm check:generated`.
- [ ] Dispatch **qa** to drive the wave's user-visible criteria in a browser on a production build.
- [ ] If it was the phase's last wave: have **qa** open the phase's **Done when** on merged `main` (phone
      viewport) and log `✅ phase N — <evidence>`; then open the next phase whose needs are ✅.
- [ ] In `TASKS.md` (the main checkout): tick each evidenced subtask (`pnpm tasks:tick <ids…>`), a **Check** only
      once it passed on merged `main`; add a **Log** line; add follow-ups as new subtasks; record a changed
      decision in the doc that owns it.
