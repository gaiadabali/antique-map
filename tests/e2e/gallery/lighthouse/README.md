# The gallery's Lighthouse runner

`run.mjs` drives the installed `lighthouse` CLI over the gallery's pages on a running server and
asserts the Check's budgets (TASKS.md 5.5.c/d): **performance ≥ 90 and accessibility 100** on a
mobile viewport, plus the numeric budgets from `lighthouserc.web.json` (LCP ≤ 2500 ms, CLS ≤ 0.05,
TBT ≤ 200 ms, script ≤ 150 KB). The staging run — against `indies-gallery.gaiada.com` — is the
orchestrator's later; this folder is the local half.

## Run

Against a production build started on this worktree's own port (`pnpm worktree:env 5 wds5c`,
`pnpm db:fresh`, the gallery seed, `pnpm build`, then `node .next/standalone/engine/apps/web/server.js`
with `GALLERY_HOSTS=gallery.localhost SHOP_HOSTS=shop.localhost LOCAL_PRODUCTION_BUILD=1`):

```bash
node tests/e2e/gallery/lighthouse/run.mjs --base http://gallery.localhost:$PORT --out docs/reports/workers/ds-5.5c / /browse
```

Against staging:

```bash
node tests/e2e/gallery/lighthouse/run.mjs --base https://indies-gallery.gaiada.com --out /tmp/lh-gallery / /browse
```

`--base` is the origin the paths hang off (`/`, `/browse`, one item page). `--out` is where the raw
`<slug>-<n>.json` reports land — one per run, per page. `--runs` (default 3) is how many times each
page is audited; the table shows the **median** performance score and the accessibility score of the
**worst** run (which must be 100). Exit code is 1 when any page misses a budget, 0 when all pass.

Chromium resolves `*.localhost` to loopback by itself, so `http://gallery.localhost:<port>` needs no
hosts-file entry. The runner finds the CLI at pnpm's hoisted store path
(`node_modules/.pnpm/node_modules/lighthouse/cli/index.js`) because `pnpm exec lighthouse` does not
resolve it at the workspace root — override with `LIGHTHOUSE_CLI` to another `cli/index.js` if needed.

## Windows `EPERM` — why the CLI, not `lhci`

`pnpm exec lhci collect` (the `@lhci/cli` wrapper) **crashes on this Windows host**
(`docs/gates/shop-payment.md` Finding 2): after Lighthouse finishes and before it has persisted a
report, `chrome-launcher`'s own cleanup (`fs.rmSync` of its random `%TEMP%\lighthouse.*` profile
directory) throws `EPERM` and kills the process. This is a host/profile-cleanup issue, not a product
defect, and the staging host (Linux) is not expected to hit it.

The runner calls the `lighthouse` CLI directly with an explicit `--user-data-dir` of its own. The
JSON output (`LH:Printer json output written to …`) completes **before** the same `EPERM` fires during
cleanup, so a run may exit non-zero yet leave a complete report. The runner therefore treats a
non-zero exit as OK **only** when the JSON file exists and parses; a run that wrote no parseable JSON
fails the page. The throwaway profile sits under `os.tmpdir()` and is removed by the runner itself.

## The table

```
| Page | Perf (median) | A11y | LCP ms | CLS | TBT ms | Script KB | Result |
```

Every number is read from a report the CLI wrote; nothing is estimated. Raw JSON for the evidence run
is under `docs/reports/workers/ds-5.5c/`.
