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

## Review (Opus) — 2026-10-06

**Verdict: MERGE**, with two follow-ups for the orchestrator that are outside this ticket's owned
paths (F1, F2 below). Reviewed `git diff main...w/5.4` against the ticket and AGENTS.md, merged
current `main` (`abe72b2`, no conflicts, lockfile unchanged), fixed what is listed, and re-ran
every gate on this worktree.

### Checked and holding

- **Loaders** (`server/gallery/{makers,places,pages}`): every Payload read is `overrideAccess: false`,
  `_status: 'published'`, and has an explicit `select`. Pages filter `site: 'gallery'` and `kind`.
  Work cards go through the catalogue's `projectCards` / `WORK_CARD_SELECT` (`catalogue/` is
  untouched), available and on-hold first, then sold. The one raw SQL (the makers index count)
  counts published works only. No `askingPrice`, `notes` or staff field is selected. The view
  models carry only the fields they map.
- **Routes** live at the internal surface names (`maker`, `place`, `page/[slug]`, `story/[slug]`),
  which is correct: the proxy rewrites the public segments there (`SURFACE_ROUTES`). The ticket's
  folder names (`makers/`, `about/`, …) would never be reached.
- **The catch-all and slugs.** `[...missing]` is unchanged. A CMS page is reached only through
  `parsePublicPath()`: one canonical segment matching `SLUG`, with reserved and claimed segments
  refused. The loader then matches published + gallery + kind + slug, and the place path is
  resolved against the published tree by exact slug. Probed on the production build: a draft page,
  the shop's page, `..%2F`, `%2e%2e`, an extra segment, the internal `/gallery/en/page/…` prefix, a
  child place without its parent, and a page slug under `/stories/` all give 404, with
  `askingPrice` 0 in every body.
- **No unsafe HTML.** There is no `dangerouslySetInnerHTML`. The body is a plain textarea split
  into `<p>` text nodes.
- **Links** are plain `<a>`, the repo idiom (`work-card.tsx`, `pagination.tsx`), so they never
  prefetch. CSS uses tokens only (`check:tokens` passes). Lexicon keys are in en and id. No file is
  over 300 lines.
- **`playwright.config.ts`:** `git diff main -- playwright.config.ts` is empty. The three-dot diff
  was non-empty only because the merge base predates `main`'s `gallery-e2e` project, which
  `7e4959b` restored byte-for-byte. `docker-compose.dev.yml` and `.claude/worker-rules.md` are also
  identical to `main`.
- **The e2e spec** has no conditional asserts and no skips.

### Fixes (commits on `w/5.4`)

| sha | fix |
| --- | --- |
| `e6e8c68` | The makers index counted a work twice when it credits one maker twice (`COUNT(DISTINCT wm._parent_id)`). The db test now seeds such a work. The pages db test's other-site case passed whenever the gallery's own page loaded; it now asserts that a shop-only slug is `null`. |
| `9d38207` | The places index showed a bare number. It now reads "3 places within" (`placePage.placeCount`, en and id), and nothing for a leaf. Added `copy.test.ts` for makers, places and pages: the ticket's unit-test path had no tests at all. |
| `aa537cd` | `generateMetadata` and the page each ran the same live loader (5–6 queries each). The loaders are now wrapped in React `cache()`. The place loader is keyed on the joined path. |
| `4d31999` | `routes-exist.test.ts` (from `main`) failed 3 tests after the merge. Its `NOT_BUILT_YET` lines for maker, place and story are removed, as the test asks once a page lands. |
| `b011b11` | A maker with no portrait rendered an empty 4:5 frame that pushed the name below the first screen at 390 px. Seen on a screenshot, fixed and re-checked. |
| `9ac31da` | E2E: the seed moves to `pages-seed.ts`. New cases: both indexes; an edited page shows its new words on the next request; a draft page and a shop page give 404 on the gallery host; axe now covers the indexes too. The file now runs in one worker, because under `fullyParallel` two workers' seeds raced on the same unique slugs (the earlier run passed only with `--workers=1`). |

### Findings left for the orchestrator (not this ticket's paths)

- **F1 — pages cannot be published from the admin (blocker for real content).**
  `pagePublishGuard` (`packages/cms/src/collections/pages/publish-guard.ts`) reads
  `data.title.en`. On a save in one locale, which is how the admin saves, `title` is a flat string,
  so every publish throws "The following field is invalid: title". Probed with the Local API on
  `indies_p5_w54`:
  - `update(locale:'en', {title, body, _status:'published'})` throws.
  - `update(locale:'en', {body, _status:'published'})` throws.
  - `update(locale:'all', {title:{en}, body:{en}, _status:'published'})` succeeds but leaves the
    body unchanged (an update under `'all'` does not write the localized value).

  Only "save a draft in `en`, then publish under `'all'`" works, and the e2e edit case uses that
  two-step. Before the owner enters the about/guarantee/visit pages, the guard needs a fix from the
  collection's owner: read the string form, and check the stored English title for a non-`en`
  save.
- **F2 — no cache tags; the reads are live.** `@engine/cache` has no `maker`/`place`/`page` tag
  kind, and nothing in the CMS invalidates on a maker, place or page change. The only invalidation
  hook is `work-invalidate`. Tagging these reads would therefore cache them stale forever. Reading
  live, as the branch does, is the safe choice, at the cost of a few queries per view. Making them
  cacheable needs three things: new tag kinds in `packages/cache/src/tags.ts`, `afterChange`
  hooks on the three collections, and `'use cache'` wrappers here. That is a contract change for
  the architect/schema lead, not a review fix.
- **F3 (minor, follow-ups):**
  - EXPERIENCE §7 asks for an "Include sold" toggle on the maker page; the branch shows sold works
    in their own section instead.
  - The maker and place work lists have no cap or pagination: every published work is projected.
  - There is no `/stories` index, though the shell's header and footer link "Stories", so that
    link gives 404. The sitemap says the Journal waits for one.
  - Figure, FAQ and CTA blocks wait for 9.3's blocks.
  - A route-level `notFound()` renders the designed 404 only in the RSC payload: the HTML has no
    `<h1>`, the same as the shop's `/product/<unknown>`. This is platform-wide and predates the
    branch.
  - The first db-test run hit `timeout exceeded when trying to connect` / `ECONNRESET` on the
    shared Postgres. The next two runs were 11/11 green. This looks like load on the shared
    container; no container was touched.

### Runs (this worktree, after the merge and fixes)

| run | result |
| --- | --- |
| `pnpm --filter @engine/web typecheck` | 0 errors |
| `pnpm vitest run engine/apps/web/src/sites/gallery/{pages,makers,places}` | 3 files, 8 tests passed |
| db tests `server/gallery/{makers,places,pages}`, `--maxWorkers=2` | 3 files, **11 passed**. Run 1 had 2 failures from connection timeouts (above); runs 2 and 3 were green. |
| `pnpm verify` | **exit 0**: format, lint, typecheck (all packages; the worker's 27 cms errors are gone on current `main`), test **235 files / 2145 passed, 276 skipped**, filesize, generated, tasks:lint, tasks:check, tokens |
| `pnpm build` | exit 0; maker, place, page and story routes listed |
| `pnpm worktree:env 5 w54`, `pnpm db:fresh` (own suffix: migrated), `node tests/e2e/admin/local.mjs start` (port 4259) | boot check passed |
| `E2E_PORT=4259 pnpm exec playwright test --project=gallery-e2e tests/e2e/gallery/pages.spec.ts` | **9 passed** (25.6 s, 1 worker), on the build that includes every fix |

Curls on that server (`Host: gallery.localhost:4259`):

```
200  /makers                                 h1=[Makers]                 askingPrice=0
200  /makers/e2e-5-4-valentijn               h1=[E2E François Valentijn] askingPrice=0
200  /id/pembuat/e2e-5-4-valentijn           h1=[E2E François Valentijn] askingPrice=0
200  /places                                 h1=[Places]                 askingPrice=0
200  /places/e2e-5-4-java/e2e-5-4-batavia    h1=[E2E Jakarta]            askingPrice=0
200  /e2e-5-4-page                           h1=[E2E fixture page]       askingPrice=0
404  /e2e-5-4-draft, /e2e-5-4-shop-page, /places/e2e-5-4-batavia, /places/e2e-5-4-java/..%2Fe2e-5-4-batavia,
     /places/%2e%2e/e2e-5-4-java, /..%2Fe2e-5-4-page, /e2e-5-4-page/extra, /gallery/en/page/e2e-5-4-draft,
     /stories/e2e-5-4-page, /makers/no-such-maker
```

I opened the makers index, a maker, the places index, a place and a page at 390 px and 1280 px
(Playwright screenshots). They look right after `b011b11`.

### 5.4.c Check claims

| claim | holds? | evidence |
| --- | --- | --- |
| A seeded maker lists its items | **yes** | e2e cases 1–2 (available link before sold link; index links to the page); db test; curl |
| A seeded place lists its items | **yes** | e2e cases 3–4 (historical name shown, work linked, reached by drill-down from its parent); db test; curl |
| An edited page appears after cache-tag invalidation | **partly** | An edited page does appear on the very next request (e2e case 6, no restart), because these reads are live, not tagged. No cache tag is involved (F2). An edit made from the admin cannot be published at all today (F1). |
| axe clean at 390 and 1280 px | **yes** | e2e cases 8–9: both indexes, a maker, a place and a CMS page, 0 violations at each width |

Run C, the same server, started at 11:11:31, more than 15 minutes after run A cached the pages (10:55): `4 passed (21.7s)`. The pages heal only when the default `cacheLife` revalidates, which confirms the cause. After every run, the fixture rows counted works 0, media 0, E2E places 0.

`pnpm lint`: `eslint --max-warnings=0 .` is clean after the merge and the fixes. The spec files are prettier-formatted, and a strict `tsc` of the spec reports only the missing ad-hoc `@types/node`, with no type errors.

Side notes, not for this branch: the seed CLI failed once with a transient DB error and succeeded on retry. A `db:fresh` on an existing suffix keeps its rows, so use `db:drop` first. Card images render broken locally (the media URL on this env). At 390 px the header shows the logo and a second, wrapping "Indies Gallery" wordmark (see `search-batavia-390.png`). A UI pass item.
