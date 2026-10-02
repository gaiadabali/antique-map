# Worker lanes — finishing the build on three models

**Status:** adopted 2026-10-03. This session is the orchestrator. It replaces the Hermes replay pilot on this
repo and overrides `docs/WORKFLOW.md` §4.1 ("at most three phases open"): phases overlap **contract-first**, so a
task opens when the code it reads is merged, not when its whole phase is ✅. Everything else in
`docs/WORKFLOW.md`, `DISPATCH.md` and `AGENTS.md` still holds: owned paths, one schema lead per wave, review
before merge, `pnpm verify` on merged `main`, qa opens every user-visible Check.

Copied from the Airin Platform project, where the same split shipped nine tickets on 2026-10-02/03.

## 1. The three lanes

| Lane | Model | Speed / cost | Concurrency | Gets |
| --- | --- | --- | --- | --- |
| **K** `extra` | Kimi K2.7 Code (conextlab gateway, team key shared with Platform) | fast, cheap | up to 3 (key shared with Platform) | **The bulk lane.** Every ticket that can be specified exactly: pages, components, lexicon, plain collections, loaders that copy an existing pattern, e2e specs, SEO, redirects, seeds, admin UI |
| **G** `glm` | GLM 5.3 Flash (company OpenRouter key) | slow, cheap | 2 | Mid-level work that needs judgement but no money/access invariant: search, media pipeline, Google Maps picker, import, perf |
| **C** Claude | Opus subagents in this session (`isolation: "worktree"`) | fast, **limited quota** | 2 | Only the **cores**: access rules, migrations, money, the stock decrement, webhooks, the chat's tools and guardrails, staging/server work, security review. Kept small: the core + its `*.db.test.ts`; Kimi builds the UI around it |

**The orchestrator (this session)** writes tickets, launches, reviews, merges, runs gates, ticks Checks. To save
Claude quota: review = read the diff + run the gates on a fresh clone in bash; an Opus second reviewer only for
money, access, stock, webhooks and the chat's tools (WORKFLOW §6).

**Splitting rule.** An L4 task becomes two tickets: a **core** (Claude: the invariant, its server function and
its database test) and a **shell** (Kimi: the page, form, lexicon, e2e) that calls the core's merged interface.
The core merges first; the shell's ticket quotes the core's exact signature.

## 2. Tickets

A ticket is `.claude/specs/indies-platform/tickets/<id>.md`: the filled `DISPATCH.md` prompt **plus**, for K and
G lanes, the exact file list, exported signatures, the tests to write by name, and the Verify commands. Kimi
needed one review round on most Platform tickets when the ticket left a choice open — so a K ticket leaves
none. Report: `.claude/specs/indies-platform/reports/<id>.md`.

## 3. Launch and collect

```bash
git worktree add ../antique-map-w-<id> -b w/<id> main        # K and G lanes
bash C:/Users/Hansel/.claude/workers/run.sh <extra|glm> \
  C:/Users/Hansel/Documents/Hansel/Projects/antique-map-w-<id> \
  .claude/specs/indies-platform/tickets/<id>.md <id>-1
bash C:/Users/Hansel/.claude/workers/status.sh          # lane, messages, last line, exit
```

Project rules for workers: `.claude/worker-rules.md`. C-lane cores run as Agent-tool subagents (`model: "opus"`, worktree isolation, the `DISPATCH.md` prompt).
Merge: review → fresh clone of the branch → `pnpm install --frozen-lockfile && pnpm verify` (+ the ticket's
build/e2e) → merge to `main` → `pnpm verify` on `main` → tick the Check → **Log** line. A rejected run gets a
`-r1` ticket addendum on the same branch. Traps (from Platform): kill a stuck worker's `claude.exe` by command
line, not by TaskStop; never edit `run.sh` mid-run; a branch cut from an unmerged branch is cherry-picked.

## 4. The run, by wave

A wave starts when what it reads is merged. Sizes are wall-clock with the lanes above. **K** runs one ticket
after another (queue order is the column order); **G** and **C** run beside it.

| Wave | Opens after | Kimi queue (K) | GLM (G) | Claude (C) |
| --- | --- | --- | --- | --- |
| **0** close phase 2 | now | — | — | orchestrator: rebase + merge 2.2 (review fixes in), then 2.3; 2.2.e status e2e, 2.3.d; qa on `main` |
| **A** collections + tokens | 0 | 3.4 leads/partners/chats/events/pages/settings · 4.1.d token lint | 3.2 catalogue collections · 4.1 tokens and fonts | 3.3 products/stores/stock/orders (constraints) · 3.1 staging as one site (devops, Helios) |
| **B** schema lead + kit | A | 3.6 admin languages, sidebar, dashboard shell · 4.2.a components port · 4.2.c `/style-guide` | 4.2.b extra components · 5.2.a derivatives and tiles | **3.5** migration + roles/access (schema lead) · 6.2-core pricing, fee bands, welcome code |
| **C** catalogue pages | B (3.5 merged) | 3.7.c mock shop seed · 4.3 chrome and home pages · 6.1 shop browse/product · 6.2-shell bag page | 3.7.a/b import + gallery seed · 5.1 browse and search | 6.4 Midtrans adapter, webhook, expiry · 8.1 chat core, tools, guardrails |
| **D** item, leads, checkout | C | 5.2.b–d item page + zoom viewer · 5.3-shell Sell-to-us, wa.me builder · 5.4 makers/places/pages · 9.3 metadata, JSON-LD, sitemaps | 6.3-shell checkout form + Google Maps pin · 8.3 drafting tool | 5.3-core `/api/x/leads` (Turnstile, uploads, rate limit) · 6.3-core `pickStore` + order transaction |
| **E** pay, fulfil, AI UI | D | 6.5 pay/confirm/recovery pages + email · 8.2 chat panel · 9.4 redirects · 9.1 leads inbox, partners, partnership page | 9.2 analytics + dashboard · 9.1.d retention job | 7.1 statuses, driver image, reassign |
| **F** panels + gates | E | 7.2 store staff panel · 5.5/7.4 gate e2e specs · 8.4.a red-team cases | 7.3 tracking page + notifications | qa runs gates 5.5, 6.5.c, 7.4; 8.4 live eval run |
| **G** hardening | F | 10.1.c access-sweep tests | 10.2 perf + a11y pass | 10.1 security review + fixes · 10.3 staging rehearsal + restore drill |
| 👤 | owner | — | — | 10.4 timed tests, phase 11 — need the owner (OA3–OA11, Q12, Q13) |

**Kimi load:** about 25 tickets (~30–40 min each). At
three at once the whole run through wave G is ~10–12 h of wall clock (one at a time would be ~14 h for Kimi alone). GLM carries ~10 tickets, Claude ~12 small
cores plus reviews.

## 5. What "finished" means here

Code-complete = waves 0–G merged, every non-👤 Check ticked, gates 5.5, 6.5, 7.4, 8.4, 10.1–10.3 green on
staging. Phase 10.4 and phase 11 need the owner's people, data, keys and written go-ahead and cannot be
compressed. The UI/UX polish (backlog v2.0) follows, as token and component edits.
