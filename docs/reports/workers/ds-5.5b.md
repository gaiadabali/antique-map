# Report — ds-5.5b, the gallery's "no commerce" scan (5.5.b)

**Status: BLOCKED — the spec is built, committed and runs, but it fails on real banned terms in the
gallery's own lexicon, and the seed cannot create works (an app bug outside my owned paths), so no
item page can answer 200. Per the ticket: not reported as 5.5.b done, reported as a finding.**

```text
Task / Status (done | blocked | partial)
5.5.b / blocked
Subtasks
  banned-term list (terms.ts)      ✅ built and committed — 25 words + 1 href rule, each with a reason
  pages-to-scan discovery          ✅ built and committed — route-map driven, both locales, 404 probe
  the scan (DOM + raw HTML)        ✅ runs — fails on 2 real lexicon violations (see Found)
  seed + run on my port            ❌ scan green impossible: seed rejects every work row (after()
                                     outside a request scope) → 0 works → no item page is 200
  tasks:report 5.5.b               ❌ intentionally not reported (ticket: only on a green run)
Check
  (orchestrator ticks after merge; nothing ticked by me)
Files
  tests/e2e/gallery/no-commerce.spec.ts
  tests/e2e/gallery/no-commerce/terms.ts
  docs/reports/workers/ds-5.5b.md
```

## What is built

- `tests/e2e/gallery/no-commerce/terms.ts` — the banned vocabulary (the ticket's list, EN + ID,
  case-insensitive regex sources with a reason each), the banned href rule (`/bag`, `/checkout`,
  `/account`, `/admin`), the allowed-price phrases (`price on request`, `harga atas permintaan`,
  masked out before `price`/`harga` are tested), the attribute list, and `askingPrice`.
- `tests/e2e/gallery/no-commerce.spec.ts` — discovers pages from the route map (`SITES.gallery` +
  `createHref`), both locales; item pages from browse's own links (up to 10), maker/place pages from
  the indexes' own links when they answer 200; scans the rendered DOM at 390×844 (visible text +
  `href`/`aria-label`/`title`/`alt`/`placeholder`/`value`) and the raw server HTML (`askingPrice`
  and currency figures); prints the scanned list and the "not built yet" list; hard-fails when home,
  browse, search or an item page is not 200; asserts at least one item page was scanned. No
  `test.skip`; the one allowed skip is the printed "not built yet" list.

Commits: `f67f4bb`…`67e9597` on `w/ds-5.5b` (resume of run am-ds-5.5b-g2; this run added the
discovery fix `67e9597` — `add()` dropped the 404 probe's `scanAt404` flag, so the 404 page was
skipped instead of scanned).

## Verify — real output

`pnpm lint` (2026-10-06, this worktree):

```text
$ eslint --max-warnings=0 .
```
(no output, exit 0)

`pnpm --filter @engine/web typecheck`:

```text
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
```
(no type errors)

`pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts --project gallery-e2e --reporter=list`
(server: `next start -p 4200`, production build, `LOCAL_PRODUCTION_BUILD=1`, host `gallery.localhost`):

```text
Running 1 test using 1 worker

scanned 9 pages:
  ok   /
  ok   /browse
  ok   /search?q=java
  ok   /search?q=zzzzqqq
  ok   /no-such-page-zzzz (HTTP 404)
  ok   /id
  ok   /id/jelajah
  ok   /id/cari?q=java
  ok   /id/cari?q=zzzzqqq
not built yet (20):
  skip /sell-to-us (HTTP 404)        skip /id/jual-ke-kami (HTTP 404)
  skip /makers (HTTP 404)            skip /id/pembuat (HTTP 404)
  skip /places (HTTP 404)            skip /id/tempat (HTTP 404)
  skip /about (HTTP 404)             skip /id/about (HTTP 404)
  skip /guarantee (HTTP 404)         skip /id/guarantee (HTTP 404)
  skip /certificate (HTTP 404)       skip /id/certificate (HTTP 404)
  skip /condition (HTTP 404)         skip /id/condition (HTTP 404)
  skip /shipping (HTTP 404)          skip /id/shipping (HTTP 404)
  skip /visit (HTTP 404)             skip /id/visit (HTTP 404)
  skip /contact (HTTP 404)           skip /id/contact (HTTP 404)

1) Gallery: no commerce anywhere (5.5.b)

   Error: banned commerce terms found on the gallery:
   / [text] -> price -> "ce went — never its price.

   A chart of the Su"
   / [text] -> price -> "ort, provenance and price — and, if you wish,"

   1 failed
```

## Finding 1 (blocks green): the gallery's own home copy says "price"

Both violations are the **gallery lexicon** (`engine/apps/web/src/sites/gallery/lexicon/en.json`),
rendered on `/`:

- `home.gallery.recentlyBody` (en.json:263) — "We keep the record of where a piece went —
  **never its price**."
- `home.gallery.enquireBody` (en.json:231) — "…condition report, provenance **and price** — and, if
  you wish, arrange a private viewing."

EXPERIENCE-GALLERY.md §12 allows only "Price on request". If the owner's intent is that these two
sentences are fine (one of them literally says no price is kept), then the lexicon keys should be
added to the allowed list or reworded — that is an owner/UX decision and an app change outside my
owned paths. The Indonesian lexicon carries the same sentences: `home.gallery.enquireBody`
(id.json:232) says "…dan **harganya** —", `recentlyBody` (id.json:264) "…tidak pernah **harganya**."

Note for the term list: the ID forms escape the ticket's `\bharga\b` (Indonesian attaches suffixes:
"harganya", "hargaku"). I did **not** widen the pattern unilaterally; if the finding is confirmed,
the list wants `harga` as a prefix (`\bharga\w*`), which would make the ID home fail identically.

## Finding 2 (blocks the run's item pages): the seed rejects every work row

`pnpm db:fresh` + `pnpm --filter @engine/cms seed --layer gallery-sample --publish` (also
`gallery-full`): makers (127) and places (66) seed fine, but **every work/product row is rejected**:

```text
Row 3 (P.0035) rejected — `after` was called outside a request scope. …
Row 4 (M.orderr) rejected — `after` was called outside a request scope. …
…
review marks carried into legacy.categories: 0 work(s)
```

The database ends with `works = 0` (checked via `psql`), so browse/search render with no items and
no item page can answer 200 — the spec's "at least one item page was scanned" assertion fails by
design. Cause: `invalidate()` (@engine/cache) throws outside a Next request when the write's
`req.context` carries no collector, and the gallery seed's work writes attach none
(`engine/packages/cms/src/seed/req.ts` builds a bare request). The same class of bug was fixed for
site-settings in `32091a7` (vocabulary seed now wraps the write in
`invalidationBatch().operation(...)`); the gallery/shop seed's work and product writes need the same
treatment (or a collector on the seed's request). Not my owned paths — the schema lead / seed owner
should apply the `32091a7` pattern to `engine/packages/cms/src/seed/gallery/**` and `shop/**`.

## Environment notes (for the next runner)

- The dev Postgres container is up and healthy; `localhost:5432` TCP-connects but **resets the
  Postgres startup handshake on the IPv6 path** — `127.0.0.1` works. My `.env.local` (gitignored,
  worktree-only) pins `POSTGRES_HOST=127.0.0.1` and `DATABASE_URL` on `127.0.0.1`. `db:fresh`'s
  migrate child reads `POSTGRES_*` from `.env.local`, so pinning there is enough.
- The web server's env is Next's own `engine/apps/web/.env.local` (gitignored): I copied
  `.env.example` into it, set `PORT`, `DATABASE_URL`, `LOCAL_PRODUCTION_BUILD=1`,
  `POSTGRES_HOST=127.0.0.1`, and carried the dev `LINK_TOKEN_KEYS` ring across from the root
  `.env.local`. `next start` needs `next start -p <port>` (the root `.env.local`'s PORT does not
  reach it; pnpm's `--` passes literally).
- The stray untracked `.e2e-shop-payment-seed-*.ts` files (and their `-out` folders) from the
  earlier payment run were deleted as the ticket's resume note asked.
