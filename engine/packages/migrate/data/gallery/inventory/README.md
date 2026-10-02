# The old site's URL inventory

TASKS.md 7.1.c, run with the owner's OK (D41, 2026-09-30): a read-only,
rate-limited read of the old store's **public** pages — GET only, about one
request every two seconds, robots.txt obeyed, an honest User-Agent, no
sign-in, no forms, no writes. Nothing on the old site was changed, and
nothing but its public pages was requested.

| File | What |
| --- | --- |
| `public-read.json` | the reader's settings for this store: the origin, the User-Agent, the pace, the route shapes, the paths never requested (sign-in, account, basket, search, form endpoints), the page selectors |
| `urls.tsv` | **the legacy URL list** for the redirect gate (TASKS.md 37.1.b): every same-origin URL the public pages link to — path and query only, no host — with its kind, the status the old site answered (or why it was not requested) and, for a redirect, its target |
| `summary.json` | counts: URLs by kind and status, products discovered and fetched, original images fetched, categories |

`urls.tsv` columns — `path` · `kind` (`product`, `listing:category`,
`listing:maker`, `image`, `page`, `asset`) · `status` (an HTTP status, or
`not-fetched` for a sort order, a sized image variant or an asset, `never` for
a never-list path, `robots`, `failed`) · `location` (a redirect's target).
A URL whose query names a token or an address would be left out of this copy
and counted in `summary.json` (`droppedFromCommittedCopy`).

Raw output stays outside git, in `$LEGACY_DATA_DIR/public-read/`: the HTML
cache, one JSON record per product (listed and sold), the original images,
the category tree, and the raw URL list with referrer counts.

## Run, resume, rebuild

```sh
cd engine/packages/migrate
# read (resumes from the cache: nothing already fetched is asked for again; Ctrl-C stops cleanly)
pnpm legacy:public-read crawl --config ../../../indies-gallery/content/legacy/inventory/public-read.json \
  --inventory-out ../../../indies-gallery/content/legacy/inventory
# rebuild the records and this inventory from the cache alone — no network
pnpm legacy:public-read build --config ../../../indies-gallery/content/legacy/inventory/public-read.json \
  --inventory-out ../../../indies-gallery/content/legacy/inventory
```

The export (OA9), when it arrives, adds what no public page shows — the
unlisted items, and every product URL ever issued; its URL list
(`extract/urls.jsonl`, see `../schema/`) joins this one for the gate.
