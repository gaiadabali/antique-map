# 9chk — the phase-9 check tools (review round r1): base vs canonical origin

**Task / Status:** 9chk done (review round `9chk-r1` complete; no board task — the tools are tooling for TASKS.md
9.3.d and 9.4.c, and the orchestrator ticks those Checks on staging). Branch `w/9chk`, not merged or pushed.

## What the tools do

Two read-only CLIs under `engine/tooling/phase9-checks/`, plain Node ESM (no new dependency). Both are paced
(≤5 requests a second, one in flight per host, backoff on 429/503 honouring `Retry-After`), resumable from a JSONL
state file, and never request a sensitive path (`/track`, `/lacak`, `/order`, `/pesanan`, `/admin`, `/api`).

- **`old-urls.mjs`** (`pnpm check:old-urls`, TASKS.md 9.4.c) — reads one site's legacy URL inventory, normalises
  each with the 9.4a builder's own `redirectKey`, de-duplicates, and requests each key **without following
  redirects**. Judgement: 200 as itself; **301** → request the `Location` once, which must answer 200; 410 for a
  retired address; a 404 the builder lists unresolved (with its reason). Reports totals, every failure with its URL
  and chain, and the line `rows + gone + unresolved = N`.
- **`seo-crawl.mjs`** (`pnpm check:seo-crawl`, TASKS.md 9.3.d) — fetches `/sitemap.xml` (and any index children),
  then every URL in it under the limiter. For each page: status 200, an absolute `<link rel="canonical">`, `hreflang`
  alternates for `en`, `id` and `x-default`, a non-empty `<meta name="description">`; on the gallery no JSON-LD block
  containing `price` or `offers` (parsed block walk). `--expect <n>` compares the URL count with the published count.

### Flags

Shared (`cli-args.mjs`):

| Flag | Meaning |
| --- | --- |
| `--base <origin>` | the origin to request (an IP, a tunnel, `http://localhost:<port>`) — required |
| `--origin <origin>` | the site's canonical origin that pages/sitemaps/redirects speak — **defaults to `--base`**; must be an absolute `http(s)://host[:port]` with no path, query or fragment |
| `--site <gallery\|shop>` | which site's rules/inventory to apply — required |
| `--host <header>` | sent as the `Host` header (when `--base` is an IP or a tunnel) |
| `--out <path>` | write the JSON report here (default: stdout only) |
| `--state <path>` | JSONL resume file (default: a per-site file under the OS temp dir) |
| `--rate <n>` | requests a second (default 5; lower is fine, above 5 needs `--i-know`) |
| `--i-know` | allow a rate above 5 |
| `-h, --help` | usage |

`old-urls.mjs` adds `--unresolved <path>` (the builder's `unresolved.<site>.json`); `seo-crawl.mjs` adds
`--expect <n>`. Exit 0 only when the Check passes; a bad flag exits 2 with a readable message.

## The review-round fix (`9chk-r1`)

The first run (`a11ab4a`) treated the **base** and the **canonical origin** as the same. On staging the tools are
pointed at an IP, a tunnel or `http://localhost:<port>` (`--base`, with `--host`), while pages, sitemaps and
redirects speak the site's canonical origin (e.g. `https://gallery.staging.example`). Fixed:

1. `--origin` added to `cli-args.mjs`, defaulting to `--base`; `parseOrigin` rejects a non-`http(s)` scheme, a bare
   host and any path/query/fragment.
2. New module `to-base.mjs`: `toBase(url, { origin, base })` rewrites a URL on `origin` onto `base` (same path and
   query), returns any other origin unchanged and flagged `foreign`. Tests in `to-base.test.mjs`.
3. `seo-crawl`: sitemap `<loc>`s and index children go through `toBase`; a foreign `<loc>` is a failure ("sitemap
   lists another origin") and is never requested. The canonical check compares against `--origin`. Report URLs stay
   canonical. The sitemap-walk logic moved into pure functions (`resolveLocs`, `collectSitemapUrls`, `crawlPages`)
   in `seo-check.mjs` so tests drive it with a local server.
4. `old-urls`: the `Location` is judged against `--origin`. An absolute `Location` on another origin is a failure
   ("redirects off-site"). A `Location` on `origin` is requested through `toBase`, and the hop is checked for 200 as
   before. Counts now report 301 separately from 302, 307 and 308 (`counts.statuses`); a 308 is acceptable only when
   its `Location` differs from the request just by a trailing slash (counted `normalised`); 302 and 307 are failures
   with their status ("expected 301, got 302"); any other non-301 redirect is a failure with its status.

### Tests added (same runner, `pnpm vitest run`)

`cli-args.test.mjs`: "--origin with a path is refused"; `--origin` defaults to `--base`; an explicit origin is taken;
non-http and bare host refused.
`to-base.test.mjs`: rewrites onto the base keeping path and query; flags another origin as foreign and unchanged;
a different port is foreign; an unparsable URL is foreign; a no-op when base == origin.
`seo-check.test.mjs`: "crawls a sitemap on the canonical origin through the base"; "fails a sitemap loc on another
origin and never requests it"; "follows an index's children through the base"; "the canonical is checked against
--origin"; plus `crawlPages` end-to-end against a local server.
`old-urls-check.test.mjs`: "follows a 301 to the canonical origin through the base"; "fails a redirect that points
off-site"; "fails a 302 for the 9.4.c Check"; "fails a 307"; "counts a 308 that only normalises a trailing slash as
normalised"; "fails a 308 to a different path"; "counts 301 separately from 302, 307 and 308".

## Evidence

### Verify output

```
$ pnpm vitest run engine/tooling/phase9-checks
 Test Files  9 passed (9)
      Tests  70 passed (70)

$ node engine/tooling/phase9-checks/old-urls.mjs --help
usage: node engine/tooling/phase9-checks/old-urls.mjs --base <origin> --site <gallery|shop> [options]
  --base <origin>      the origin to request (e.g. https://staging.example, http://localhost:4372)
  --origin <origin>    the site's canonical origin (default: --base); the 301's Location is judged against it
  ...
$ node engine/tooling/phase9-checks/seo-crawl.mjs --help
usage: node engine/tooling/phase9-checks/seo-crawl.mjs --base <origin> --site <gallery|shop> [options]
  --base <origin>      the origin to request (e.g. https://staging.example, http://localhost:4372)
  --origin <origin>    the site's canonical origin (default: --base); sitemap locs are judged against it
  ...

$ pnpm check:filesize 2>/dev/null || true
check-file-size: ok, no file over 300 lines
```

`npx prettier --check engine/tooling/phase9-checks/**/*.mjs` → clean; `npx eslint engine/tooling/phase9-checks` →
clean (no output).

### End-to-end run against a local server

Run against a hand-rolled Node server on `http://127.0.0.1:4477` serving a sitemap on `https://gallery.example`
(canonical), a page, a 301 to the canonical origin, a 302, a 410 and a 404 — **not** a production build (see below):

```
$ node engine/tooling/phase9-checks/seo-crawl.mjs --base http://127.0.0.1:4477 --origin https://gallery.example --site gallery
seo-crawl (gallery) against http://127.0.0.1:4477 (canonical https://gallery.example)
  1 sitemap file(s), 3 URLs (en 2, id 1)
  checked 3, skipped 0 sensitive
  2 page(s) with a problem
  FAIL https://evil.example/x: sitemap lists another origin
  FAIL https://gallery.example/id/: status 404; no canonical link; ... (a page the demo server does not serve)
exit=1   (fails, as the sitemap lists a foreign loc and one page is missing)
$ ... --origin https://bad/path  ->  seo-crawl: --origin must have no path, query or fragment: https://bad/path  (exit 2)
```

`old-urls` judgement path over the same server (`checkKeys` with `origin: https://gallery.example`):

```
counts: { ok: 0, redirected: 1, normalised: 0, gone: 1, unresolved: 0, fail: 2,
          statuses: { 301: 1, 302: 1, 307: 0, 308: 0 } }
  /category/7-maps  301 → https://gallery.example/collections/7-maps  followed through the base → 200  (redirected)
  /product/1706     410   (gone)
  /old-302          302   FAIL  expected 301, got 302
  /missing          404   FAIL  404 the builder does not list unresolved
```

## Deviations / Follow-ups

1. **End-to-end against a production build is still owed.** The ticket asks for a run against a production build on
   the worker's own port (gallery and shop). The dev database is down for repair, so `pnpm build`, `db:fresh` and
   any docker command were **not** run, as instructed. The tool is proven end-to-end against a local server
   (above) and by the unit/integration suite; the production-build run stays for the orchestrator on staging.
2. **`--origin` default.** When neither the origin nor a base differs, `--origin` equals `--base`, so every existing
   local invocation keeps working unchanged.
3. **`counts.normalised`** is a new outcome (a 308 that only adds/removes a trailing slash). It counts as a `row`
   in the reconciliation (`rows + gone + unresolved = N`), since the address still resolves to a real page.
4. **Board:** `pnpm tasks:start 9chk` reports "no such open task" — the ticket is tooling for 9.3.d/9.4.c, which are
   themselves Check-only board rows the orchestrator ticks on staging, so nothing was ticked here.
5. `pnpm verify` was not run (the ticket says not to); the orchestrator runs it at merge.

**Files** — `engine/tooling/phase9-checks/cli-args.mjs`, `cli-args.test.mjs`, `to-base.mjs`, `to-base.test.mjs`,
`seo-check.mjs`, `seo-check.test.mjs`, `seo-crawl.mjs`, `old-urls-check.mjs`, `old-urls-check.test.mjs`,
`old-urls.mjs`; `docs/reports/workers/9chk.md`.

**Found** — nothing contradicts `docs/DATA.md` §Redirects or TASKS.md 9.3/9.4.
