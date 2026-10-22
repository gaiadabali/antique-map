# Ticket 9chk — read-only tools for the phase-9 staging Checks (9.3.d crawl, 9.4.c old-URL walk)

**Lane:** deepseek · **Task:** tooling for TASKS.md 9.3.d and 9.4.c (the orchestrator runs them on staging; you
tick nothing) · **Branch:** `w/9chk` · **Report:** `docs/reports/workers/9chk.md`

## Read first
`AGENTS.md`, `.claude/worker-rules.md`, TASKS.md tasks 9.3 and 9.4 (their **Check** lines are the spec),
`docs/DATA.md` §Redirects (around lines 155–215), the inventories
`engine/packages/migrate/data/gallery/inventory/{urls.tsv,README.md,summary.json}` (7,665 rows) and
`engine/packages/migrate/data/shop/inventory/{urls.csv,summary.json}` (673 rows), the builder
`engine/packages/migrate/src/redirects/{build,cli,normalise,rules}.ts` (the 9.4a outcomes: row, gone, unresolved
with reason), the SEO code `engine/apps/web/src/server/seo/**` and the routes `engine/apps/web/src/app/api/x/{sitemap,robots}/**`
(what a sitemap and a page's head look like), the site table `engine/packages/config/src/sites/table.ts`, and an
existing tool for the house style: `engine/tooling/no-trackers/{cli.mjs,no-trackers.mjs,no-trackers.test.mjs}`.

## Owned paths
`engine/tooling/phase9-checks/**` (new), one script line per tool in the root `package.json` (`check:old-urls`,
`check:seo-crawl`), the report. Plain Node ESM `.mjs`, as the other tools are; no new dependency (use `fetch`
and regexes or a tiny hand-rolled HTML scan; no lockfile change). No file over 300 lines.

## Hard rules (staging is shared with other clients on one host)
- **Read-only:** GET/HEAD only. Never POST, never sign in, never send a cookie.
- **Rate-limited:** a global limiter of at most **5 requests a second** (configurable lower, never higher
  without a flag that also requires `--i-know`), one request in flight per host by default, a backoff on 429/503
  that honours `Retry-After`.
- **Resumable:** progress is appended to a JSONL state file (`--state <path>`, default under the OS temp dir);
  a rerun with the same state skips URLs already answered.
- **Never** request `/track/*`, `/lacak/*`, `/order/*`, `/pesanan/*` or any path the site table marks
  `sensitive`. Skip and count them; never guess tokens.
- Args: `--base <origin>` (e.g. `https://staging.example`), optional `--host <Host header>` (send it as `Host`
  when the base is an IP or tunnel), `--site gallery|shop`, `--out <report.json>`. Nothing at import time;
  exit code 0 only when the Check passes.

## What to build
1. **`old-urls.mjs`** (9.4.c): reads the site's inventory, normalises each URL with the builder's own rules
   (import `@engine/migrate`'s normaliser only if it resolves from tooling without a lockfile change; otherwise
   restate it with a test that compares against the builder by relative import, as `packages/http/src/legacy/key.ts`
   did), de-duplicates, and for each key requests it **without following redirects**: 301 → request the `Location`
   once, which must answer **200** (anything else is a failure: chain, loop, 404); 410 → ok; 404 → ok **only** if the
   builder lists it unresolved, and the report carries the builder's reason (run the builder in-process over the
   inventory with `--works <json>` the orchestrator supplies, or read the builder's `unresolved.<site>.json` via
   `--unresolved <path>`). Report: totals by outcome, every failure with its URL and chain, and the line
   "rows + gone + unresolved = N" per site.
2. **`seo-crawl.mjs`** (9.3.d): fetches `/sitemap.xml` (and any sitemap index children) for the site, then every URL
   in it under the limiter. For each page: status 200; a `<link rel="canonical">` (absolute, same origin);
   `hreflang` alternates for both locales and `x-default`; a non-empty `<meta name="description">`; on the gallery,
   **no** JSON-LD block containing `"price"` or `"offers"` anywhere (parse each `application/ld+json` block, walk
   it). Also: every sitemap URL answered 200, the count per locale, and `--expect <n>` compares the count with the
   published count the orchestrator supplies. Report per failure: URL and what was missing.
3. **Tests** (`node --test` like the other tools, or vitest if that is what the repo runs for `.test.mjs`; check
   `vitest.workspace`/config): against a tiny local HTTP server started in the test: "a 301 to a 200 passes";
   "a 301 to a 301 is a chain failure"; "a 404 the builder lists unresolved passes with its reason, one it does
   not list fails"; "a sensitive path is never requested"; "the limiter never exceeds the rate" (fake clock or
   measured); "a rerun with the state file skips answered URLs"; "a gallery page with offers in JSON-LD fails";
   "a page missing its canonical or description fails"; "Retry-After is honoured".

## Verify (paste output)
```bash
pnpm vitest run engine/tooling/phase9-checks   # or the repo's runner for .mjs tests
pnpm verify
node engine/tooling/phase9-checks/old-urls.mjs --help
node engine/tooling/phase9-checks/seo-crawl.mjs --help
```
Also run both against your own production build on your own port (`--base http://localhost:<port>`, gallery and
shop) and paste the summary: on a dev seed many checks will legitimately fail (no real works yet), and that's fine.
The point is that the tool runs end to end and reports clearly.
