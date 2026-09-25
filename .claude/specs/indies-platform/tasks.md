# Implementation Plan — moved to the root `TASKS.md`

The task list lives in one place: **[`TASKS.md`](../../../TASKS.md)** at the repo
root. It is the progress board — every phase, task and subtask (each task ending
in a **Check**), the dispatch plan W1–W26, what is in flight now, the owner's
decisions, and a log — with a progress table rebuilt from its checkboxes by
`node scripts/progress.mjs`.

It moved there so there is exactly one list to tick: two copies drift, and a
board nobody trusts stops being read.

This spec folder keeps what every task traces to:

- [`requirements.md`](requirements.md) — the 161 numbered acceptance criteria;
- [`design.md`](design.md) — the design summary agents read first;
- [`DISPATCH.md`](DISPATCH.md) — the orchestrator's per-wave checklist and the
  prompt each agent receives.
