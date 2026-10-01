# Migration — Indies Gallery's existing store

Old East Indies has no website, so it starts clean (with a spreadsheet importer
for its product list). **Indies Gallery is a migration**, and the old store is
the SEO estate, the customer list and the catalogue all at once. This document
is what was measured on the live site on 2026-09-25 and how its content moves
into the new site.

**We never touch the live sites.** The new sites are new builds. Nobody on this
project logs in to, fixes, changes, freezes, archives or switches off the current
`antiquemapsindonesia.com` or `oldeastindies.com` setups — they stay exactly as
they are, and the owner decides what happens to them. Everything the new sites
take from them is a **copy**: an export the owner hands over, or — only with the
owner's OK — a read-only, rate-limited read of their public pages. At launch the
owner points each domain at its new site; that is the whole cutover.

---

## 1. What exists today (measured, not assumed)

| | |
| --- | --- |
| Live store | `https://antiquemapsindonesia.com` — `indiesgallery.com` 301s to it |
| Stack | custom **Laravel** app (`laravel_session`, `XSRF-TOKEN` cookies), Bootstrap 4.3.1, Apache 2.4.29 on Ubuntu 18.04 (end of life) |
| Sitemap | **none** — `/sitemap.xml` throws an unhandled Symfony exception page |
| Structured data | none (no JSON-LD) · GA via `gtag` |
| Listed online | ≈ 2,090 items: Antique Maps 347 · Prints 1,428 · Books 34 · Posters 17 · Photographs 182 · Tribal 2 · Special Collection 80 |
| Held in total | "over 9,500 authentic antiques" (site copy) — most are **not** online |
| Category tree | ~100 categories, embedded in every page as JSON (`var db = [...]`: `id`, `parent_id`, `slug`, `name`, `products_count`) |
| Product URL | `/product/{id}-{slug}` — e.g. `/product/1706-bali-island-large-map-kaart-van-het-eyland-bali` |
| Category URL | `/category/{id}-{slug}` + `?page=` · `?o=newest` · `?p=highest|lowest` · `?s=sold|unsold` |
| Other routes | `/new-additions` `/catalogue` `/newsletter` `/about-us` `/contact-us` `/sell-to-us` `/faq` `/privacy-policy` `/terms-conditions` `/account/*` `/s` (search) |
| Images | `/storage/products/{productId}-{imageId}.jpg` — sampled **3543 × 2840 px, 1.5 MB JPEG** |
| Prices | USD (`USD 380` … `USD 38,800`) or **"On Request"** |

A product page carries: SKU (`#M.1044`, `#M.0500`), title, cartographer/artist,
publisher, "Publication Place / Date" (`Frankfurt / 1598`), technique
(`Engraving`), image dimensions (`45 by 38 cm`), condition (`G+ / Study images
carefully`), a long HTML description with inline references
(`( Ref: Tooley, R.V. (Australia) 1268. )`), price, and actions — Product
Inquiry, Request Price, Add to Wishlist, Sell To Us, Email a Friend, Share.

**Gaps the new site closes** (a full audit is in RESEARCH.md §1; they shape
EXPERIENCE-GALLERY.md):

- **Debug output is on in production** — `/sitemap.xml` renders a full Laravel
  stack trace. That is the old site's own business and outside this project (we
  do not touch the live site); the new site shows designed error pages and never
  leaks a trace (design.md, Error Handling).
- No SEO scaffolding: no meta description, Open Graph, canonical or JSON-LD; the
  home `<title>` is " | Antique Maps Indonesia"; the only `<h1>` on product and
  category pages is the login modal's "Sign in"; thumbnails carry `align=` where
  `alt=` was meant.
- One flat JPEG per item inside OpenSeadragon (2682 × 2316, 2.46 MB) — untiled,
  not crawlable, no verso, detail or framed views.
- Sort is broken (`?p=highest`, `?p=lowest` and default return one order); no
  facets for date, maker, price or size.
- The FAQ and terms pages read "Work in progress" — **no returns, guarantee,
  shipping or payment terms at all**, the biggest conversion blocker for a
  USD 1–40k object. The USD 38,800 top item has no references and "still needs
  to be scanned".
- Catalogues are Issuu modals (newest Dec 2022) whose items do not link to
  products; the "every two weeks" newsletter archive shows four issues.
- "Buy Reproduction" on originals links to the Old East Indies home page, which
  now redirects to a Linktree — the highest-intent click the merch shop gets
  dead-ends.

**Assets to keep:** the `/product/{id}-{slug}` URLs, the indexable sold archive
("Sold – we frequently have similar art works…"), request price, the product
inquiry, wishlist, WhatsApp, sell-to-us/consignment, the M./P./F. stock numbers,
the long essays, the Parry certificate of authenticity, the institutional client
list, the Indonesian theme categories (Wayang, Batik, Temples, Buitenzorg,
Spices) and "Gifts under $350" (kept as a curation with a threshold per market,
so Indonesian delivery reads it in rupiah). The niche depth is the moat: 347 maps, 1,428
prints and 182 photographs, against 192 Indonesia items on raremaps and 152 on
1stDibs' competing "antique maps Indonesia" landing page.

## 2. The category tree conflates five dimensions

Exactly the failure NOW! found in 75 WordPress categories (its ARCHITECTURE.md
§4). One tree mixes:

```
"Java Maps"                   → type:map        + region:java
"Temples in Indonesia Prints" → type:print      + region:indonesia + subject:temples
"Pre-1750 Maps"               → type:map        + era:<1750           (derived from date, not tagged)
"Captain Cooks Voyages"       → collection:cook-voyages               (curated, not a facet)
"Botanical › Leaves Prints"   → type:print      + subject:botanical/leaves
"Singapore Photographs"       → type:photograph + region:singapore
```

Decomposed into the new facets (CONTENT-MODEL.md §3): **object type · region
(gazetteer) · subject · era · maker · technique · availability · price band**,
plus **curated collections** for editorial groupings. The mapping is a data file,
`indies-gallery/content/legacy/mapping/categories.json`, one row per legacy
category id → a facet selection. **The curator reviews it** — about 100 rows,
an hour of reading, and the highest-leverage thing the client can do for the
new site's browse and SEO (the NOW! taxonomy-review lesson).

## 3. Source — an export from the owner, not access to the old site

**Preferred: an export the owner hands over** — a MySQL dump of the Laravel
database plus the product-images folder, which the owner asks whoever hosts the
old site to produce. We never log in to the old server. The export is the only
source for the ~7,400 unlisted items, sold history, orders, customers, wishlists
and newsletter consent. Restore it into a throwaway MySQL container on a
workstation and extract with SQL. **Never stream-parse a dump** — NOW! lost rows
from large-blob tables exactly that way.

**Fallback, only with the owner's OK: a read-only look at the public pages.**
A polite, rate-limited reader of the public pages and their links gathers the
listed and sold items, images and the old URL list; it is blind to everything
else, and it never logs in, submits a form or changes anything. The old URL list
it (or the export) produces is what the redirect verification requests against
the **new** site.

## 4. Pipeline

```
the owner's export → MySQL restore (throwaway container)  │  or  a read-only public read (fallback, with the owner's OK)
  ↓ extract     products · images · categories · customers · orders · wishlists · subscribers
  ↓ normalise   dates → {from,to,precision} · "45 by 38 cm" → dimensions · "G+" → condition scale
                prices → Money (USD minor units) · "On Request" → priceOnRequest
                inline "(Ref: …)" → structured references where the pattern is unambiguous
                titles → hook title + original title (SEO-stuffed suffixes like
                "- Year 1725" / "- Extremely rare map" moved out of the title)
  ↓ makers      cartographer/publisher strings → Makers with aliases (Valentijn/Valentyn, De Bry)
                fuzzy match → human review queue; never auto-merge below 0.9
  ↓ facets      legacy category ids → facet selections (curator-reviewed mapping, §2)
  ↓ register    the owner's item register → location + export status per stock number
                (none defaulted: an item missing from the register sells nowhere — §9)
  ↓ media       originals → derivative ladder + IIIF tiles, **off-box** by the tiling CLI writing
                straight to the bucket (ARCHITECTURE.md §10); first image = primary, the rest tagged
                `detail` until a cataloguer marks recto/verso; each gets the deterministic alt baseline
  ↓ load        works + products as DRAFTS with legacyId, legacySku, legacyUrl — idempotent upsert on legacyId
  ↓ redirects   category, query and image URLs → their new equivalents (product URLs need none)
  ↓ report      counts old vs new per category/facet · items without images · items without a register
                row · parse failures · redirect coverage
```

Engine code is source-shaped, never brand-shaped: the adapter is
`engine/packages/migrate/src/sources/laravel-catalogue`, and everything specific
to this store (mappings, condition scale, SKU prefixes, the item register) is
data in `indies-gallery/content/legacy/` — the signed mappings committed, the raw
extracts under `legacy/raw/` gitignored and read through `LEGACY_DATA_DIR`, so an
agent in its own worktree can reach them.

Everything loads as a **draft**, then publishes in bulk once the report is clean
and the curator has signed the mapping. Nothing becomes public on a script's
authority — and nothing becomes **exportable** on a script's authority either: an
item without a register row publishes as enquiry-only.

**Dirty data the normaliser must expect** (seen on live cards): `Year: null`,
`Year: Leiden` (a place in the year field), `Size: 40 b7 22 cm.` (a typo for
"by"), mixed mm/cm and "x"/"by", no inches anywhere, empty colour fields,
missing makers, condition typed freehand against an unpublished scale
(`G+ / Study images carefully` vs `…image carefully`), SKUs in two patterns
(`M.1044`, `M.Dav5`), and one chart carrying **16** category tags. Anything the
normaliser cannot parse with confidence goes to a review queue with the raw value
beside the proposal — it is never guessed into a field.

**Taxonomy defects to fix, not migrate:** counts that do not roll up (Asia 71,
its child Indonesia 131), "India & Sri Lanka" under Southeast Asia, a slug
`pre-1700-maps` labelled "Pre-1750 Maps", duplicate "Mammal Prints" /
"Mammals Prints", and a Tasmania plan filed under "Indonesia Maps". The new model
gives each work one primary place plus capped secondary tags, and counts roll up
by construction.

## 5. People, carefully

- **Customers** import with name, email and addresses — **never passwords**
  (Laravel bcrypt hashes are not Payload's PBKDF2, and carrying them over is a
  liability, not a convenience). Each is created with a random, unusable password
  (Payload requires one); the first sign-in sends a "claim your account" link that
  sets a real one. Accounts that never claim are purged after 12 months by the
  retention job (TASKS.md 28.4).
- **Newsletter subscribers** import with their recorded consent and source
  `legacy`. Where consent cannot be shown, they get one re-permission email and
  nothing else (UU PDP / PDPA; COMPLIANCE.md).
- **Orders** import as read-only `legacy` orders for purchase history and sales
  reporting. They never re-enter the order state machine.
- **Wishlists** import where the dump has them; a wished-for item that has since
  sold becomes a "notify me of similar" want-list entry.

## 6. URLs — every one of them, by count

The legacy URLs *are* the traffic. The rule is NOW!'s for 9,201 articles:
**verified by count, not by spot check.**

**Product URLs do not move at all.** The gallery app keeps the legacy shape as
its canonical item URL — `/product/{id}-{slug}` in the default locale, served
unprefixed at the root — and migrated items keep their legacy numeric id as
their public id (new items continue the sequence). Thousands of deep links from
Pinterest, forums and institutions keep working with **zero redirects**. Only a
changed slug redirects, to the current one, by id. Other locales are prefixed
(`/id/produk/{id}-{slug}`) with reciprocal `hreflang`.

| Legacy | New | Rule |
| --- | --- | --- |
| `/product/{id}-{anything}` | `/product/{id}-{current-slug}` | same URL when the slug is unchanged; otherwise one permanent redirect by **id** — a 308, the status of a page's `permanentRedirect()` — its query kept; the slug part is ignored, since old links carry stale slugs |
| `/category/{id}-{slug}` | the equivalent facet URL | from the reviewed mapping |
| `?s=sold` / `?s=unsold` | `availability=sold` / `available` | query mapped, not dropped |
| `?o=newest` · `?p=highest|lowest` | `sort=newest` · `sort=price-desc|price-asc` | |
| `?page=n` | dropped (new pagination is facet-driven) | 301 to page one |
| static pages | their new equivalents | hand map, ~15 rows |
| `/account/*` | `/account/*` | |
| `/storage/products/*.jpg` | 301 to the new primary image derivative | old image links live on in Pinterest and forums |

**Who answers which URL.** Product URLs are answered by the item route itself: it
resolves `/product/{id}-{slug}` by public id and calls `permanentRedirect()` when
the address asked for is not the current one — no lookup table involved. That is a
**308 Permanent Redirect**, Next's only permanent status for a page, which search
engines treat as they treat a 301 (the 4.1.e spike §3). The route reads only the id
from its param, since Next hands the same segment still encoded to the page and
decoded once to its metadata, and its loader compares the **public path the proxy
passed on** (C13 `PROXY_REQUEST_HEADERS.publicPath`, handed to C2's `Loaders.item` as
`asked` by the page) with `href()`'s spelling, byte for byte, outside its cached read
(DESIGN-SYSTEM.md §2):
exactly one address answers 200, the redirect's `Location` is encoded once (twice
would loop), and it carries on the query the old link had
(`PROXY_REQUEST_HEADERS.publicSearch` — a rewritten request loses its query, so this
is the one place it survives), keeping a campaign's `utm_*`. Every other legacy
pattern (`/category/…`, `/storage/products/…`, the static pages) is rewritten by the
proxy to the engine's legacy handler (`/api/x/legacy/…`), which reads the
`redirects` collection under `'use cache'` + `cacheTag` and answers 301 or 404; the
proxy itself never touches the database (ARCHITECTURE.md §11). The verification
script requests **every** legacy URL — from the owner's export and the URL
inventory — **against the new site** and asserts 200, or **one permanent redirect
to a 200** — the legacy handler's 301 or the item route's 308 — after at most one of
Next's own normalising 308s (below); the migration is not done until the failure
count is zero.

**The static pages, by decision (TASKS.md 3.4.c).** A legacy prefix ends in `/`
(C10), so it cannot name `/about-us`, and the proxy may not ask the database
which slugs moved. Each of the ~15 rows of the hand map therefore takes one of
two paths:

- **It keeps its URL** — the default, as for the product URLs: the new site
  serves the same address, as a CMS page with the old slug (`/about-us`, `/faq`,
  `/privacy-policy`) or as a surface whose segment is the same (`/newsletter`,
  `/sell-to-us` — the consignment form — and `/account/*`). No rule, no redirect.
- **It moves** — its old path goes into the brand's `routes.legacyPaths` (C10
  v1.2: exact paths, no trailing `/`, such as `/catalogue` for the catalogues'
  new `/catalogues`, `/s` for search, `/new-additions` for the browse page by
  newest), which the proxy rewrites to `/api/x/legacy/…` exactly as it does a
  prefix, its query kept; the `redirects` row holds the target, and the handler
  answers 301.

The two never compete: CI refuses a legacy path that shadows a live root segment
or sits under a legacy prefix, and the pages validator (SCH, TASKS.md 9.3)
refuses a CMS slug that is a one-segment legacy path. Rejected: letting the page
route or the designed not-found page look up `redirects` for an unknown slug —
it queries the database for every mistyped URL, and a redirect decided while a
page streams cannot answer 301.

**How a legacy URL is matched (C10, 3.4 reviews).** Exactly, on the path as the
browser sent it — case and percent-encoding included — its query carried along.
No rule names a `.` or `..` segment (the URL parser removes them before a
request is made), a root file (C13 `ROOT_REWRITES`: robots, the sitemaps, the
icons, the manifest) or a first segment Next or the proxy claims (`_next`,
`not-found`, `.well-known`): each would never be reached, and CI refuses it.

- **A trailing `/` or a doubled `//`** is answered by Next itself, a 308 to the
  path without it, before the proxy runs (measured on 16.3.6; C10 refuses both
  too): an inventory URL `/about-us/` goes 308 → `/about-us` → 301 → the new page,
  and `/product/1706-old/` 308 → `/product/1706-old` → 308 → the current URL. The
  URL gate (TASKS.md 37.1.b) counts Next's 308 as normalisation — recognised by its
  `Location`, the same path with the trailing `/` dropped or the `//` collapsed —
  and still requires the one permanent redirect after it.
- **An old item link works whatever its slug spells** — `%27`, `(…)`, `%61` for
  `a`, a `+`: its id picks the item and the route answers one 308 to the current
  URL (C10's one exception to strict segments; a `%2F` or a non-canonical id is
  still not found), as the 4.1.e spike proved with an encoded slug.
- **A lower-case escape is not another spelling.** RFC 3986 §6.2.2.1 makes
  `%c3%a9` one URI with `%C3%A9`, and Next upper-cases an escape's hex digits
  before the proxy runs, so `/product/1706-caf%c3%a9-de-java` is served at the one
  address, 200 — never a second one (the spike §3).
- **A slug part that does not decode as UTF-8** — `%FF`, a Latin-1 `caf%E9`, raw
  bytes in the request line — is not found today (404 from the proxy: C10 cannot
  read the segment). C10's next minor version sends it to the item route by its id
  with a fixed ASCII slug no item has — never the bytes as asked, which Next cannot
  decode into the route's param and answers with a bare 500 (measured by 4.3's
  senior-fe review #4) — so it gets the one 308, its query kept (TASKS.md 22.7.d); the
  status spec probes it, and the URL gate lists any such URL of the inventory until
  then (4.1 review, senior-fe #12).
- **The handler (36.4) takes a `Location` only from a root-relative `redirects`
  row** — matching `^/(?![/\\])`, never `//host` or `/\host`, which a browser
  reads as another site. A request such as `/category/%2F%2Fevil.com` reaches it
  as asked for, and is a 404 unless a row names it.

## 7. Domain — do not move it in the same release

`antiquemapsindonesia.com` holds the rankings. **The platform migration keeps it
as the canonical domain**; `indiesgallery.com` stays a 301 alias. Moving the
brand to its own domain is a separate, later decision with its own redirect
release and Search Console change-of-address — combining a platform migration
with a domain migration makes any traffic drop impossible to attribute.

## 8. Cutover — the owner points the domain at the new site

Nothing below touches the old site. It keeps running, untouched, until the owner
decides otherwise; the steps that involve it are the owner's own.

0. **Before Old East Indies launches** (if it launches first) — the gallery's
   production database is provisioned and imported **dark**: no DNS, no public
   traffic, but its archive API serves the works the shop's designs come from and
   the originals' per-market prices the shop displays (D25).
1. **T–14 days** — full rehearsal import into staging (`indies-gallery.gaiada.com`) from the
   owner's export; report reviewed; curator signs the mapping. Writing to Helios
   needs the owner's go-ahead.
2. **T–2 days** — the owner lowers the DNS TTL to 300 s and asks their staff to
   stop editing the old admin from T (a staff instruction, not a change to the
   old system).
3. **T** — the owner hands over a final export; the delta import (by
   `updated_at`) runs into the new production database; publish; redirect
   verification at 100% against the new site; **the owner points the domain at
   the new site**; submit sitemaps; Search Console + GA annotations.
4. **After T** — the old site is the owner's: this plan does not archive, change
   or switch it off.

Rollback during the first 48 hours is the owner pointing DNS back at the old
site, which nobody touched. Orders taken on the new site in that window are
exported for manual handling.

## 9. What the client must supply

| Item | Blocks | Effort for them |
| ---- | ------ | --------------- |
| **An export of the old catalogue** — a MySQL dump and the product-images folder, from whoever hosts the old site (we never log in to it) | §3 (a read-only public read, with the owner's OK, otherwise) | 30 min for whoever hosts the old site |
| Curator review of the category → facet mapping | §2, bulk publish | ~1 hour |
| **The item register**: for every stock number, where the object physically is (Singapore, Jakarta, elsewhere) and its export status | any sale — an item without a row publishes enquiry-only (COMPLIANCE.md §1) | a spreadsheet; the largest single input the owner gives |
| Condition-grade scale they use (`G+`, `VG`…) with definitions | the PDP condition legend | 15 min |
| High-resolution master scans (where they exist) | large OEI print sizes — today's 3543 × 2840 px web images allow at most about 37 cm on the long edge at 240 ppi, and only where the sheet fills the frame edge to edge: the ceiling is computed from the sheet's own pixels or a design's crop of them, never the file's long edge (ARCHITECTURE.md §7), so a sheet spanning 3300 px of one prints to about 35 cm. Each legacy image is assessed at import, never rejected — its object's long edge measured and, where the dimensions are known, its object ppi (`docs/design/imagery/intake-spec.md` §8) | ongoing |
| Newsletter platform export (subscribers + consent) | §5 | 15 min |
| Pointing `antiquemapsindonesia.com`, `indiesgallery.com` and `oldeastindies.com` at the new sites at launch (the owner's registrar and DNS) | cutover | minutes, on the day |
| Old East Indies' product list (spreadsheet or the WhatsApp catalogue export) and any Squarespace export | §10 | 1 hour |

## 10. Old East Indies — a small legacy too

Old East Indies has no store, but it has URLs:

- `oldeastindies.com` 301s to `linktr.ee/oldeastindiesbali`, **including old
  Squarespace product paths Google still indexes** (e.g.
  `/our-collection/p/bali-island-dutch-map-year-1849`) — each now lands on a
  broken Linktree URL.
- Indies Gallery's "Buy Reproduction" buttons point at the `oldeastindies.com`
  home page.
- Today's catalogue lives in a WhatsApp Business catalogue and PDF catalogues on
  Google Drive; the owner's history columns run in NOW! Bali.

So the emporium launch carries its own redirect map: every old Squarespace path
— gathered from Search Console and the Wayback Machine's CDX index
(`web.archive.org/cdx/search/cdx?url=oldeastindies.com/*`) — maps to its new
product or collection. The old gallery's "Buy Reproduction" buttons all point at
one home page, so there is nothing to map one-to-one: instead, **the new gallery
item pages link to the exact products made from each work** (sister links, TASKS.md
27.1), and the old home-page URL redirects like any other. The product list is
imported through the generic `csv-products` source adapter rather than typed in
by hand.
