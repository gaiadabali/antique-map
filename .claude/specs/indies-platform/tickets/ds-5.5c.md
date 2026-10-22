# Ticket ds-5.5c — the gallery's Lighthouse runner (5.5.c, local half)

**Lane:** deepseek (via glmteam) · **Task:** TASKS.md 5.5, subtask **5.5.c** — the runner and a local run; the staging run is the orchestrator's later · **Branch:** `w/ds-5.5c` (cut from `main`, already checked out — work in place)
**Report:** `docs/reports/workers/ds-5.5c.md` · Opus reviews every line before the merge. Never invent a score: every number in the report comes from a JSON file the runner wrote.

## The claim (TASKS.md 5.5.c, 5.5.d)
Lighthouse **mobile** on the gallery's listing and an item page scores **≥ 90 performance** and **100 accessibility**.

## Read first
`AGENTS.md`, `.claude/worker-rules.md`, `docs/gates/shop-payment.md` §Lighthouse and Finding 2 (**why `lhci collect` crashes on this Windows host** and the workaround: call the `lighthouse` CLI directly with its own `--user-data-dir`, and read the JSON it writes before chrome-launcher's cleanup `EPERM`), `lighthouserc.web.json` (the budget values), `docs/gates/shop-payment/lighthouse-product.json` (what a report looks like).

## Owned paths
`tests/e2e/gallery/lighthouse/**` (new — the runner and its README), `docs/reports/workers/ds-5.5c.md`, `docs/reports/workers/ds-5.5c/**` (raw JSON). **Nothing else** — no app code, no `package.json`, no lockfile (use the `lighthouse` binary already installed: find it with `pnpm exec lighthouse --version`; if it is not installed, stop and report).

## Build
1. **The runner** `tests/e2e/gallery/lighthouse/run.mjs` (plain Node ESM, no new dependency): `node tests/e2e/gallery/lighthouse/run.mjs --base <origin> --out <dir> [--runs 3] <path> [<path>…]`. For each path, run `lighthouse <base><path> --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=<out>/<slug>-<n>.json --chrome-flags="--headless=new --user-data-dir=<a fresh dir under os.tmpdir()>"` `--runs` times. Treat a non-zero exit as OK **only if** the JSON file exists and parses (the known cleanup `EPERM`); otherwise fail. Take the **median** performance score per page; accessibility must be 100 on every run. Also read LCP, CLS, TBT and total script bytes and compare them with the budgets in `lighthouserc.web.json`. Print a Markdown table (page · perf median · a11y · LCP · CLS · TBT · script KB · pass/fail) and exit 1 if any page fails. Host routing: the gallery is reached as `http://gallery.localhost:<port>` (Chromium resolves `*.localhost` itself).
2. **README** in the same folder: how to run it locally and against staging (`--base https://indies-gallery.gaiada.com`), and the Windows `EPERM` note.
3. **Local run:** `pnpm install --frozen-lockfile`, `pnpm worktree:env 5 wds5c`, `pnpm db:fresh`, `pnpm --filter @engine/cms seed`, `pnpm build`, `pnpm --filter @engine/web start`. Run the runner on the gallery home `/`, the listing `/browse`, and — **if the item route answers 200 on your build** — one item page taken from a browse link (the item page may not be merged yet; if `/product/...` answers 404, say "item page not on main yet" and run the other two only). Save the raw JSON under `docs/reports/workers/ds-5.5c/` and paste the table into the report.
4. Do not tick anything on the board (`pnpm tasks:start` is fine; 5.5.c is only done on staging). If a page fails its budget, report the top three Lighthouse opportunities/diagnostics for it from the JSON — do not change app code.

## Rules
No file over 300 lines. `pnpm lint` clean. Use only the dev Postgres container `indies-platform-dev-postgres-1`.

## Verify (paste real output)
```bash
pnpm lint
node tests/e2e/gallery/lighthouse/run.mjs --base http://gallery.localhost:$PORT --out docs/reports/workers/ds-5.5c / /browse
```
