# ds-5.5b — the gallery's "no commerce" scan (TASKS.md 5.5.b)

**Task / Status: blocked**

The spec and its term list are written (owned paths), lint and typecheck are clean, but the ticket's
own acceptance condition ("home, browse, search **and at least one item page** must answer 200")
cannot be met on `w/ds-5.5b`, and the scan cannot be executed at all, for three independent reasons
below. No banned term was proven absent or present: the scan never ran.

## Subtasks

- ❌ **5.5.b** — not evidenced. See the three blockers. `pnpm tasks:report 5.5.b` was **not** run (the
  ticket forbids reporting it unless the spec runs green with home, browse, search and item pages
  scanned).

## Check

- ❌ The gallery's built HTML contains no cart/checkout/sign-in/price/"offer" — **not proven**. The
  scan did not run (blockers 1–3).

## Files

- `tests/e2e/gallery/no-commerce/terms.ts` (new) — the banned-term list, each term with its reason;
  EN+ID, the allowed "Price on request" / "Harga atas permintaan" phrases masked first.
- `tests/e2e/gallery/no-commerce.spec.ts` (new, 235 lines) — the scan: discovers pages from the route
  map and browse/index links, loads each at 390×844, tests visible text + the named attributes,
  scans the raw server HTML for `askingPrice` and currency, and prints the scanned / "not built yet"
  lists. Fails on any banned term and on any non-200 required page.
- `docs/reports/workers/ds-5.5b.md` (this file).

## Blockers (all three are outside my owned paths — I could not fix any)

1. **The gallery has no item route on this branch, so the ticket is unsatisfiable as written.**
   `engine/apps/web/src/app/(gallery)/gallery/[locale]/` holds only `page.tsx` (home), `browse/`,
   `search/`, `page/` and `not-found/` — there is **no `item/`, `makers/`, `places/`, `sell-to-us/`**
   (verified by directory listing; the catch-all `[...missing]/page.tsx` calls `notFound()`).
   `routes-exist.test.ts` (`NOT_BUILT_YET.gallery`) names them: `item: 'TASKS.md 5.2'`,
   `maker/place/story: 'TASKS.md 5.4'`, `sellToUs: 'TASKS.md 5.3'`. The ticket requires
   "at least one item page must answer 200" — impossible until **5.2** is merged into `w/ds-5.5b`.
   This is not branch staleness: **`main` is identical** (`git show main:engine/apps/web/src/app/routes-exist.test.ts`
   lists the same `item: 'TASKS.md 5.2'`), so the ticket cannot pass on today's `main` either.

2. **The root `playwright.config.ts` has no project for `tests/e2e/gallery/`,** so the ticket's own
   Verify command finds no test to run. `pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts --list`
   → `Error: No tests found.` / `Total: 0 tests in 0 files`; `pnpm exec playwright test --list` lists
   164 tests in 14 files, none under `tests/e2e/gallery`. The config's projects are smoke, status,
   a11y, shop-e2e, hosts, admin (`testDir`s `./tests/e2e/{smoke,status,a11y,shop,hosts,admin}`).
   `playwright.config.ts` is **not** an owned path, so adding a `gallery-e2e` project is a change I did
   not make — it must be the orchestrator's (or a new ticket's). Without it the ticket's Verify line
   is unrunnable.

3. **The shared dev Postgres container is down and I may not recover it.** `docker exec
   indies-platform-dev-postgres-1 pg_isready` → `/var/run/postgresql:5432 - rejecting connections`
   (`rc=1`), continuously for this whole session ("terminating connection because of crash of another
   server process"; "the database system is in recovery mode"). Worker rules forbid dropping or
   recreating shared containers. The root cause is **already fixed on `main`** — `214a1f5 fix(dev):
   the dev Postgres runs with an init as PID 1` (and `24f008a docs(workers): workers never start, stop
   or recreate the shared dev containers`) — but `w/ds-5.5b` predates `1b5dffc`/`214a1f5` and I may
   not merge. So `pnpm db:fresh`, `pnpm seed`, `pnpm build` and the server start could not run, and the
   scan has no server to load.

## Evidence

```text
$ pnpm lint
$ eslint --max-warnings=0 .
(clean — no output, exit 0, after removing one unused helper)

$ pnpm --filter @engine/web typecheck
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
rc=0

$ pnpm vitest run engine/apps/web/src/app/routes-exist.test.ts
Test Files  1 passed (1)
     Tests  17 passed (17)

$ pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts --list
Error: No tests found.
Total: 0 tests in 0 files

$ pnpm exec playwright test --list
Total: 164 tests in 14 files          # none in tests/e2e/gallery

$ docker exec indies-platform-dev-postgres-1 pg_isready
/var/run/postgresql:5432 - rejecting connections
rc=1
```

Gallery app routes present (no `item/`, `makers/`, `places/`, `sell-to-us/`):

```text
engine/apps/web/src/app/(gallery)/gallery/[locale]/
  [...missing]/  browse/  not-found/  page/  search/  layout.tsx  not-found.tsx  page.tsx
```

## Found

- **`.claude/specs/indies-platform/tickets/ds-5.5b.md` §2 is internally inconsistent given the
  dependency order:** it requires "at least one item page must answer 200" while also allowing "a
  route that answers 404 today because its phase-5 task hasn't merged" to be skipped as "not built
  yet". Those two rules collide until 5.2 merges: the item route is both the page that must be 200
  and the page that 404s. The ticket was cut as if 5.2 had landed; it has not.
- **`playwright.config.ts` has no gallery e2e project** (its header comment lists only
  smoke/status/a11y/hosts/shop), so no ticket may assume `pnpm exec playwright test tests/e2e/gallery/...`
  runs. Contradicts the Verify line of ds-5.5b (and ds-5.1d, which the same run cut).

## Follow-ups (proposed subtasks — I did not create them)

1. Merge **5.2** (gallery item page) into the branch the gallery scan runs on, then re-cut ds-5.5b;
   it is otherwise unblockable.
2. Add a `gallery-e2e` project to `playwright.config.ts` (`testDir: './tests/e2e/gallery'`, gallery
   host, `E2E_PORT`) — small, but the whole ticket family depends on it. Not an owned path here.
3. Recover the shared dev Postgres: it needs the `main` fix `214a1f5` (init as PID 1); a worker may
   not recreate the container, so the orchestrator must land that on the running container's host or
   restart it from the fixed compose file.

## Not done (deliberately)

- No `pnpm tasks:report 5.5.b` (ticket §5: only when green).
- No `test.skip` and no conditional assert beyond the one "not built yet" rule — the spec's required
  pages (home, browse, search, first item) fail loudly, as instructed.
