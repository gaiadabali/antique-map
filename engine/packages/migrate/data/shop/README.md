# Old East Indies — legacy URLs

Every path `oldeastindies.com` is known to have served, so the emporium's
redirect map can answer each one (docs/MIGRATION.md §10, TASKS.md 7.3,
requirement 16.6). Gathered from **copies only**: the Wayback Machine's CDX
index, the domain's own sitemap as the Wayback Machine archived it (D43), and the
owner's Search Console export when it arrives (OA11). **Nothing was requested
from, or done to, `oldeastindies.com`**: the tool can only reach
`web.archive.org` (a host allowlist that also applies to every redirect hop, tested).

| File                     | Holds                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `discovery.json`         | the domain and the two `kindOverrides`, the tool's only brand input                                                               |
| `inventory/urls.csv`     | one row per distinct normalised path (committed)                                                                                  |
| `inventory/summary.json` | counts by kind, source and host; the five CDX queries and their cross-check; the sitemap captures read; rejections by reason only |

Raw CDX responses, the archived sitemap XML and any Search Console export stay in
`LEGACY_DATA_DIR` (`../indies-legacy-data/old-east-indies/{cdx,sitemap,gsc}/`),
outside git.

## What the copies show (fetched 2026-09-30)

**673 distinct paths**, all on the apex / `www.` host:

| Source         | Paths | What                                                      |
| -------------- | ----: | --------------------------------------------------------- |
| `cdx`          |   303 | archived captures only                                    |
| `cdx\|sitemap` |     8 | archived and listed in the sitemap                        |
| `sitemap`      |   362 | listed in the archived sitemap, never captured themselves |

- **CDX index:** 1,561 captures, which normalise to 311 paths.
- **Sitemap:** `/sitemap.xml` was archived twice with status 200 (20240624134228 and
  20240808221041). Both captures are byte-identical Squarespace `urlset`s of 370
  URLs each, with no child sitemaps. Their `lastmod` dates run from 2022 to 2024.

| Kind     | Paths | Of which                                                                                                    |
| -------- | ----: | ----------------------------------------------------------------------------------------------------------- |
| product  |   503 | 225 `/products/<slug>` (2020–21 store) · 278 `/our-collection/p/<slug>` (Squarespace; 276 from the sitemap) |
| category |   125 | 34 `/products/category/…` · 85 Squarespace collections (`/our-collection/…`, `/collection/…`) · 6 overrides |
| page     |    11 | `/`, `/home`, about, contact, help, legal, testimonials                                                     |
| blog     |    10 | `/blog/…` and `/lookbook/…` (theme demo content)                                                            |
| asset    |     3 | `/favicon.ico`, `/bg.jpg`, `/static`                                                                        |
| system   |    21 | account, cart, search, robots, sitemap, `/.well-known/*` probes                                             |

The domain ran **two platforms before the Linktree redirect**:

- **2020-09 → 2021-12, an Indonesian hosted store**, SIRCLO (identified by its demo post
  `/blog/2017/04/hello-from-sirclo`). Its paths: `/products/<slug>`,
  `/products/category/<type>/<theme>`, `/lookbook/…`, `/blog/2017/…`. The CDX
  index is the only source for this era.
- **2022 → 2024-09, Squarespace:** `/our-collection/p/<slug>`, `/our-collection/<category>/…`,
  the older `/collection/…` tree, `/framed-art-works` and `/mounted-art-prints`. The
  CDX index captured only 4 of its product pages. The archived sitemap lists 276,
  including the example MIGRATION.md §10 quotes
  (`/our-collection/p/bali-island-dutch-map-year-1849`, lastmod 2024-05-23).
  Two archived products are not in the sitemap. One of them,
  `/our-collection/p/tamarind-plant-or-tamarindus-indica-year-1693`, answered 404.
- **2025 → today**, `/` answers 301 (to Linktree, MIGRATION.md §10; the index
  records the status, not the target).

`/framed-art-works` and `/mounted-art-prints` are store pages by name. The CDX
index holds them only as revisit records, with no product under them, and the
sitemap lists their sub-listings (`/search-by-region`, `/browse-by-theme` …). So
`discovery.json` classifies each of them, and everything under it, as `category`.

## Columns of `inventory/urls.csv`

| Column                          | Meaning                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `host`                          | `@` for the apex and `www.`; otherwise the subdomain label                                                                            |
| `path`                          | root-relative, no trailing `/`; case and encoding as sent; only `category` / `tag` kept in a query                                    |
| `kind`                          | `product`, `category`, `page`, `blog`, `asset`, `system`                                                                              |
| `rule`                          | the URL shape that decided the kind (`product-path`, `store-product`, `override` …)                                                   |
| `first_seen`, `last_seen`       | earliest / latest evidence, UTC: a capture, a sitemap `lastmod` (or the capture that listed it), a Search Console period / last crawl |
| `statuses`                      | every HTTP status archived, `\|`-separated; `-` is a revisit record (identical bytes to an earlier capture, no status of its own)     |
| `last_status`                   | the status of the latest capture that has one                                                                                         |
| `captures`                      | CDX captures behind the row                                                                                                           |
| `sources`                       | any of `cdx`, `sitemap`, `gsc`, `\|`-joined                                                                                           |
| `gsc_clicks`, `gsc_impressions` | from the Search Console export, when imported                                                                                         |

## Re-running

From the repo root, in a worktree whose `.env.local` sets `LEGACY_DATA_DIR`:

```sh
# the archive (resumes from the cache; --refresh refetches)
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs fetch-cdx --site engine/packages/migrate/data/shop/discovery.json

# the archived sitemaps, through Wayback playback (resumes from the cache)
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs fetch-sitemaps --site engine/packages/migrate/data/shop/discovery.json

# rebuild from the cache alone, no network
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs build --site engine/packages/migrate/data/shop/discovery.json
```

## When the Search Console export arrives (OA11)

The owner (or whoever holds the property) opens Search Console for
`oldeastindies.com` → **Performance → Search results**, sets the date range to
the longest available (16 months), opens the **Pages** tab, and chooses
**Export → Download CSV**. Unzip it and import `Pages.csv` with the period shown
in the UI:

```sh
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs import-gsc --site engine/packages/migrate/data/shop/discovery.json --file ~/Downloads/Pages.csv --from 2025-05-30 --to 2026-09-29
```

Expected columns: `Top pages, Clicks, Impressions, CTR, Position` (the
Indonesian UI's `Halaman teratas, Klik, Tayangan` are accepted). The
**Indexing → Pages** export (`URL, Last crawled`) can be imported the same way.
Commit the rebuilt `inventory/` — never the export itself. Rows already in the
inventory gain `gsc` (e.g. `cdx|gsc`, `cdx|gsc|sitemap`); new ones are `gsc`.
