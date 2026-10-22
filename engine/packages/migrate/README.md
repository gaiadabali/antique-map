# @engine/migrate

The legacy migration (MIGRATION.md §3–4): source adapters that copy an old
store's catalogue out of **a copy** — never the live site's admin, server or
database — and, in later tasks, the normalisers (7.2), the loader, redirects
and the report (phase 36–37).

Engine code is source-shaped, never brand-shaped: every store-specific value
(an origin, route shapes, CSS selectors, extraction queries, mappings) is data
in the site's `data/<site>/` folder (`data/gallery/`, `data/shop/`) or a command-line argument. Raw
output — HTML, JSON, images, table extracts — goes to `LEGACY_DATA_DIR`
(environment or the workspace `.env.local`), outside git; the CLIs refuse a
data directory inside the checkout unless it is a gitignored
`content/legacy/raw/`.

## Sources

| Source              | Entry                                       | What                                                                                                                                                        |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `laravel-catalogue` | `@engine/migrate/sources/laravel-catalogue` | restore a MySQL dump (any path) into a throwaway container, discover its schema, extract by SQL — see its [README](src/sources/laravel-catalogue/README.md) |
| `public-read`       | `@engine/migrate/sources/public-read`       | the owner-approved fallback (D41): a polite, read-only reader of the old site's public pages — the URL inventory, raw product records, original images      |
| `csv-products`      | `@engine/migrate/sources/csv-products`      | a product spreadsheet (TASKS.md 7.3)                                                                                                                        |

## The public read (D41)

```sh
cd engine/packages/migrate
pnpm legacy:public-read crawl --config data/<site>/inventory/public-read.json \
  --inventory-out data/<site>/inventory
pnpm legacy:public-read build --config …   # no network: product JSON, images, inventory from the cache
```

What it will and will not do, all enforced in code and tested
(`src/sources/public-read/test/polite-fetch.test.ts`):

- **GET only**, `redirect: manual` (each hop is its own request), no cookies,
  no credentials, no forms, never a sign-in, account, basket or search path
  (the config's `never` list);
- robots.txt read first and obeyed — a 5xx robots.txt means "nothing";
  a `Crawl-delay` only ever slows it down;
- **one request at a time, at least 2 s after the previous answer**
  (`minIntervalMs`, refused below 2000); a 429 is waited out (Retry-After
  first) and doubles the interval for the rest of the run; 5xx backs off
  exponentially; three URLs in a row that exhaust their attempts, or five 403s
  in a row, stop the read;
- an honest `User-Agent` (a browser-like one is refused);
- **never the same URL twice**: every answer is cached on disk before it is
  used, and the cache is the crawl's only state — a second run replays the
  walk from disk and carries on where the last stopped (Ctrl-C stops cleanly;
  `--max-requests N` stops after N requests). Only 2xx bodies are kept: an
  error page is recorded by status alone.

Raw output in `$LEGACY_DATA_DIR/public-read/`: `cache/` (every answer),
`products/<id>.json`, `images/<productId>-<imageId>.jpg` (hard links into the
cache), `categories.json`, `urls.tsv` (with referrer counts). The committed
copy, `--inventory-out`, holds `urls.tsv` (path, kind, status, redirect
target — paths only) and `summary.json`.

### `PublicProductRecord` — the raw record 7.2 normalises

One file per product, values **exactly as the old pages printed them**:

| Field                                                                                 | From                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legacyId`, `path`, `slug`                                                            | the product URL `/product/{id}-{slug}`                                                                                                               |
| `availability` (`listed` · `sold`), `soldEvidence` (`page` · `card` · `sold-listing`) | the sold marker on the page, on a listing card, or presence in a sold-filtered listing                                                               |
| `heading`                                                                             | the side panel's heading (the maker line)                                                                                                            |
| `fields` `[{label, value}]`                                                           | the side panel, in order — "Publication Place / Date", "Image Dimensions", "Color" (kept when empty), "Condition", "Product Price", "Product Number" |
| `longTitle`, `descriptionHtml`                                                        | the description box: its title line and the essay                                                                                                    |
| `cardTitle`, `cardFields`, `cardPrice`                                                | the first listing card seen: "Year", "Size", "Condition", "SKU", "Price"                                                                             |
| `maker` `{legacyId, name, path}`                                                      | the card's maker link                                                                                                                                |
| `categories` `[{legacyId, name, path}]`                                               | every category tag on every card seen                                                                                                                |
| `images` `[{legacyImageId, path, file, bytes}]`                                       | the viewer's original images, `file` relative to the output folder, `null` if not fetched yet                                                        |
