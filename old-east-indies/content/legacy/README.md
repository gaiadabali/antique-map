# Old East Indies — legacy URLs

Every path `oldeastindies.com` is known to have served, so the emporium's
redirect map can answer each one (docs/MIGRATION.md §10, TASKS.md 7.3,
requirement 16.6). Gathered from **copies only**: the Wayback Machine's CDX index
now, the owner's Search Console export when it arrives (OA11). **Nothing was
requested from, or done to, `oldeastindies.com`** — the tool can only reach
`web.archive.org` (a host allowlist, tested).

| File | Holds |
| ---- | ----- |
| `discovery.json` | the domain and the two `kindOverrides` — the tool's only brand input |
| `inventory/urls.csv` | one row per distinct normalised path (committed) |
| `inventory/summary.json` | counts by kind, source and host; the five CDX queries and their cross-check; what was rejected, by reason only |

Raw CDX responses and any Search Console export stay in `LEGACY_DATA_DIR`
(`../indies-legacy-data/old-east-indies/{cdx,gsc}/`), outside git.

## What the archive shows (CDX, fetched 2026-09-30)

1,561 captures → **311 distinct paths**, all on the apex / `www.` host:

| Kind | Paths | Of which |
| ---- | ----: | -------- |
| product | 229 | 225 `/products/<slug>` (2020–21 store) · 4 `/our-collection/p/<slug>` (Squarespace) |
| category | 38 | 34 `/products/category/…` · 2 `/our-collection/<sub>` · 2 overrides |
| page | 10 | `/`, about, contact, help, legal, testimonials |
| blog | 10 | `/blog/…` and `/lookbook/…` (theme demo content) |
| asset | 3 | `/favicon.ico`, `/bg.jpg`, `/static` |
| system | 21 | account, cart, search, robots, sitemap, `/.well-known/*` probes |

The domain ran **two platforms before the Linktree redirect**:

- **2020-09 → 2021-12, an Indonesian hosted store** — SIRCLO, by its demo post `/blog/2017/04/hello-from-sirclo` — (`/products/<slug>`,
  `/products/category/<type>/<theme>`, `/lookbook/…`, `/blog/2017/…`): 224 of
  the 311 paths were first captured in 2020, 58 in 2021.
- **2022-11 → 2024-09, Squarespace** (`/our-collection/p/<slug>`,
  `/our-collection/<category>`, `/framed-art-works`, `/mounted-art-prints`).
  The archive holds **only 4 Squarespace product paths** — the example
  MIGRATION.md §10 quotes (`/our-collection/p/bali-island-dutch-map-year-1849`)
  is not among them. The Search Console export is therefore the main source for
  the Squarespace era.
- **2025 → today**, `/` answers 301 (to Linktree, MIGRATION.md §10; the index records the status, not the target).

`/framed-art-works` and `/mounted-art-prints` were archived only as revisit
records, with no product under them; their names make them store pages, so
`discovery.json` classifies them `category`.

## Columns of `inventory/urls.csv`

| Column | Meaning |
| ------ | ------- |
| `host` | `@` for the apex and `www.`; otherwise the subdomain label |
| `path` | root-relative, no trailing `/`; case and encoding as sent; only `category` / `tag` kept in a query |
| `kind` | `product`, `category`, `page`, `blog`, `asset`, `system` |
| `rule` | the URL shape that decided the kind (`product-path`, `store-product`, `override` …) |
| `first_seen`, `last_seen` | earliest / latest evidence, UTC: a capture, or a Search Console period / last crawl |
| `statuses` | every HTTP status archived, `\|`-separated; `-` is a revisit record (identical bytes to an earlier capture, no status of its own) |
| `last_status` | the status of the latest capture that has one |
| `captures` | CDX captures behind the row |
| `sources` | `cdx`, `gsc` or `cdx\|gsc` |
| `gsc_clicks`, `gsc_impressions` | from the Search Console export, when imported |

## Re-running

From the repo root, in a worktree whose `.env.local` sets `LEGACY_DATA_DIR`:

```sh
# the archive (resumes from the cache; --refresh refetches)
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs fetch-cdx --site old-east-indies/content/legacy/discovery.json

# rebuild from the cache alone, no network
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs build --site old-east-indies/content/legacy/discovery.json
```

## When the Search Console export arrives (OA11)

The owner (or whoever holds the property) opens Search Console for
`oldeastindies.com` → **Performance → Search results**, sets the date range to
the longest available (16 months), opens the **Pages** tab, and chooses
**Export → Download CSV**. Unzip it and import `Pages.csv` with the period shown
in the UI:

```sh
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs import-gsc --site old-east-indies/content/legacy/discovery.json --file ~/Downloads/Pages.csv --from 2025-05-30 --to 2026-09-29
```

Expected columns: `Top pages, Clicks, Impressions, CTR, Position` (the
Indonesian UI's `Halaman teratas, Klik, Tayangan` are accepted). The
**Indexing → Pages** export (`URL, Last crawled`) can be imported the same way.
Commit the rebuilt `inventory/` — never the export itself. Rows already in the
inventory become `cdx|gsc`; new ones are `gsc`.
