# Ticket ds-5.5b — the gallery's "no commerce" scan (5.5.b)

**Lane:** deepseek (via glmteam) · **Task:** TASKS.md 5.5, subtask **5.5.b** · **Branch:** `w/ds-5.5b` (cut from `main`, already checked out — work in place)
**Report:** `docs/reports/workers/ds-5.5b.md` · Opus reviews every line before the merge.

## The claim (TASKS.md 5.5.b; EXPERIENCE-GALLERY.md §12 Deliberately absent)
The gallery's built HTML contains **no cart, checkout, sign-in, price or "offer"** — on any page a visitor can reach. The only price wording allowed is the phrase "Price on request" (EN) / its Indonesian lexicon value.

## Read first
`AGENTS.md`, `.claude/worker-rules.md`, `docs/EXPERIENCE-GALLERY.md` §2 Sitemap and §12, the gallery lexicon `engine/apps/web/src/sites/gallery/lexicon/{en,id}.json` (for the allowed "Price on request" strings), the route map in `engine/packages/config/src/sites/`, and the e2e pattern in `tests/e2e/shop/product.spec.ts` and `playwright.config.ts` (port, `Host` header, `*.localhost`).

## Owned paths
`tests/e2e/gallery/no-commerce.spec.ts` (new), `tests/e2e/gallery/no-commerce/terms.ts` (new — the banned-term list), `docs/reports/workers/ds-5.5b.md`. **Nothing else** — do not touch app code, the lexicon or other tests. If you find a banned term in the app, the test fails and you report where; never weaken the list to pass.

## Build
1. **Banned terms** (`terms.ts`, exported, each with a short reason): EN and ID, case-insensitive, matched on the **visible text and attribute values** (`href`, `aria-label`, `title`, `alt`, `placeholder`, `value`) — not on CSS class names or script bundles: `cart`, `basket`, `bag` (as a shopping word — match `add to bag`, `your bag`, `/bag` hrefs), `checkout`, `check out`, `sign in`, `log in`, `login`, `my account`, `register`, `keranjang`, `masuk`, `daftar`, `bayar`, `buy`, `beli`, `add to`, `offer`, `penawaran`, `make an offer`, `price` / `harga` **except** inside the allowed "Price on request" lexicon strings, and currency figures `/\b(Rp|IDR|SGD|S\$|USD|US\$|\$)\s?\d/`. Also banned hrefs: anything pointing at the shop's `/bag`, `/checkout`, `/account`, or `/admin`.
2. **Pages to scan** — discovered, not hard-coded where possible: the gallery home, browse (`/browse` and each object-type listing linked from the header), a search (`?q=java`), the no-results search (`?q=zzzzqqq`), up to 10 item pages taken from the browse listing's links, every maker and place link on the first page of `/makers` and `/places` if those routes answer 200, and these if they answer 200: `/about`, `/guarantee`, `/certificate`, `/condition`, `/shipping`, `/visit`, `/contact`, `/sell-to-us`, a 404 page. EN and ID (`/id/...` via the route map). A route that answers 404 today because its phase-5 task hasn't merged is **listed in the output as "not built yet"** — that is the only allowed skip, and the spec prints the list so the report shows it. Home, browse, search and at least one item page must answer 200 or the test fails.
3. **The scan:** load each page with Playwright at 390×844 (phone first), take the rendered DOM's visible text and the attribute values above, and test each banned term. Fail with a list of `page → term → snippet (40 chars around)`. Also scan the raw server HTML (`request.get`) of the same pages for `askingPrice` and the currency pattern.
4. Seed and run on your own port: `pnpm install --frozen-lockfile`, `pnpm worktree:env 5 wds55`, `pnpm db:fresh`, `pnpm --filter @engine/cms seed`, `pnpm build`, `pnpm --filter @engine/web start`, then `E2E_PORT=$PORT pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts --reporter=list`. Paste the **full** output, the scanned-page list and the "not built yet" list in the report.
5. Board: `pnpm tasks:start 5.5 --agent deepseek` first; `pnpm tasks:report 5.5.b` only when the spec runs green against your server with home, browse, search and item pages scanned. If it fails on a real banned term in the app, do **not** report 5.5.b — report the finding.

## Rules
**No conditional asserts** beyond the one "not built yet" rule above; no `test.skip`. No file over 300 lines. `pnpm lint` and `pnpm --filter @engine/web typecheck` clean. Never hand-edit generated files or the lockfile. Use only the dev Postgres container `indies-platform-dev-postgres-1`.

## Verify (paste real output)
```bash
pnpm lint
pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts --reporter=list
```
