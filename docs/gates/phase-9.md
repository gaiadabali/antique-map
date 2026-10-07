# Phase 9 gate — partners, leads, analytics and SEO (staging)

Evidence for the Checks of TASKS.md phase 9, run against staging (`indies-gallery.gaiada.com`,
`old-east-indies.gaiada.com`) on release **`production-20261007T091257Z-0fc3942a`** (main `0fc3942a`).

## 9.3.d — metadata, structured data and sitemaps

The first crawl, on release `188996d` (2026-10-07 morning), **failed**: each sitemap was the phase-2 stub (3 English
URLs), both home pages had no meta description, and the shop sitemap listed `/contact` (404). Fixed by `w/9.3fix`
(merged `dda63752`): sitemaps from published records, one `<url>` per locale with translated segments and
en/id/x-default alternates; a description on every page type; Indonesian alternates from the translated segment.

Rerun on `0fc3942a` with the read-only tool (`engine/tooling/phase9-checks/seo-crawl.mjs`, ≤ 4 requests/s):

```
seo-crawl (gallery) against https://indies-gallery.gaiada.com
  1 sitemap file(s), 496 URLs (en 248, id 248)
  checked 496, skipped 0 sensitive
  0 page(s) with a problem                                  exit 0
seo-crawl (shop) against https://old-east-indies.gaiada.com
  1 sitemap file(s), 178 URLs (en 89, id 89)
  checked 178, skipped 0 sensitive
  0 page(s) with a problem                                  exit 0
```

Every listed page answered 200 with an absolute canonical, `hreflang` en, id and x-default, and a non-empty
description; no gallery JSON-LD block contains `price` or `offers` (the tool walks every block).

Sitemap counts against the database (`_status = 'published'`):

| | published | sitemap item/product URLs | per locale |
| --- | --- | --- | --- |
| gallery works (sold ones included) | 49 | 98 | 49 + 49 |
| shop products | 80 | 160 | 80 + 80 |

The gallery sitemap contains no `price`. **9.3.d passes.**
