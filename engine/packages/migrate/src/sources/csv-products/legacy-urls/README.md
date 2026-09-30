# Legacy URL discovery

Inventories every URL a brand's old hosted-store domain ever served, so the new
storefront's redirect map can answer each one (MIGRATION.md §6, §10). Two
sources, both copies — **nothing is ever requested from the old site**:

| Source | What it is | Status |
| ------ | ---------- | ------ |
| `cdx` | the Wayback Machine's CDX index — every archived capture of the domain | read by `fetch-cdx` |
| `gsc` | a Google Search Console export the owner hands over | read by `import-gsc` |

The domain is data: it lives in the brand's `content/legacy/discovery.json` and
is never written in this code (CONVENTIONS.md §1).

## Commands

Run from the repo root with plain `node` (no build step, Node built-ins only):

```sh
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs fetch-cdx  --site <brand>/content/legacy/discovery.json
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs import-gsc --site <brand>/content/legacy/discovery.json --file Pages.csv --from 2025-05-01 --to 2026-08-31
node engine/packages/migrate/src/sources/csv-products/legacy-urls/cli.mjs build      --site <brand>/content/legacy/discovery.json
```

- `--data-dir` is the raw cache, default `LEGACY_DATA_DIR` (from the environment
  or `./.env.local`) — outside git. `fetch-cdx` writes `cdx/<query>/page-<n>.json`
  verbatim plus `cdx/manifest.json`; `import-gsc` copies the export to
  `gsc/<name>.csv` beside a `.meta.json` holding the period.
- Every command ends with `build`: the inventory is rebuilt **from the cache
  alone**, deterministically, into `<site dir>/inventory/urls.csv` and
  `summary.json`. Rebuilding an unchanged cache rewrites identical bytes.

## Politeness (the CDX half)

`polite-fetch.mjs` is the only network code. One request at a time; at least
1 s between request starts (default 1.5 s; lower is refused); backoff of 10 s,
20 s, 40 s … on 429 / 5xx, honouring `Retry-After`; a **host allowlist of
`web.archive.org` alone**, so a URL on the old domain throws before any request
is made. A rerun resumes: a cached page that parses is never fetched again
(`--refresh` refetches). `fetch-cdx` prints every URL it requested.

Five queries are asked: the `domain` match (apex, `www.` and every subdomain,
both schemes) and the apex / `www.` / `http://` / `https://` spellings. The index
keys on a scheme-less, `www`-less SURT, so all five normally return the same
captures; `build` **fails** if a variant ever sees a path the domain match does
not, rather than under-count. Captures are fetched uncollapsed, because first and
last capture and every status are the point.

## Normalisation (`normalise-path.mjs`)

Scheme, host, `www.`, port and fragment are dropped; doubled and trailing
slashes are collapsed (Next answers both with a 308 anyway); case and
percent-encoding are kept (legacy paths are matched exactly, C10). Only
`category` and `tag` survive in a query — they change what a collection listed —
and everything else (`format`, `offset`, tracking, cart and order tokens) is
dropped. A subdomain other than `www` keeps its own `host` label. A URL carrying
an email address is **rejected, never written** — counted in `summary.rejected`
by reason only.

## Kinds (`classify-path.mjs`)

`product`, `category`, `page`, `blog`, `asset`, `system`, from generic platform
URL shapes (`/<collection>/p/<slug>` is a Squarespace product, `/products/<slug>`
the Indonesian store builders' shape, a collection with a `/p/` child is a store,
one with a dated child a blog …). The `rule` column names the shape that
decided; what a shape cannot tell, the brand's `kindOverrides` settles
(`rule = override`).

## The Search Console CSV the importer expects

**Performance → Search results → Pages tab → Export → Download CSV**, unzipped:
`Pages.csv` with the columns

| Column | Required | Used for |
| ------ | -------- | -------- |
| `Top pages` (or `Page`, `URL`; Indonesian UI `Halaman teratas`) | yes | the URL |
| `Clicks` (`Klik`) | no | `gsc_clicks` — ranks the redirect work |
| `Impressions` (`Tayangan`) | no | `gsc_impressions` |
| `CTR`, `Position` | no | ignored |

The page-indexing export (**Indexing → Pages → a reason → Export**: `URL`,
`Last crawled`) is read too; `Last crawled` dates the row. A byte-order mark,
CRLF and quoted `"1,234"` counts are handled. Pass the export's period with
`--from` / `--to` (Search Console shows it in the UI, not in the file): it
becomes the row's first/last seen. When two exports overlap, the larger count is
kept, never the sum. A file without a page column is refused, naming the
columns expected.

## Tests

Colocated `*.test.mjs` (Vitest) over synthetic fixtures in `fixtures/` — a CDX
cache and three Search Console exports for `example-shop.test`. They run today
under the root config's `packages` project:

```sh
pnpm exec vitest run engine/packages/migrate
```

`inventory-files.test.mjs` also checks every committed inventory (any brand
folder with `content/legacy/discovery.json`): columns, unique sorted rows, valid
kinds and sources, summary counts, and nothing personal.
