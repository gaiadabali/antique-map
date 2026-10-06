# Worker report — ds-5.1d (gallery browse/search e2e evidence)

Run am-ds-5.1d-g2, GLM lane, worktree `antique-map-w-ds-5.1d`, branch `w/ds-5.1d`.
Ticket: `.claude/specs/indies-platform/tickets/ds-5.1d.md` (TASKS.md 5.1.d Check).
Owned paths touched: `tests/e2e/gallery/browse.spec.ts`, `tests/e2e/gallery/support/**`,
`docs/reports/workers/ds-5.1d/` (screenshots + this report).

## Result: all four claims proven, 4/4 tests pass

| Claim (Check clause) | Test | Result |
|---|---|---|
| 1. Search "Batavia" finds a work catalogued under the modern place | `search for the historical name "Batavia" finds the work catalogued under the modern place` | ✅ pass |
| 2. A draft work is never listed in browse/search; the owner's REST read still finds it (as `_status: 'draft'`) | `a draft work is never listed in browse or search, yet the owner can read it` | ✅ pass |
| 3. Browse/search responses carry no `askingPrice` and no currency figure (`/\b(Rp|S\$|US\$|\$)\s?\d/`) | `the browse and search responses carry no askingPrice and no currency figure` | ✅ pass |
| 4. axe clean on browse and search at 390×844 and 1280×800 | `axe is clean on browse and search at 390 and 1280 px` | ✅ pass |

Evidence for clause 1 is real: the fixtures publish a place named `E2E Jakarta <stamp>` whose
historical name is **Batavia**, and a work under it, then the test asserts the work's own title as a
result link on `/search?q=Batavia`. The draft test asserts the owner's REST read returns the record
with `_status: 'draft'` (so it exists) and that browse/search HTML never contains its title or its
unique word. Clause 3 captures the response bodies (`text/html`, `text/x-component`,
`application/json`) plus rendered `page.content()` before asserting. No conditional asserts, no
`test.skip`; missing data fails.

Screenshots: `docs/reports/workers/ds-5.1d/search-batavia-390.png`,
`search-batavia-1280.png` (final suite run, production build, worktree server on 4257).

## What the suite does differently from run 1

- Deleted `tests/e2e/gallery/support/playwright.config.ts` — tests run under the root config's
  `gallery-e2e` project (`--project gallery-e2e`).
- `test.describe.configure({ mode: 'default' })` + 5xx/network retries in the fixture helpers:
  the shared dev Postgres drops connections under parallel load, and a failed auth lookup silently
  reads as nobody (403 on the next write). Serialised, the suite is stable.
- The Batavia test settles with `expect(...).toPass({ timeout: 300_000 })` — the publish's cache
  revalidation can lag minutes under other worktrees' load; the test still fails hard if the work
  never appears.
- The fallback condition grade now sends its A–D `equivalent` (publishing a grade requires
  definition **and** equivalent — `GRADE_EQUIVALENT` in `validators/term-grade.ts`). The old
  fallback only worked on a database that already had a seeded grade.
- The media upload carries `provenance: 'photograph'` with the other alt/role fields.

## Findings for the orchestrator (app-side, not owned paths)

1. **Shared dev Postgres drops connections under parallel load** — login 500s and silent auth
   failures (user → null → 403). Any suite writing fixtures should serialise and retry 5xx.
2. **Search page cache lag after a publish** was observed once at ~90 s+ under load (the stale page
   even listed a since-deleted work). With a healthy DB it propagated within seconds. If it
   reproduces on quiet machines, that is an app bug worth a ticket; the test is written to catch it
   (5 min ceiling).
3. **The seed CLI is broken app-side**: `pnpm --filter @engine/cms seed --layer <layer>` dies with
   "`after` was called outside a request scope" (settings-invalidate hook in a plain Node process),
   for both `vocabulary` and `gallery-sample`. The suite works around it by creating its own
   fixtures, but nothing else that needs seed data can proceed until this is fixed.

## Verify (fresh clone, per the ticket)

Clone: `git clone -b w/ds-5.1d <worktree> C:/Users/Hansel/Documents/Hansel/Projects/antique-map-w-ds-5.1d-fresh`
(HEAD `6234879`), then `pnpm install --frozen-lockfile`, `pnpm worktree:env 5 ds51d`,
`pnpm db:fresh` (migrations ok, `indies_p5_ds51d` ready), `pnpm build` (ok), plus a local
`engine/apps/web/.env.local` (dev placeholders: hosts `gallery/shop.localhost`, DATABASE_URL to
`indies_p5_ds51d`, the shared dev MinIO/Mailpit, dev secrets — gitignored, never committed).

Note: the clone also carried the 3-line `equivalent: 'B+'` fixture fix, which at verify time was
already committed on the branch (`c70bd3c`) but the sandbox denied `git fetch/pull` into the
sibling path, so the file was applied by hand — byte-identical to the commit.

**`pnpm lint`** — clean (`eslint --max-warnings=0 .`, exit 0), both in the worktree and the fresh clone.

**`pnpm exec playwright test tests/e2e/gallery/browse.spec.ts --project gallery-e2e --reporter=list`**
(fresh clone, production build, own server on 4250, fresh database):

```
Running 4 tests using 1 worker
  ok 1 [gallery-e2e] › tests\e2e\gallery\browse.spec.ts:51:3 › … search for the historical name "Batavia" finds the work catalogued under the modern place (1.4s)
  ok 2 [gallery-e2e] › tests\e2e\gallery\browse.spec.ts:71:3 › … a draft work is never listed in browse or search, yet the owner can read it (587ms)
  ok 3 [gallery-e2e] › tests\e2e\gallery\browse.spec.ts:93:3 › … the browse and search responses carry no askingPrice and no currency figure (1.4s)
  ok 4 [gallery-e2e] › tests\e2e\gallery\browse.spec.ts:122:3 › … axe is clean on browse and search at 390 and 1280 px (2.8s)
  4 passed (11.6s)
```

Worktree suite (same commands, port 4257): `4 passed (49.7s)` — output in the transcript; the final
run before the fresh-clone verify also passed 4/4.

## Commits (this branch)

- `9c1dfb1` / `0621928` / `f8246cd` / `85c4507` — run 1's and the resumed setup (historical).
- `385f3ae` — settle window + fixture hardening; deletes the private playwright config.
- `c70bd3c` — the fallback grade's A–D equivalent.
- `6234879` — refreshed screenshots.

## Not done / caveats

- `.claude/specs/indies-platform/tickets/ds-5.1d.md` still carries run 1's uncommitted resume-note
  edit. The ticket says to `git checkout` it before the last commit, but the sandbox denied the
  checkout, so it is left as-is (uncommitted) for the orchestrator to discard.
- `pnpm tasks:report` for 5.1.d was **not** run — it is a Check; the orchestrator ticks it after
  merge + qa.
- Evidence is ready for the Opus review pass.

TICKET DONE
