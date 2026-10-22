// A small board in TASKS.md's shape, for the board tests: a progress table, a **Now**
// table and one phase. `boxes` overrides a subtask's or task's checkbox by id;
// `suffix` appends a status suffix to a task line.
export function board({ boxes = {}, suffix = {} } = {}) {
  const box = (id, def = ' ') => `[${boxes[id] ?? def}]`
  const tail = (id) => suffix[id] ?? ''
  return `# Board

<!-- progress:start -->
stale
<!-- progress:end -->

## Now

| Wave | Task | Agent | Worktree / branch | Since | Note |
| ---- | ---- | ----- | ----------------- | ----- | ---- |
| 7·W1 | 7.1 First task | medior | wt | 2026-10-01 | |
| 7·W1 | 7.10 Tenth task | junior | wt | 2026-10-01 | |

## Phase 7 — Fixture · Migration · needs — · ~1d

**Waves:** W1 — 7.1, 7.2, 7.10 · W2 — 7.3

- ${box('7.1')} **7.1 First task** · needs: —${tail('7.1')}
  - **Lane** MIG · **Agent** medior · **Wave** W1
  - **Owns** \`a/**\`
  - ${box('7.1.a')} 7.1.a do the thing
  - ${box('7.1.b')} 7.1.b **Check:** it works

- ${box('7.2')} **7.2 Cut task** · needs: — — ✂️ cut: folded into 7.1
  - **Lane** MIG · **Agent** medior · **Wave** W1
  - **Owns** \`b/**\`
  - ${box('7.2.a')} 7.2.a **Check:** gone

- ${box('7.10')} **7.10 Tenth task** · needs: —${tail('7.10')}
  - **Lane** MIG · **Agent** junior · **Wave** W1
  - **Owns** \`c/**\`
  - ${box('7.10.a')} 7.10.a 👤 the owner hands it over
  - ${box('7.10.b')} 7.10.b **Check:** it arrived

- ${box('7.3')} **7.3 Later task** · needs: 7.1${tail('7.3')}
  - **Lane** MIG · **Agent** junior · **Wave** W2
  - **Owns** \`d/**\`
  - ${box('7.3.a')} 7.3.a **Check:** later

## Log

- 2026-10-01 — nothing here counts: - [ ] **9.9 Not a task** · needs: —
`
}
