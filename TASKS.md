# Indies Platform — Build Plan and Progress

**Finish line:** two new sites on one engine, live on their own domains — **Old East Indies** on `oldeastindies.com` (about week 12), then **Indies Gallery** on `antiquemapsindonesia.com` (about weeks 14–15) — each through its launch gate (13.11).

- **New builds, not changes to what exists.** The current sites stay exactly as they are: this plan never logs in to, fixes, changes, freezes or switches them off. What the new sites take from them is a copy — an export the owner hands over or, only with the owner's OK, a read-only look at their public pages.
- **One engine, two storefront apps** (`engine/apps/gallery`, `engine/apps/emporium`), one database per brand. The reasoning lives in `docs/` — start with [docs/PLAN.md](docs/PLAN.md), [docs/PARALLEL-TRACKS.md](docs/PARALLEL-TRACKS.md) and [design.md](.claude/specs/indies-platform/design.md).
- **Many agents at once.** The dispatch plan runs up to eight agents per wave, each in its own worktree, on paths nobody else in that wave owns.
- **Every task ends in a Check** — the evidence that it works — and the progress table counts ticked subtasks, so a task only moves the bar as its steps are proven.

Written 2026-09-25 from the reviewed plan (a UX review and an architecture review, both applied). Every task lists the requirements it satisfies ([requirements.md](.claude/specs/indies-platform/requirements.md), 161 criteria).

## Progress

Rebuilt from the checkboxes by `node scripts/progress.mjs` — run it after every tick; never edit the table by hand.

<!-- progress:start -->
| Phase | Waves | Status | Tasks | Subtasks | 👤 open | Progress |
| --- | --- | --- | --- | --- | --- | --- |
| **Phase 0** Foundation and frozen contracts | W1–W6 | 🔄 in progress | 1/11 | 7/67 | 1 | `█░░░░░░░░░`  10% |
| **Phase 1** Brand directions | W6–W12 | · not started | 0/11 | 0/48 | 8 | `░░░░░░░░░░`   0% |
| **Phase 2** Content model and CMS core | W6–W10 | · not started | 0/11 | 0/57 | 0 | `░░░░░░░░░░`   0% |
| **Phase 3** Design systems and app shells | W7–W14 | · not started | 0/10 | 0/50 | 1 | `░░░░░░░░░░`   0% |
| **Phase 4** Media, deep zoom and search | W8–W11 | · not started | 0/8 | 0/33 | 0 | `░░░░░░░░░░`   0% |
| **Phase 5** Commerce core | W8–W16 | · not started | 0/18 | 0/89 | 2 | `░░░░░░░░░░`   0% |
| **Phase 6** The Indies Gallery storefront | W16–W20 | · not started | 0/10 | 0/47 | 2 | `░░░░░░░░░░`   0% |
| **Phase 7** The Old East Indies storefront | W16–W21 | · not started | 0/10 | 0/46 | 2 | `░░░░░░░░░░`   0% |
| **Phase 8** Admin tooling | W10–W21 | · not started | 0/14 | 0/63 | 4 | `░░░░░░░░░░`   0% |
| **Phase 9** Integrations | W15–W20 | · not started | 0/9 | 0/37 | 5 | `░░░░░░░░░░`   0% |
| **Phase 10** Accounts, retention and consent | W15–W21 | · not started | 0/8 | 0/35 | 0 | `░░░░░░░░░░`   0% |
| **Phase 11** Migration and legacy URLs | W3–W22 | · not started | 0/11 | 0/43 | 8 | `░░░░░░░░░░`   0% |
| **Phase 12** SEO, analytics and feeds | W20–W22 | · not started | 0/8 | 0/31 | 1 | `░░░░░░░░░░`   0% |
| **Phase 13** Hardening, launch readiness and cutover | W21–W26 | · not started | 0/12 | 0/47 | 12 | `░░░░░░░░░░`   0% |
| **All** | W1–W26 | | **1/151** | **7/693** | **46** | `░░░░░░░░░░`   1% |
<!-- progress:end -->

## Running order — when each phase starts

A phase starts once everything in its "Starts when" column is ✅; its tasks then follow the dispatch plan below. Phases overlap on purpose.

| Phase | Starts when | Runs in | Size |
| --- | --- | --- | --- |
| **0** Foundation and frozen contracts | now | W1–W6 | ~5d |
| **11** Migration and legacy URLs | 0.2 ✅ — and the owner's export is requested the same day | W3–W22 | ~8d |
| **1** Brand directions | 0.8 and 0.10 ✅ | W6–W12 | ~10–12d |
| **2** Content model and CMS core | 0.7 ✅ | W6–W10 | ~8d |
| **3** Design systems and app shells | 0.5 ✅ for the primitives and tokens; 1.9 ✅ for the app shells | W7–W14 | ~8d |
| **4** Media, deep zoom and search | 2.1–2.3 and 2.7 ✅ | W8–W11 | ~7d |
| **5** Commerce core | 0.5 ✅ for the pure domain; Phase 2 ✅ for the commerce schema | W8–W16 | ~12d |
| **8** Admin tooling | 2.8 ✅ for the contextual inquiry; 1.10, 2.2 and 5.8 ✅ for the screens | W10–W21 | ~10d |
| **9** Integrations | 2.2 and 5.11 ✅ for sister sync and couriers; 5.9 ✅ for the payment adapters | W15–W20 | ~10d |
| **10** Accounts, retention and consent | 2.6 ✅ | W15–W21 | ~6d |
| **6** The Indies Gallery storefront | 3.5 and 5.12 ✅ | W16–W20 | ~12d |
| **7** The Old East Indies storefront | 3.5 and 5.12 ✅ | W16–W21 | ~12d |
| **12** SEO, analytics and feeds | 6.1 and 7.1 ✅ | W20–W22 | ~5d |
| **13** Hardening, launch readiness and cutover | Phases 5 and 9 ✅ for security; Phase 7 ✅ for the shop's halves; Phase 6 ✅ for the gallery's | W21–W26 | ~8d |

## Dispatch plan — the schedule, wave by wave

| Wave | Stage | Tasks (phase letter) | Agents |
| ---- | ----- | -------------------- | :----: |
| W1 | Foundation | 0.1 · 0.5 — two architects (0A) | 3 |
| W2 | Foundation | 0.2, 0.3, 0.6, 0.10 (0B) | 4 |
| W3 | Foundation | 0.4, 0.7 (0C) · 11.1 👤, 11.7.a (11A) — the owner is asked for the export of the old catalogue now | 4 |
| W4 | Foundation | 0.8 with the Cache Components spike (0D) · 11.2 (11B) | 2 |
| W5 | Foundation | 0.9 👤 staging on Helios (0E) — **M0** once the Phase 0 gate passes | 1 |
| W6 | Directions and CMS | gate 0.11 · 1.1, 1.2 👤, 1.3 👤 (1A) · 2.1, 2.5, 2.6, 2.7 (2A) | 7 |
| W7 | Directions and CMS | 1.4, 1.5 (1B) · 2.2, 2.3 (2B) · 3.1, 3.2 (3A) · 11.3 👤 (11C) | 7 |
| W8 | Directions and CMS | 1.6 (1C) · 2.4 (2C) · 3.6 (3A) · 4.1, 4.5, 4.6 (4A) · 5.2 (5A) | 7 |
| W9 | Directions and CMS | 1.7 👤 the owner picks the pairs (1D) · 2.8, 2.9 (2D) · 3.8 (3B) · 4.2, 4.4, 4.7 (4B) · 5.9.a, 5.13.a (5A) | 8 |
| W10 | Directions and CMS | 1.8 👤 buyers test the prototype, 1.10 (1E) · gate 2.11 · 4.3 (4C) · 5.3 (5B) · 8.0 👤 (8·0) · 11.7.b (11C) | 6 |
| W11 | Directions and CMS | 1.9 👤 — two agents (1F) · gate 4.8 · 5.1 (5A), 5.10 👤, 5.11 (5B), 5.6 (5C) · 11.5 (11D) | 7 |
| W12 | Design systems and commerce | gate 1.11 · 3.3, 3.4 (3B), 3.9 — two agents (3A) · 5.4, 5.5, 5.17 (5B) · 11.4 (11D) | 8 |
| W13 | Design systems and commerce | 3.5 — two agents, 3.7 (3C) · 5.7, 5.8 (5D) · 8.1, 8.2 (8A) · 11.6 (11E) | 8 |
| W14 | Design systems and commerce | gate 3.10 → **M1** · 5.9, 5.13, 5.15, 5.16, 5.18 (5E) · 8.3, 8.11 (8A) · 11.8 👤 (11F) | 8 |
| W15 | Design systems and commerce | 5.12 (5F) · 8.4 👤, 8.5, 8.8 (8B) · 9.4 👤, 9.7 (9A) · 10.1, 10.8 (10A) · gate 11.9 | 8 |
| W16 | Storefronts | gate 5.14 👤 → **M2** · 6.1, 6.2, 6.3, 6.5, 6.7 (6A) · 7.1, 7.2, 7.3 (7A) | 8 |
| W17 | Storefronts | 6.4, 6.6 (6B) · 7.4.a, 7.5, 7.6 (7A) · 8.6, 8.7 (8B) · 9.1 👤 (9A) | 8 |
| W18 | Storefronts | 6.8 (6C) · 7.4.b, 7.8 (7B) · 8.9, 8.13 (8B) · 9.2, 9.5 👤, 9.6 (9B) | 8 |
| W19 | Storefronts | 6.9 👤 buyers (6D) · 7.7 (7C) · 8.10 👤 timed tests (8C) · 9.3 if chosen, 9.8 👤 (9B) · 10.2 — two agents, 10.3, 10.6 (10A–B) | 8–9 |
| W20 | Storefronts | gate 6.10 · 7.9 👤 buyers (7D) · gate 9.9 · 10.4, 10.5 (10A–B) · 11.10 👤 content sprint · 12.1, 12.2, 12.3, 12.5 (12A) | 8 |
| W21 | Storefronts | gates 7.10, 8.12, 10.7 · 12.4 👤, 12.6, 12.7 (12B) · 13.3, 13.5 👤 (13A) | 5 |
| W22 | Launch | gate 12.8 · 11.11 👤 the gallery's dark production import · the shop's halves 13.1.a, 13.2.a, 13.4.a, 13.4.c 👤, 13.6.a 👤, 13.9.a 👤, 13.10.a 👤 (13A) | 8 |
| W23 | Launch | **13.7 👤 Old East Indies launches → M3** · alongside it, the gallery's halves 13.1.b, 13.2.b, 13.4.b, 13.6.b 👤, 13.9.b 👤, 13.10.b 👤 (13B) | 7 |
| W24 | Launch | **13.8 👤 Indies Gallery cuts over → M4** (13C) | team |
| W25 | Launch | gate 13.11 — the design gate on the live sites | 1 |
| W26 | After launch | 13.12 — the 30-day design iteration (T+14, T+30) → **M5** with Phase 14 | 1–2 |

**Start the owner's long-lead items on day one**, whatever the row: booking the
photographer (1.2.b), the export of the old catalogue (11.1.a), the item register (11.4.a,
D24), counsel's legal texts and breach contacts (13.4.c), the gateway and courier
merchant accounts (D1–D5), and the buyers for the tests (D21). None of them needs
engineering, and each one blocks a row above if it arrives late.

## Now

One row per agent in flight. The orchestrator adds a row when it dispatches a task and removes it when the task closes.

| Wave | Task | Agent | Worktree / branch | Since | Note |
| ---- | ---- | ----- | ----------------- | ----- | ---- |
| W1 | 0.5 Contracts — platform and UI (ARC-P) | architect | worktree-agent-a1e288423b050020e | 2026-09-28 | **reported done** (14 commits; merged-tree `pnpm verify` green with ARC-D) — [report](.claude/specs/indies-platform/reviews/0.5-arc-p-report.md); senior-fe + senior-be review running |
| W1 | 0.5 Contracts — domain (ARC-D) | architect | worktree-agent-a5abd4af956ac043a | 2026-09-28 | senior-db + senior-be: sign-off with fixes (5 blockers) — [db](.claude/specs/indies-platform/reviews/0.5-arc-d-senior-db.md), [be](.claude/specs/indies-platform/reviews/0.5-arc-d-senior-be.md); ARC-D applying the fixes + ARC-P cross-contract items |

## Decisions for the owner

**How a session asks:** with `AskUserQuestion`, 2–4 options, **the recommended one first, labelled "(Recommended)"**, and one line on what each option means. The answer is recorded under **Answered** with the date, and in the doc the decision changes. Until the owner answers, the default is used, so work never waits.

### Open

| # | Decision | Default until answered | Who answers | Needed by |
| --- | --- | --- | --- | --- |
| **D1** | Selling entities: is Indies Gallery a Singapore company, an Indonesian PT, or both? Where is its stock physically? | one Singapore seller for Singapore stock and export + one Indonesian seller for Jakarta stock sold domestically (COMPLIANCE.md §2) | legal/tax adviser | 5.3 (draft values until then); real values before 13.7 |
| **D2** | Old East Indies' entity; a Singapore seller for export later? | Indonesian PT only at launch; export charged in IDR by card, or PayPal in USD | owner + adviser | 5.10, 13.7 |
| **D3** | Gateways | IG: Stripe SG + bank transfer; OEI: Midtrans + PayPal | merchant accounts + sandbox keys | 5.10, 9.1, 9.2, 9.3 |
| **D4** | PKP / GST registration status of each seller | PPN not charged by OEI until registration is confirmed; IG GST off | accountant | 5.6, 13.4 |
| **D5** | Export clearance for items held in Jakarta | every Jakarta item `domestic-only` until a written determination exists | lawyer / customs broker | 5.3 |
| **D6** | **Hofker rights** for the Bali Hotel line | line built but **not published** until confirmed | estate / licence | 1.5 (no direction may depend on it), 13.7 (publish the line or not) |
| **D7** | Launch order | Old East Indies first | owner | 13.7 |
| **D8** | Gallery domain | keep `antiquemapsindonesia.com` canonical; `indiesgallery.com` stays a 301 alias; a brand move is a later, separate release | owner | 13.8 |
| **D9** | Direction per brand (Phase 1) | **no default** — the owner picks a pair from the direction round (1.7); the research directions ("Print Room", "Hotel Bali 1928") enter the round as one candidate each, not as the answer | owner | 1.7 |
| **D10** | Grading scale wording | VG+ · VG · G+ · G · Fair · As-is with A–D equivalents | curator | 2.2, 6.6 |
| **D11** | Returns policy text per seller | none published until drafted — the engine supports returns on every line | counsel | 5.15, 13.4 |
| **D12** | Object storage provider | Cloudflare R2 | owner (account) | 0.9 |
| **D13** | Transactional email for each brand's domain | the brand's Google Workspace SMTP with SPF/DKIM/DMARC; a transactional provider if it has none | owner (DNS) | 0.9, 5.13 |
| **D14** | WhatsApp notifications provider — **needed before Phase 9**, because viewing reminders, payment instructions and order updates are promised on WhatsApp | if unanswered by Phase 9: click-to-chat only, every notification goes by email, and no copy promises a WhatsApp message | owner | 9.8 — before W15 |
| **D15** | Legacy passwords | no import; "claim your account" email (bcrypt rehash-on-login is a one-day option) | owner | 10.1, 11.4 |
| **D16** | AI cataloguing model provider | a production model behind the `ai.cataloguing` flag, human-verified; Ollama Cloud for development only (not a production dependency) | owner | 8.4 |
| **D17** | Staging tier after launch | staging stays on Helios `.gaiada.com`; Delphi `staging` branch only if wanted | owner | 13.12 |
| **D18** | Default locale per brand (served unprefixed) | English for both; Indonesian at `/id/…` | owner | 0.6 |
| **D19** | Photographer and the pilot shoot (Phase 1) | **no default** — Phase 1 cannot finish its comps on today's single web JPEGs | owner (booking, budget) | 1.2 |
| **D20** | Native Indonesian copywriter | **no default** — the lexicon and the launch copy review need one | owner | 1.3 |
| **D21** | Buyers for the prototype test and usability runs (≈ 10 + 10 people) | collectors from the gallery's client list; shoppers recruited through the shop's Instagram | owner (introductions) | 1.8, 6.9, 7.9 |
| **D22** | Offers at launch | **non-binding offers** in v1: accept / counter / decline in the admin; an accepted offer becomes a hold and a private pay link. Binding offers (a contract on acceptance) are v2 | owner | 5.8 |
| **D23** | Print-on-demand abroad at launch | **not at launch** — export orders ship from Bali stock or local production, DAP; Prodigi / Gelato switch on in v2 behind the existing router | owner | 9.6 |
| **D24** | The item register — who compiles location and export status for every original, and by when | the gallery's staff, by the Phase 11 rehearsal; an original without a row publishes **enquiry-only** and sells nowhere online | owner (staff time) | 11.4 |
| **D25** | Dark production import of the gallery before the shop launches | yes, whenever the shop launches first — its sister links and original prices come from the gallery's archive API | owner (Helios go-ahead) | 11.11 |
| **D26** | Minimum print resolution for reproductions | **240 ppi** (≈ 37 cm long edge from today's 3543 px images); a product type may demand more | owner + print partner | 2.4, 4.4 |
| **D27** | FX source for derived prices | ECB reference rates, refreshed daily, plus the per-market buffer; each order stores the rate it used | accountant | 5.2 |
| **D28** | Newsletter sender | a bulk-sending provider for the newsletter and alerts (Workspace SMTP caps daily sends and would put transactional mail at risk); transactional mail stays per D13 | owner (account) | 10.4 |
| **D29** | The Singapore seller selling Singapore-held stock to an Indonesian address | priced and charged in **IDR** (the rupiah rule governs what the buyer sees), card or bank transfer, import duties the buyer's (DAP) | tax adviser | 5.3, 9.1 |

### Owner actions (not questions)

| # | Action | Needed by |
| --- | --- | --- |
| **OA1** | ✅ 2026-09-28 — `gaiadabali/antique-map` (private, internal), deploy account `web-gaiada` (admin); `main` pushed | 0.1.f |
| **OA2** | The owner interview — at most 15 questions per brand | 1.1.b |
| **OA3** | Book a photographer and the pilot shoot (D19) | 1.2.b |
| **OA4** | A native Indonesian copywriter for the lexicon and the launch copy (D20) | 1.3.c, 13.10 |
| **OA5** | Two or three Indonesian designers or buyers for the shop's cultural review | 1.5.a |
| **OA6** | Buyers for the prototype test and the usability runs — about 10 + 10 people (D21) | 1.8, 6.9, 7.9 |
| **OA7** | A commercial font licence, if a commercial face is chosen | 1.9.f |
| **OA8** | Go-ahead to provision staging on Helios; DNS for `ig.gaiada.com` and `oei.gaiada.com`; the object-storage account; Infisical entries | 0.9.b |
| **OA9** | **The export of the old catalogue** — a MySQL dump and the product-images folder, from whoever hosts the old site. We never log in to it. | 11.1.a |
| **OA10** | **The item register** — stock location and export status for every original (D24) | 11.4 |
| **OA11** | A Search Console export for `oldeastindies.com` | 11.7.a |
| **OA12** | The curator's review of the maker clusters and the category → facet mapping (about an hour) | 11.3 |
| **OA13** | Two observation sessions (a cataloguer, the shop manager), and the same people for the timed tests | 8.0.a, 8.10 |
| **OA14** | Sandbox accounts: Midtrans, Stripe Singapore, PayPal, Biteship, DHL Express (D3) | 5.10, 9.1, 9.2, 9.4, 9.5 |
| **OA15** | A WhatsApp Business account and provider (D14) | 9.8 |
| **OA16** | Merchant Center and Meta Commerce Manager access for each brand | 12.4 |
| **OA17** | Counsel's bilingual legal pages per seller; breach-response contacts; the data-protection-officer decision | 13.4.c |
| **OA18** | Go-aheads on Helios for the staging import, the gallery's dark production import and production provisioning | 11.8, 11.11, 13.5 |
| **OA19** | At launch: live payment and courier credentials; pointing `oldeastindies.com`, then `antiquemapsindonesia.com` and `indiesgallery.com`, at the new sites | 13.7, 13.8 |

### Answered

| # | Answer | Date |
| --- | --- | --- |
| — | none yet | — |

## How to update this file — the rule

This file is how the owner sees progress without asking. **It is updated as work happens, not afterwards.**

1. **Dispatching a task:** append `— 🔄 W7` (its wave) to the task line and add its row to **Now**.
2. **Finishing a subtask:** when an agent's report evidences it, tick it `[x]` **in this file in the main checkout** — never in a worktree's copy — and run `node scripts/progress.mjs`. Re-read the file just before each edit.
3. **Finishing a task:** only when every subtask is ticked, its **Check** passed on merged `main` and `qa` has driven it. Tick the task line, replace `🔄 …` with `✅ YYYY-MM-DD <short sha>`, add one line to the top of **Log**, update **Now**.
4. **Blocked:** append `— ⛔ <reason>` (an owner item: `— ⛔ 👤 D14`), note it in **Now**, and move on to the next unblocked task.
5. **New work:** add it as a subtask, or as a new task at the end of its phase, with the next free id. **Never delete a task** — a dropped one gets `— ✂️ cut: <reason>` and stops counting.
6. **Agents never edit this file.** They report (PARALLEL-TRACKS.md §5); the orchestrator ticks. A solo session outside a wave may tick its own task.
7. **Keep the order.** A task starts only when its `needs:` are ✅ (a need like `5.9.a` means that one subtask); inside a wave, disjoint **Owns** keep agents apart.

**What "done" means here:** the **Check** is evidenced — a test name, a command output, or a screenshot of the opened screen on a production build (CONVENTIONS.md §11). A UI is shown at 390 px and 1280 px with axe clean (360/390/768/1440 in a design gate). A library passing its own tests is not done.

## Session protocol — the orchestrator

Paste this into a Claude Code session opened at the repo root:

> You are the orchestrator for the Indies Platform. Read `AGENTS.md`, then `TASKS.md` and `.claude/specs/indies-platform/DISPATCH.md`.
>
> 1. Find the first row of the dispatch plan whose tasks are not all ✅. Check that its 👤 items are in hand; drop a task that would stall rather than let an agent wait.
> 2. From W3 on, run `pnpm tasks:lint --wave W<n>` and fix the plan if it is red.
> 3. Dispatch one agent per task with the DISPATCH.md prompt — `model: "opus"`, `isolation: "worktree"` — and mark each task 🔄 here, with a row in **Now**.
> 4. As reports arrive, tick the evidenced subtasks here and run `node scripts/progress.mjs`.
> 5. Merge each branch in a clean worktree, run the full gate, have `qa` drive the user-visible criteria, then close the tasks (✅ date sha), update **Now** and add to **Log**.
> 6. Ask the owner for 👤 items with options and a recommendation; record the answers under **Decisions**.
> 7. Never touch the current live sites, and never write to Helios, DNS or production credentials without the owner's go-ahead.

Each agent's prompt, and the before- and after-wave checklists, are in [DISPATCH.md](.claude/specs/indies-platform/DISPATCH.md).

## Legend

👤 needs the owner (an agent cannot finish it — PARALLEL-TRACKS.md §7) · 🔄 in flight · ✅ done · ⛔ blocked · ✂️ cut · **Lane** codes and file ownership are [PARALLEL-TRACKS.md §1](docs/PARALLEL-TRACKS.md) · agent types are the project's subagents (`architect`, `devops`, `senior-be`, `senior-db`, `senior-fe`, `senior-uiux`, `senior-integrator`, `medior`, `junior`, `qa`).

**Ids and waves.** A task is `N.M`; its subtasks are `N.M.a`, `N.M.b`… and the last one is always the **Check**. **W1–W26** are the dispatch plan's rows — the real schedule. Inside a phase, **phase letters** (`5A`, `5B`…) order its tasks by dependency: a task never shares a letter, or a W-row, with a task it depends on. A `needs:` or wave entry followed by a subtask id in parentheses — `Phase 7 (13.1.a)` — applies to that subtask only, and `E needs 5.8` applies to the part of the task in letter E. "Phase N" as a need means all of it, gate included. Contract files (`@contract`, C1–C13) stay ARC's even inside a folder a task owns.

---

## Phase 0 — Foundation and frozen contracts · W1–W6 · ~5d

**Goal:** the monorepo, its gates, the config spine, contracts C1–C13, both apps
booting against two databases, the `test` brand, and staging.
**Done when:** `pnpm dev --brand indies-gallery` and `--brand old-east-indies`
serve two differently themed shells in EN and ID from two databases; `/admin`
logs in on both; `test` runs on both apps; the Cache Components spike's verdict
is recorded; every gate fails on a planted violation; both staging hostnames serve a CI-built release.
**Phase letters:** A 0.1, 0.5 (two architects) · B 0.2, 0.3, 0.6, 0.10 · C 0.4, 0.7 · D 0.8 · E 0.9 👤 · gate 0.11

- [x] **0.1 Initialise the repository and pnpm workspace** · needs: — — ✅ 2026-09-28 f7e32c1
  - **Lane** HAR · **Agent** devops · **Wave** W1 · 0A
  - **Owns** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.gitattributes`, `.editorconfig`
  - **Read** ARCHITECTURE.md §3–4, CONVENTIONS.md §9
  - _Requirements: 1.2, 19.3_
  - [x] 0.1.a `git init`; `.gitignore` (node_modules, `.next`, `.env*` except `.env.example`, `*/db/`, `*/content/legacy/raw/**` — the old site's raw extracts live in `LEGACY_DATA_DIR`, never in git, while mapping files and URL inventories under `content/legacy/` **are** committed — `test-results/`, `TASKS.md.lock`); `.gitattributes` forcing LF (CRLF breaks deploy scripts — GDA memory); the first commit holds the planning docs, `TASKS.md` and `scripts/progress.mjs` as they stand
  - [x] 0.1.b `pnpm-workspace.yaml` listing `engine/apps/*`, `engine/packages/*`, `engine/tooling`; `allowBuilds` for sharp, esbuild, @tailwindcss/oxide, unrs-resolver
  - [x] 0.1.c root `package.json`: `packageManager` pnpm 11 pinned, `engines.node >=22`, scripts `verify`, `dev`, `build`, `test`, `test:e2e`, `lhci`, `db:*`, `brand:create` (delegating to tooling)
  - [x] 0.1.d `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `@engine/*` paths) and a per-package tsconfig template
  - [x] 0.1.e ESLint 9 flat config + typescript-eslint + Prettier; import-boundary rules: apps may not import `payload` outside `(payload)`, packages may not import apps, `view-models` has no runtime dependencies
  - [x] 0.1.f 👤 owner creates the GitHub repository under the organisation and grants the deploy account write access; first push
  - [x] 0.1.g **Check:** a fresh clone on Windows and Linux runs `pnpm install && pnpm verify` green with the empty workspace.

- [ ] **0.2 Local infrastructure and database scripts** · needs: 0.1
  - **Lane** HAR · **Agent** devops · **Wave** W2 · 0B
  - **Owns** `docker-compose.dev.yml`, `.env.example`, `engine/tooling/db/**`
  - **Read** DEPLOYMENT.md §1, §8
  - _Requirements: 1.1, 19.7_
  - [ ] 0.2.a compose: `postgres:18` with an init script enabling `unaccent`, `pg_trgm`; Mailpit; MinIO with bootstrap buckets `ig-media`, `oei-media`, `test-media`, `archive-masters`
  - [ ] 0.2.b `db:fresh --brand <slug> [--suffix <lane>]`, `db:drop`, `db:list` (create, migrate, seed — seed hook no-op until 2.9)
  - [ ] 0.2.c `.env.example` documenting every variable in DEPLOYMENT.md §8, grouped, with safe local defaults
  - [ ] 0.2.d **Check:** `docker compose -f docker-compose.dev.yml up -d` then `pnpm db:fresh --brand test --suffix smoke` creates a database with `unaccent` and `pg_trgm` on Windows (Docker Desktop) and in CI.

- [ ] **0.3 Quality-gate tooling** · needs: 0.1
  - **Lane** HAR · **Agent** devops · **Wave** W2 · 0B
  - **Owns** `engine/tooling/{check-file-size,lint-brand-literals,schema-hash,route-parity,tasks-lint,config-drift,brand-create}/**`, `vitest.config.ts` (Vitest 5 has no workspace file — `test.projects`; found in 0.1), `playwright.config.ts`, `lighthouserc*.json`, root `package.json` (scripts and devDependencies for its gates only; the only W2 task touching it)
  - **Read** CONVENTIONS.md §1–2, BRANDS.md §6–7, ARCHITECTURE.md §2, §11, DESIGN-SYSTEM.md §7, PARALLEL-TRACKS.md §2, §5
  - _Requirements: 1.3, 1.5, 1.6, 1.7, 1.8, 19.1, 19.3_
  - [ ] 0.3.a `check-file-size` (port KOI's `scripts/check-file-size.mjs`; 300 lines over `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.css` in `engine/` and `scripts/`; generated files, migrations and fixtures excluded — CONVENTIONS.md §2)
  - [ ] 0.3.b `lint-brand-literals`: banned terms read from each brand folder's config (slug, names, domains); scans `engine/**`; excludes generated migrations, fixtures with catalogue text, `.env*`
  - [ ] 0.3.c `schema-hash`: normalised `pg_dump --schema-only` → sha256 per database; `--all` compares every brand database
  - [ ] 0.3.d `route-parity`: reads the `@engine/http` manifest (C13) and fails if an app lacks a mounted `/api/x/*` route, if an engine route's first segment equals a collection slug, `payload-jobs` or `graphql`, or if an app's `proxy.ts` matcher differs from the manifest's literal
  - [ ] 0.3.e Vitest workspace; Playwright projects `{ig, oei, test-gallery, test-emporium} × {desktop, mobile}` with axe; LHCI configs per app with the DESIGN-SYSTEM.md §7 budgets
  - [ ] 0.3.f `tasks-lint`: parses the root `TASKS.md` — unique ids, every `needs:` resolvable (a task, a subtask, a range or "Phase N"), no task sharing a wave with its own dependency, no two tasks in one dispatch row with overlapping **Owns**, every task ending in a **Check** subtask, every requirement covered; `--wave W<n>` checks one dispatch row against the ticked boxes
  - [ ] 0.3.g `config-drift` (`pnpm check:generated`): regenerates the migration snapshot, `payload-types.ts` and both apps' `importMap.js` **with `BRAND` unset** and once per brand, and fails on any diff (ARCHITECTURE.md §2)
  - [ ] 0.3.h `brand:create <slug> --storefront gallery|emporium`: scaffolds `<slug>/site/` from the matching `test` config with `"draft": true`, database and bucket names, and a copy folder; the result passes `validateBrandConfigs()` (Req 1.7)
  - [ ] 0.3.i **Check:** each gate fails on a planted violation in a CI test (a 301-line file, a brand literal in `engine/`, a drifted schema, a missing route, an engine route shadowing a collection slug, a proxy without a literal matcher, a config that differs with `BRAND` unset, a stale import map, a wave with overlapping **Owns**) and passes once it is removed; `pnpm brand:create` scaffolds a brand that validates.

- [ ] **0.4 CI pipeline, artifact and deploy manifest** · needs: 0.2, 0.3
  - **Lane** HAR · **Agent** devops · **Wave** W3 · 0C
  - **Owns** `.github/**`, `.gaiadeploy.yml`
  - **Read** DEPLOYMENT.md §3–4
  - _Requirements: 1.4, 1.5, 19.4, 19.7_
  - [ ] 0.4.a `ci.yml`: change detection; static job (file size, brand literals, `check:generated`, `validateBrandConfigs()`, `tasks:lint`, format, lint, types, unit); e2e job (Postgres service, migrate the four databases — ig, oei and the two `test` configs — seed, build both apps **with no database env**, Playwright for ig/oei/test-gallery/test-emporium); Lighthouse job
  - [ ] 0.4.b `artifact` job: build `engine/apps/gallery` and `engine/apps/emporium` standalone, assemble subdirs with `sharp`/`@img` copied beside the server, tar + sha256; `publish` job creating the release (use the GDA deploy-workflows stub pinned by tag, if it fits)
  - [ ] 0.4.c `.gaiadeploy.yml` with the two Helios targets and `subdir` (DEPLOYMENT.md §3); a CI check that fails on the string `TBD`
  - [ ] 0.4.d **Check:** a push to `main` runs static checks, unit and e2e jobs green; a push to `production` publishes a `deploy/production-*` release whose tarball holds `indies-gallery/` and `old-east-indies/` standalone builds with their brand `site/` folders and a `.sha256`.

- [ ] **0.5 Freeze the contracts C1–C13** · needs: — — 🔄 W1
  - **Lane** ARC · **Agent** architect ×2, types and docs only — **ARC-P** (platform and UI: 0.5.a–0.5.d, 0.5.h, 0.5.i) and **ARC-D** (domain: 0.5.e–0.5.g, 0.5.j); ARC-P writes 0.5.k · **Wave** W1 · 0A
  - **Owns** ARC-P: `engine/packages/config/src/{schema,routes}.ts`, `engine/packages/view-models/**`, `engine/packages/ui/src/tokens/contract.ts`, `engine/packages/media/src/contract.ts`, `engine/packages/http/src/manifest.ts`, `engine/packages/CONTRACTS.md` · ARC-D: `engine/packages/domain/src/{money/contract.ts,contracts/**,*/machine.ts,reservations/contract.ts}`, `engine/packages/{payments,shipping,fulfilment,analytics,sister}/src/contract.ts` · each: the `package.json` skeletons and `tsconfig.json` (extending the 0.1 template) of the packages it touches
  - **Read** PARALLEL-TRACKS.md §4, BRANDS.md, CONTENT-MODEL.md, COMMERCE.md, PAYMENTS.md §2–4, ARCHITECTURE.md §6, §9, §11, DESIGN-SYSTEM.md §2–5
  - _Requirements: 1.2, 2.7, 3.1, 8.4, 9.1, 10.4, 11.1_
  - [ ] 0.5.a C1 `BrandConfig` zod schema: identity, domains, storefront, tokens, locales, routes, ids, money/markets and rounding, sellers (serves, tax, charge currencies, payments, method order, card ceiling, insured threshold, document prefix), commerce (inventory models, named TTLs, purchase tiers), shipping, fulfilment, analytics ids (runtime), modules (a typed registry with descriptions — `hasModule()` keys), sisters
  - [ ] 0.5.b C2 view models for every surface in DESIGN-SYSTEM.md §2 + `ShellVM` (with the runtime analytics ids and brand assets); typed fixtures (`item-unique`, `item-sold-with-alternative`, `item-on-hold`, `item-price-on-request`, `item-enquiry-only`, `item-variants`, `listing`, `design`, `cart`, `checkout-id`, `checkout-export`, …); `loadItem` returns `{ vm } | { redirectTo } | null`
  - [ ] 0.5.c C3 token contract (DESIGN-SYSTEM.md §4) + the overridable subset
  - [ ] 0.5.d C4 block union (15 blocks, DESIGN-SYSTEM.md §5 — incl. `zoomFigure`, `compare`, `shoppableImage`, and note marks in `prose`) with prop shapes; C2 also carries the viewer-relative `ItemVM.purchase` states, the `book` part, and the `Pay`, `Quote`, `OrderLookup`, `Source`, `Exhibition`, `Location`, `Ig`, `GiftCard` and `NewsletterArchive` view models
  - [ ] 0.5.e C5 `Money` (safe-integer minor units), `PriceSet`, the pricing-pipeline step signature and the named rounding points; C6 commerce API request/response shapes (cart, ship-to, checkout, offer, hold, enquiry, price request, consignment, appointment, return request, order lookup, quote)
  - [ ] 0.5.f C7 `PaymentGateway` (incl. `sessionTtl`, `capture?`, `cancel?`, `retrieve()` and the `providerEventId` rule per adapter), `ShippingProvider`, `FulfilmentProvider`, normalised events (PAYMENTS.md §2–4)
  - [ ] 0.5.g C8 state-machine tables as types — order, payment, reservation, availability (derived), offer — the domain-event names they emit, and the service signatures `reserve()` (`reserve` · `extend` · `release` · `convert` · `reverse`) and `applyPaymentEvent()`
  - [ ] 0.5.h C9 media artefacts (derivative names and sizes, public 512 px tile cap, private full-resolution prefix, `print-files/` prefix, master access)
  - [ ] 0.5.i C10 route map — per-locale segments, facet vocabularies, legacy prefixes, `href(surface, params, locale)`; C13 HTTP handler manifest — every `/api/x/*` route and the literal proxy `matcher`
  - [ ] 0.5.j C11 analytics event names (ANALYTICS.md §2); C12 sister work snapshot (published fields only) + webhook events
  - [ ] 0.5.k `engine/packages/CONTRACTS.md`: how a contract changes (versioned, announced to consuming lanes, ARC approval)
  - [ ] 0.5.l **Check:** every contract compiles, is marked `@contract` with an owner, every fixture type-checks against its view model, and a senior-be and a senior-fe reviewer have signed off in the report.

- [ ] **0.6 Platform spine: config loader, i18n, proxy helpers, brand folders** · needs: 0.5.a, 0.5.i
  - **Lane** PLT (+ BRD for brand folders) · **Agent** senior-be · **Wave** W2 · 0B
  - **Owns** `engine/packages/config/src/{loader,validate,boot-check}/**`, `engine/packages/i18n/**`, `engine/packages/http/src/proxy/**`, `indies-gallery/site/**`, `old-east-indies/site/**`, `test/site/**`
  - **Read** BRANDS.md §3–4, ARCHITECTURE.md §2, §11, COMPLIANCE.md §1
  - _Requirements: 2.1, 2.2, 2.4, 18.1, 18.2_
  - [ ] 0.6.a `loadBrandConfig()` from `BRAND_ROOT` / `BRAND` → `<brand>/site/brand.config.json` (for `test`, the file `TEST_STOREFRONT` names); **`validateBrandConfigs()`** for CI — every committed config: schema, modules ⊆ the app's `supports`, a rounding rule per currency, sellers covering every market — and **`bootCheck()`** at process start — environment, per-seller provider secrets present, sandbox vs live, loader source; the CMS-global merge seam with file fallback and a logged reason
  - [ ] 0.6.b `@engine/i18n`: locales, the message-key loader (keys from the app, **values from `<brand>/site/copy/{en,id}.json`**), `formatMoney`, `formatDate` with precision, `formatDimensions` (mm + inches)
  - [ ] 0.6.c proxy helpers — **rewrites only**: locale resolution (default unprefixed), route-map rewrites for localised segments and facet vocabularies (C10), 404 for internal paths, legacy-prefix rewrite to `/api/x/legacy/…` (the handler answers 404 until 11.5), admin-in-English default (KOI)
  - [ ] 0.6.d draft brand configs for `indies-gallery`, `old-east-indies` and `test` (two configs, `brand.gallery.json` and `brand.emporium.json`) with staging domains, sellers with clearly fictional placeholder legal entities flagged `"draft": true` (owner fills real values later — D1–D3), and empty `copy/` folders
  - [ ] 0.6.e **Check:** `BRAND=test TEST_STOREFRONT=gallery` loads and validates; `validateBrandConfigs()` rejects a broken committed config with a readable message naming the field; `bootCheck()` refuses to start on a missing secret, a sandbox key in production or `LOADERS_SOURCE=fixtures` in production; formatter tests pass (IDR has no decimals, `c. 1750`, 450 mm → 17¾ in); the proxy serves the default locale unprefixed and `/id/…` prefixed, answers 404 for internal paths, rewrites legacy prefixes to `/api/x/legacy/…`, never touches the database, and redirects nothing at the root by `Accept-Language`.

- [ ] **0.7 Payload bootstrap: one brand-independent config, staff users, migrations in the web process** · needs: 0.2, 0.6.a
  - **Lane** SCH · **Agent** senior-be · **Wave** W3 · 0C
  - **Owns** `engine/packages/cms/src/{payload.config.ts,collections/users,access,migrations,db,registries}/**`, `engine/packages/cms/package.json`
  - **Read** ARCHITECTURE.md §2, §6, §10, §12, DEPLOYMENT.md §3–4, PARALLEL-TRACKS.md §1 (registries), KOI `src/lib/cms/db-adapter.ts`
  - _Requirements: 1.1, 1.5, 1.8, 3.6, 19.7_
  - [ ] 0.7.a `buildConfig()` — **brand-independent** (ARCHITECTURE.md §2): Postgres adapter from `DATABASE_URL`, `push: false`, the superset locales `en`/`id`/`nl`, every collection registered whatever the modules (flags only set `admin.hidden` and access), the S3 storage adapter with `alwaysInsertFields: true` (MinIO locally), nodemailer (Mailpit locally); `BRAND` may set only the server URL, CSRF/CORS, email sender and admin branding (through runtime-reading admin components, not config values)
  - [ ] 0.7.b `users` collection with the seven roles (default `contributor`), access helpers — including **`publishedOrStaff`** (the public sees `_status: 'published'` only) and field-level `staffOnly` — first-user flow, lockout
  - [ ] 0.7.c initial migration (creating `unaccent` and `pg_trgm`) + `prodMigrations` wiring gated by `RUN_MIGRATIONS=1` and `pg_advisory_lock`; the "No schema changes detected" check script
  - [ ] 0.7.d `generate:types` and `generate:importmap` per app (checked by 0.3.g)
  - [ ] 0.7.e the `db/` DDL seam — engine tables and indexes Payload cannot express, declared through the adapter's `afterSchemaInit` / `extendTable` so migrations carry them — proven with one engine table; the `registries/{jobs,views,plugins}.ts` that import each package's barrel (PARALLEL-TRACKS.md §1)
  - [ ] 0.7.f **Check:** both apps' `/admin` log in against two different databases; `push: false` is set; migrations apply only in a process with `RUN_MIGRATIONS=1`, under an advisory lock, when `/api/health` first calls `getPayload()`; the config generated with `BRAND` unset equals every brand's (0.3.g); and `schema-hash --all` is equal for the ig, oei and test databases.

- [ ] **0.8 Storefront app shells, the health route and the Cache Components spike** · needs: 0.5, 0.6, 0.7
  - **Lane** WEB (mount files, `@engine/http`) + UXG + UXE (app scaffolds) · **Agent** senior-fe · **Wave** W4 · 0D
  - **Owns** `engine/apps/gallery/**`, `engine/apps/emporium/**`, `engine/packages/http/src/{index.ts,health,brand-assets,legacy,cron}/**`, `docs/spikes/cache-components.md`
  - **Read** ARCHITECTURE.md §9–11, DESIGN-SYSTEM.md §2, BRANDS.md §2, KOI AGENTS.md (Next 16 differs from training data — read `node_modules/next/dist/docs/`)
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 19.4, 19.9, 19.12_
  - [ ] 0.8.a scaffold both Next 16 apps: `next.config.ts` with `withPayload`, `output: 'standalone'`, `cacheComponents: true`, **no route segment config anywhere**; `src/proxy.ts` re-exporting the engine proxy with a **literal** `matcher`; the `(payload)` admin mount; the `(site)` root layout awaiting `connection()` and reading `ShellVM` from the fixture; `src/app/api/x/**` one-line re-exports
  - [ ] 0.8.b `/api/health` in `@engine/http` (calls `getPayload()`) + mounted in both apps; the `/api/x/cron/jobs` route (runs the queue with a per-run limit, `CRON_SECRET`, 503 when unset); manifest entries
  - [ ] 0.8.c an app `supports` declaration file per app (modules it can render)
  - [ ] 0.8.d placeholder `PRODUCT.md` stays as drafted in planning (do not overwrite); `DESIGN.md` absent until 1.9
  - [ ] 0.8.e **the Cache Components spike** (ARCHITECTURE.md §9): a fixture item route resolved by public id with `permanentRedirect()` on a slug mismatch; a `'use cache'` + `cacheTag` record; a `<Suspense>` purchase panel reading the `shipTo` cookie and a fake availability source; `revalidateTag(tag, 'max')` for the record and `{ expire: 0 }` for availability, proven by a test that flips availability and never sees it stale; `next build` with the admin mounted and **no database, brand or secrets**; one gallery build serving `test` and Indies Gallery with different mastheads. Written up in `docs/spikes/cache-components.md`
  - [ ] 0.8.f `/brand-assets/[...path]` in `@engine/http`: serves logo, favicon, OG fallback and fonts from `BRAND_ROOT` with immutable caching; the legacy handler stub at `/api/x/legacy/[...path]` (404 until 11.5)
  - [ ] 0.8.g **Check:** both apps run for their brand and for `test`, render the brand name and logo from config with placeholder tokens in EN and ID, mount Payload at `/admin`, serve `/api/health` (app, DB, storage — and it initialises Payload), serve brand files at `/brand-assets/…`, and route parity passes; **the spike's verdict is recorded** in ARCHITECTURE.md §9 — Cache Components confirmed, or the fallback adopted whole.

- [ ] **0.9 Staging on Helios 👤** · needs: 0.4, 0.8
  - **Lane** HAR · **Agent** devops · **Wave** W5 · 0E
  - **Owns** `scripts/ops/**`
  - **Read** DEPLOYMENT.md §2, §9; KOI docs/ops/helios-koi-setup.sh; memory: Helios writes need the owner's go-ahead each time
  - _Requirements: 19.7, 19.8, 19.9_
  - [ ] 0.9.a `scripts/ops/helios-provision.sh` (idempotent, shellchecked): site users `uig`/`uoei`, ports (verify free), databases and roles, `shared/.env` skeletons (with `BRAND_ROOT` and `RUN_MIGRATIONS=1`), pm2 ecosystem, crontab for the jobs-queue route and the sweepers (DEPLOYMENT.md §5), backup timers
  - [ ] 0.9.b 👤 owner approves and runs it; DNS for both staging hostnames; object-storage buckets and keys; Infisical entries
  - [ ] 0.9.c first release deployed; rollback rehearsed; results recorded in `docs/DEPLOYMENT.md`
  - [ ] 0.9.d **Check:** `ig.gaiada.com` and `oei.gaiada.com` serve the shells from a CI-built release, health checks are green, and one rollback has been rehearsed.

- [ ] **0.10 Agent workspace** · needs: 0.1
  - **Lane** HAR · **Agent** junior · **Wave** W2 · 0B
  - **Owns** `engine/tooling/worktree/**`, `.claude/skills/**`, `.claude/agents/impeccable-*`
  - **Read** PARALLEL-TRACKS.md §3
  - _Requirements: 19.7_
  - [ ] 0.10.a worktree helper script (`worktree` and `worktree:env`)
  - [ ] 0.10.b copy the impeccable skill and its agents from Kingdom of Indonesia into `.claude/` (the design workflow Phase 1 uses)
  - [ ] 0.10.c **Check:** `pnpm worktree <phase> <lane>` creates a worktree + branch + `.env.local` with a unique `PORT` and database suffix, `pnpm worktree:env <phase> <lane>` does the `.env.local` part inside a worktree that already exists (agents dispatched with `isolation: "worktree"`), and an agent in either can `db:fresh` and `dev` without touching another worktree.

- [ ] **0.11 Phase 0 gate** · needs: 0.1–0.10
  - **Lane** QA · **Agent** qa · **Wave** W6
  - **Owns** `docs/gates/phase-0.md`
  - **Read** the phase's **Done when**
  - _Requirements: 1.1–1.8_
  - [ ] 0.11.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 0.11.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-0.md`
  - [ ] 0.11.c A planted violation for every gate (a 301-line file, a brand literal, a drifted schema, a missing route, a shadowing route, a non-literal matcher, config drift, a stale import map, an overlapping wave) — each fails, then passes once removed
  - [ ] 0.11.d Screenshots of both shells in English and Indonesian and both admins, on staging; the Cache Components spike write-up reviewed
  - [ ] 0.11.e File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 0.11.f **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-0.md`, with no failure left open.

---

## Phase 1 — Brand directions · W6–W12 · ~10–12d

**Goal:** one visual direction per brand — **derived, not assumed** — on real
photography, tested with real buyers, recorded as `DESIGN.md` and tokens, with a
voice and lexicon in both languages and the sister system drawn in both worlds.
**Done when:** the owner has approved a direction per brand — judged **as a pair**,
on their own phone and on a desktop — after a prototype test with real buyers;
both `DESIGN.md` files (with motion, iconography, image treatment, font budget and
the dark-mode decision) and token files are committed; each brand has a
native-reviewed EN/ID voice and lexicon; the sister system exists in both worlds.
**Duration:** ≈10–12 days including owner reviews, a pilot shoot and a prototype test.
**Phase letters:** A 1.1, 1.2 👤, 1.3 👤 · B 1.4, 1.5 · C 1.6 · D 1.7 👤 · E 1.8 👤, 1.10 · F 1.9 👤 · gate 1.11 — runs in parallel with Phase 2.

**Why this phase is long.** A research recommendation is the category default —
"Print Room" is what a premium dealer site already looks like; a Deco travel
poster is the stock look of vintage-poster print shops. The direction round
exists to beat the default, photography decides perceived quality more than any
component, and the only honest test of a direction is a real buyer on a real
phone (DESIGN-SYSTEM.md §11, §13).

- [ ] **1.1 Product briefs and journeys** · needs: 0.10.b
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W6 · 1A
  - **Owns** `engine/apps/gallery/PRODUCT.md`, `engine/apps/emporium/PRODUCT.md`, `PRODUCT.md`, `docs/design/journeys/**`
  - **Read** the drafted PRODUCT.md files, EXPERIENCE-GALLERY.md, EXPERIENCE-SHOP.md, RESEARCH.md §1, §3
  - _Requirements: 6.1, 7.1_
  - [ ] 1.1.a impeccable `init` against the drafts; list the questions only the owner can answer
  - [ ] 1.1.b 👤 owner interview (≤ 15 questions per brand); fold answers in
  - [ ] 1.1.c journeys and scenarios — gallery: a collector from Google on a phone → item → verso zoom → request price → WhatsApp → payment link; an institution → proforma → bank transfer; a designer → factsheet → client; a diaspora buyer → town search. Shop: the Instagram in-app browser → configurator → QRIS; a tourist buying in Bali, shipped home to the Netherlands; a hotel → quote → payment link; a showroom QR walk-in; a gift to a recipient abroad. These become Phase 6/7's done-criteria and the usability scripts for 1.8, 6.9 and 7.9.
  - [ ] 1.1.d **Check:** each PRODUCT.md follows the impeccable product schema with no invented facts and the owner's answers folded in, and 6–8 journeys per brand exist, each naming its surfaces, states, channel handoffs and the moment that decides trust.

- [ ] **1.2 👤 Image direction, capture standards and the pilot shoot** · needs: 0.10.b
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W6 · 1A
  - **Owns** `docs/design/imagery/**`
  - **Read** DESIGN-SYSTEM.md §11, CONTENT-MODEL.md (image roles), MIGRATION.md §9, the drafted PRODUCT.md files
  - _Requirements: 4.5, 6.12, 7.12_
  - [ ] 1.2.a capture standards per brand: lighting and colour temperature, a colour target in every frame, the raking-light angle, minimum ppi, backgrounds, mat and shadow, **retouching limits (never restore a defect on an original)**, the studio/lifestyle split (gallery: studio, object, raking light, no people; shop: sun, hands, rooms, packaging, the showroom), and how synthetic mockups are labelled
  - [ ] 1.2.b 👤 book a photographer; pilot shoot of six gallery items — including one **typical migrated item** at real data quality — and one day in the Denpasar showroom
  - [ ] 1.2.c the configurator's room scenes: wall colours, scale props, perspective, pre-composited plates
  - [ ] 1.2.d **Check:** each brand has capture standards, a photographer has shot the pilot set, and the pilot images are in the private masters bucket ready for the comps; any owner answer from 1.1.b that changes the standards is folded in before closing.

- [ ] **1.3 👤 Voice and lexicon** · needs: 0.8, 0.6.b
  - **Lane** UXG + UXE + BRD · **Agent** senior-uiux · **Wave** W6 · 1A
  - **Owns** `docs/design/{gallery,emporium}/voice.md`, `engine/apps/*/src/messages/keys.ts` (the keys), `indies-gallery/site/copy/**`, `old-east-indies/site/copy/**`, `test/site/copy/**` (the values)
  - **Read** DESIGN-SYSTEM.md §10, BRANDS.md §2, NOW! docs/DESIGN-SYSTEM.md §6 (copy), the drafted PRODUCT.md files
  - _Requirements: 18.8_
  - [ ] 1.3.a voice principles and register per brand
  - [ ] 1.3.b the lexicon as app keys + brand values ("Price on request", "On hold until", "Reproduction / Reproduksi", "Made to order"…); the `test` brand gets deliberately long values (+30%) to catch overflow
  - [ ] 1.3.c 👤 native Indonesian copywriter review
  - [ ] 1.3.d **Check:** each brand has voice principles, a decided Indonesian register (*Anda* for the gallery; the shop's to confirm — likely *kamu*), and an EN/ID lexicon covering every status, purchase mode, configurator label, checkout step, error, empty state and prefilled WhatsApp message — its **keys** in each app, its **values** in each brand's `site/copy/` (no brand copy in `engine/`) — reviewed by a native Indonesian writer; owner answers from 1.1.b folded in.

- [ ] **1.4 Gallery direction round** · needs: 1.1.c, 1.2.b
  - **Lane** UXG · **Agent** senior-uiux · **Wave** W7 · 1B
  - **Owns** `docs/design/gallery/**`
  - **Read** impeccable `reference/new-work.md` §3, EXPERIENCE-GALLERY.md, RESEARCH.md §1.5, DESIGN-SYSTEM.md
  - _Requirements: 6.1, 6.2, 19.2_
  - [ ] 1.4.a Run impeccable's direction round: seven candidates drawn from the collectors' own world (map rooms, dealers' catalogues, museum print rooms, the cartouches themselves) — each research direction enters as **at most one** candidate
  - [ ] 1.4.b `concept-seed --scope direction` roll, challengers, IMPECCABLE'S PICK and a canon card for each survivor
  - [ ] 1.4.c Comp **the item page** for the top two or three finalists at full fidelity on the pilot photography — first viewport and one scroll, phone first — including the typical migrated item and its hook-title fallback
  - [ ] 1.4.d Structure cards for home and browse per finalist, and an impeccable critique of each finalist
  - [ ] 1.4.e **Check:** impeccable's direction round has run in full — seven candidates from the collectors' own world, a `concept-seed --scope direction` roll, challengers, IMPECCABLE'S PICK and a canon card — with each research direction entering as **at most one** candidate; the top two or three finalists show **the item page** (first viewport and one scroll, phone first) at full fidelity on the pilot photography, including the typical migrated item and its hook-title fallback; home and browse appear as structure cards; each finalist has an impeccable critique.

- [ ] **1.5 Shop direction round** · needs: 1.1.c, 1.2.b
  - **Lane** UXE · **Agent** senior-uiux · **Wave** W7 · 1B
  - **Owns** `docs/design/emporium/**`
  - **Read** impeccable `reference/new-work.md` §3, EXPERIENCE-SHOP.md, RESEARCH.md §3
  - _Requirements: 7.2, 19.2_
  - [ ] 1.5.a 👤 recruit two or three Indonesian designers or buyers for the cultural review
  - [ ] 1.5.b **Check:** the same round has run for the shop, the finalists show **the product page with the configurator open** at full fidelity on the pilot photography, every finalist works **without** the Hofker line as hero (D6), and a cultural review by Indonesian designers and buyers has produced a written position on what the direction celebrates and avoids.

- [ ] **1.6 The sister system** · needs: 1.4, 1.5
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W8 · 1C
  - **Owns** `docs/design/sister/**`
  - **Read** BRANDS.md §5
  - _Requirements: 15.3_
  - [ ] 1.6.a The shared lockup and the Archive No. / stock-number tag — one format both brands print and show
  - [ ] 1.6.b The cross-link components — sister strip, "own the original", "get a print", the separate-account note — drawn in each gallery finalist's world
  - [ ] 1.6.c The same components drawn in each shop finalist's world, so every finalist pair is judged with its sister system
  - [ ] 1.6.d **Check:** a shared lockup, the shared Archive No. / stock-number tag and format, and each cross-link component (sister strip, "own the original", "get a print", the separate-account note) are drawn in both brands' finalist worlds as pairs.

- [ ] **1.7 👤 Owner picks a direction per brand — as a pair** · needs: 1.6
  - **Lane** ARC · **Agent** — (orchestrator presents) · **Wave** W9 · 1D
  - **Owns** `docs/design/DECISIONS.md`
  - _Requirements: 6.1, 7.1_
  - [ ] 1.7.a Prepare the finalist pairs as phone-sized and desktop comps, behind one link the owner opens on their own phone
  - [ ] 1.7.b 👤 The review session: the owner compares the pairs side by side, phone first, then desktop
  - [ ] 1.7.c Record the choice, the device used and every requested change verbatim, with the date, in `docs/design/DECISIONS.md`; hand the changes to 1.8
  - [ ] 1.7.d **Check:** the owner has compared the finalist pairs side by side on their own phone and on a desktop, and the choice, the device used and every requested change are recorded verbatim with the date.

- [ ] **1.8 👤 Prototype test with real buyers** · needs: 1.7
  - **Lane** UXG + UXE · **Agent** senior-uiux, qa · **Wave** W10 · 1E
  - **Owns** `docs/design/research/prototype-test/**`
  - _Requirements: 19.10_
  - [ ] 1.8.a Build a clickable phone prototype of the chosen item page and configurator, with 1.7's requested changes
  - [ ] 1.8.b Write the test script from the 1.1.c journeys — tasks, success criteria, what to observe — in English and Indonesian
  - [ ] 1.8.c 👤 Recruit five collectors and five Instagram-type shoppers (D21), two of the sessions in Indonesian
  - [ ] 1.8.d Run and record the ten sessions: task time, success, quotes, findings ranked by severity
  - [ ] 1.8.e Turn the findings into a list of design changes for 1.9
  - [ ] 1.8.f **Check:** a clickable phone prototype of the chosen item page and configurator has been tested with five collectors and five Instagram-type shoppers — two sessions in Indonesian — on the 1.1.c journeys, with task times, success and findings recorded and folded into 1.9.

- [ ] **1.9 👤 DESIGN.md and token files** · needs: 1.7, 1.8
  - **Lane** UXG + UXE (one agent each) · **Agent** senior-uiux · **Wave** W11 · 1F
  - **Owns** `engine/apps/gallery/{DESIGN.md,src/styles/tokens.css}`, `engine/apps/emporium/{DESIGN.md,src/styles/tokens.css}`
  - **Read** DESIGN-SYSTEM.md §4, §7–13, the chosen comps, the prototype findings
  - _Requirements: 2.6, 19.2_
  - [ ] 1.9.a motion spec: at most six named motions, each with trigger, duration, easing and reduced-motion fallback
  - [ ] 1.9.b iconography: one family per app matched to the type's stroke; the viewer's glyphs (recto, verso, raking, transmitted, reset, loupe); payment, courier and WhatsApp marks per their owners' guidelines
  - [ ] 1.9.c image treatment: box behaviour at aspects 0.3, 1 and 3.5; mats against toned paper; the contact shadow; black-and-white and albumen photographs
  - [ ] 1.9.d font budget: ≤ 3 files on first paint, subsets for Latin + Indonesian + Dutch, glyph coverage checked against real original titles (`ſ`, ligatures, diacritics), a CJK plan
  - [ ] 1.9.e record the dark-mode decision (storefronts: none; the viewer's lightbox rung) — DESIGN-SYSTEM.md §4
  - [ ] 1.9.f 👤 owner approves and buys any commercial font licence (web + PDF embedding for 8.11), or accepts the free alternative
  - [ ] 1.9.g **Check:** each DESIGN.md records the chosen world and its canon card, every C3 token is defined with every text pairing clearing AA, font licences are confirmed (a commercial face like DTL Elzevir needs the owner — else its Google alternative), and the sections below exist; the signature surface has had a full-fidelity pass in the chosen direction.

- [ ] **1.10 Admin visual brief** · needs: 1.7
  - **Lane** ADM · **Agent** senior-uiux · **Wave** W10 · 1E
  - **Owns** `docs/design/admin/visual-brief.md`
  - _Requirements: 14.8_
  - [ ] 1.10.a Each brand's admin colour application — chrome and accents only, never dense tables or form fields
  - [ ] 1.10.b Decide whether Payload's dark theme is tokenised to AA or disabled, and record it
  - [ ] 1.10.c Density, type size and target size for long cataloguing sessions
  - [ ] 1.10.d **Check:** each brand's admin colour application is specified (chrome and accents only — never dense tables or form fields), Payload's dark theme is either tokenised to AA or disabled (decided and recorded), and density and target size for long cataloguing sessions are set.

- [ ] **1.11 Phase 1 gate — with the design gate** · needs: 1.1–1.10
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W12
  - **Owns** `docs/gates/phase-1.md`
  - **Read** the phase's **Done when**, DESIGN-SYSTEM.md §13
  - _Requirements: 6.1, 7.1, 19.10_
  - [ ] 1.11.a Collect the evidence for every clause of Phase 1's **Done when** — the approved pairs, both DESIGN.md and token files, the native-reviewed lexicons, the sister system — in `docs/gates/phase-1.md`
  - [ ] 1.11.b The design gate on the final comps (DESIGN-SYSTEM.md §13): impeccable `critique` at 360, 390, 768 and 1440 px, in English and Indonesian — zero P0/P1 left
  - [ ] 1.11.c 👤 The owner confirms the final comps are the ones they approved; recorded in `docs/design/DECISIONS.md`
  - [ ] 1.11.d **Check:** every clause of Phase 1's **Done when** is evidenced in `docs/gates/phase-1.md`, the design gate reports zero P0/P1, and the owner has confirmed the comps.

---

## Phase 2 — Content model and CMS core · W6–W10 · ~8d

**Goal:** every non-commerce collection in CONTENT-MODEL.md, validated, localised, grouped, seeded.
**Done when:** in the gallery admin a non-developer creates a maker, a place with a
historical name, a work with a circa date and a verso image, and a unique
product; in the shop admin a design, a product type and a product with variants;
all appear in the API; an incomplete work is refused on publish with a plain
reason; schema hashes are identical across three databases.
**Phase letters:** A 2.1, 2.5, 2.6, 2.7 · B 2.2, 2.3 · C 2.4 · D 2.8, 2.9 · 2.10 runs at the end of each wave · gate 2.11

- [ ] **2.1 Discovery vocabulary: makers, places (gazetteer), terms, sources** · needs: 0.7
  - **Lane** SCH · **Agent** senior-db · **Wave** W6 · 2A
  - **Owns** `engine/packages/cms/src/collections/{makers,places,terms,sources}/**`, their validators
  - **Read** CONTENT-MODEL.md §3, ARCHITECTURE.md §8, EXPERIENCE-GALLERY.md §2
  - _Requirements: 3.4, 3.5, 5.1_
  - [ ] 2.1.a makers: names, sortName, aliases, roles, life dates with precision, bio (blocks), portrait, `sameAs`
  - [ ] 2.1.b places: localised modern name, `historicalNames[]`, type, parent, geo point + bbox; cycle guard
  - [ ] 2.1.c terms (subject, mood, room, occasion, recipient) and sources (bibliography)
  - [ ] 2.1.d gazetteer seed data file (`test/content/seed/gazetteer.json` shape, reused by every brand): the place hierarchy of EXPERIENCE-GALLERY.md §2 and the historical names of ARCHITECTURE.md §8
  - [ ] 2.1.e **Check:** each collection saves with validation, localisation and slugs; a place stores historical names and a parent; a unit test proves a place cannot be its own ancestor.

- [ ] **2.2 Works** · needs: 2.1, 2.7
  - **Lane** SCH · **Agent** senior-db · **Wave** W7 · 2B
  - **Owns** `engine/packages/cms/src/collections/works/**`, `validators/work-*.ts`, `hooks/work-*.ts`
  - **Read** CONTENT-MODEL.md §1, §9; COMPLIANCE.md §1, §8
  - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.9, 3.10, 3.11_
  - [ ] 2.2.a fields and groups (collation, dimensions in mm, condition with the grade as a `terms(grade)` reference, references, provenance, images with roles, master, rights, **physical with no defaults** — location and export status stay blank until the item register sets them — origin, cataloguing, the `book` group for books and atlases, legacy, seo); the print ceiling lives on designs, not works
  - [ ] 2.2.b pure validators: date order and precision, positive dimensions, image ≤ sheet
  - [ ] 2.2.c publish guard (title, object type, date, primary place or maker, primary image with alt, grade for originals, verified AI fields) — a blank location or export status **never blocks publishing**; it makes the item enquiry-only (Req 16.8)
  - [ ] 2.2.d field-level access for `physical`; read-only guard for synced fields on copies; `publishedOrStaff` read access
  - [ ] 2.2.e `afterChange` / `afterDelete` → `invalidate(tags)` for the work and everything that lists it
  - [ ] 2.2.f **Check:** every field in CONTENT-MODEL.md §1 exists; save-time validation and the publish guard are unit-tested; public read is `publishedOrStaff`; `physical` fields are invisible to roles without access and to the public; a provenance copy's synced fields reject edits.

- [ ] **2.3 Products** · needs: 2.1, 2.7
  - **Lane** SCH · **Agent** senior-be · **Wave** W7 · 2B
  - **Owns** `engine/packages/cms/src/collections/products/**`, `validators/product-*.ts`, `hooks/product-*.ts`
  - **Read** CONTENT-MODEL.md §1, COMMERCE.md §3–4, §7
  - _Requirements: 3.1, 3.3, 3.11, 6.10, 8.4, 16.8_
  - [ ] 2.3.a fields (kind, inventoryModel, work/design/productType, status, pricing group with market prices, shipping profile, tax class, HS code derivation, badges, channels, seo)
  - [ ] 2.3.b `publicId` sequence starting above the highest legacy id; slug derivation (NOW! S1 rule: never re-derive on edit)
  - [ ] 2.3.c publish guard (pricing mode, price unless on request, shipping profile, tax class, a routable seller — **or**, for a unique item whose work has no location or export status, publish as enquiry-only — rights for reproductions)
  - [ ] 2.3.d guard: originals can never have channel `marketplace`
  - [ ] 2.3.e `afterChange` → `invalidate(tags)`: editorial tags stale-while-revalidate, the product's price and availability tags expired immediately (Req 19.12)
  - [ ] 2.3.f **Check:** `publicId` is a unique integer sequence that accepts preserved legacy ids; slugs derive once and never re-derive; `status` is only `available · not-for-sale · archived` — *on hold* and *sold* are derived from reservations (C8 availability), never stored; public read is `publishedOrStaff`; the publish guard is tested.

- [ ] **2.4 Merchandise schema: designs, product types, variants, locations, stock** · needs: 2.2, 2.3
  - **Lane** SCH · **Agent** senior-db · **Wave** W8 · 2C
  - **Owns** `engine/packages/cms/src/collections/{designs,product-types,variants,locations,stock-levels}/**`, `engine/packages/cms/src/db/inventory.ts`
  - **Read** CONTENT-MODEL.md §2, COMMERCE.md §4, §8, ARCHITECTURE.md §7
  - _Requirements: 3.1, 4.4, 7.2, 12.4_
  - [ ] 2.4.a designs (work, crop, print file stored under `print-files/` in the masters bucket, aspect, derived print ceiling, story, archive number)
  - [ ] 2.4.b product types (axes and options, price table per market, constraints, minimum ppi — 240 by default, D26 — fulfilment routes, shipping profile, HS code, materials, mockup scenes)
  - [ ] 2.4.c variants (options, SKU pattern, market prices, weight/dimensions, fulfilment mapping)
  - [ ] 2.4.d locations and stock levels; `engine.inventory_movements` append-only table declared in `db/inventory.ts`
  - [ ] 2.4.e **Check:** a product type with axes, a price table and constraints saves; a variant cannot exceed its design's print ceiling (enforced again in 4.4); `stockLevels.reserved` is not editable in the admin; `inventory_movements` exists as an engine table in the wave migration.

- [ ] **2.5 Editorial and site: stories, pages, curations, exhibitions, redirects, globals, blocks** · needs: 0.7, 0.5.d
  - **Lane** SCH · **Agent** senior-be · **Wave** W6 · 2A
  - **Owns** `engine/packages/cms/src/{collections/{stories,pages,curations,exhibitions,redirects},globals,blocks}/**`
  - **Read** CONTENT-MODEL.md §6–7, DESIGN-SYSTEM.md §5, BRANDS.md §3
  - _Requirements: 2.3, 2.4, 3.5, 3.9, 3.11_
  - [ ] 2.5.a block definitions from C4 + an exhaustiveness test against `@engine/view-models` blocks
  - [ ] 2.5.b stories, pages (template hints), curations (kinds, members or query, PDF field), exhibitions
  - [ ] 2.5.c globals: brandSettings, navigation, homepage (ordered bands), commerceSettings, consent, seoDefaults — wired into the config merge seam (0.6.a)
  - [ ] 2.5.d redirects collection (from, to, code, source, hits) with a unique `from`
  - [ ] 2.5.e draft preview at the real URL for staff (NOW! S4 pattern: staff session, not a token) and live preview config
  - [ ] 2.5.f **Check:** all fifteen blocks from C4 have Payload definitions matching the union exactly (a test compares them), including `prose` note marks that cite a source and `zoomFigure` regions addressed in IIIF coordinates; the six globals save (the holiday calendar inside `commerceSettings`, which holds **no prices**); a curation can be a manual list or a saved facet query, with price thresholds **per market currency**; every drafts-enabled collection reads `publishedOrStaff`.

- [ ] **2.6 People (non-commerce): customers, addresses, saved items, want-lists, subscribers, reviews** · needs: 0.7
  - **Lane** SCH · **Agent** senior-be · **Wave** W6 · 2A
  - **Owns** `engine/packages/cms/src/collections/{customers,addresses,saved-items,want-lists,subscribers,reviews}/**`
  - **Read** CONTENT-MODEL.md §5, ARCHITECTURE.md §12, COMPLIANCE.md §7
  - _Requirements: 13.1, 13.2, 18.5_
  - [ ] 2.6.a `customers` as its own auth collection (profile, verification, consents) — never the staff collection; the custom strategy and its cookie arrive in 10.1
  - [ ] 2.6.b `addresses` with the Indonesian shape (province → city → district → sub-district, postcode) and an international form
  - [ ] 2.6.c `saved-items`, `want-lists` (saved query + budget stored with its market currency), `subscribers` (with recorded consent), `reviews` (verified buyer, moderation state)
  - [ ] 2.6.d Access rules — a customer reads and edits only their own records — with tests
  - [ ] 2.6.e **Check:** `customers` is its own auth collection (the custom strategy and its separate session cookie arrive in 10.1), a customer can read and edit only their own records (tested), addresses validate the Indonesian shape, want-list budgets store their market currency, and consents store purpose, timestamp and policy version.

- [ ] **2.7 Media and masters** · needs: 0.7
  - **Lane** MED · **Agent** senior-be · **Wave** W6 · 2A
  - **Owns** `engine/packages/cms/src/collections/{media,masters}/**` (by agreement with SCH), `engine/packages/media/src/storage/**`
  - **Read** ARCHITECTURE.md §7, CONTENT-MODEL.md §6, KOI CONTENT-MODEL Media
  - _Requirements: 4.3, 4.6_
  - [ ] 2.7.a `media` upload collection: localised alt text required, image roles, the brand bucket through `@payloadcms/storage-s3`
  - [ ] 2.7.b `masters` as a plain collection: a presigned PUT straight to the private bucket (never through the app server), checksum recorded on completion, no public URL
  - [ ] 2.7.c Bucket policies: the shop's credentials write only under `print-files/`; local MinIO policies mirror production
  - [ ] 2.7.d Upload size limits and allowed types
  - [ ] 2.7.e **Check:** a public upload requires localised alt text and lands in the brand bucket; `masters` is a **plain collection** (not an upload collection) whose files go straight to the private bucket by presigned PUT — never through the app server — and have no public URL; the shop's credentials can write only under `print-files/`; upload limits and allowed types are enforced.

- [ ] **2.8 Admin organisation and plain language** · needs: 2.1–2.7
  - **Lane** SCH · **Agent** senior-uiux · **Wave** W9 · 2D
  - **Owns** `admin.*` settings inside `engine/packages/cms/src/collections/**` (after the wave's authors hand off)
  - **Read** NOW! docs/SURFACES-PLAN.md §2.2 and S3 (writer-first screens, legacy fields in tabs, plain labels)
  - _Requirements: 2.5, 14.8_
  - [ ] 2.8.a Sidebar groups — Catalogue · Merchandise · Commerce · Editorial · People · Settings — through `admin.group`
  - [ ] 2.8.b A cataloguer's default screens: engine and legacy fields in collapsed tabs, list columns chosen for the job
  - [ ] 2.8.c Plain-language labels and descriptions in English and Indonesian
  - [ ] 2.8.d `admin.hidden` driven by module flags, so a disabled module's collections disappear
  - [ ] 2.8.e **Check:** the sidebar is grouped (Catalogue · Merchandise · Commerce · Editorial · People · Settings), a cataloguer's default screen shows no engine or legacy field, every label a cataloguer sees is in plain English and Indonesian, and disabled modules' collections are hidden.

- [ ] **2.9 Seeds** · needs: 2.1–2.7
  - **Lane** BRD (+ SCH for the seed runner) · **Agent** medior · **Wave** W9 · 2D
  - **Owns** `engine/packages/cms/src/seed/**`, `*/content/seed/**`
  - **Read** CONTENT-MODEL.md §10
  - _Requirements: 3.9, 9.5_
  - [ ] 2.9.a The seed runner: re-runnable, idempotent by natural key, everything landing as drafts
  - [ ] 2.9.b Gallery cases: sold with an alternative, price on request, a circa date, Jakarta `domestic-only`, an original with **no location** (enquiry-only), a verso photograph
  - [ ] 2.9.c Shop cases: three designs (one rights-pending), four product types, showroom stock, a gift card
  - [ ] 2.9.d The `test` brand's fictional catalogue for both of its configs
  - [ ] 2.9.e **Check:** `pnpm seed --brand <slug>` is re-runnable, lands everything as drafts, and loads the cases CONTENT-MODEL.md §10 lists (sold with alternative, price on request, circa date, Jakarta `domestic-only`, an original with **no location** (enquiry-only), verso photograph; three designs incl. one rights-pending; four product types; showroom stock; a gift card).

- [ ] **2.10 Migrations and schema verification (per wave)** · needs: each wave's merge
  - **Lane** SCH · **Agent** senior-db (SCH lead) · **Wave** after each wave's merge
  - **Owns** `engine/packages/cms/src/migrations/**`, `engine/packages/cms/payload-types.ts` (generated)
  - _Requirements: 1.5, 19.7_
  - [ ] 2.10.a wave A migration
  - [ ] 2.10.b wave B migration
  - [ ] 2.10.c wave C migration (incl. `engine.inventory_movements`)
  - [ ] 2.10.d a verify script creating a work + product through the Local API with hooks (NOW! `verify-*` pattern), then reading them **as the public** (`overrideAccess: false`) to prove a draft and a `physical` field never come back; run in CI
  - [ ] 2.10.e **Check:** each wave has exactly one generated migration, `payload migrate:create` reports "No schema changes detected" after it, types are regenerated, and `schema-hash --all` is equal.

- [ ] **2.11 Phase 2 gate** · needs: 2.1–2.10
  - **Lane** QA · **Agent** qa · **Wave** W10
  - **Owns** `docs/gates/phase-2.md`
  - **Read** the phase's **Done when**
  - _Requirements: 3.1–3.11_
  - [ ] 2.11.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 2.11.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-2.md`
  - [ ] 2.11.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 2.11.d **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-2.md`, with no failure left open.

---

## Phase 3 — Design systems and app shells · W7–W14 · ~8d

**Goal:** primitives, tokens with runtime overrides, each app's shell, blocks, a brief for every surface, state fixtures, surfaces from fixtures, style guides.
**Done when:** changing a brand's token overrides re-skins every component and a
failing palette is rejected; every surface has an approved brief; both
`/style-guide` pages render every component, block and state at 360/768/1440 px
with axe clean and budgets met; the design gate passes.
**Phase letters:** A 3.1, 3.2, 3.6, 3.9 · B 3.3, 3.4, 3.8 · C 3.5, 3.7 · gate 3.10

- [ ] **3.1 Headless primitives** · needs: 0.5
  - **Lane** WEB · **Agent** senior-fe · **Wave** W7 · 3A
  - **Owns** `engine/packages/ui/src/primitives/**`
  - **Read** DESIGN-SYSTEM.md §1, §9
  - _Requirements: 19.2_
  - [ ] 3.1.a Overlay primitives — dialog, sheet, drawer, toast — with focus trap, focus return and an inert background
  - [ ] 3.1.b Disclosure, tabs, combobox and radio group
  - [ ] 3.1.c Form fields (label, hint, error), price, skip link and visually-hidden
  - [ ] 3.1.d Component tests for every interaction state and keyboard path
  - [ ] 3.1.e **Check:** dialog, sheet, drawer, tabs, disclosure, combobox, radio group, toast, form fields, price, skip link and visually-hidden are keyboard-complete and screen-reader-labelled, unstyled and token-driven, with component tests for their interaction states.

- [ ] **3.2 Token pipeline, runtime overrides and the contrast gate** · needs: 0.5.c, 0.6.a
  - **Lane** WEB · **Agent** senior-fe · **Wave** W7 · 3A
  - **Owns** `engine/packages/ui/src/tokens/**` (not `contract.ts`, which is C3)
  - **Read** DESIGN-SYSTEM.md §4, KOI DESIGN-SYSTEM.md §1 and "Secondary text"
  - _Requirements: 2.6, 19.2_
  - [ ] 3.2.a Inject brand token overrides from config into the root layout as CSS custom properties, at runtime
  - [ ] 3.2.b Derive `--c-ink-soft` against the deepest surface; the contrast validator checks every text pairing against WCAG AA
  - [ ] 3.2.c A failing palette is rejected whole: the app's default tokens render and the reason is logged (unit tests)
  - [ ] 3.2.d **Check:** brand overrides are injected at runtime, `--c-ink-soft` is derived against the deepest surface, and a unit test proves a failing palette is rejected whole.

- [ ] **3.3 Gallery app foundation** · needs: 1.9, 3.1, 3.2
  - **Lane** UXG · **Agent** senior-uiux (app lead) · **Wave** W12 · 3B
  - **Owns** `engine/apps/gallery/src/{styles,components,app/(site)/[locale]/layout.tsx,app/(site)/[locale]/style-guide}/**`, `engine/apps/gallery/src/surfaces/_blocks/**`
  - **Read** engine/apps/gallery/DESIGN.md, EXPERIENCE-GALLERY.md §2, DESIGN-SYSTEM.md §6, §9, §12
  - _Requirements: 6.1, 8.9, 18.3, 19.1, 19.2_
  - [ ] 3.3.a fonts via `next/font` (self-hosted, within the 1.9.d budget); Tailwind v4 `@theme inline` roles
  - [ ] 3.3.b shell components fed by `ShellVM`; the bottom-edge slot with its priority order (DESIGN-SYSTEM.md §9)
  - [ ] 3.3.c the work card (image on its mat, never cropped — verified with fixtures at aspects 0.3, 1 and 3.5; one link; the wishlist button outside the link with its own focus stop; status as text)
  - [ ] 3.3.d block renderers (exhaustive map against C4)
  - [ ] 3.3.e `/style-guide` (an underscore folder would be private in the App Router) with a token-override picker, module toggles and the state switcher from 3.8 (noindex)
  - [ ] 3.3.f **Check:** the shell (header with utility row, navigation — with the phone menu's prioritised order and the place drill-down — footer with seller identity and sister strip, consent banner, the ship-to selector that decides the currency, locale banner), the **bottom-edge stacking policy**, the work card, the type scale and all fifteen block renderers exist and appear in `/style-guide`.

- [ ] **3.4 Shop app foundation** · needs: 1.9, 3.1, 3.2
  - **Lane** UXE · **Agent** senior-uiux (app lead) · **Wave** W12 · 3B
  - **Owns** `engine/apps/emporium/src/{styles,components,app/(site)/[locale]/layout.tsx,app/(site)/[locale]/style-guide}/**`, `engine/apps/emporium/src/surfaces/_blocks/**`
  - **Read** engine/apps/emporium/DESIGN.md, EXPERIENCE-SHOP.md §2, DESIGN-SYSTEM.md §6, §9, §12
  - _Requirements: 7.1, 8.9, 18.3, 19.1, 19.2_
  - [ ] 3.4.a Fonts via `next/font` (self-hosted, within the 1.9.d budget); Tailwind v4 `@theme inline` roles
  - [ ] 3.4.b Shell components fed by `ShellVM`: the utility bar (ship-to, WhatsApp, account, bag), the Shop mega-menu, the footer
  - [ ] 3.4.c The bottom-edge stacking policy: WhatsApp merged into the buy bar on product pages, no welcome offer before first engagement, no exit-intent pop-up on phones
  - [ ] 3.4.d The product tile: named swatches, badge, Reproduction label, "From" price
  - [ ] 3.4.e Block renderers (an exhaustive map against C4)
  - [ ] 3.4.f `/style-guide` with a token-override picker, module toggles and the 3.8 state switcher (noindex)
  - [ ] 3.4.g **Check:** the shell (utility bar with ship-to, WhatsApp, account, bag; Shop mega-menu; footer), the bottom-edge stacking policy (WhatsApp merged into the buy bar on product pages; no welcome offer before first engagement; no exit-intent pop-up on phones), the product tile (named swatches, badge, Reproduction label, "From" price), all fifteen block renderers and `/style-guide` (with the state switcher) exist.

- [ ] **3.5 Surface skeletons from fixtures in both apps** · needs: 3.3, 3.4, 3.6, 3.9
  - **Lane** UXG + UXE · **Agent** medior (one per app) · **Wave** W13 · 3C
  - **Owns** `engine/apps/*/src/app/(site)/[locale]/**` route folders and `src/surfaces/*/` skeletons (not the layout, not `style-guide`)
  - **Read** DESIGN-SYSTEM.md §2, the surface briefs from 3.9
  - _Requirements: 1.2, 18.1_
  - [ ] 3.5.a Gallery: a route folder and a skeleton for every supported surface, rendering its fixture view model to its surface brief
  - [ ] 3.5.b Shop: the same for every shop surface
  - [ ] 3.5.c Landmarks and heading order per surface, and route-map resolution in both locales (an e2e smoke test)
  - [ ] 3.5.d **Check:** every surface the app supports renders its fixture view model following its surface brief, with correct landmarks and heading order, and routes resolve through the route map in both locales.

- [ ] **3.6 Loader interface with a fixture source** · needs: 0.5.b, 0.8.e
  - **Lane** WEB · **Agent** senior-fe · **Wave** W8 · 3A
  - **Owns** `engine/packages/loaders/**`
  - **Read** DESIGN-SYSTEM.md §2–3, ARCHITECTURE.md §9, §12, the spike write-up
  - _Requirements: 1.2, 3.11_
  - [ ] 3.6.a `loadX(params)` per surface returning its VM; `loadItem` returns `{ vm } | { redirectTo } | null`
  - [ ] 3.6.b The fixture source behind `LOADERS_SOURCE=fixtures` — the boot check refuses it in production
  - [ ] 3.6.c The one Payload read helper — always `overrideAccess: false`, `_status: 'published'` and a `select` — and a lint rule failing any other Local API call in `loaders/`
  - [ ] 3.6.d Stubbed Payload sources per surface, ready for Phases 6–7
  - [ ] 3.6.e **Check:** every surface has a `loadX(params)` returning its VM (`loadItem` returns `{ vm } | { redirectTo } | null`), backed by fixtures when `LOADERS_SOURCE=fixtures` (dev and component tests — the boot check refuses it in production), with the Payload source stubbed for Phases 6–7 behind one read helper that **always** passes `overrideAccess: false`, `_status: 'published'` and a `select` (a lint rule fails any other Local API call in `loaders/`).

- [ ] **3.7 Accessibility and performance baseline** · needs: 3.3, 3.4
  - **Lane** QA · **Agent** qa · **Wave** W13 · 3C
  - **Owns** `tests/e2e/design-system/**`
  - _Requirements: 19.1, 19.2_
  - [ ] 3.7.a e2e: the skip link is the first tab stop; focus is visible and never obscured with every bottom-edge element open (WCAG 2.4.11)
  - [ ] 3.7.b e2e: every drag has a non-drag alternative (2.5.7), reduced motion collapses transitions, search works without JavaScript
  - [ ] 3.7.c axe on both style guides and LHCI budgets on them, in CI
  - [ ] 3.7.d **Check:** e2e asserts the skip link is the first tab stop, focus is visible **and never obscured** with every bottom-edge element open (WCAG 2.4.11), every drag has a non-drag alternative (2.5.7), reduced motion collapses transitions, search works without JavaScript, axe is clean on both style guides, and LHCI budgets pass on them.

- [ ] **3.8 State matrix fixtures** · needs: 0.5.b, 3.6
  - **Lane** WEB · **Agent** senior-fe · **Wave** W9 · 3B
  - **Owns** `engine/packages/view-models/src/fixtures/states/**`
  - **Read** DESIGN-SYSTEM.md §3
  - _Requirements: 6.11, 19.2_
  - [ ] 3.8.a Per-surface state fixtures: loading/streaming, empty, partial, error, JavaScript off
  - [ ] 3.8.b Long content and extreme values — Dutch titles, 300-character Latin transcriptions, +30% text, `Rp 1.250.000.000` — and images at aspects 0.3, 1 and 3.5
  - [ ] 3.8.c The purchase-panel matrix: one fixture per combination, including *enquiry-only*
  - [ ] 3.8.d Register every fixture with both apps' `/style-guide` state switchers
  - [ ] 3.8.e **Check:** every surface has fixtures for loading/streaming, empty, partial, error, JavaScript off, long content (Dutch titles, 300-character Latin transcriptions, +30% text expansion) and extreme values (`Rp 1.250.000.000`), and the gallery purchase panel has one fixture per purchase-state combination (including *enquiry-only*: an original with no known location); both apps' `/style-guide` state switchers list them.

- [ ] **3.9 Surface briefs** · needs: 1.9
  - **Lane** UXG + UXE · **Agent** senior-uiux (one per app, not the app leads) · **Wave** W12 · 3A
  - **Owns** `docs/design/{gallery,emporium}/surfaces/**`, `.impeccable/` surface briefs per app
  - **Read** DESIGN-SYSTEM.md §2, §12, EXPERIENCE-*.md, the 1.1.c journeys
  - _Requirements: 6.11, 7.11, 19.10_
  - [ ] 3.9.a gallery surface briefs
  - [ ] 3.9.b shop surface briefs
  - [ ] 3.9.c cross-cutting behaviours, designed: switching ship-to (which moves currency) and locale; the language banner's place; the WhatsApp handoff (DESIGN-SYSTEM.md §12)
  - [ ] 3.9.d **Check:** every surface not comped in Phase 1 has an impeccable `shape` brief naming its mode (Experience · Operate · Read · Persuade), its states and its content rules, with `concept-seed --scope surface` run for the open ones — including 404/410/500, the payment-pending page, the bag's edge cases, `Pay`, `Quote`, `OrderLookup`, the trust pages, For Business and the design page.

- [ ] **3.10 Phase 3 gate — with the design gate** · needs: 3.1–3.9
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W14
  - **Owns** `docs/gates/phase-3.md`
  - **Read** the phase's **Done when**, DESIGN-SYSTEM.md §13
  - _Requirements: 2.6, 19.1, 19.2, 19.10_
  - [ ] 3.10.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 3.10.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-3.md`
  - [ ] 3.10.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 3.10.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 3.10.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 3.10.f **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-3.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

---

## Phase 4 — Media, deep zoom and search · W8–W11 · ~7d

**Goal:** derivatives, IIIF tiles and manifests, masters and print ceilings, the viewer, the search index, the facet engine.
**Done when:** a 3543 × 2840 scan becomes derivatives and tiles and deep-zooms
smoothly on a mid-range Android without moving the item page's JS budget;
"Celebes" and "Sulawesi" return the same works; facet counts follow the rule.
**Phase letters:** A 4.1, 4.5, 4.6 · B 4.2, 4.4, 4.7 · C 4.3 · gate 4.8

- [ ] **4.1 Derivative ladder and image loader** · needs: 2.7
  - **Lane** MED · **Agent** senior-be · **Wave** W8 · 4A
  - **Owns** `engine/packages/media/src/{derivatives,jobs/derivatives}/**`
  - **Read** ARCHITECTURE.md §7, DESIGN-SYSTEM.md §7
  - _Requirements: 4.1, 4.6_
  - [ ] 4.1.a The derivative job: AVIF + WebP at 320/640/1024/1600/2400 px and a blur placeholder, with `sharp` concurrency capped
  - [ ] 4.1.b Queue wiring through `@engine/media/jobs` (run by `/api/x/cron/jobs`), with the job's status on the media record
  - [ ] 4.1.c A custom `next/image` loader that picks from the ladder
  - [ ] 4.1.d **Check:** an upload produces AVIF + WebP at 320/640/1024/1600/2400 and a blur placeholder via a Payload job with a concurrency cap, and a custom `next/image` loader picks from the ladder.

- [ ] **4.2 IIIF tiling — the queue job and the bulk CLI** · needs: 4.1
  - **Lane** MED · **Agent** senior-be · **Wave** W9 · 4B
  - **Owns** `engine/packages/media/src/{iiif,jobs/tiles,cli}/**`
  - **Read** ARCHITECTURE.md §7, §10, DEPLOYMENT.md §2
  - _Requirements: 4.2_
  - [ ] 4.2.a the tiler (pure, shared by both paths) and the queue job
  - [ ] 4.2.b the off-box CLI with resume, a dry run and a per-item report
  - [ ] 4.2.c **Check:** `sharp().tile({ layout: 'iiif3', size: 512 })` writes Level 0 tiles and `info.json` to the brand bucket; **public tiles stop at the configured resolution cap** while the full-resolution pyramid goes to the private prefix; the queue job (new uploads, `sharp.concurrency` capped, run by `/api/x/cron/jobs`) is idempotent and retried and the media record shows its status; and `pnpm media:tile` tiles a batch **off-box** — on a workstation or CI runner, straight to the bucket, resumable, updating records through the API — for the migration (11.4).

- [ ] **4.3 IIIF Presentation manifests** · needs: 4.2, 2.2
  - **Lane** MED · **Agent** medior · **Wave** W10 · 4C
  - **Owns** `engine/packages/media/src/manifests/**`, `engine/packages/http/src/media/**`
  - _Requirements: 4.2, 4.3_
  - [ ] 4.3.a A IIIF Presentation 3 manifest per work, images ordered by role, labels localised
  - [ ] 4.3.b A signed full-resolution manifest for staff, reading the private prefix
  - [ ] 4.3.c Served under `/api/x/media/…`, cached and invalidated by tag
  - [ ] 4.3.d **Check:** each work serves a Presentation 3 manifest ordering images by role with localised labels, and a signed full-resolution manifest is available to staff.

- [ ] **4.4 Masters and the print ceiling** · needs: 2.7, 2.4
  - **Lane** MED · **Agent** senior-be · **Wave** W9 · 4B
  - **Owns** `engine/packages/media/src/masters/**`
  - **Read** ARCHITECTURE.md §7, MIGRATION.md §9
  - _Requirements: 4.3, 4.4_
  - [ ] 4.4.a The presigned-PUT upload flow into the private bucket, recording pixels, ppi, colour profile and checksum
  - [ ] 4.4.b Presigned read URLs with an expiry, and an access log
  - [ ] 4.4.c The print ceiling per design, computed from its master at the product type's minimum ppi, stored and shown
  - [ ] 4.4.d Enforcement on variant save and on publish; the MinIO-policy test for `print-files/`
  - [ ] 4.4.e **Check:** masters are uploaded by presigned PUT straight to the private bucket and record pixels, ppi, colour profile and checksum; presigned read URLs expire and are logged; the shop's key is refused outside `print-files/` (a test against MinIO policies); a design's print ceiling is computed from its master at the product type's minimum ppi (240 by default: a 3543 px long edge → 375 mm) and stored; a test proves an over-ceiling variant is refused on save and on publish.

- [ ] **4.5 The zoom viewer** · needs: 3.1, 0.5.h
  - **Lane** WEB · **Agent** senior-fe · **Wave** W8 · 4A
  - **Owns** `engine/packages/ui/src/viewer/**`
  - **Read** EXPERIENCE-GALLERY.md §6
  - _Requirements: 4.5, 4.7, 19.1_
  - [ ] 4.5.a An OpenSeadragon wrapper that loads on intent (first tap or hover, or idle after LCP); until then the primary image is a plain responsive image
  - [ ] 4.5.b A filmstrip across recto, verso and details; controls as real buttons; the keyboard map
  - [ ] 4.5.c Touch: pinch and double-tap zoom, one-finger pan only once zoomed, `touch-action`; full screen as a fixed overlay
  - [ ] 4.5.d Reduced motion as cuts; a Lighthouse run proving the item page's initial JavaScript is unchanged
  - [ ] 4.5.e **Check:** OpenSeadragon loads only on intent, shows a filmstrip across recto/verso/details, has keyboard controls and a reset, pans with one finger only once zoomed, honours reduced motion, and a Lighthouse run shows the item page's initial JS unchanged by it.

- [ ] **4.6 Search index with the gazetteer** · needs: 2.1–2.3
  - **Lane** SRC (+ SCH lead for 4.6.a) · **Agent** senior-db · **Wave** W8 · 4A
  - **Owns** `engine/packages/search/src/{index-builder,pg,gazetteer}/**`, `engine/packages/cms/src/db/search.ts` (4.6.a, SCH lead)
  - **Read** ARCHITECTURE.md §8, NOW! ARCHITECTURE §8.G
  - _Requirements: 5.1, 5.5_
  - [ ] 4.6.a (SCH lead) the DDL in `db/search.ts`: the table, the text-search configuration, the IMMUTABLE `unaccent` wrapper and the indexes, in the wave migration
  - [ ] 4.6.b the index builder, gazetteer expansion and publish/nightly rebuilds
  - [ ] 4.6.c **Check:** `engine.search_documents` is rebuilt on publish and nightly, per locale, with trigram and tsvector indexes on an `unaccent` + `simple` text-search configuration wrapped in an IMMUTABLE function (so the index can use it), **per-market price columns** refreshed by the FX job, and **no stored availability** (it is joined from live reservations at query time); a test proves historical-name expansion (Celebes ⇄ Sulawesi, Batavia ⇄ Jakarta, Iava ⇄ Java) and fuzzy maker matching (Valentyn → Valentijn).

- [ ] **4.7 Facet engine, SearchPort and the search API** · needs: 4.6
  - **Lane** SRC · **Agent** senior-db · **Wave** W9 · 4B
  - **Owns** `engine/packages/search/src/{port.ts,facets}/**`, `engine/packages/http/src/search/**`
  - _Requirements: 5.2, 5.3, 5.4, 5.6, 8.3_
  - [ ] 4.7.a `SearchPort` and the Postgres facet counts with the all-but-this-facet rule
  - [ ] 4.7.b The place facet rolled up over the hierarchy; availability joined from live reservations at query time
  - [ ] 4.7.c Price facets per market currency — rupiah only for an Indonesian destination — with "on request"; zero-result queries recorded
  - [ ] 4.7.d The `/api/x/search` handler mounted in both apps; unit and e2e tests
  - [ ] 4.7.e **Check:** facets per brand and module compute counts with the all-but-this-facet rule (unit + e2e), the place facet rolls up the hierarchy, availability is computed at query time, **price facets are in the viewer's market currency** (rupiah only for an Indonesian destination — a test fails on any foreign amount) and include "on request", zero-result queries are recorded, and the handler is mounted in both apps under `/api/x/search`.

- [ ] **4.8 Phase 4 gate** · needs: 4.1–4.7
  - **Lane** QA · **Agent** qa · **Wave** W11
  - **Owns** `docs/gates/phase-4.md`
  - **Read** the phase's **Done when**
  - _Requirements: 4.1–4.7, 5.1–5.6_
  - [ ] 4.8.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 4.8.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-4.md`
  - [ ] 4.8.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 4.8.d **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-4.md`, with no failure left open.

---

## Phase 5 — Commerce core · W8–W16 · ~12d

**Goal:** money, sellers, the reservation guarantee, cart, pricing, tax, checkout, the five state machines and the outbox, the webhook pipeline, payments core with Midtrans, returns, the tax export, shipping basics, notifications, the commerce API.
**Done when:** two parallel checkouts on one unique gallery item yield exactly one
paid order and one clean conflict; a sold item cannot be reserved again; one
webhook delivered twice yields one payment, and a crash after the dedupe insert
rolls back and applies once on the retry; a payment landing after its
reservation expired takes the late-payment path; a multi-line shop cart to Bali
prices in IDR only, never offers QRIS above IDR 10 m, pays by VA in the Midtrans
sandbox, and its emails arrive; every order reproduces its own total.
**Phase letters:** A 5.1, 5.2, 5.9.a, 5.13.a · B 5.3, 5.4, 5.5, 5.10 👤, 5.11, 5.17 · C 5.6 · D 5.7, 5.8 · E 5.9 (rest), 5.13 (rest), 5.15, 5.16, 5.18 · F 5.12 · gate 5.14 👤

**Money-path review.** Every task in this phase that touches `domain/**` or
`payments/**` gets a senior-be review **and** a senior-db review of its
transactions before merge (PARALLEL-TRACKS.md §6) — 5.4, 5.17 and 5.18 above
all.

- [ ] **5.1 Commerce schema** · needs: Phase 2
  - **Lane** SCH · **Agent** senior-db (SCH lead) · **Wave** W11 · 5A
  - **Owns** `engine/packages/cms/src/collections/{carts,reservations,orders,payment-attempts,refunds,shipments,returns,offers,enquiries,consignments,appointments,invoices,discounts,gift-cards}/**`, `engine/packages/cms/src/db/{reservations,payments,outbox,fx,documents}.ts`, the wave migration
  - **Read** CONTENT-MODEL.md §4, §8, COMMERCE.md §4, §6, §12–13, PAYMENTS.md §4, ARCHITECTURE.md §6
  - _Requirements: 8.5, 8.10, 9.1, 9.9, 11.3_
  - [ ] 5.1.a collections and access rules; `payment-attempts` store the provider's `SessionResult` (domain-held idempotency)
  - [ ] 5.1.b DDL in `db/`: the reservation partial unique index (on the reservations table itself — never on a relationship table, which would not see the scalar key); `engine.payment_events` (unique `provider` + `provider_event_id`); `engine.domain_events` (the outbox: id, type, payload, created, dispatched, attempts); `engine.fx_rates`; `engine.document_sequences` (gapless per seller and series); the gift-card ledger
  - [ ] 5.1.c wave migration + schema hash
  - [ ] 5.1.d **Check:** every collection exists with access rules (nothing public reads orders; customers read only their own); reservations carry a scalar **`targetKey`** (`product:<id>` for a unique item, `unit:<id>` for a numbered edition unit; counted stock is guarded by the conditional `stock_levels` update instead) and the partial unique index on `target_key WHERE status IN ('active','converted')` for exclusive targets is declared through `afterSchemaInit` and present in the migration; the engine tables below exist; and admin list views minimise PII.

- [ ] **5.2 Money, FX and market price lists** · needs: 0.5.e
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W8 · 5A
  - **Owns** `engine/packages/domain/src/{money,fx,markets}/**` (not `money/contract.ts`, which is C5)
  - **Read** COMMERCE.md §3, CONVENTIONS.md §3
  - _Requirements: 8.4, 8.5, 8.8_
  - [ ] 5.2.a money module, rounding points, allocation + property tests
  - [ ] 5.2.b FX: rate source port (ECB reference rates by default, D27), daily refresh job, snapshots
  - [ ] 5.2.c market price resolution + "From" price for a destination
  - [ ] 5.2.d **Check:** safe-integer money arithmetic with ISO exponents (a guard rejects any non-safe-integer at every boundary), the **named rounding points** with their methods — half-even, and largest-remainder allocation so parts sum to the whole (COMMERCE.md §3) — the three price sources (explicit, product-type table × multiplier, derived FX + buffer + market price point), "From" prices and the FX snapshot are pure and **property-tested** (no float, no rounding outside a named point, totals reproducible).

- [ ] **5.3 Seller routing, destination and the rupiah rule** · needs: 5.2, 0.6.a
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W10 · 5B
  - **Owns** `engine/packages/domain/src/{sellers,destination}/**`, `engine/packages/http/src/commerce/destination/**`
  - **Read** COMMERCE.md §2–3, COMPLIANCE.md §1–2
  - _Requirements: 8.1, 8.2, 8.3, 8.9, 16.8, 18.7_
  - [ ] 5.3.a `routeSeller()` from stock location and destination, with typed blocked-line reasons (no known location → enquiry-only; `domestic-only` abroad)
  - [ ] 5.3.b The one `shipTo` cookie (defaulted from `CF-IPCountry`) and its API under `/api/x/commerce/destination` — no currency parameter anywhere
  - [ ] 5.3.c The rupiah rule in VM formatting, with a test that fails on any foreign amount for an Indonesian destination
  - [ ] 5.3.d The Singapore seller's Indonesian deliveries priced and charged in IDR (D29)
  - [ ] 5.3.e **Check:** `routeSeller()` picks one seller from stock location and destination, or explains blocked lines; an original with **no known location sells nowhere** (enquiry-only); a Jakarta `domestic-only` item is blocked for a Dutch destination with the stated message; the Singapore seller shipping to Indonesia prices in IDR (D29); the one `shipTo` cookie (defaulted from `CF-IPCountry`) and its API are the **only** input to the market — there is no currency parameter anywhere; VM formatting provably renders **IDR only** for Indonesian destinations (a test fails if any foreign amount is present).

- [ ] **5.4 The reservation service** · needs: 5.1, 0.5.g
  - **Lane** DOM · **Agent** senior-be (DOM-B), reviewed by senior-db · **Wave** W12 · 5B
  - **Owns** `engine/packages/domain/src/{reservations,inventory}/**` (not `reservations/contract.ts`, which is C8), `engine/packages/testing/src/concurrency/**`, `engine/packages/http/src/cron/reservations/**`
  - **Read** ARCHITECTURE.md §6, COMMERCE.md §4, PAYMENTS.md §1
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.9, 11.6_
  - [ ] 5.4.a `reserve()` writing the scalar `targetKey` and first expiring stale active rows for that target, in one transaction
  - [ ] 5.4.b `extend`, `release`, `convert` and `reverse`; counted stock through the conditional `stock_levels` update
  - [ ] 5.4.c The concurrency harness: 50 parallel reservations → one success and 49 typed conflicts; a sold item refusing a new reservation, even by direct insert
  - [ ] 5.4.d The sweeper route `/api/x/cron/reservations` — housekeeping only
  - [ ] 5.4.e **Check:** `reserve()` — `reserve` · `extend` · `release` · `convert` · `reverse` — is the only writer and always writes the scalar `targetKey`; inside its transaction it first expires stale active rows **for that target**, so correctness never waits on the sweeper; 50 parallel reservations of one unique item yield exactly one success and 49 typed conflicts (test); **a converted (sold) item refuses every new reservation at the database** (test, including a direct insert); `extend` lengthens a checkout lock to the chosen method's `sessionTtl` + margin within the configured ceiling; stocked quantity races never oversell; an expired active row reads as available; the sweeper route is housekeeping only.

- [ ] **5.5 Cart** · needs: 5.1, 5.2
  - **Lane** DOM · **Agent** senior-be (DOM-C) · **Wave** W12 · 5B
  - **Owns** `engine/packages/domain/src/cart/**`
  - **Read** COMMERCE.md §5
  - _Requirements: 8.8, 9.1_
  - [ ] 5.5.a Guest carts behind a hashed token, merged on sign-in
  - [ ] 5.5.b Line validation (status, active variant, routable) and 30-day expiry
  - [ ] 5.5.c `CartVM` computation, and a test proving a cart never reserves
  - [ ] 5.5.d **Check:** guest carts (hashed token), merge on sign-in, line validation (status, variant active, routable), 30-day expiry and `CartVM` computation are tested; **a cart never reserves**.

- [ ] **5.6 Pricing pipeline and tax** · needs: 5.2, 5.3
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W11 · 5C
  - **Owns** `engine/packages/domain/src/{pricing,tax}/**`
  - **Read** COMMERCE.md §3, §9; COMPLIANCE.md §3
  - _Requirements: 8.5, 8.6_
  - [ ] 5.6.a Every pipeline step as a pure function returning its intermediate figures for the order snapshot
  - [ ] 5.6.b Tax regimes as dated data — ID-PPN 12% on an 11/12 base, SG-GST 9%, `none` — with exports zero-rated
  - [ ] 5.6.c Inclusive and exclusive price lists producing the right tax lines, under property tests
  - [ ] 5.6.d **Check:** each pipeline step is a pure function; ID-PPN (12% on an 11/12 base), SG-GST 9% and `none` are data with effective dates; exports are zero-rated; inclusive and exclusive price lists produce the right tax lines; every intermediate figure is returned for the order snapshot.

- [ ] **5.7 Discounts, gift cards, bundles, gift wrap** · needs: 5.5, 5.6
  - **Lane** DOM · **Agent** senior-be (DOM-C) · **Wave** W13 · 5D
  - **Owns** `engine/packages/domain/src/{discounts,gift-cards,bundles}/**`
  - **Read** COMMERCE.md §10
  - _Requirements: 8.7_
  - [ ] 5.7.a Discount codes with usage limits enforced atomically (a concurrency test)
  - [ ] 5.7.b The gift-card ledger, which never goes below zero
  - [ ] 5.7.c Bundles and "3 for 2" at line level; order discounts allocated by largest remainder
  - [ ] 5.7.d The free-shipping threshold as an automatic rule per market; gift wrap as a priced product line
  - [ ] 5.7.e **Check:** codes enforce usage limits atomically under concurrency (test), gift cards debit a ledger and never go below zero, bundles and "3 for 2" apply at line level with the order discount allocated by largest remainder, the free-shipping threshold is an automatic rule per market, and gift wrap is a priced product line.

- [ ] **5.8 Checkout and order placement** · needs: 5.4, 5.5, 5.6, 5.17
  - **Lane** DOM · **Agent** senior-be (DOM-B) · **Wave** W13 · 5D
  - **Owns** `engine/packages/domain/src/{orders,checkout,offers,holds}/**` (not their `machine.ts`, which are C8)
  - **Read** COMMERCE.md §5–7, PAYMENTS.md §1–3
  - _Requirements: 9.3, 9.5, 9.6, 9.7, 10.1, 10.4, 11.6_
  - [ ] 5.8.a `CheckoutVM.steps` derived from seller, destination and lines
  - [ ] 5.8.b Order placement snapshotting every figure: lines, pipeline, tax, FX, seller
  - [ ] 5.8.c The payment step: take the checkout lock, `extend()` it at method choice to the method's `sessionTtl` + margin (no cash-at-retail for a unique item), and create the payment attempt idempotently — a retry returns its stored `SessionResult`
  - [ ] 5.8.d Offers (non-binding, D22): submit, auto-decline below the floor, accept → an offer hold and a payment link that expires before it; staff holds
  - [ ] 5.8.e Every transition through the 5.17 machine runner
  - [ ] 5.8.f **Check:** `CheckoutVM.steps` derive from seller, destination and lines; placing an order snapshots every figure; the checkout lock is taken at the payment step and **extended at method choice** to that method's `sessionTtl` + margin (no cash-at-retail for a unique item); the payment step creates a payment attempt idempotently and returns its **stored `SessionResult`** on a retry; offers are non-binding (D22), auto-decline below the floor, and an accepted offer creates an offer hold and a payment link that expires before it; every transition goes through the 5.17 machine runner.

- [ ] **5.9 Payments core** · needs: 0.5.f; E needs 5.3, 5.8
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W14 · 5E — 5.9.a runs earlier, in W9 · 5A
  - **Owns** `engine/packages/payments/src/{registry,routing,limits.ts,reconcile,links,boot-check,adapters/manual,adapters/bank-transfer}/**`, `engine/packages/http/src/webhooks/payments/**`, `engine/packages/http/src/cron/reconcile/**`, `tests/contract/payments/**`
  - **Read** PAYMENTS.md
  - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.8, 18.7_
  - [ ] 5.9.a provider registry per seller (secrets as `PAYMENT_<SELLER>_<PROVIDER>_*`) + the shared contract suite: signature failure, duplicate, out-of-order, **crash after the dedupe insert**, pending → settlement, refund idempotency, a session outliving its reservation window, late payment after the item sold
  - [ ] 5.9.b routing with `limits.ts` (sourced, dated caps)
  - [ ] 5.9.c the thin webhook handler (parse → retrieve → apply; no business logic)
  - [ ] 5.9.d reconciliation cron route `/api/x/cron/reconcile`
  - [ ] 5.9.e payment links `/pay/{token}`; manual and bank-transfer providers (instructions, proforma reference)
  - [ ] 5.9.f the payments part of the boot check: sandbox/live key vs environment
  - [ ] 5.9.g **Check:** routing offers only allowed methods with dated caps (no retail method for a unique item); the webhook handler at `/api/x/webhooks/payments/{provider}` verifies the signature on the raw body, calls `retrieve()` where the adapter says so, and hands one normalised event to `domain.applyPaymentEvent()` (5.18), answering 200 only after it commits and 5xx otherwise; reconciliation runs every 10 minutes through the same path; payment links work; `manual` and `bank-transfer` pass the contract suite.

- [ ] **5.10 👤 Midtrans adapter (sandbox)** · needs: 5.9.a · 👤 a Midtrans sandbox merchant account and keys
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W11 · 5B
  - **Owns** `engine/packages/payments/src/adapters/midtrans/**`
  - **Read** PAYMENTS.md §2–4, §6; Midtrans docs (Snap, Core API, notification signature, status API)
  - _Requirements: 11.1, 11.3, 11.7_
  - [ ] 5.10.a 👤 The owner opens a Midtrans **sandbox** merchant account; its keys go into Infisical, never into chat
  - [ ] 5.10.b Snap redirect and Core API sessions (virtual account, QRIS) in IDR, each method's `sessionTtl` declared
  - [ ] 5.10.c The notification signature check, `retrieve()` before applying, and the `providerEventId` hash
  - [ ] 5.10.d `cancel`, refunds, and manual refund tasks for VA and retail
  - [ ] 5.10.e Recorded sandbox fixtures and the shared contract suite
  - [ ] 5.10.f **Check:** Snap redirect and Core API VA/QRIS sessions are created in IDR with each method's `sessionTtl` declared; notifications are signature-verified and **re-fetched with `retrieve()` before they are applied**; `providerEventId` is the hash of `transaction_id | transaction_status | fraud_status | status_code` (Midtrans sends no event id), so a repeated status dedupes and a new status does not; `cancel`, refunds (or manual refund tasks for VA/retail) work; and the adapter passes the contract suite against recorded sandbox fixtures.

- [ ] **5.11 Shipping basics and duties** · needs: 0.5.f, 2.4
  - **Lane** LOG · **Agent** medior · **Wave** W11 · 5B
  - **Owns** `engine/packages/shipping/src/{profiles,rates,duties,adapters/{flat,quote,collect}}/**`
  - **Read** COMMERCE.md §8, COMPLIANCE.md §3–4
  - _Requirements: 10.3, 12.1, 12.2, 12.3_
  - [ ] 5.11.a Shipping profiles and flat zone tables per seller and destination
  - [ ] 5.11.b Pickup at stocked locations; "quote required" above the insured threshold
  - [ ] 5.11.c The duties estimate per destination (a data table)
  - [ ] 5.11.d All of it through the `ShippingProvider` contract, with unit tests
  - [ ] 5.11.e **Check:** shipping profiles, flat zone tables, pickup at stocked locations, quote-required for originals above the insured threshold, and a per-destination duties estimate (data table) work through the `ShippingProvider` contract.

- [ ] **5.12 Commerce API handlers** · needs: 5.5–5.9, 5.15, 5.18
  - **Lane** DOM (+ WEB for mounting) · **Agent** senior-be (DOM-C) · **Wave** W15 · 5F
  - **Owns** `engine/packages/http/src/commerce/**` (not `commerce/destination/**`, 5.3's), app `src/app/api/x/commerce/**` re-exports
  - **Read** C6, C13, COMMERCE.md
  - _Requirements: 8.8, 19.5_
  - [ ] 5.12.a Handlers under `/api/x/commerce/…`: cart, ship-to, checkout, offer, hold request, price request, enquiry
  - [ ] 5.12.b Consignment, appointment, return request, order lookup and quote
  - [ ] 5.12.c zod validation on every input, client prices ignored, rate limits
  - [ ] 5.12.d Mounted in both apps, parity green
  - [ ] 5.12.e **Check:** cart, ship-to, checkout, offer, hold request, price request, enquiry, consignment, appointment, return request, order lookup and quote endpoints under `/api/x/commerce/…` validate input with zod, ignore any client price, are rate-limited, and are mounted in both apps (parity green; the manifest entries were declared in C13).

- [ ] **5.13 Transactional notifications and the documents job** · needs: 0.5.g; E needs 5.8, 5.17
  - **Lane** NTF · **Agent** medior · **Wave** W14 · 5E — 5.13.a runs earlier, in W9 · 5A
  - **Owns** `engine/packages/{mail,documents}/**`
  - **Read** COMMERCE.md §12–13, ANALYTICS.md §1–2
  - _Requirements: 10.5, 13.5_
  - [ ] 5.13.a template system and senders (SMTP), bilingual, list-unsubscribe where marketing
  - [ ] 5.13.b event → template wiring; PDF job infrastructure (confirmation, proforma; COA and commercial invoice in 8.6)
  - [ ] 5.13.c email design system per brand (senior-uiux): layouts that work with images off and in dark-mode clients, stay under Gmail's 102 KB clipping limit and render in Outlook; the payment-instructions email designed as carefully as the payment-pending page; the newsletter layout for 10.4
  - [ ] 5.13.d **Check:** EN/ID templates exist for order received/paid, payment instructions (VA, QR), pickup ready, shipped, refund, return received, offer received/accepted/countered/expired, hold granted/expiring, enquiry acknowledged + staff alert, consignment received; WhatsApp deep links are built; a Payload job renders order PDFs; **the outbox dispatcher (5.17) triggers them** — never a request handler — with the event id as the idempotency key (Mailpit in CI).

- [ ] **5.15 Returns** · needs: 5.8, 5.6
  - **Lane** DOM · **Agent** senior-be (DOM-B) · **Wave** W14 · 5E
  - **Owns** `engine/packages/domain/src/returns/**`
  - **Read** COMMERCE.md §11, COMPLIANCE.md §6
  - _Requirements: 10.6_
  - [ ] 5.15.a The return request per order line and its states (requested → approved → received → refunded | rejected), through the machine runner
  - [ ] 5.15.b Refunds through the gateway adapter or as a tracked manual refund task; partial refunds allocated by largest remainder
  - [ ] 5.15.c `reverse` for a unique item only after staff confirm it is back in the drawer; restock for counted stock
  - [ ] 5.15.d **Check:** a return request per order line moves through its states (requested → approved → received → refunded | rejected), a refund goes through the gateway adapter or becomes a tracked manual refund task, a partial refund across lines is allocated by largest remainder, a unique item's `reverse` puts it back on sale only after staff confirm it is back in the drawer, and every step writes its domain event.

- [ ] **5.16 Document numbering and the tax export** · needs: 5.6, 5.8
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W14 · 5E
  - **Owns** `engine/packages/domain/src/{documents,tax-export}/**`
  - **Read** COMMERCE.md §9, §12, COMPLIANCE.md §3
  - _Requirements: 8.6, 8.10_
  - [ ] 5.16.a Gapless numbering per seller and series from `engine.document_sequences`, inside the transaction that issues the document
  - [ ] 5.16.b A concurrency test: no gap, no duplicate
  - [ ] 5.16.c The per-seller CSV export, one row per document: date, number, customer country, net, tax base, tax, currency, FX snapshot
  - [ ] 5.16.d **Check:** every seller's orders, invoices, credit notes and receipts are numbered **gaplessly per series** from `engine.document_sequences` inside the transaction that issues them (a concurrency test proves no gap and no duplicate), and a per-seller export (CSV, per document: date, number, customer country, net, tax base, tax, currency, FX snapshot) reproduces the tax figures the accountant files.

- [ ] **5.17 State machines and the outbox** · needs: 5.1, 0.5.g
  - **Lane** DOM · **Agent** senior-be (DOM-D), reviewed by senior-db · **Wave** W12 · 5B
  - **Owns** `engine/packages/domain/src/{machines,outbox,availability}/**` (not `availability/machine.ts`, which is C8), `engine/packages/http/src/cron/outbox/**`
  - **Read** COMMERCE.md §6, §13, ANALYTICS.md §1
  - _Requirements: 10.4, 19.12_
  - [ ] 5.17.a The machine runner enforcing the C8 tables for order, payment, reservation and offer — an illegal transition throws
  - [ ] 5.17.b The outbox writer: each transition's event into `engine.domain_events` in the same transaction
  - [ ] 5.17.c Availability as a pure function of product status and live reservations, never stored
  - [ ] 5.17.d The dispatcher job: at-least-once delivery with event ids and backoff, to email, analytics, the sister webhook and `invalidate(tags)`
  - [ ] 5.17.e A rollback test proving an event never leaves a rolled-back transaction
  - [ ] 5.17.f **Check:** one machine runner enforces the C8 tables for order, payment, reservation and offer — an illegal transition throws — and **writes each transition's domain event to `engine.domain_events` in the same transaction**; availability is a pure function of product status and live reservations, never stored; a dispatcher job (run by the jobs queue) delivers each event **at least once** with its id to its consumers (email, analytics, sister webhook, cache invalidation) and retries with backoff; a test rolls back a transaction and proves its event never leaves.

- [ ] **5.18 The payment-event pipeline — `applyPaymentEvent()`** · needs: 5.4, 5.8, 5.17
  - **Lane** DOM · **Agent** senior-be (DOM-B), reviewed by senior-db and senior-integrator · **Wave** W14 · 5E
  - **Owns** `engine/packages/domain/src/payments/**` (not its `machine.ts`)
  - **Read** PAYMENTS.md §1, §4, ARCHITECTURE.md §6
  - _Requirements: 9.8, 11.3, 11.6_
  - [ ] 5.18.a The one transaction: `INSERT … engine.payment_events … ON CONFLICT DO NOTHING RETURNING id`, then the payment transition, reservation conversion, order transition and outbox events
  - [ ] 5.18.b Capture or settlement only while the reservation is live
  - [ ] 5.18.c The late-payment path: re-reserve if the item is still free, otherwise void or refund automatically and tell the buyer
  - [ ] 5.18.d Stale and out-of-order events never move a machine backwards; the crash-after-dedupe contract test passes
  - [ ] 5.18.e **Check:** `applyPaymentEvent()` runs **one** transaction — `INSERT … engine.payment_events … ON CONFLICT DO NOTHING RETURNING id` (no row → commit as a no-op), then the payment transition, reservation conversion, order transition and outbox events — and any failure rolls back **the dedupe row too**, so the provider's retry applies it once (the crash-after-dedupe contract test passes); capture or settlement happens only while the reservation is live; a **late payment** re-reserves the item if it is still free, otherwise voids or refunds automatically and notifies the buyer; a stale or out-of-order event never moves a machine backwards.

- [ ] **5.14 👤 Phase 5 gate** · needs: 5.1–5.13, 5.15–5.18 · 👤 the Midtrans sandbox keys in staging's `shared/.env`
  - **Lane** QA · **Agent** qa · **Wave** W16
  - **Owns** `docs/gates/phase-5.md`
  - **Read** the phase's **Done when**
  - _Requirements: 8.1–8.10, 9.1–9.9, 10.1, 10.4, 10.6, 11.1–11.8_
  - [ ] 5.14.a 👤 The Midtrans sandbox keys in staging's `shared/.env` (through Infisical)
  - [ ] 5.14.b The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build
  - [ ] 5.14.c On staging: the concurrency test against the real database, a sold-item re-reservation attempt, a duplicate-webhook replay, and a forced crash between the dedupe insert and the commit
  - [ ] 5.14.d On staging: the multi-line shop cart to a Bali address — IDR only, no QRIS above IDR 10 m, paid by virtual account in the Midtrans sandbox, emails arriving — and every order reproducing its own total
  - [ ] 5.14.e Evidence per clause in `docs/gates/phase-5.md`; every failure filed as a subtask of the task that owns it and re-run after the fix
  - [ ] 5.14.f **Check:** the phase's **Done when** runs on staging with the Midtrans sandbox, including the concurrency test against the real database, a sold-item re-reservation attempt, a duplicate-webhook replay and a forced crash between the dedupe insert and the commit — evidenced in `docs/gates/phase-5.md`.

---

## Phase 6 — The Indies Gallery storefront · W16–W20 · ~12d

**Goal:** every gallery surface on real data, built to its brief, with the item page, every purchase state and the conversations a gallery lives on.
**Done when:** the 1.1.c gallery journeys pass on a phone — a visitor lands on a
place page, filters Java maps under USD 2,000, zooms an item's verso, requests the
price or reserves or buys it in the sandbox and gets the confirmation; an
institution turns a cart into a proforma; a sold item shows its available
alternative and "own a print of this map" and takes an alert — budgets pass on
home, browse and item; axe is clean; real buyers have run the journeys (6.9); the
design gate passes.
**Phase letters:** A 6.1, 6.2, 6.3, 6.5, 6.7 · B 6.4, 6.6 · C 6.8 · D 6.9 👤 · gate 6.10 — UI agents start on fixtures and switch to loaders when 6.1 lands.

- [ ] **6.1 Gallery loaders** · needs: Phase 2, 4.3, 4.7, 5.12
  - **Lane** WEB · **Agent** senior-fe · **Wave** W16 · 6A
  - **Owns** `engine/packages/loaders/src/{home,browse,search,item,maker,place,source,exhibition,location,curation,story,page,form,cart,checkout,order,pay,quote,order-lookup,newsletter-archive}.ts` (Payload source)
  - **Read** DESIGN-SYSTEM.md §2–3, §7, ARCHITECTURE.md §9, §12
  - _Requirements: 1.2, 3.11, 6.3, 6.4, 6.10, 6.11, 19.4, 19.12_
  - [ ] 6.1.a The Payload source for every gallery surface, through the 3.6 read helper
  - [ ] 6.1.b `loadItem` by public id, returning `redirectTo` on a slug mismatch; the viewer-relative purchase states, *enquiry-only* included
  - [ ] 6.1.c Content under `'use cache'` + `cacheTag`; availability, the ship-to market and the cart inside `<Suspense>`, streaming into reserved placeholders
  - [ ] 6.1.d Tests: never stale-available from cache, no purchase control before availability (with a CLS assertion), no draft or private field in any response
  - [ ] 6.1.e **Check:** every gallery surface loads real, **published-only, projected** data into its VM through the 3.6 read helper (`overrideAccess: false`, `_status: 'published'`, `select`), including the viewer-relative purchase states and *enquiry-only*; `loadItem` resolves `/product/{id}-{slug}` by public id and returns `redirectTo` when the slug differs; content is `'use cache'` + `cacheTag`; availability, the ship-to market and the cart are read inside `<Suspense>` and **stream into a reserved placeholder** — tests prove a sold item is never served as available from cache (its tags expire immediately), no purchase control renders before availability resolves (with a CLS assertion), and a draft or a private field never reaches a response.

- [ ] **6.2 Home, browse and search** · needs: 3.5
  - **Lane** UXG · **Agent** senior-uiux (UXG-A) · **Wave** W16 · 6A
  - **Owns** `engine/apps/gallery/src/surfaces/{home,browse,search,not-found}/**` + their route folders
  - **Read** EXPERIENCE-GALLERY.md §3–4, §10; the 3.9 surface briefs
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_
  - [ ] 6.2.a Home bands from the homepage global
  - [ ] 6.2.b Browse: available by default with the sold toggle; the facet bottom sheet on phones (chips, live count, number inputs, sticky apply/clear); sort; named facet URLs
  - [ ] 6.2.c Search without JavaScript; the zero-results page ("not all 9,500 works are online — ask us", a prefilled enquiry, historical-name suggestions, Indonesian queries, a want-list)
  - [ ] 6.2.d The designed 404, 410 and 500
  - [ ] 6.2.e **Check:** home bands follow the homepage global; browse defaults to available with the sold toggle, the full facet set in a bottom sheet on phones (applied-filter chips, live count on apply, number inputs beside sliders, sticky apply/clear), working sort, named facet URLs; search works without JavaScript; **zero results never dead-end** ("not all 9,500 works are online — ask us" with a prefilled enquiry, historical-name suggestions, Indonesian queries, a want-list); 404, 410 and 500 are the designed pages.

- [ ] **6.3 The item page** · needs: 3.5, 4.5
  - **Lane** UXG · **Agent** senior-uiux (UXG-B) · **Wave** W16 · 6A
  - **Owns** `engine/apps/gallery/src/surfaces/item/**` (not `item/purchase/**`, 6.4's) + the item route folder `app/(site)/[locale]/item/[idSlug]/**`
  - **Read** EXPERIENCE-GALLERY.md §5–6, §8, DESIGN-SYSTEM.md §2
  - _Requirements: 4.5, 4.6, 6.1, 6.8, 6.10_
  - [ ] 6.3.a The item route: `permanentRedirect()` on `redirectTo`, `notFound()` on null
  - [ ] 6.3.b The title block with the designed hook-title fallback; media with the viewer on intent; the static scale view; the primary image as LCP
  - [ ] 6.3.c The record: collation (and the book variant for volumes), condition linked to the scale, references, provenance, stock number
  - [ ] 6.3.d Context (essay, maker, locator map, related) and utilities (wishlist/alert, share, print, factsheet PDF, sister prints, the consign block)
  - [ ] 6.3.e **Check:** the item route calls `permanentRedirect()` on a `redirectTo` and `notFound()` on null; the title block (with the designed hook-title fallback), media with the viewer on intent, the static scale view, the record (collation — and the book variant for volumes — condition linked to the scale, references, provenance, stock number), context (essay, maker, locator map, related) and utilities (wishlist/alert, share, print, factsheet PDF, sister prints, consign block) render from real data; the primary image is the LCP.

- [ ] **6.4 Purchase panel and flows** · needs: 6.3, 5.12, 3.8
  - **Lane** UXG · **Agent** senior-uiux (UXG-B) · **Wave** W17 · 6B
  - **Owns** `engine/apps/gallery/src/surfaces/item/purchase/**`
  - **Read** COMMERCE.md §7, EXPERIENCE-GALLERY.md §5, §8
  - _Requirements: 6.2, 6.3, 6.4, 6.7, 6.11, 8.2, 9.3, 9.6, 16.8_
  - [ ] 6.4.a design the purchase-state matrix (tier × status × viewer relation × export status × ship-to × signed in) before building it
  - [ ] 6.4.b build every state; e2e over the fixture set
  - [ ] 6.4.c **Check:** every combination in the purchase-state matrix renders its designed state from the 3.8 fixtures; request price answers in place; a **make-an-offer** flow states plainly that offers are non-binding (D22) and shows the offer's status in the panel; an enquiry-only original (no known location) offers Enquire and Book a viewing, never Buy; sold pages put "own a print of this map" in the primary position; WhatsApp is prefilled (from the lexicon) with stock number and title; a `domestic-only` item seen from abroad reads "Available for delivery within Indonesia · View it in Jakarta"; each flow reaches its API and shows its confirmation.

- [ ] **6.5 Makers, places, sources, curations, catalogues, exhibitions and stories** · needs: 3.5
  - **Lane** UXG · **Agent** senior-uiux (UXG-C) · **Wave** W16 · 6A
  - **Owns** `engine/apps/gallery/src/surfaces/{maker,place,source,collection,catalogue,exhibition,story,newsletter-archive}/**` + routes
  - **Read** EXPERIENCE-GALLERY.md §7
  - _Requirements: 6.5, 13.4, 15.3_
  - [ ] 6.5.a Maker and place pages (modern and historical names) with available and sold works
  - [ ] 6.5.b Source pages, and web-native catalogue pages with live availability
  - [ ] 6.5.c Exhibition pages and the newsletter archive
  - [ ] 6.5.d Stories with the scholarly blocks and the "originals in this story" / "prints from this story" rails
  - [ ] 6.5.e **Check:** each page renders real data with available and sold works, the place page shows modern and historical names, **web-native catalogue pages** show live availability (the printable PDF is v2, 14.2), exhibitions list fairs and viewings, stories use the scholarly blocks (`zoomFigure` opening the viewer at a region, `compare`, sidenotes citing sources) and carry "originals in this story" and "prints from this story" rails, and past newsletters are archived as pages.

- [ ] **6.6 Trust pages, forms, consignment, viewings and proformas** · needs: 6.5, 5.12
  - **Lane** UXG · **Agent** senior-uiux (UXG-C) · **Wave** W17 · 6B
  - **Owns** `engine/apps/gallery/src/surfaces/{page,form,quote,location}/**` + routes
  - **Read** EXPERIENCE-GALLERY.md §9, COMPLIANCE.md §6, COMMERCE.md §7
  - _Requirements: 6.6, 6.9, 18.4_
  - [ ] 6.6.a Page templates serving the trust pages from the CMS
  - [ ] 6.6.b Consignment: the phone camera, HEIC, per-file progress with retry, the "what happens next" timeline
  - [ ] 6.6.c Viewing booking: time zones, `.ics`, the reminder (WhatsApp once D14 is chosen, email until then), rescheduling, the wishlist as a pull list; the location page
  - [ ] 6.6.d The framing quote; a cart → multi-item proforma on the `Quote` surface (PO field, PDF, "pay this proforma")
  - [ ] 6.6.e **Check:** page templates serve guarantee, authentication, grades, certificate, shipping & insurance, framing & conservation, institutions, visit and FAQ from the CMS; consignment uses the phone camera, accepts HEIC, shows per-file progress with retry and a "what happens next" timeline; viewing booking shows the location's time zone, sends an `.ics`, reminds on WhatsApp, can be rescheduled and attaches the wishlist as a pull list; the framing quote has its flow; a cart becomes a multi-item proforma on the `Quote` surface with a PO field, PDF and "pay this proforma".

- [ ] **6.7 Cart, checkout, payment and order pages** · needs: 3.5, 5.8 (VMs), 5.12
  - **Lane** UXG · **Agent** senior-fe (UXG-D) · **Wave** W16 · 6A
  - **Owns** `engine/apps/gallery/src/surfaces/{cart,checkout,order,pay,order-lookup}/**` + routes
  - **Read** COMMERCE.md §5, PAYMENTS.md §2–5, DESIGN-SYSTEM.md §2
  - _Requirements: 9.3, 10.1, 10.5, 10.7, 11.5, 18.3_
  - [ ] 6.7.a Cart and checkout rendering the steps the VM contains and every `SessionResult` kind
  - [ ] 6.7.b The lock countdown surviving a 3-D Secure redirect; its expiry mid-payment as a designed state; "someone else was first" with alternatives and a want-list
  - [ ] 6.7.c Bank transfer for a high-value item (how long it is held, the SWIFT instructions, what happens at expiry); the `Pay` page for staff-sent links
  - [ ] 6.7.d Guest order lookup; confirmation and order pages with the seller identity and documents
  - [ ] 6.7.e **Check:** checkout renders the steps its VM contains and every `SessionResult` kind (embedded, redirect, instructions, QR, manual); the lock countdown survives a 3-D Secure redirect, and its expiry mid-payment is a designed state; "someone else was first" offers alternatives and a want-list; a bank transfer for a high-value item shows how long it is held, the SWIFT instructions and what happens at expiry; the `Pay` page serves staff-sent links; guests can look an order up; confirmation and order pages show the seller identity and documents.

- [ ] **6.8 Gallery polish and end-to-end** · needs: 6.2–6.7
  - **Lane** QA + UXG lead · **Agent** qa, senior-uiux · **Wave** W18 · 6C
  - **Owns** `tests/e2e/gallery/**`
  - _Requirements: 19.1, 19.2, 19.11_
  - [ ] 6.8.a e2e for every 1.1.c gallery journey on a production build — desktop, phone and the WhatsApp in-app browser
  - [ ] 6.8.b impeccable `audit` and `polish`, and the fixes
  - [ ] 6.8.c LHCI budgets and axe green; the reference-device check on 4G recorded
  - [ ] 6.8.d **Check:** every 1.1.c gallery journey passes e2e on a production build (desktop, phone, and the WhatsApp in-app browser); impeccable `audit` and `polish` findings are fixed; LHCI budgets and axe pass; the reference-device check on 4G is recorded.

- [ ] **6.9 👤 Usability runs with real buyers** · needs: 6.8
  - **Lane** QA + UXG · **Agent** qa, senior-uiux · **Wave** W19 · 6D
  - **Owns** `docs/design/research/gallery-usability/**`
  - _Requirements: 19.10_
  - [ ] 6.9.a 👤 Recruit five buyers — collectors, a designer, a diaspora buyer; at least one session in Indonesian
  - [ ] 6.9.b Run the journeys on staging, recording task times and success
  - [ ] 6.9.c Fix every blocker, or file it as a task, before the gate
  - [ ] 6.9.d **Check:** five buyers (collectors, a designer, a diaspora buyer; at least one in Indonesian) have run the journeys on staging with task times and success recorded, and every blocker is fixed or filed before the gate.

- [ ] **6.10 Phase 6 gate — with the design gate** · needs: 6.1–6.9
  - **Lane** QA + UXG · **Agent** qa, senior-uiux · **Wave** W20
  - **Owns** `docs/gates/phase-6.md`
  - **Read** the phase's **Done when**, DESIGN-SYSTEM.md §13
  - _Requirements: 6.1–6.12, 19.10_
  - [ ] 6.10.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 6.10.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-6.md`
  - [ ] 6.10.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 6.10.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 6.10.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 6.10.f **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-6.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

---

## Phase 7 — The Old East Indies storefront · W16–W21 · ~12d

**Goal:** every shop surface on real data, built to its brief: the configurator, both checkout flows, the payment-pending page, gifts, guests and the showroom.
**Done when:** the 1.1.c shop journeys pass on a phone **inside the Instagram
in-app browser** — a visitor opens a collection, configures the largest giclée
the seed scan allows (≈ 37 cm on the long edge at 240 ppi, D26) with a teak frame
and mount, sees it to scale, adds gift wrap and a voucher, pays by QRIS (or VA,
following the payment-pending page) in the sandbox in IDR only, and tracks the
order as a guest; a tourist switches ship-to to the Netherlands and sees euro
prices and a duties estimate; a showroom QR opens the in-showroom mode; budgets
pass; axe is clean; real buyers have run the journeys (7.9); the design gate passes.
**Phase letters:** A 7.1, 7.2, 7.3, 7.4.a, 7.5, 7.6 · B 7.4.b, 7.8 · C 7.7 · D 7.9 👤 · gate 7.10

- [ ] **7.1 Shop loaders** · needs: Phase 2, 4.3, 4.7, 5.12
  - **Lane** WEB · **Agent** senior-fe · **Wave** W16 · 7A
  - **Owns** `engine/packages/loaders/src/{design,collection,product-type,ig,showroom,gift-card,business-quote}.ts` (shop-specific; the shared loaders are 6.1's, and a change one of them needs for the shop is routed to 6.1's agent, not made here)
  - **Read** DESIGN-SYSTEM.md §2–3, ARCHITECTURE.md §9, §12
  - _Requirements: 1.2, 3.11, 7.5, 8.3, 19.12_
  - [ ] 7.1.a The Payload source for the shop-specific loaders, through the 3.6 read helper
  - [ ] 7.1.b `DesignVM` and variant pricing for the current destination (rupiah only for Indonesia)
  - [ ] 7.1.c `IgVM` from the CMS-curated posts, `LocationVM` with showroom stock, `GiftCardVM`
  - [ ] 7.1.d The same cache and streaming rules, and tests, as 6.1
  - [ ] 7.1.e **Check:** every shop surface loads real, published-only, projected data through the 3.6 read helper, including `DesignVM`, the variant-pricing VMs for the current destination (rupiah only for Indonesia), `IgVM` from the CMS-curated posts (an Instagram API feed is v2), `LocationVM`/showroom stock and `GiftCardVM`; the same cache and streaming rules as 6.1 hold.

- [ ] **7.2 Home, menus, collections, places & eras, gifts, search and filters** · needs: 3.5
  - **Lane** UXE · **Agent** senior-uiux (UXE-A) · **Wave** W16 · 7A
  - **Owns** `engine/apps/emporium/src/surfaces/{home,browse,search,collection}/**` + routes
  - **Read** EXPERIENCE-SHOP.md §2–3
  - _Requirements: 7.4, 5.3_
  - [ ] 7.2.a The Shop mega-menu and home bands
  - [ ] 7.2.b Collections, places & eras, and gifts by price, recipient and occasion
  - [ ] 7.2.c The filter sheet and sort; tiles showing the destination's valid "From" price; empty bands omitted
  - [ ] 7.2.d The designed 404, 410 and 500
  - [ ] 7.2.e **Check:** the Shop mega-menu, collections, places & eras, gifts by price/recipient/occasion, the filter sheet and sorting work on real data; tiles show the "From" price valid for the destination; empty bands (reviews, Instagram photos) are omitted, never shown empty; 404, 410 and 500 are the designed pages.

- [ ] **7.3 The product page** · needs: 3.5
  - **Lane** UXE · **Agent** senior-uiux (UXE-B) · **Wave** W16 · 7A
  - **Owns** `engine/apps/emporium/src/surfaces/item/**` + route
  - **Read** EXPERIENCE-SHOP.md §4
  - _Requirements: 7.1, 7.5, 7.6, 15.3, 18.7_
  - [ ] 7.3.a Images and the title block (Archive No., Reproduction label, badge, live price)
  - [ ] 7.3.b The delivery promise from the holiday calendar, a shipping estimate for the saved district, the stated COD position
  - [ ] 7.3.c The sticky buy bar with WhatsApp merged in (prefilled from the lexicon), the trust row, story, specs and "more with this image"
  - [ ] 7.3.d The original's status (market currency, export status respected, the separate-account note); the in-showroom mode from a showroom QR
  - [ ] 7.3.e **Check:** images, the title block (Archive No., Reproduction label, badge, live price), the delivery promise (reading the holiday calendar) with a shipping estimate for the saved district and the stated COD position, the sticky buy bar with WhatsApp merged in and prefilled from the lexicon, trust row, story, the original's status (price in the visitor's market currency, export status respected, the separate-account note), specs and "more with this image" render from real data; a page opened from a showroom QR switches to the in-showroom mode.

- [ ] **7.4 The configurator** · needs: 2.4, 5.2
  - **Lane** WEB (7.4.a) + UXE (7.4.b) · **Agent** senior-fe, senior-uiux (UXE-B) · **Wave** 7.4.a in W17 · 7A · 7.4.b in W18 · 7B
  - **Owns** `engine/packages/ui/src/configurator/**` (7.4.a), `engine/apps/emporium/src/surfaces/item/configurator/**` (7.4.b)
  - **Read** EXPERIENCE-SHOP.md §5, COMMERCE.md §3
  - _Requirements: 4.4, 7.2, 7.3, 19.1, 19.2_
  - [ ] 7.4.a headless configurator state machine, constraint evaluation, URL codec, GET-form fallback (unit-tested)
  - [ ] 7.4.b configurator UI and layered preview (scan, mount, frame, shadow; three views; pinned on phones)
  - [ ] 7.4.c **Check:** the options are server-rendered radio groups in a GET form that works without JavaScript and hydrates progressively; constraints from the product type disable impossible combinations with a reason; the price updates instantly from the destination's price table shipped with the page (display only — the bag re-prices on the server and shows any difference); the preview (pre-sized AVIF, 9-slice frames, pre-composited room plates, SVG scale) loads on intent and renders flat/on a wall/to scale in under 100 ms **measured on the reference device**; the configuration round-trips through the URL; swatches are named with ≥ 24 px targets and a text summary.

- [ ] **7.5 Design pages, stories, For Business, `/ig`, showroom, gift cards** · needs: 3.5, 5.12
  - **Lane** UXE · **Agent** senior-uiux (UXE-C) · **Wave** W17 · 7A
  - **Owns** `engine/apps/emporium/src/surfaces/{design,story,page,form,quote,ig,showroom,gift-card}/**` + routes
  - **Read** EXPERIENCE-SHOP.md §6, §8–9
  - _Requirements: 7.7, 7.8_
  - [ ] 7.5.a Design pages listing every product made from one design
  - [ ] 7.5.b Stories with shop-the-story rails and `shoppableImage` hotspots
  - [ ] 7.5.c For Business → the quote page (lines, validity, PDF, accept → payment link), and "Turn this into a quote" from a configured product
  - [ ] 7.5.d `/ig` from the CMS-curated posts; the showroom page ("In the showroom now", hours, map); gift cards (choose, schedule for a recipient, check a balance)
  - [ ] 7.5.e **Check:** a design page lists every product from one design; stories carry shop-the-story rails and `shoppableImage` hotspots; the business enquiry becomes a **quote page** (lines, validity, PDF, accept → payment link) that a configured product can also start ("Turn this into a quote"); `/ig` shows the posts staff curate in the CMS, each linked to the products it shows (no Instagram API at launch); the showroom page shows "In the showroom now" stock with hours and map; gift cards can be chosen, scheduled for a recipient, and checked for balance.

- [ ] **7.6 Bag drawer, checkout, payment-pending and order pages** · needs: 3.5, 5.8, 5.12
  - **Lane** UXE · **Agent** senior-fe (UXE-D) · **Wave** W17 · 7A
  - **Owns** `engine/apps/emporium/src/surfaces/{cart,checkout,order,pay}/**` + routes
  - **Read** EXPERIENCE-SHOP.md §7, COMMERCE.md §5, PAYMENTS.md §3, DESIGN-SYSTEM.md §2, §12
  - _Requirements: 7.9, 7.11, 10.1, 10.2, 10.3, 10.8, 12.3, 18.7, 19.11_
  - [ ] 7.6.a The bag drawer (free-shipping bar, upsells, voucher field) and every bag edge case with a fixture and a designed state, including re-pricing to IDR with a notice
  - [ ] 7.6.b The Indonesian checkout: WhatsApp first (+62), one full-name field, searchable address pickers with an optional pin; the "I'm visiting Bali" path; gift options
  - [ ] 7.6.c Routed methods only; the payment-pending page (VA copy, per-bank steps, a countdown matching the session's real expiry, the cap warning, auto-switch to paid, QRIS save-to-gallery and e-wallet deep links, retry keeping the bag)
  - [ ] 7.6.d The in-app-browser hint; the `Pay` page; the export flow with market currency and duties
  - [ ] 7.6.e **Check:** the drawer shows the free-shipping bar, upsells and voucher field, and **every bag edge case** in EXPERIENCE-SHOP.md §7 has a fixture and a designed state — including the bag re-pricing to IDR with a visible notice when ship-to moves to Indonesia; the Indonesian flow asks WhatsApp first (normalised to +62), uses one full-name field and searchable address pickers with an optional pin; the "I'm visiting Bali" path works (deliver before a date, pickup, send home); gift options (recipient address, note preview, prices hidden, target date); payment shows only routed methods; the **payment-pending page** (VA copy, per-bank steps, countdown matching the session's real expiry, cap warning, auto-switch to paid; QRIS save-to-gallery and e-wallet deep links; retry keeps the bag) is complete; an in-app browser gets "open in your browser" where a payment cannot complete; the `Pay` page serves staff-sent links; the export flow shows market currency and duties.

- [ ] **7.7 Shop polish and end-to-end** · needs: 7.2–7.6, 7.8
  - **Lane** QA + UXE lead · **Agent** qa, senior-uiux · **Wave** W19 · 7C
  - **Owns** `tests/e2e/emporium/**`
  - _Requirements: 19.1, 19.2, 19.11_
  - [ ] 7.7.a e2e for every 1.1.c shop journey on a production build — desktop, phone, and the Instagram, WhatsApp and TikTok in-app browsers
  - [ ] 7.7.b impeccable findings fixed
  - [ ] 7.7.c Budgets and axe green; the reference-device check on Telkomsel 4G in Bali recorded
  - [ ] 7.7.d **Check:** every 1.1.c shop journey passes e2e on a production build (desktop, phone, and the Instagram, WhatsApp and TikTok in-app browsers); impeccable findings are fixed; budgets and axe pass; the reference-device check on Telkomsel 4G in Bali is recorded.

- [ ] **7.8 Guest order tracking and pickup confirmation** · needs: 7.6, 5.13
  - **Lane** UXE · **Agent** senior-fe · **Wave** W18 · 7B
  - **Owns** `engine/apps/emporium/src/surfaces/order-lookup/**` + route (the gallery's own lookup page is 6.7's; both follow the one 3.9 brief)
  - **Read** EXPERIENCE-SHOP.md §7, DESIGN-SYSTEM.md §2
  - _Requirements: 7.10_
  - [ ] 7.8.a Lookup by order number plus email or WhatsApp number — rate-limited, the same answer for a wrong pair and an unknown order
  - [ ] 7.8.b The courier timeline, and the tracking link in every WhatsApp update
  - [ ] 7.8.c Pickup orders: a code or QR, the "ready" notice, hours, map and who may collect
  - [ ] 7.8.d **Check:** a guest finds an order by order number plus email or WhatsApp number (rate-limited, answering the same for a wrong pair and an unknown order) and sees the courier timeline; every WhatsApp update carries the tracking link; a pickup order shows a pickup code or QR, the "ready" notice, hours, map and who may collect.

- [ ] **7.9 👤 Usability runs with real buyers** · needs: 7.7
  - **Lane** QA + UXE · **Agent** qa, senior-uiux · **Wave** W20 · 7D
  - **Owns** `docs/design/research/shop-usability/**`
  - _Requirements: 19.10_
  - [ ] 7.9.a 👤 Recruit five buyers — tourists, an expat, a gift buyer, a local; at least two sessions in Indonesian, at least three from the Instagram in-app browser
  - [ ] 7.9.b Run the journeys on staging, recording task times and success
  - [ ] 7.9.c Fix every blocker, or file it as a task, before the gate
  - [ ] 7.9.d **Check:** five buyers (tourists, an expat, a gift buyer, a local; at least two in Indonesian; at least three from the Instagram in-app browser) have run the journeys on staging with task times and success recorded, and every blocker is fixed or filed before the gate.

- [ ] **7.10 Phase 7 gate — with the design gate** · needs: 7.1–7.9
  - **Lane** QA + UXE · **Agent** qa, senior-uiux · **Wave** W21
  - **Owns** `docs/gates/phase-7.md`
  - **Read** the phase's **Done when**, DESIGN-SYSTEM.md §13
  - _Requirements: 7.1–7.12, 19.10_
  - [ ] 7.10.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 7.10.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-7.md`
  - [ ] 7.10.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 7.10.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 7.10.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 7.10.f **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-7.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

---

## Phase 8 — Admin tooling · W10–W21 · ~10d

**Goal:** the screens that decide whether both sites fill up.
**Done when:** — measured with real people — a cataloguer enters twenty works at
the agreed median time with images, unaided; a shop manager turns one work into a
twelve-variant giclée product with mockups in under five minutes; an accepted
offer reaches the buyer as a working payment link; every custom view was opened
and has the Payload sidebar.
**Phase letters:** 0 8.0 👤 · A 8.1, 8.2, 8.3, 8.11 · B 8.4 👤, 8.5, 8.6, 8.7, 8.8, 8.9, 8.13 · C 8.10 👤 · gate 8.12

Every custom admin component is registered through ADM's `views` barrel (PARALLEL-TRACKS.md §1)
and reaches Payload through the regenerated `importMap.js` — never a hand edit; 0.3.g fails the
build when the import map is stale.

- [ ] **8.0 👤 Contextual inquiry and admin surface briefs** · needs: 2.8
  - **Lane** ADM · **Agent** senior-uiux · **Wave** W10 · 8·0
  - **Owns** `docs/design/admin/{inquiry,briefs}/**`
  - **Read** CONTENT-OPERATIONS.md, KOI CONTENT-OPERATIONS.md
  - _Requirements: 14.1, 14.2, 14.8_
  - [ ] 8.0.a 👤 the owner schedules the two observation sessions and names the cataloguer and shop manager who will also sit the 8.10 timed tests
  - [ ] 8.0.b observation notes (what they do, in what order, with what at hand, where they wait)
  - [ ] 8.0.c the *Operate* briefs
  - [ ] 8.0.d **Check:** a cataloguer has been observed at the drawer and the shop manager on WhatsApp and in the showroom (about two hours each), and impeccable `shape` briefs in *Operate* mode exist for the desk, cataloguing, bulk upload, the merch wizard, the inbox, the order builder and the showroom sale — each with a keyboard map and a density spec — and Payload's Indonesian admin translation has been checked against the custom views.

- [ ] **8.1 Admin shell, branding and the desk** · needs: 2.8, 1.10, 8.0
  - **Lane** ADM · **Agent** senior-uiux (ADM-A) · **Wave** W13 · 8A
  - **Owns** `engine/packages/cms/src/admin/{shell,desk,theme}/**`
  - **Read** NOW! SURFACES-PLAN S3.1 (custom views inside `DefaultTemplate`), DESIGN-SYSTEM.md §4
  - _Requirements: 14.1, 14.8_
  - [ ] 8.1.a The admin wearing the brand's tokens (chrome and accents, per 1.10)
  - [ ] 8.1.b The desk: the queues in Req 14.1, each with its count
  - [ ] 8.1.c Custom views inside Payload's `DefaultTemplate` so they keep its navigation, registered through ADM's `views` barrel
  - [ ] 8.1.d **Check:** the admin wears the brand's tokens, the desk shows the queues in Req 14.1 with counts, and every custom view renders inside Payload's navigation (opened, not assumed).

- [ ] **8.2 Fast cataloguing** · needs: 2.2, 8.0
  - **Lane** ADM · **Agent** senior-fe (ADM-B) · **Wave** W13 · 8A
  - **Owns** `engine/packages/cms/src/admin/cataloguing/**`
  - **Read** the 8.0 cataloguing brief, CONTENT-OPERATIONS.md §2, KOI CONTENT-OPERATIONS.md (fast person screen), CONTENT-MODEL.md §1
  - _Requirements: 14.2, 16.8_
  - [ ] 8.2.a Save-and-add-another keeping context (drawer, source work, maker)
  - [ ] 8.2.b Fuzzy dates (`c. 1750`, `1724–26`, `abad ke-18`) and dimensions (cm/in) parsed with a visible interpretation
  - [ ] 8.2.c Inline maker and place creation with alias hints; duplicate warnings; autosave; locales side by side
  - [ ] 8.2.d The grade picker with definitions; the enquiry-only state for a work missing location or export status
  - [ ] 8.2.e **Check:** save-and-add-another keeps context (drawer, source work, maker), fuzzy dates (`c. 1750`, `1724–26`, `abad ke-18`) and dimensions (cm/in) parse with visible interpretation, makers and places can be created inline with alias hints, duplicates warn, drafts autosave, locales sit side by side, the grade picker shows definitions, and a work whose location or export status is blank carries a visible "Enquiry only until location and export status are set" state (staff with `physical` access set them here).

- [ ] **8.3 Bulk image upload** · needs: 2.7, 4.1
  - **Lane** ADM · **Agent** medior (ADM-C) · **Wave** W14 · 8A
  - **Owns** `engine/packages/cms/src/admin/bulk-upload/**`
  - _Requirements: 14.3_
  - [ ] 8.3.a A drop zone matching files to works by the stock number in the filename, with a list of what did not match
  - [ ] 8.3.b Inline role tags (recto, verso, detail…) and captions
  - [ ] 8.3.c Each file's derivative and tiling status
  - [ ] 8.3.d **Check:** dropping many files matches them to works by stock number in the filename, lets staff tag roles (recto, verso, detail…) and caption inline, and shows each file's derivative and tiling status.

- [ ] **8.4 👤 AI-assisted cataloguing (behind `ai.cataloguing`)** · needs: 8.2 · 👤 the production model provider (D16)
  - **Lane** ADM + senior-integrator · **Agent** senior-integrator · **Wave** W15 · 8B
  - **Owns** `engine/packages/cms/src/admin/ai-assist/**`, `engine/packages/media/src/vision/**`
  - **Read** ARCHITECTURE.md §1 principle 7; owner decision D16
  - _Requirements: 14.4, 3.3_
  - [ ] 8.4.a 👤 The owner chooses the production model provider (D16)
  - [ ] 8.4.b The pluggable provider interface — a development provider locally (Ollama Cloud is dev-only), the owner's choice in production
  - [ ] 8.4.c Proposals for title, original-title transcription, places, makers and description, each flagged unverified
  - [ ] 8.4.d The verification UI, and the publish guard refusing unverified fields
  - [ ] 8.4.e **Check:** the assistant proposes title, original-title transcription, places, makers and a description from the scan, every proposal is flagged until a human verifies it, publishing refuses unverified fields, and the provider is pluggable (a development provider may be used locally; production uses the owner-approved one).

- [ ] **8.5 Merch-from-work wizard and mockups** · needs: 2.4, 4.4
  - **Lane** ADM (+ MED for compositing) · **Agent** senior-fe (ADM-A), senior-be (MED) · **Wave** W15 · 8B
  - **Owns** `engine/packages/cms/src/admin/merch-wizard/**`, `engine/packages/media/src/mockups/**`
  - **Read** CONTENT-MODEL.md §2, EXPERIENCE-SHOP.md §5
  - _Requirements: 14.5, 4.4_
  - [ ] 8.5.a Pick a work (a provenance copy) and crop a design with the print ceiling visible
  - [ ] 8.5.b Choose product types; preview the generated variants within constraints and ceilings, priced from the tables
  - [ ] 8.5.c Composite room mockups (MED) and create the drafts
  - [ ] 8.5.d **Check:** a manager picks a work (provenance copy), crops a design with the print ceiling visible, selects product types, previews generated variants that respect constraints and ceilings, sees prices from the tables, and creates drafts with composited room mockups.

- [ ] **8.6 Order operations and documents** · needs: 5.8, 5.9, 5.13, 8.11
  - **Lane** ADM + NTF · **Agent** senior-fe (ADM-B), medior (NTF) · **Wave** W17 · 8B
  - **Owns** `engine/packages/cms/src/admin/orders/**`, `engine/packages/documents/src/{coa,factsheet,commercial-invoice,packing-slip}/**`
  - **Read** COMMERCE.md §6, §11–12, the 8.11 collateral designs
  - _Requirements: 10.5, 10.6, 14.6_
  - [ ] 8.6.a The order screen with its state-machine timeline
  - [ ] 8.6.b Shipments with tracking; pickups marked ready
  - [ ] 8.6.c Refunds (gateway or manual task) and returns, including the shop's photo claim for a damaged print
  - [ ] 8.6.d Documents to the 8.11 designs: the COA with the curator signature block, the factsheet, the commercial invoice, the packing slip and its gift variant
  - [ ] 8.6.e **Check:** the order screen shows the state-machine timeline, creates shipments with tracking, marks pickups ready, issues refunds (gateway or manual task), processes returns (including the shop's photo claim for a damaged print), and generates — **to the 8.11 designs** — the COA (with curator signature block), the item factsheet, the commercial invoice and the packing slip (with a gift variant that hides prices).

- [ ] **8.7 The inbox: offers, holds, price requests, enquiries, consignments, appointments** · needs: 5.8, 5.9.e
  - **Lane** ADM · **Agent** senior-fe (ADM-A) · **Wave** W17 · 8B
  - **Owns** `engine/packages/cms/src/admin/inbox/**`
  - _Requirements: 9.5, 9.7, 11.5, 14.7_
  - [ ] 8.7.a Offers: accept (issuing a payment link), counter, decline
  - [ ] 8.7.b Holds (grant, release, expiry) and price-request answers from templates
  - [ ] 8.7.c Consignment statuses and the appointments calendar
  - [ ] 8.7.d Layouts that work at 390 px and 768 px as well as on a desktop
  - [ ] 8.7.e **Check:** staff accept (issuing a payment link), counter or decline offers; grant or release holds with expiry; answer price requests from templates; move consignments through their statuses; and see appointments on a calendar — **on a phone (390 px) and a tablet (768 px)** as well as a desktop, because the shop manager works from a phone.

- [ ] **8.8 Stock, locations and showroom sales** · needs: 5.4
  - **Lane** ADM · **Agent** medior (ADM-C) · **Wave** W15 · 8B
  - **Owns** `engine/packages/cms/src/admin/stock/**`
  - _Requirements: 9.1, 7.8_
  - [ ] 8.8.a Stock counts and transfers between locations; the showroom stock view
  - [ ] 8.8.b Low-stock alerts
  - [ ] 8.8.c The showroom sale, reserving and converting through `reserve()` (channel `showroom`), on the counter's tablet and a phone
  - [ ] 8.8.d **Check:** staff count and transfer stock, see showroom stock, get low-stock alerts, and record a showroom sale that reserves and converts through `reserve()` (channel `showroom`) — the showroom-sale screen working on the counter's tablet (768 px) and a phone.

- [ ] **8.9 Homepage and navigation editors with preview** · needs: 2.5, 6.2, 7.2 (for preview targets)
  - **Lane** ADM · **Agent** senior-fe (ADM-B) · **Wave** W18 · 8B
  - **Owns** `engine/packages/cms/src/admin/homepage-editor/**`
  - _Requirements: 2.3_
  - [ ] 8.9.a Band reordering and item pinning in the homepage editor
  - [ ] 8.9.b A side-by-side preview of the real page
  - [ ] 8.9.c The navigation editor, with the same preview
  - [ ] 8.9.d **Check:** reordering a band or pinning an item in the editor changes the home page after save, with a side-by-side preview of the real page.

- [ ] **8.10 👤 Timed tests with real users, and fixes** · needs: 8.2–8.9, 8.13
  - **Lane** QA + ADM · **Agent** qa · **Wave** W19 · 8C
  - _Requirements: 14.2, 14.5_
  - [ ] 8.10.a 👤 The owner's cataloguer and shop manager (named in 8.0.a) sit the timed session
  - [ ] 8.10.b Timed runs: twenty works from a drawer with images; one work → a twelve-variant giclée product with mockups; an accepted offer → a working payment link
  - [ ] 8.10.c Fix every blocker, or file it as a task
  - [ ] 8.10.d **Check:** the owner's cataloguer and shop manager complete the phase's tasks with the times recorded; every blocker found is fixed or filed as a task.

- [ ] **8.11 Printed collateral design** · needs: 1.9
  - **Lane** ADM + NTF · **Agent** senior-uiux · **Wave** W14 · 8A
  - **Owns** `docs/design/collateral/**`, `engine/packages/documents/src/templates/**`
  - **Read** COMMERCE.md §12, DESIGN-SYSTEM.md §11
  - _Requirements: 10.5, 19.10_
  - [ ] 8.11.a The certificate of authenticity (image, stock number, grade, the Parry signature block, a slot for the v2 verification QR) and the designers' item factsheet
  - [ ] 8.11.b The proforma, the commercial invoice, the packing slip and its gift variant
  - [ ] 8.11.c The gift card (digital and print), the shop's story card, the showroom QR placard, the hang tag / Archive No. label
  - [ ] 8.11.d Bilingual, A4 and US Letter, fonts embedded — and test-printed on a real printer
  - [ ] 8.11.e **Check:** each brand's printed and PDF artefacts are designed, bilingual, in A4 and US Letter with embedded fonts, and **test-printed on a real printer**: the certificate of authenticity (image, stock number, grade, the Parry signature block, a slot for the v2 verification QR), the item factsheet designers present, the proforma, the commercial invoice, the packing slip (and its gift variant), the gift card (digital and print), the shop's story card, the showroom QR placard, and the hang tag / Archive No. label.

- [ ] **8.13 Manual order and quote builder** · needs: 5.8, 5.9, 8.0
  - **Lane** ADM · **Agent** senior-fe (ADM-C) · **Wave** W18 · 8B
  - **Owns** `engine/packages/cms/src/admin/order-builder/**`
  - **Read** COMMERCE.md §5, §7, PAYMENTS.md §5, the 8.0 order-builder brief
  - _Requirements: 9.1, 11.5, 14.6, 14.7_
  - [ ] 8.13.a Build an order or a quote: items (a unique item is reserved through `reserve()` the moment it is added), the customer, the destination
  - [ ] 8.13.b Staff discounts within the role's limit, with every figure priced by the server
  - [ ] 8.13.c Send it as a payment link or a quote PDF — from a phone at 390 px
  - [ ] 8.13.d **Check:** staff build an order or a quote for a WhatsApp, phone or showroom sale — pick items (a unique item is reserved through `reserve()` the moment it is added), the customer and the destination, apply a staff discount within the role's limit — with every figure **priced by the server**, and send it as a payment link or a quote PDF; it works on a phone (390 px), because most of these sales start in a WhatsApp chat.

- [ ] **8.12 Phase 8 gate — with the design gate** · needs: 8.0–8.11, 8.13
  - **Lane** QA + ADM · **Agent** qa, senior-uiux · **Wave** W21
  - **Owns** `docs/gates/phase-8.md`
  - **Read** the phase's **Done when**, DESIGN-SYSTEM.md §13
  - _Requirements: 14.1–14.8, 19.10_
  - [ ] 8.12.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 8.12.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-8.md`
  - [ ] 8.12.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 8.12.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 8.12.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 8.12.f **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-8.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

---

## Phase 9 — Integrations · W15–W20 · ~10d

**Goal:** the remaining providers, the fulfilment router, sister sync and WhatsApp.
**Done when:** every adapter passes the contract suite on recorded sandbox
fixtures; a Denpasar order gets live Biteship rates and tracking; a Netherlands
order ships from Bali stock by DHL Express with a duties estimate (print-on-demand
abroad is not part of the launch, D23); publishing a work in the gallery updates
its shop copy within a minute and the shop's "own the original" reads "sold"
after the gallery sells it.
**Phase letters:** A 9.1 👤, 9.4 👤, 9.7 · B 9.2, 9.3, 9.5 👤, 9.6, 9.8 👤 · gate 9.9

- [ ] **9.1 👤 Stripe adapter (Singapore seller)** · needs: 5.9 · 👤 sandbox keys (D3)
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W17 · 9A
  - **Owns** `engine/packages/payments/src/adapters/stripe/**`
  - **Read** PAYMENTS.md §2–4
  - _Requirements: 11.1, 11.5, 11.6, 11.7_
  - [ ] 9.1.a 👤 Stripe Singapore **sandbox** account and keys, into Infisical (D3)
  - [ ] 9.1.b The Payment Element (cards, Apple/Google Pay, PayNow; iDEAL/SEPA where enabled) with 3DS; authorise-then-capture for unique items
  - [ ] 9.1.c Checkout Sessions with `expires_at` at least 30 minutes out (the lock is extended to cover it); IDR charging for the Singapore seller's Indonesian deliveries (D29)
  - [ ] 9.1.d Webhooks keyed by Stripe's event id, refunds, Invoicing / Payment Links — through the contract suite
  - [ ] 9.1.e **Check:** the Payment Element (cards, Apple/Google Pay, PayNow; iDEAL/SEPA where enabled) with 3DS, authorise-then-capture for unique items (capture only while the reservation is live), Checkout Sessions whose `expires_at` respects Stripe's 30-minute minimum (so the lock is extended to cover it), IDR charging for the Singapore seller's Indonesian deliveries (D29), webhooks keyed by Stripe's event id, refunds, and Invoicing/Payment Links for inquire → pay pass the contract suite.

- [ ] **9.2 PayPal adapter** · needs: 5.9
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W18 · 9B
  - **Owns** `engine/packages/payments/src/adapters/paypal/**`
  - _Requirements: 11.1, 11.7_
  - [ ] 9.2.a Orders v2 approve and capture
  - [ ] 9.2.b Webhooks and refunds
  - [ ] 9.2.c Never offered for IDR; the contract suite
  - [ ] 9.2.d **Check:** Orders v2 approve/capture, webhooks and refunds pass the contract suite; PayPal is never offered for IDR.

- [ ] **9.3 Xendit or DOKU adapter — only if chosen (D3)** · needs: 5.9 · 👤 the owner's choice (D3)
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W19 · 9B
  - **Owns** `engine/packages/payments/src/adapters/{xendit,doku}/**`
  - _Requirements: 11.7_
  - [ ] 9.3.a 👤 The owner's choice (D3) — or close this task as "not chosen", with the date
  - [ ] 9.3.b The chosen adapter and its recorded sandbox fixtures
  - [ ] 9.3.c The contract suite
  - [ ] 9.3.d **Check:** the chosen adapter passes the contract suite, or this task is closed as "not chosen" with the date.

- [ ] **9.4 👤 Biteship** · needs: 5.11 · 👤 sandbox key
  - **Lane** LOG · **Agent** senior-integrator · **Wave** W15 · 9A
  - **Owns** `engine/packages/shipping/src/adapters/biteship/**`, `engine/packages/http/src/webhooks/shipping/**`
  - _Requirements: 10.2, 12.1, 12.7_
  - [ ] 9.4.a 👤 The Biteship sandbox key, into Infisical
  - [ ] 9.4.b Address → area resolution; rates with ETA, same-day included
  - [ ] 9.4.c Order creation with the insurance flag; tracking webhooks feeding notifications
  - [ ] 9.4.d **Check:** address → area resolution, rates with ETA (incl. same-day), order creation, insurance flag and tracking webhooks work in sandbox and feed notifications.

- [ ] **9.5 👤 DHL Express** · needs: 5.11 · 👤 account
  - **Lane** LOG · **Agent** senior-integrator · **Wave** W18 · 9B
  - **Owns** `engine/packages/shipping/src/adapters/dhl-express/**`
  - _Requirements: 12.1, 12.2, 12.6_
  - [ ] 9.5.a 👤 A DHL Express account with test-environment access
  - [ ] 9.5.b Rates, declared value and commercial-invoice data
  - [ ] 9.5.c Tracking; originals above the threshold still route to "quote required"
  - [ ] 9.5.d **Check:** rates, declared value, commercial-invoice data and tracking work in the test environment; originals above the threshold still route to "quote required".

- [ ] **9.6 The fulfilment router — own stock and local made-to-order** · needs: 2.4, 4.4, 5.8
  - **Lane** LOG · **Agent** senior-integrator · **Wave** W18 · 9B
  - **Owns** `engine/packages/fulfilment/src/{routing,adapters/{own-stock,local-mto}}/**`
  - **Read** COMMERCE.md §8, COMPLIANCE.md §5
  - _Requirements: 12.4, 12.5, 12.7_
  - [ ] 9.6.a The router: own stock → local made-to-order → POD near the buyer (only while `fulfilment.pod` is on) → not offered
  - [ ] 9.6.b The local made-to-order adapter: a production task for the Bali print partner, with a presigned print file from `print-files/`
  - [ ] 9.6.c Tests: an Indonesian destination never routes overseas; switching `fulfilment.pod` on needs no router change
  - [ ] 9.6.d **Check:** each line routes own stock → local made-to-order (a production task for the Bali print partner, with its presigned print file from `print-files/`) → **POD near the buyer only while `fulfilment.pod` is on** (off at launch, D23) → not offered; a test proves Indonesian destinations never route overseas and that switching `fulfilment.pod` on needs no router change. The Prodigi and Gelato adapters are post-launch (14.18).

- [ ] **9.7 Sister sync** · needs: 2.2, 0.5.g
  - **Lane** SIS · **Agent** senior-integrator · **Wave** W15 · 9A
  - **Owns** `engine/packages/sister/**`, `engine/packages/http/src/sister/**`
  - **Read** BRANDS.md §5
  - _Requirements: 3.8, 3.11, 15.1, 15.2, 15.3, 15.4, 15.5, 16.6, 8.3_
  - [ ] 9.7.a The gallery's signed read-only archive API at `/api/x/sister/…` — published works only, `overrideAccess: false`, a field `select` — and a test that drafts, `physical` and acquisition fields never leave
  - [ ] 9.7.b `work.*` webhooks, sent from the outbox
  - [ ] 9.7.c The shop's idempotent provenance-copy importer (synced fields read-only) and a nightly reconcile
  - [ ] 9.7.d Both cross-links: the gallery item page linking to the exact products; the shop's "own the original" in the visitor's market currency, export status respected
  - [ ] 9.7.e A two-database test: a sale in the gallery flips the shop's block to sold within a minute
  - [ ] 9.7.f **Check:** the gallery's signed read-only archive API at `/api/x/sister/…` — reading **published works only**, with `overrideAccess: false` and a field `select`, so drafts, `physical` and acquisition fields never leave (a test asserts it) — and `work.*` webhooks sent from the outbox feed the shop's idempotent provenance-copy importer (synced fields read-only); both cross-links resolve, the gallery item page links to the exact products made from its work (Req 16.6), and a two-database test proves a sale in the gallery flips the shop's "own the original" to sold within a minute. The shop's link shows the original's price **in the visitor's market currency** (never USD beside an IDR page) and **respects export status** — tested for an Indonesian destination and for a `domestic-only` original seen from abroad.

- [ ] **9.8 👤 WhatsApp notifications** · needs: 5.13 · 👤 provider (D14 — needed before this wave; otherwise close as email-only with the date)
  - **Lane** NTF · **Agent** senior-integrator · **Wave** W19 · 9B
  - **Owns** `engine/packages/mail/src/whatsapp/**`
  - _Requirements: 13.5, 18.5_
  - [ ] 9.8.a WhatsApp template copy in EN and ID from the lexicon, within Meta's length and button limits, submitted for approval (👤 the business account)
  - [ ] 9.8.b **Check:** opted-in buyers receive order and shipping updates through the chosen provider's templates, the sender is pluggable, and opt-in is recorded as a consent.

- [ ] **9.9 Phase 9 gate** · needs: 9.1–9.8
  - **Lane** QA · **Agent** qa · **Wave** W20
  - **Owns** `docs/gates/phase-9.md`
  - **Read** the phase's **Done when**
  - _Requirements: 11.1, 11.6, 11.7, 12.1–12.7, 15.1–15.5, 16.6_
  - [ ] 9.9.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 9.9.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-9.md`
  - [ ] 9.9.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 9.9.d **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-9.md`, with no failure left open.

---

## Phase 10 — Accounts, retention and consent · W15–W21 · ~6d

**Goal:** customer accounts, alerts, newsletter, the shop's retention features, consent, data-subject operations.
**Done when:** a guest's saved search emails them when a match is published; a
confirmed subscriber receives the next generated digest; a consented abandoned
bag sends one email and a non-consented one sends none; an erasure request
removes a customer's personal data while their orders stay reproducible.
**Phase letters:** A 10.1, 10.3, 10.4, 10.6, 10.8 · B 10.2, 10.5 · gate 10.7

- [ ] **10.1 Customer authentication and the legacy claim flow** · needs: 2.6
  - **Lane** WEB (+ SCH consult) · **Agent** senior-be · **Wave** W15 · 10A
  - **Owns** `engine/packages/http/src/auth/**`
  - **Read** ARCHITECTURE.md §12, MIGRATION.md §5, NOW! READER-IDENTITY.md
  - _Requirements: 13.1, 16.4, 19.5_
  - [ ] 10.1.a The custom auth strategy on `customers` under its own cookie — a staff session in the same browser survives (test)
  - [ ] 10.1.b Register, verify, sign in, reset, lockout, rate limits
  - [ ] 10.1.c Cart merge on sign-in; the claim flow for migrated accounts (random, unusable password)
  - [ ] 10.1.d Tests: wrong password, unknown user (the same answer), lockout, a customer on an admin route
  - [ ] 10.1.e **Check:** customer sessions are issued by a **custom auth strategy on `customers` under their own cookie** — a member of staff signed in to `/admin` stays signed in after signing in as a customer in the same browser (test); register, verify, sign in, reset, lockout and rate limits work for customers only; carts merge on sign-in; a migrated account (random, unusable password) can claim itself by email link; tests cover wrong password, unknown user (same answer as wrong password), lockout and a customer attempting an admin route.

- [ ] **10.2 Account areas in both apps** · needs: 10.1
  - **Lane** UXG + UXE · **Agent** senior-uiux (one per app) · **Wave** W19 · 10B
  - **Owns** `engine/apps/*/src/surfaces/account/**` + routes
  - _Requirements: 13.2, 18.6_
  - [ ] 10.2.a Both apps: overview, orders with documents, wishlist, want-lists (with an unsubscribe landing page), addresses, profile, consents, export and deletion requests
  - [ ] 10.2.b The gallery's conversations: my offers (with the counter's countdown), holds, price requests, viewings (reschedule, cancel, `.ics`), consignments with their timeline
  - [ ] 10.2.c Empty states that invite rather than blank
  - [ ] 10.2.d **Check:** overview, orders with documents, wishlist (the gallery's viewing pull list), want-lists (with an unsubscribe landing page), addresses, profile and consents, and export/deletion requests work; the gallery's account also holds **my offers** (with the counter's countdown), holds, price requests, viewings (reschedule, cancel, `.ics`) and consignments with their status timeline; empty states invite rather than blank (NOW! DESIGN-SYSTEM §4).

- [ ] **10.3 Want-list matching and alerts** · needs: 4.7, 5.13
  - **Lane** DOM · **Agent** senior-be · **Wave** W19 · 10A
  - **Owns** `engine/packages/domain/src/want-lists/**`
  - _Requirements: 13.3, 5.6_
  - [ ] 10.3.a Matching on publish, from an outbox event run by the queue
  - [ ] 10.3.b Delivery within 15 minutes or in a daily digest, as the subscriber chose; "another example arrived" for sold items
  - [ ] 10.3.c Budgets compared in the want-list's own market currency; an unsubscribe per alert
  - [ ] 10.3.d **Check:** publishing a work or product emits an outbox event that the queue matches against saved queries, notifying **within 15 minutes** or in a daily digest as the subscriber chose (a test measures publish → email in Mailpit), including "another example arrived" for sold items; budgets compare in the want-list's own market currency; each alert can be unsubscribed.

- [ ] **10.4 Newsletter: double opt-in and the generated digest** · needs: 2.6, 5.13
  - **Lane** NTF · **Agent** medior · **Wave** W20 · 10A
  - **Owns** `engine/packages/mail/src/newsletter/**`
  - _Requirements: 13.4_
  - [ ] 10.4.a Double opt-in (KOI)
  - [ ] 10.4.b The digest generated from inventory published since the last issue, archived as HTML pages
  - [ ] 10.4.c Sending through the D28 newsletter sender, with list-unsubscribe
  - [ ] 10.4.d **Check:** double opt-in works (KOI), the gallery digest is generated from inventory published since the last issue, issues are archived as HTML pages, sends go through the newsletter sender chosen in D28 (never the transactional SMTP's daily quota), and every send carries list-unsubscribe.

- [ ] **10.5 Shop retention: welcome offer, reviews, back in stock, abandoned bag, gift-card purchase** · needs: 5.7, 10.1
  - **Lane** DOM + UXE + NTF · **Agent** senior-be, medior · **Wave** W20 · 10B
  - **Owns** `engine/packages/domain/src/{reviews,retention}/**`, `engine/apps/emporium/src/surfaces/{reviews,gift-card}/**`
  - _Requirements: 13.6, 13.7, 8.7_
  - [ ] 10.5.a A welcome code on a confirmed signup
  - [ ] 10.5.b Verified-buyer reviews with photos, under moderation
  - [ ] 10.5.c Back-in-stock alerts; abandoned-bag email only with consent (tested both ways)
  - [ ] 10.5.d Gift cards bought and redeemed
  - [ ] 10.5.e **Check:** a confirmed signup issues a welcome code, verified buyers can review with photos under moderation, restock alerts fire, abandoned-bag email goes only to consented buyers (test both ways), and gift cards can be bought and redeemed.

- [ ] **10.6 Consent banner, records and the cookieless beacon mode** · needs: 2.6, 3.3, 3.4
  - **Lane** SEO · **Agent** senior-fe · **Wave** W19 · 10A
  - **Owns** `engine/packages/analytics/src/consent/**`
  - **Read** ANALYTICS.md §1, COMPLIANCE.md §7, KOI DESIGN-SYSTEM.md ("the consent banner is fixed")
  - _Requirements: 17.5, 17.6, 18.5_
  - [ ] 10.6.a The fixed, CLS-safe banner
  - [ ] 10.6.b Consent records: purpose, timestamp, policy version
  - [ ] 10.6.c The beacon cookieless until consent; GA4 and Meta loaded from the runtime ids in `ShellVM` only after marketing consent; an e2e for rejection
  - [ ] 10.6.d **Check:** the banner is fixed (CLS-safe), records purpose + timestamp + policy version, keeps the beacon cookieless until consent, loads GA4 and Meta only from the **runtime** ids in `ShellVM` after marketing consent, and an e2e proves rejecting consent loads no marketing tag.

- [ ] **10.8 Data-subject operations** · needs: 2.6, 5.1
  - **Lane** DOM + WEB · **Agent** senior-be · **Wave** W15 · 10A
  - **Owns** `engine/packages/domain/src/privacy/**`, `engine/packages/http/src/privacy/**`
  - **Read** COMPLIANCE.md §7, MIGRATION.md §5
  - _Requirements: 13.2, 18.6_
  - [ ] 10.8.a Export (JSON) and correction
  - [ ] 10.8.b Erasure: personal fields removed or pseudonymised everywhere, while orders, invoices and tax records keep what the law requires and still reproduce their totals
  - [ ] 10.8.c The record-of-processing export per brand; never-claimed migrated accounts purged on counsel's schedule
  - [ ] 10.8.d An operations log that never holds the personal data itself
  - [ ] 10.8.e **Check:** a verified customer (or staff on their behalf) can **export** their data as JSON, **correct** it, and **erase** it — personal fields removed or pseudonymised everywhere, while orders, invoices and tax records keep what the retention law requires and still reproduce their totals; a record-of-processing export exists per brand; migrated customers who never claim their account are purged on the schedule counsel sets; every operation is logged without the personal data itself.

- [ ] **10.7 Phase 10 gate** · needs: 10.1–10.6, 10.8
  - **Lane** QA · **Agent** qa · **Wave** W21
  - **Owns** `docs/gates/phase-10.md`
  - **Read** the phase's **Done when**
  - _Requirements: 13.1–13.7, 18.6_
  - [ ] 10.7.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 10.7.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-10.md`
  - [ ] 10.7.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 10.7.d **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-10.md`, with no failure left open.

---

## Phase 11 — Migration and legacy URLs · W3–W22 · ~8d

**Goal:** the gallery's catalogue, customers and URLs carried across — with the owner's item register — the shop's legacy URLs redirected, and the gallery's production archive imported dark before the shop launches.
**Done when:** a rehearsal import loads every item with images tiled and no
unexplained discrepancy; every original has a location and export status from the
register or publishes enquiry-only; every legacy URL, counted, resolves with 200
or one 301; the curator has signed the mapping; the dark production import serves
the shop's sister sync.
**Phase letters:** A (right after Phase 0) 11.1 👤, 11.7.a · B 11.2 · C (after Phase 2) 11.3 👤, 11.7.b · D (after 4.2) 11.4, 11.5 · E 11.6 · F 11.8 👤 · gate 11.9 · then 11.10 👤 and, before the shop launches, 11.11 👤

- [ ] **11.1 👤 Receive the old catalogue export** · needs: 0.2
  - **Lane** MIG · **Agent** senior-integrator (MIG-A) · **Wave** W3 · 11A
  - **Owns** `engine/packages/migrate/src/sources/{laravel-catalogue,public-read}/**`, `indies-gallery/content/legacy/{schema,inventory}/**` (committed notes and the URL inventory; raw extracts stay in `LEGACY_DATA_DIR`, outside git)
  - **Read** MIGRATION.md §1–3
  - _Requirements: 16.1, 16.5_
  - [ ] 11.1.a 👤 The owner asks whoever hosts the old site for a MySQL dump and the product-images folder, and hands them over — we never log in to, fix or change the old site
  - [ ] 11.1.b restore + schema discovery notes (tables → collections)
  - [ ] 11.1.c A read-only, rate-limited reader of the old site's public pages and sitemap — run only with the owner's OK — that gathers the old URL list for verification
  - [ ] 11.1.d **Check:** the owner's export is restored into a throwaway MySQL container with its schema documented — **or**, as a fallback and only with the owner's OK, a read-only, rate-limited read of the public pages has produced a URL inventory, product JSON (sold included) and images; either way the legacy URL list for verification exists, nothing personal or raw has been committed, and nothing was done to the old site.

- [ ] **11.2 Normalisers and the review queue** · needs: 11.1
  - **Lane** MIG · **Agent** medior (MIG-A) · **Wave** W4 · 11B
  - **Owns** `engine/packages/migrate/src/normalise/**`
  - **Read** MIGRATION.md §4 (dirty data list)
  - _Requirements: 16.2_
  - [ ] 11.2.a Parsers for dates, dimensions, condition grades, prices, references and titles (hook vs original; SEO suffixes removed)
  - [ ] 11.2.b A fixture test for each dirty-data case in MIGRATION.md §4
  - [ ] 11.2.c The review file — raw value beside the proposal — for everything below confidence
  - [ ] 11.2.d **Check:** dates, dimensions, condition grades, prices, references and titles (hook vs original, SEO suffixes removed) parse from the real extract, with a fixture test per dirty-data case listed in MIGRATION.md, and everything below confidence goes to a review file with raw value beside proposal.

- [ ] **11.3 👤 Makers de-duplication and the category → facet mapping** · needs: 11.2, 2.1
  - **Lane** MIG · **Agent** medior (MIG-B) · **Wave** W7 · 11C
  - **Owns** `engine/packages/migrate/src/{makers,taxonomy}/**`, `indies-gallery/content/legacy/mapping/**`
  - _Requirements: 16.3_
  - [ ] 11.3.a Maker strings clustered into makers with aliases (never auto-merged below 0.9)
  - [ ] 11.3.b `categories.json`: every legacy category id mapped to a facet selection
  - [ ] 11.3.c 👤 The curator reviews and signs both (about an hour)
  - [ ] 11.3.d **Check:** maker strings cluster into makers with aliases (never auto-merged below 0.9), `categories.json` maps every legacy category id to a facet selection, and the curator has reviewed and signed both (👤, ~1 hour).

- [ ] **11.4 The loader and the item register** · needs: 11.3, Phase 2, 4.1, 4.2, 2.6
  - **Lane** MIG · **Agent** senior-integrator (MIG-B) · **Wave** W12 · 11D
  - **Owns** `engine/packages/migrate/src/{load,register}/**`
  - **Read** MIGRATION.md §4–5, §9, COMPLIANCE.md §1, CONTENT-MODEL.md §1, §6
  - _Requirements: 16.1, 16.4, 16.8, 19.2_
  - [ ] 11.4.a 👤 the owner's item register — location and export status per stock number (D24)
  - [ ] 11.4.b register importer with a mismatch report (unknown stock numbers, conflicting rows)
  - [ ] 11.4.c the batch loader and the off-box tiling run
  - [ ] 11.4.d **Check:** works and products upsert idempotently by legacy id in batches of 500 with a dry-run diff, as drafts, with `publicId = legacy id` and stock numbers preserved; **the item register** sets each original's stock location and export status by stock number — an original with no row keeps both blank and publishes enquiry-only, and the report lists them; images are tiled **off-box** by `pnpm media:tile` (4.2.b) straight to the bucket, each with the **deterministic alt-text baseline** built from its record (CONTENT-MODEL.md §6) so the publish guard can pass; customers are created with a random, unusable password for the claim flow; subscribers keep recorded consent; legacy orders import read-only; wishlists become saved items or want-lists.

- [ ] **11.5 Redirects and the legacy handler** · needs: 11.3, 2.5, 0.8.f
  - **Lane** MIG + WEB · **Agent** senior-be · **Wave** W11 · 11D
  - **Owns** `engine/packages/migrate/src/redirects/**`, `engine/packages/http/src/legacy/**`
  - **Read** MIGRATION.md §6, ARCHITECTURE.md §11
  - _Requirements: 6.10, 16.5_
  - [ ] 11.5.a Rules for categories and query parameters → facet URLs, static pages and `/storage/products/*.jpg`
  - [ ] 11.5.b The rules in the `redirects` collection, answered by the legacy handler at `/api/x/legacy/…` under `'use cache'` + `cacheTag`
  - [ ] 11.5.c 404 for an unknown legacy path, 410 for a removed item; product URLs need no rule (6.3)
  - [ ] 11.5.d **Check:** product URLs need no rule — the item route resolves them by public id and 301s a changed slug (6.3); categories and query parameters map to facet URLs, static pages and `/storage/products/*.jpg` redirect; rules live in the `redirects` collection and are answered by the legacy handler at `/api/x/legacy/…` under `'use cache'` + `cacheTag` (the proxy only rewrites to it and never touches the database); an unknown legacy path answers 404, a removed item 410.

- [ ] **11.6 Verification report and the URL gate** · needs: 11.4, 11.5
  - **Lane** MIG + QA · **Agent** qa · **Wave** W13 · 11E
  - **Owns** `engine/packages/migrate/src/report/**`, `tests/migration/**`
  - _Requirements: 16.5_
  - [ ] 11.6.a The report: counts per legacy category vs new facets, items without images, parse failures, price parity
  - [ ] 11.6.b The URL gate: every legacy URL from the export and the URL inventory requested **against the new site on staging** — 200, or one 301 to a 200
  - [ ] 11.6.c Zero failures before the gate
  - [ ] 11.6.d **Check:** the report shows counts per legacy category vs new facets, items without images, parse failures and price parity, and requesting **every** legacy URL against the new site on staging returns 200 or a single 301 to 200, with zero failures.

- [ ] **11.7 Old East Indies legacy and product import** · needs: 0.2; 11.7.b needs 2.4
  - **Lane** MIG · **Agent** medior (MIG-B) · **Wave** 11.7.a in W3 · 11A · 11.7.b in W10 · 11B
  - **Owns** `engine/packages/migrate/src/sources/csv-products/**`, `old-east-indies/content/legacy/**`
  - **Read** MIGRATION.md §10
  - _Requirements: 16.6_
  - [ ] 11.7.a URL discovery (CDX + Search Console export 👤)
  - [ ] 11.7.b mapping + CSV importer + redirects
  - [ ] 11.7.c **Check:** every Squarespace path from Search Console and the Wayback CDX index maps to a product or collection; the old gallery's "Buy Reproduction" target (one home page for every button) redirects like any other URL, since the new item pages link to exact products themselves (9.7); and the owner's product list imports through `csv-products`.

- [ ] **11.8 👤 Rehearsal on staging and the delta import** · needs: 11.6 · 👤 the Helios go-ahead for the staging import
  - **Lane** MIG + HAR · **Agent** senior-integrator, devops · **Wave** W14 · 11F
  - _Requirements: 16.7_
  - [ ] 11.8.a 👤 The owner's go-ahead for the staging import on Helios
  - [ ] 11.8.b A full rehearsal import on staging, and the report reviewed with the owner
  - [ ] 11.8.c A second run proving the delta import by `updated_at`
  - [ ] 11.8.d **Check:** a full rehearsal import runs on staging, the report is reviewed, and a delta import by `updated_at` is proven on a second run.

- [ ] **11.9 Phase 11 gate** · needs: 11.1–11.8
  - **Lane** QA · **Agent** qa · **Wave** W15
  - **Owns** `docs/gates/phase-11.md`
  - **Read** the phase's **Done when**
  - _Requirements: 16.1–16.8_
  - [ ] 11.9.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 11.9.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-11.md`
  - [ ] 11.9.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 11.9.d **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-11.md`, with no failure left open.

- [ ] **11.10 👤 Content sprint: hook titles and alt text for the top 500** · needs: 11.4, 8.2, 8.4
  - **Lane** MIG + ADM · **Agent** medior (with the owner's cataloguer) · **Wave** W20
  - **Owns** content only (through the admin) · `indies-gallery/content/legacy/sprint/**` (the tracking sheet)
  - **Read** EXPERIENCE-GALLERY.md §5 (hook titles), CONTENT-MODEL.md §6 (alt guidance)
  - _Requirements: 6.1, 19.2_
  - [ ] 11.10.a Pick the top 500 migrated items (most viewed or most valuable) and start the tracking sheet
  - [ ] 11.10.b Draft hook titles and alt text (AI drafts allowed, flagged as unverified)
  - [ ] 11.10.c 👤 The owner's cataloguer verifies each one in the admin
  - [ ] 11.10.d **Check:** the 500 most-viewed or most valuable migrated items have a human-written hook title and improved alt text (AI drafts allowed, every one verified), before the gallery's cutover.

- [ ] **11.11 👤 The gallery's dark production import** · needs: 11.9, 13.5.b, 9.7 · 👤 the Helios go-ahead (D25)
  - **Lane** MIG + HAR · **Agent** senior-integrator, devops · **Wave** W22
  - **Read** MIGRATION.md §8 (step 0), PLAN.md (launch order), DEPLOYMENT.md §2
  - _Requirements: 15.1, 15.3, 16.7_
  - [ ] 11.11.a 👤 The owner's go-ahead for the production import on Helios (D25)
  - [ ] 11.11.b Import into the gallery's production database with no DNS — the storefront answers only on an internal hostname behind access control
  - [ ] 11.11.c The archive API serving the shop's sister sync; the shop's production target configured against it
  - [ ] 11.11.d **Check:** the gallery's **production** target is imported with no DNS and no public traffic — its storefront answers only on an internal hostname behind access control — while its archive API serves the shop's sister sync (published works only, per-market original prices); the shop's production target is configured to sync from it and its staging shows real originals from it; and the later public cutover (13.8) is only a delta import and a DNS switch on this same database.

---

## Phase 12 — SEO, analytics and feeds · W20–W22 · ~5d

**Goal:** discoverability, the event pipeline, feeds and dashboards.
**Done when:** Rich Results passes for an item, a sold item, a design and a
location; sitemaps validate and include sold items; the Merchant feed validates;
a purchase funnel and a lead funnel from real staging sessions are visible in the
dashboard; rejecting consent stops every non-essential tag.
**Phase letters:** A 12.1, 12.2, 12.3, 12.5 · B 12.4 👤, 12.6, 12.7 · gate 12.8

- [ ] **12.1 Metadata, canonicals, hreflang, OG images** · needs: 6.1, 7.1
  - **Lane** SEO (+ apps for templates) · **Agent** senior-fe · **Wave** W20 · 12A
  - **Owns** `engine/packages/seo/src/{metadata,og}/**`
  - **Read** EXPERIENCE-GALLERY.md §11, ARCHITECTURE.md §11
  - _Requirements: 17.1, 18.1_
  - [ ] 12.1.a Title and description templates per surface, the brand name from config
  - [ ] 12.1.b Canonicals and reciprocal `hreflang` (the default locale unprefixed, `/id` prefixed)
  - [ ] 12.1.c OG images per item and design, generated at request time and cached — the sheet on its mat, centred so WhatsApp's square crop never cuts it
  - [ ] 12.1.d **Check:** every surface has its templated title, description, canonical and reciprocal `hreflang` (default unprefixed + `/id`), and OG images are generated per item and design at request time with caching — **the sheet on its mat, centred so WhatsApp's square crop never cuts it**, with the stock number and title.

- [ ] **12.2 JSON-LD** · needs: 6.1, 7.1
  - **Lane** SEO · **Agent** medior · **Wave** W20 · 12A
  - **Owns** `engine/packages/seo/src/jsonld/**`
  - _Requirements: 17.2_
  - [ ] 12.2.a Gallery: `Product` + `VisualArtwork` with `InStock` / `Reserved` / `SoldOut`, and no price for price-on-request
  - [ ] 12.2.b Shop: `Product` + `Offer`; `ArtGallery` / `Store` per location; `BreadcrumbList`, `FAQPage`, `Organization`
  - [ ] 12.2.c Schema-shape tests
  - [ ] 12.2.d **Check:** builders emit `Product` + `VisualArtwork` (gallery) with `InStock`/`Reserved`/`SoldOut` and no price for POR, `Product` + `Offer` (shop), `ArtGallery`/`Store` per location, `BreadcrumbList`, `FAQPage` from faq blocks and `Organization`, with schema-shape tests.

- [ ] **12.3 Sitemaps** · needs: 6.1, 7.1
  - **Lane** SEO · **Agent** medior · **Wave** W20 · 12A
  - **Owns** `engine/packages/seo/src/sitemaps/**`, `engine/packages/http/src/sitemap/**`
  - _Requirements: 17.3_
  - [ ] 12.3.a Per-locale sitemaps split by type, sold items included, and an image sitemap
  - [ ] 12.3.b Regeneration on publish (by tag) and nightly
  - [ ] 12.3.c Validation in CI
  - [ ] 12.3.d **Check:** per-locale sitemaps split by type include sold items and an image sitemap, regenerate on publish and nightly, and validate.

- [ ] **12.4 👤 Google Merchant and Meta catalogue feeds** · needs: 12.2 · 👤 Merchant Center and Meta Commerce Manager access for each brand
  - **Lane** SEO · **Agent** medior · **Wave** W21 · 12B
  - **Owns** `engine/packages/seo/src/feeds/**`, `engine/packages/http/src/feeds/**`
  - _Requirements: 17.4_
  - [ ] 12.4.a 👤 Merchant Center and Meta Commerce Manager access for each brand
  - [ ] 12.4.b The Google Merchant feed for both brands — honest availability, the right currency per market, a rupiah-only feed for Indonesia, enquiry-only originals left out
  - [ ] 12.4.c The Meta catalogue feed for the shop (Instagram tags, the WhatsApp catalogue), validated in the test catalogues
  - [ ] 12.4.d **Check:** both feeds validate (Merchant Center, Meta Commerce Manager test catalogues) with honest availability and the right currency per market — the Indonesian feed in rupiah only — with enquiry-only originals left out; the Meta feed can drive Instagram tags and the WhatsApp catalogue.

- [ ] **12.5 Beacon, events table, rollups and instrumentation** · needs: 10.6, 5.17
  - **Lane** SEO (+ SCH lead for 12.5.a, + apps) · **Agent** senior-fe · **Wave** W20 · 12A
  - **Owns** `engine/packages/analytics/src/{beacon,store,rollups}/**`, `engine/packages/http/src/collect/**`, `engine/packages/cms/src/db/analytics.ts` (12.5.a, SCH lead)
  - **Read** ANALYTICS.md, KOI docs/ANALYTICS.md
  - _Requirements: 17.5_
  - [ ] 12.5.a (SCH lead) the DDL in `db/analytics.ts`: the monthly-partitioned `engine.analytics_events`, `ensure_partition(ts)` and `engine.analytics_rollups`, in the wave migration
  - [ ] 12.5.b beacon, store, rollups and the instrumentation of both apps
  - [ ] 12.5.c **Check:** the batched beacon at `/api/x/collect` writes to partitioned `engine.analytics_events` (partition ensured before insert), bots are filtered, rollups run before retention drops, domain events reach the store **only from the outbox dispatcher** (never from a request handler), and every event in C11 is emitted by both apps (a test checks names against the contract).

- [ ] **12.6 GA4 and Meta, consent-gated** · needs: 12.5, 10.6
  - **Lane** SEO · **Agent** medior · **Wave** W21 · 12B
  - **Owns** `engine/packages/analytics/src/adapters/**`
  - _Requirements: 17.6_
  - [ ] 12.6.a The ANALYTICS.md §2 mapping, firing only after marketing consent
  - [ ] 12.6.b Ids from runtime brand config through `ShellVM`; purchase values in the charge currency with the order id as `transaction_id`
  - [ ] 12.6.c The per-request CSP listing only the configured origins
  - [ ] 12.6.d **Check:** the mapping in ANALYTICS.md §2 fires only after marketing consent, with the ids read from runtime brand config through `ShellVM` (no `NEXT_PUBLIC_*`); purchase values are in the charge currency with the order id as `transaction_id`; and the per-request CSP lists only the configured origins.

- [ ] **12.7 Admin dashboards** · needs: 12.5, 8.1
  - **Lane** ADM + SEO · **Agent** senior-fe · **Wave** W21 · 12B
  - **Owns** `engine/packages/cms/src/admin/analytics/**`, `engine/packages/analytics/src/queries/**`
  - _Requirements: 17.7_
  - [ ] 12.7.a Queries: funnels, leads with response times, unmet demand, the sold archive, payments, merchandise, field Web Vitals
  - [ ] 12.7.b Admin views per brand, inside Payload's navigation
  - [ ] 12.7.c Opened and seen with real staging sessions
  - [ ] 12.7.d **Check:** funnels, leads with response times, unmet demand (zero results + want-lists), the sold archive, payments, merchandise metrics and field Web Vitals render per brand — **opened and seen with real session data**, not only queried.

- [ ] **12.8 Phase 12 gate** · needs: 12.1–12.7
  - **Lane** QA · **Agent** qa · **Wave** W22
  - **Owns** `docs/gates/phase-12.md`
  - **Read** the phase's **Done when**
  - _Requirements: 17.1–17.7_
  - [ ] 12.8.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the phase's surfaces
  - [ ] 12.8.b Drive every clause of the phase's **Done when** on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/phase-12.md`
  - [ ] 12.8.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 12.8.d **Check:** every clause of the phase's **Done when** is evidenced in `docs/gates/phase-12.md`, with no failure left open.

---

## Phase 13 — Hardening, launch readiness and cutover · W21–W26 · ~8d

**Goal:** fast, accessible, secure, compliant, operable, photographed and well written — then live, then iterated.
**Done when:** both brands are live on their production domains, budgets pass in
CI, the restore drill is recorded, redirect verification is 100%, photography and
copy meet their gates, the design gate passes on the live sites, and someone new
can catalogue a work and fulfil an order using only the CMS guide.
**Phase letters:** A — the shop's halves and everything engine-wide: 13.1.a, 13.2.a, 13.3, 13.4.a 👤, 13.4.c 👤, 13.5 👤, 13.6.a 👤, 13.9.a 👤, 13.10.a 👤 · B — 13.7 👤 (the shop launches) **and**, alongside it, the gallery's halves: 13.1.b, 13.2.b, 13.4.b, 13.6.b 👤, 13.9.b 👤, 13.10.b 👤 · C 13.8 👤 (the gallery cuts over) · gate 13.11 · after launch 13.12

The shop launches first (PLAN.md), so every readiness task is split into **the
shop's half** (`.a`, wave A) and **the gallery's half** (`.b`, wave B): the shop
never waits for the gallery's photography or copy, and the gallery's halves still
gate its cutover. They run alongside the shop's launch because nothing in them
depends on it. A dependency or wave followed by a subtask id in parentheses
applies to that subtask only (0.3.f parses it).

- [ ] **13.1 Performance pass on the reference devices** · needs: Phase 7 (13.1.a) · Phase 6 (13.1.b)
  - **Lane** QA + WEB · **Agent** senior-fe · **Wave** 13.1.a in W22 · 13A · 13.1.b in W23 · 13B
  - _Requirements: 19.1, 19.11_
  - [ ] 13.1.a The shop: lab and field budgets on home, browse, item, design and checkout on the reference devices — including a run on Telkomsel 4G in Bali and inside the Instagram and WhatsApp in-app browsers — with the per-route JS report attached, image sizes matching rendered sizes and `Save-Data` honoured
  - [ ] 13.1.b The gallery: the same on home, browse, item (the viewer loading on intent) and checkout, on the reference devices and 4G, with its per-route JS report
  - [ ] 13.1.c **Check:** field and lab budgets pass on home, browse, item, design and checkout for the brand on the named reference devices (DESIGN-SYSTEM.md §7), including a run on Telkomsel 4G in Bali and inside the Instagram and WhatsApp in-app browsers; the per-route JS report is attached; image sizes match rendered sizes; `Save-Data` is honoured.

- [ ] **13.2 Accessibility audit** · needs: Phase 7 (13.2.a) · Phase 6 (13.2.b)
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** 13.2.a in W22 · 13A · 13.2.b in W23 · 13B
  - _Requirements: 19.2, 19.11_
  - [ ] 13.2.a The shop: axe plus manual keyboard, NVDA and VoiceOver, 200% zoom through its checkout, focus-not-obscured and dragging alternatives, and the in-app browsers — no open blocker
  - [ ] 13.2.b The gallery: the same audit, including the viewer's keyboard map and the purchase panel's states — no open blocker
  - [ ] 13.2.c **Check:** a WCAG 2.2 AA audit of the brand — axe plus manual keyboard, NVDA/VoiceOver, 200% zoom through its checkout, focus-not-obscured and dragging alternatives, and the in-app browsers — has no open blocker.

- [ ] **13.3 Security hardening** · needs: Phases 5, 9
  - **Lane** HAR + WEB · **Agent** senior-be, devops · **Wave** W21 · 13A
  - **Owns** `engine/packages/http/src/security/**`
  - _Requirements: 19.5, 19.6_
  - [ ] 13.3.a The CSP built per request from brand config; security headers with tests
  - [ ] 13.3.b Rate limits (auth, forms, offers, checkout, order lookup); webhook replay protection; admin lockout
  - [ ] 13.3.c Dependency and secret scanning in CI; the OWASP Top 10 checklist
  - [ ] 13.3.d **Check:** the CSP is **built per request** from brand config (payment-provider and analytics origins only; adding a provider needs a restart, not a rebuild), security headers ship with tests, rate limits cover auth/forms/offers/checkout/order lookup, webhook replay protection and admin lockout are tested, dependency and secret scanning run in CI, and an OWASP Top 10 checklist is complete; card data never reaches our servers.

- [ ] **13.4 👤 Compliance implementation check** · needs: Phases 5, 7, 10 (13.4.a) · Phases 5, 6, 10 (13.4.b) · 👤 counsel's texts (13.4.c)
  - **Lane** QA + ARC · **Agent** qa · **Wave** 13.4.a in W22 · 13A · 13.4.b in W23 · 13B · 13.4.c in W22 · 13A
  - **Read** COMPLIANCE.md §7, §10
  - _Requirements: 8.2, 8.3, 18.3–18.7_
  - [ ] 13.4.a The shop: e2e proves the IDR-only rule and the payment caps; the seller's identity shows in the footer and on documents; counsel's bilingual legal pages are loaded; consent records, the processing-record export and data export/erasure (10.8) work
  - [ ] 13.4.b The gallery: the same checks, plus export-status gating (a `domestic-only` original seen from abroad) and enquiry-only originals
  - [ ] 13.4.c 👤 counsel's bilingual legal pages per seller; the breach-response runbook (who decides, who notifies the authority and the people affected, within what time — UU PDP) with the owner's named contacts; the data-protection officer decision
  - [ ] 13.4.d **Check:** for the brand, e2e proves the IDR-only rule, export-status gating and payment caps; seller identity shows in the footer and documents; bilingual legal pages from counsel are loaded; consent records, the processing-record export and data export/erasure work (10.8); and the breach-response runbook exists with named contacts.

- [ ] **13.5 👤 Production provisioning, backups, restore drill, monitoring** · needs: 0.9 · 👤 the Helios go-ahead for each target
  - **Lane** HAR · **Agent** devops · **Wave** W21 · 13A
  - _Requirements: 19.7, 19.8, 19.9_
  - [ ] 13.5.a the shop's production target
  - [ ] 13.5.b the gallery's production target — provisioned early and kept dark for 11.11
  - [ ] 13.5.c backups, the restore drill and monitoring for both
  - [ ] 13.5.d **Check:** both production targets are provisioned with the owner's go-ahead, nightly dumps and storage replication run, a timed restore drill of one brand is recorded, and alerts (p95, 5xx, disk 80%, restart loop, job lag, outbox lag, webhook signature failures) fire in a test.

- [ ] **13.6 👤 Manuals and training** · needs: Phase 8
  - **Lane** DOC · **Agent** medior · **Wave** 13.6.a in W22 · 13A · 13.6.b in W23 · 13B
  - **Owns** `manual/**`
  - _Requirements: 14.1–14.7_
  - [ ] 13.6.a 👤 The shop's guide (`manual/`), with screenshots, and a training session with the shop's staff, their questions folded back in
  - [ ] 13.6.b 👤 The gallery's guide and a training session with the gallery's staff, their questions folded back in
  - [ ] 13.6.c **Check:** `manual/user-guide.md` and `manual/cms-guide.md` (cataloguing, merch wizard, order builder, orders, offers, holds, refunds, returns, data-subject requests) exist with screenshots for the brand, and a training session has been held with its staff and their questions folded back in.

- [ ] **13.7 👤 Old East Indies launch** · needs: 13.1.a, 13.2.a, 13.3, 13.4.a, 13.4.c, 13.5.a, 13.5.c, 13.6.a, 13.9.a, 13.10.a, 11.7, 11.11, Phases 7, 8, 9, 10, 12
  - **Lane** HAR + QA + MIG · **Agent** devops, qa · **Wave** W23 · 13B
  - _Requirements: 7.1–7.12, 15.3, 16.6_
  - [ ] 13.7.a 👤 The owner's go-ahead for the production deploy, and the live Midtrans and Biteship credentials in Infisical
  - [ ] 13.7.b 150–300 products published; the sister sync reading the gallery's dark production archive
  - [ ] 13.7.c 👤 The owner points `oldeastindies.com` at the new shop (their DNS); every legacy redirect live; Search Console verified
  - [ ] 13.7.d Smoke tests green; 72 hours of monitoring reviewed
  - [ ] 13.7.e **Check:** `oldeastindies.com` serves production with live Midtrans and Biteship, 150–300 products published, the sister sync reading the gallery's dark production archive, every legacy redirect live, Search Console verified, smoke tests green, and 72 hours of monitoring reviewed.

- [ ] **13.8 👤 Indies Gallery cutover** · needs: 13.7, 13.1.b, 13.2.b, 13.4.b, 13.6.b, 13.9.b, 13.10.b, 11.8, 11.10, 11.11, Phase 6
  - **Lane** MIG + HAR + QA · **Agent** senior-integrator, devops, qa · **Wave** W24 · 13C
  - **Read** MIGRATION.md §8
  - _Requirements: 6.10, 16.5, 16.7_
  - [ ] 13.8.a T–14: the rehearsal signed off (11.8)
  - [ ] 13.8.b 👤 T–2: the owner lowers the DNS TTL to 300 s and asks their staff to stop editing the old admin from T — their action; we never log in to or change the old site
  - [ ] 13.8.c T: the owner hands over a final export; the delta import runs into the dark production database; publication and redirect verification reach 100%
  - [ ] 13.8.d 👤 T: the owner points `antiquemapsindonesia.com` (and the `indiesgallery.com` alias) at the new site; sitemaps submitted; Search Console and analytics annotated
  - [ ] 13.8.e The 48-hour rollback written down: the owner points DNS back at the old site, which was never touched; orders taken in that window exported for manual handling
  - [ ] 13.8.f **Check:** the gallery serves production on its own domain, the delta import and redirect verification are at 100%, sitemaps are submitted, and the 48-hour rollback is written down — with nothing done to the old site by us.

- [ ] **13.9 👤 Photography coverage gate** · needs: 1.2 · Phase 7 (13.9.a) · Phase 6 (13.9.b)
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** 13.9.a in W22 · 13A · 13.9.b in W23 · 13B
  - _Requirements: 6.12, 7.12_
  - [ ] 13.9.a 👤 The shop: every launch product with flat, in-room and detail images shot to the capture standards; synthetic mockups labelled until replaced
  - [ ] 13.9.b 👤 The gallery: the top 200 items with at least a recto, a verso and one detail image shot to the capture standards
  - [ ] 13.9.c **Check:** every shop launch product has flat, in-room and detail images, and the gallery's top 200 items have at least a recto, a verso and one detail image shot to the capture standards — synthetic mockups labelled until replaced.

- [ ] **13.10 👤 Full copy review in both locales** · needs: 1.3, Phase 10 · Phase 7 (13.10.a) · Phase 6 (13.10.b)
  - **Lane** QA + UXG/UXE · **Agent** senior-uiux (with the native Indonesian writer) · **Wave** 13.10.a in W22 · 13A · 13.10.b in W23 · 13B
  - _Requirements: 18.8_
  - [ ] 13.10.a 👤 The shop: every page, email, WhatsApp template and document read on staging in English and Indonesian against the lexicon and voice, with the native writer; every correction merged
  - [ ] 13.10.b 👤 The gallery: the same read, with the native writer; every correction merged
  - [ ] 13.10.c **Check:** every page, email, WhatsApp template and document of the brand has been read on staging in English and Indonesian against the lexicon and voice, and every correction is merged.

- [ ] **13.11 Launch gate — with the design gate** · needs: 13.1–13.10
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W25
  - **Owns** `docs/gates/phase-13.md`
  - **Read** the phase's **Done when**, DESIGN-SYSTEM.md §13
  - _Requirements: 19.1–19.12_
  - [ ] 13.11.a The full gate on merged `main` and on both production sites
  - [ ] 13.11.b Every clause of Phase 13's **Done when** evidenced on the **live** sites in `docs/gates/phase-13.md`
  - [ ] 13.11.c The design gate on the live sites (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian — zero P0/P1 left
  - [ ] 13.11.d 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 13.11.e **Check:** every clause of Phase 13's **Done when** is evidenced in `docs/gates/phase-13.md`, and the design gate passes on the **live** sites with the owner's sign-off.

- [ ] **13.12 30-day design iteration** · needs: 13.11
  - **Lane** UXG + UXE + SEO · **Agent** senior-uiux · **Wave** W26
  - **Owns** `docs/design/iteration/**` (findings) — fixes are dispatched as new tasks in their lanes
  - _Requirements: 17.7, 19.10_
  - [ ] 13.12.a T+14: an impeccable `critique` session with the owner on the design KPIs — configurator completion, product page → WhatsApp, zoom engagement, filter use, zero-result rate, VA expiry rate, lead response times
  - [ ] 13.12.b T+30: the second session
  - [ ] 13.12.c The fixes dispatched as tasks in their lanes, and shipped
  - [ ] 13.12.d **Check:** design KPIs — configurator completion, product page → WhatsApp, zoom engagement, filter use, zero-result rate, VA expiry rate, lead response times — have been reviewed at T+14 and T+30 in impeccable `critique` sessions with the owner, and the fixes they produced have shipped.

---
## Backlog — Phase 14, v2 (after launch; not counted in the progress table)

Sequenced after launch; each becomes a detailed phase when scheduled. Owners and
agents are assigned then.

- [ ] 14.1 Binding offers with a saved payment method (Stripe), deposits for reservations, instalments — _Requirements: 9.6, 9.7_
- [ ] 14.2 Catalogues as printable PDFs, generated from the web-native catalogue pages that ship at launch — _Requirements: 6.5_
- [ ] 14.3 In-room and AR views for originals and prints (the static scale view ships at launch) — _Requirements: 4.5, 7.2_
- [ ] 14.4 Map-based browse and the Archipelago Explorer with a time slider — _Requirements: 5.1_
- [ ] 14.5 Dutch and Chinese locales — _Requirements: 3.4, 18.1_
- [ ] 14.6 My Collection registry and shareable sets — _Requirements: 13.2_
- [ ] 14.7 Trade portal (shop) and designer programme (gallery) with price tiers, quotes and project boards — _Requirements: 7.8_
- [ ] 14.8 Old East Indies Singapore seller with duties-paid export and wallets — _Requirements: 2.7, 11.7_
- [ ] 14.9 The full "Print from the Archive" range and the gallery-wall builder — _Requirements: 7.7_
- [ ] 14.10 Personalised old maps of Indonesian towns — _Requirements: 7.2_
- [ ] 14.11 Loyalty and referrals; showroom visits earning points — _Requirements: 13.7_
- [ ] 14.12 A showroom till on the same stock (QRIS) — _Requirements: 9.1_
- [ ] 14.13 Marketplace sync through an omnichannel hub (Jubelio/Ginee), merchandise only — _Requirements: 3.1_
- [ ] 14.14 Georeferenced then/now overlays (Allmaps, IIIF) — _Requirements: 4.2_
- [ ] 14.15 The Parry cartobibliography online — _Requirements: 3.5_
- [ ] 14.16 A verifiable QR certificate of authenticity — _Requirements: 10.5_
- [ ] 14.17 Image licensing for institutions and publishers — _Requirements: 4.3_
- [ ] 14.18 Print-on-demand abroad: Prodigi and Gelato adapters behind the 9.6 router, switched on with `fulfilment.pod` (D23) — _Requirements: 12.4, 12.5_

---

## Dependency diagram

```mermaid
flowchart TD
    P0[Phase 0: Foundation and contracts]
    C05[0.5: Contracts C1-C13 frozen]
    P1[Phase 1: Brand directions]
    PICK[1.7 and 1.8: Owner picks pairs, buyers test]
    P2[Phase 2: Content model and CMS]
    P3[Phase 3: Design systems and shells]
    P4[Phase 4: Media, deep zoom, search]
    P5[Phase 5: Commerce core]
    RES[5.4: Reservation guarantee]
    MACH[5.17: State machines and outbox]
    APPLY[5.18: applyPaymentEvent]
    PAYC[5.9: Payments core]
    P6[Phase 6: Indies Gallery storefront]
    P7[Phase 7: Old East Indies storefront]
    P8[Phase 8: Admin tooling]
    P9[Phase 9: Integrations]
    P10[Phase 10: Accounts and retention]
    P11A[Phase 11 A-C: Extract, normalise, map]
    P11B[Phase 11 D-F: Register, load, redirects, verify, rehearse]
    DARK[11.11: Gallery production imported dark]
    PROV[13.5: Production targets]
    P12[Phase 12: SEO, analytics, feeds]
    P13A[Phase 13 A: Readiness, the shop's halves]
    P13B[Phase 13 B: Readiness, the gallery's halves]
    OEI[13.7: Old East Indies launch]
    IG[13.8: Indies Gallery cutover]
    P14[Phase 14: v2]

    P0 --> C05
    C05 --> P1
    C05 --> P2
    C05 --> P11A
    P1 --> PICK
    PICK --> P3
    C05 --> P3
    P2 --> P4
    P2 --> P5
    P5 --> RES
    P5 --> MACH
    RES --> APPLY
    MACH --> APPLY
    APPLY --> PAYC
    P3 --> P6
    P3 --> P7
    P4 --> P6
    P4 --> P7
    PAYC --> P6
    PAYC --> P7
    P2 --> P8
    P5 --> P8
    PAYC --> P9
    P5 --> P10
    P2 --> P11B
    P4 --> P11B
    P11A --> P11B
    P6 --> P12
    P7 --> P12
    P10 --> P12
    P7 --> P13A
    P8 --> P13A
    P9 --> P13A
    P12 --> P13A
    P0 --> PROV
    PROV --> DARK
    P11B --> DARK
    P9 --> DARK
    P13A --> OEI
    DARK --> OEI
    P6 --> P13B
    OEI --> IG
    P13B --> IG
    DARK --> IG
    IG --> P14

    style C05 fill:#fff3cd
    style RES fill:#f8d7da
    style MACH fill:#f8d7da
    style APPLY fill:#f8d7da
    style PAYC fill:#f8d7da
    style PICK fill:#d1ecf1
    style DARK fill:#e2d9f3
    style OEI fill:#d4edda
    style IG fill:#d4edda
```

Yellow is the contract freeze everything builds on; red is the money-safety path
that gates both storefronts' checkouts; blue is the owner's design decision that
gates both apps' look; purple is the gallery's dark production import the shop's
launch needs; green is the two launches.

---

## Log

Newest first. One line per finished task (`✅ id — what it proved`) and per event that changed the plan.

- 2026-09-28 — ✅ 0.1 — workspace, strict TS, ESLint boundaries and `pnpm verify` green on Windows + Linux; `main` pushed to `gaiadabali/antique-map` as `web-gaiada` (OA1).
- 2026-09-28 — senior-db review of ARC-D (C5–C8): **sign-off with fixes**, 3 blockers (multi-target deadlock order, isolation pinned to READ COMMITTED, applyPaymentEvent row locking) — recorded in `.claude/specs/indies-platform/reviews/0.5-arc-d-senior-db.md`, to route to ARC-D. ARC-P relaunch and senior-be review stopped on the weekly Opus limit (resets 2026-09-30 08:00 WITA).
- 2026-09-25 — `TASKS.md` created at the repo root as the progress board, from the reviewed spec: every task broken into subtasks ending in a **Check**, the dispatch plan W1–W26, the owner's decisions moved here from PLAN.md, the progress table generated by `scripts/progress.mjs`. The current live sites are out of scope: nothing in this plan touches them.
