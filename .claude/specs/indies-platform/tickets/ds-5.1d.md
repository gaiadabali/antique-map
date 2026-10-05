# Ticket ds-5.1d — e2e evidence for the 5.1.d Check (gallery browse and search)

**Lane:** deepseek (via glmteam) · **Task:** TASKS.md 5.1, the **Check 5.1.d** only — you write the test and the evidence; you never tick it · **Branch:** `w/ds-5.1d` (cut from `main`, already checked out — work in place)
**Report:** `docs/reports/workers/ds-5.1d.md` · Opus reviews every line before the merge. A test that passes without proving its claim is worse than no test.

## The claim to prove (TASKS.md 5.1.d)
On a production build: (1) a search for a historical place name (**"Batavia"**) finds an item catalogued under the modern place (Jakarta); (2) a **draft** work is never listed — not in browse, not in search; (3) the response body of browse and search carries **no `askingPrice`**; (4) **axe is clean** on browse and search at **390 px and 1280 px**.

## Read first
`AGENTS.md`, `.claude/worker-rules.md`, TASKS.md 5.1, `docs/EXPERIENCE-GALLERY.md` §4 Browse and search. The existing e2e suites show the pattern — copy their setup exactly: `playwright.config.ts`, `tests/e2e/shop/product.spec.ts` (port, `Host` header, `*.localhost` notes, AxeBuilder use), `tests/e2e/a11y/a11y.spec.ts`. The gallery search code: `engine/apps/web/src/server/gallery/catalogue/{search.ts,places.ts}` and its db tests `search.db.test.ts` (they show how Batavia → Jakarta is seeded). The seed: `engine/packages/cms/src/seed/` (`pnpm --filter @engine/cms seed`; `gallery/`, `gazetteer.json`).

## Owned paths
`tests/e2e/gallery/browse.spec.ts` (new), `tests/e2e/gallery/support/**` (new, helpers only), `docs/reports/workers/ds-5.1d.md`. **Nothing else.** Do not change app code, the seed, the config or any other test. If the app is wrong, the test fails and you report it — never bend the test to pass.

## Build
1. Setup on your own port: `pnpm install --frozen-lockfile`, `pnpm worktree:env 5 wds51`, `pnpm db:fresh`, `pnpm --filter @engine/cms seed`, `pnpm build`, `pnpm --filter @engine/web start`. Find in the seeded data (Payload REST as anonymous: `/api/works?where[_status][equals]=published`, `/api/places`) a published work whose place is Jakarta (or whose place has the historical name Batavia). If none exists, the seed lacks it: the spec creates its own fixture in `beforeAll` (step 2) instead.
2. **Fixtures in the spec, not by hand:** sign in as the seeded owner through `POST /api/users/login` (credentials from the seed's env, `engine/packages/cms/src/seed/env.ts` — read them from `process.env`, never write a password into the file), then through Payload REST create (a) a **published** work under the Jakarta place with a unique title like `E2E Batavia ${Date.now()}` if step 1 found none, and (b) a **draft** work with a unique title `E2E Draft ${Date.now()}` and a distinctive word. Delete both in `afterAll`. (Payload REST with drafts: `POST /api/works?draft=true` for a draft.)
3. Tests (each a separate `test()`; **no conditional asserts**, no `if (found)`, no `test.skip` on missing data — missing data fails):
   - **historical name:** `GET` the search page for `q=Batavia` on the gallery host (`gallery.localhost:<port>`, English path from the route map) and assert the published Jakarta work's title appears in the result list.
   - **draft never listed:** the draft's unique title is absent from the browse page **and** from a search for its distinctive word; and present in the admin REST read as owner (proves the fixture exists).
   - **no askingPrice:** fetch the raw HTML of browse and of a search, plus every RSC/flight response captured while loading them in the page (`page.on('response')`), and assert none contains `askingPrice` (case-insensitive). Also assert the HTML contains no currency figure pattern (`/\b(Rp|S\$|US\$|\$)\s?\d/`).
   - **axe:** browse and search at 390×844 and 1280×800 — `new AxeBuilder({ page }).analyze()` → `violations` equals `[]`. Print the violation ids if any (so the report shows them).
4. Run it: `E2E_PORT=$PORT pnpm exec playwright test tests/e2e/gallery/browse.spec.ts --reporter=list` and paste the **full** output into the report. Save screenshots of search "Batavia" at both widths under `docs/reports/workers/ds-5.1d/` and list them.
5. Never run `pnpm tasks:report` for 5.1.d — it is a Check. Report it as "evidence ready for Opus".

## Rules
No file over 300 lines. `pnpm lint` and `pnpm --filter @engine/web typecheck` clean (the spec is typed). Never hand-edit generated files or the lockfile. Use only the dev Postgres container `indies-platform-dev-postgres-1`.

## Verify (paste real output)
```bash
pnpm lint
pnpm exec playwright test tests/e2e/gallery/browse.spec.ts --reporter=list
```
In the report: each of the four claims → the test name that proves it → pass/fail. If a claim fails because the app is wrong, say exactly what the page returned.
