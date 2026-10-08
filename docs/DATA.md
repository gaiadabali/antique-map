# Data — seed, import, images and old addresses

**Purpose:** how data gets into the platform: the seed it is built on now, the spreadsheet import that brings in
the owner's real catalogue, products, stores and stock (DR-11), the image intake, and the old sites' addresses.
Fields and spreadsheet columns are [CONTENT-MODEL.md](CONTENT-MODEL.md) (§9 for the columns); the admin recipe is
[CONTENT-OPERATIONS.md](CONTENT-OPERATIONS.md) §3.5. **We never touch the live sites**: what we take from them is
a copy — an export the owner hands over or, with his OK, a read-only, rate-limited read of public pages (D41, D43).

## 1. Where the data comes from

| Data                    | Now                                                                          | Later                                                                                                  | §    |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---- |
| Antiques                | 1,823 records read from the old gallery's public pages, normalised           | the owner's catalogue sheet, by stock number; the old site's database export if he hands it over (OA9) | 2, 3 |
| Their images            | 2,289 legacy images from the same read (median 2,706 × 1,697 px)             | the owner's own photographs (D19), judged by the intake spec                                           | 5    |
| Products, stores, stock | generated mock data, plainly marked                                          | the owner's product list, store list and counts per store                                              | 2, 3 |
| Vocabulary              | places with historical names; grades, techniques, subjects, categories       | additions in the admin                                                                                 | 2    |
| Old addresses           | 7,665 gallery URLs from the public read; 673 shop paths from archived copies | the export's URL list; a Search Console export (OA11)                                                  | 6, 7 |

From an export, only the catalogue and its URLs are used. Its customers, orders, wishlists and subscribers are not
imported: the new sites hold no accounts and no collection for them (DR-10).

## 2. The seed

The sites are built and tested on seed data loaded through **the same import as the owner's files** (§3). The
seed is the import's first user, so the import is proven long before his data arrives, and his data replaces the
seed without a code change (requirement 10.3).

| Layer          | What                                                                                                                                              | Runs on                                              | Source                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Vocabulary     | places with historical names and parents; grade, technique, subject and category terms; `site-settings` defaults                                  | every environment, production included               | committed, `engine/packages/cms/src/seed/`                                                          |
| Gallery sample | 50 antiques with 640 px copies of their legacy photographs (about 3 MB)                                                                           | workstations, CI                                     | committed                                                                                           |
| Gallery, full  | the 1,823 normalised records and their 2,289 images                                                                                               | staging; production only if the owner chooses (Open) | made by `@engine/migrate` in `LEGACY_DATA_DIR` (§8), never committed                                |
| Shop mock      | about 80 products (some with variants, some linked to a seeded antique), 120 stores spread over Bali's towns, stock per store, a welcome discount | workstations, CI, staging; never production          | generated with a fixed random seed, committed as import files                                       |
| Shop catalogue | the owner's 156 real designs as products with two variants each and **placeholder prices**; the 80 mock products retire                           | staging, for the client review; never production     | made in `LEGACY_DATA_DIR` (`old-east-indies/designs`, `old-east-indies/instagram`), never committed |

- **Deterministic and idempotent.** The same command twice changes nothing; every key comes from the data (stock
  numbers, old ids) or from the fixed seed.
- **Mock records say what they are.** Their SKUs and store codes start `SEED-`, a store reads "Seed store, Ubud
  03", its pin is scattered around a town and is no real address, and a product's image is a generated placeholder
  (provenance `rendered`, labelled on the page).
- **Seeded antiques are the owner's own records**: stock numbers, titles, dates and essays from his old pages, with
  only the fields the normaliser read with confidence (§8); the rest waits in the review file. Their `publicId` is
  the old product id, so old addresses work on staging from the first load (§6). Status is `available` or `sold` as
  the old page showed; `location` is `singapore` (PLAN: the antiques are held there) until his sheet says
  otherwise. **The old USD prices load into the owner-only asking price** (the full layer
  only; the committed sample stays price-free), in whole dollars. A price the normaliser could not read with
  confidence (empty, on request, in review, not in whole dollars) stays blank, never rounded or guessed. The
  gallery still shows no price (DR-3); the owner changes it in the admin. Decision 2026-10-08.
- **Every seeded antique and product arrives as a draft** (stores and stock apply at once), and publishes through
  its checks (CONTENT-MODEL.md §8) by the import's **Publish these records** (§3).
- **When his data arrives**, his sheets update the seeded antiques in place by stock number, and
  `pnpm data:purge-seed` deletes every `SEED-` product, store and stock row (refused in production, which holds
  none; orders keep their snapshots).
- **The shop catalogue layer** (`--layer shop-catalogue [--publish]`, task 10.6.e) loads the owner's real designs
  through the same import: **152** from his six catalogue PDFs (2022–24) and **4** only his Instagram shows, one
  product per design, each with two variants, **Mounted print** and **Framed print** (no sizes are known).
  SKUs start `SEED-` (`SEED-MP.244`, variants `-M` and `-F`; Instagram ones `SEED-IG01`…`04`). The name is the
  title and the year as the shop writes it ("Map of Bali Island, c. 1600"; Indonesian "sekitar 1600"); the
  description is the owner's own text, Indonesian the machine translation (`needs review`). One category each:
  Maps, Travel posters, Animals, Botanicals, Landscapes or Bali, a design in several catalogues taking the first in
  that order. **The prices are placeholders, whole rupiah, the same for every design: Rp 450,000 mounted and Rp
  950,000 framed** (anchored on the owner's archived Squarespace price of SGD 78.80 for a framed print), until the
  owner's price list arrives (OA4); no notice sits in the visible description. The run makes drafts through the
  products import, then places the pictures itself, because the import's own product-image path stamps every file
  `flat` + `photograph`: the catalogue artwork goes in as `flat` and `photograph` (a reproduction of the design; the
  provenance list has no scan value, and any other value would label it "Digital mockup"), an Instagram crop with
  the shop's logo tile placed on it as `composite`, a matted mock-up as `flat` + `rendered` and a framed one as
  `in-room` + `rendered` (both labelled "Digital mockup" on the page). Instagram designs list their artwork first.
  With `--publish` each product then publishes through its checks. Stock for every new variant goes to the 120
  mock stores from a fixed seed (a design reaches about 60% of the stores; six variants are out of stock
  everywhere, as explicit zero rows). **The 80 mock products retire** in the same run: unpublished, their variants
  off sale (the import cannot do it: a product row's `active` is read by nothing, and a variant being off sale does
  not hide its product); the mock stores and stock stay. A second run changes nothing.
- **Commands**: `pnpm data:seed --layer <layer>`; `pnpm db:fresh` loads the vocabulary, the gallery sample and the
  shop mock. The full gallery reaches staging from a workstation, through an SSH tunnel to its database and storage.

## 3. The spreadsheet import

One import, four kinds, each matched by a natural key. The columns are CONTENT-MODEL.md §9's; this is how they load.

| Kind     | Key                                         | Writes                                              | Lands as                                                  |
| -------- | ------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Antiques | `stock_number`                              | `works`, linked to makers, places, terms and images | a new one as a draft; a change on the record as it stands |
| Products | `sku`; a variant row names its `parent_sku` | `products` and their `variants`                     | the same                                                  |
| Stores   | `store_code`                                | `stores`                                            | applied at once                                           |
| Stock    | `store_code` + `sku`                        | `stock-levels`                                      | applied at once (below)                                   |

**Where it runs.** The owner (every kind) or an editor (antiques and products) uploads a file on the admin's
Import screen. A developer runs the same code from the command line for the seed and the handover
(`pnpm data:import --kind <kind> --file <path> [--apply]`). Each run is a Payload job kept after it completes, with
its file and report in the private bucket under `imports/<job>/`; there is no import collection.

**The file**: `.csv` (UTF-8, a byte-order mark allowed, `,` or `;` sniffed from the header) or `.xlsx` (the first
sheet, cell values only — a formula counts by its stored result; macros and links to other workbooks are refused),
at most 10 MB and 20,000 rows, the header in row 1 spelled as the template. A file that is not UTF-8 is refused
with its fix ("Save as CSV UTF-8"), never read in a guessed encoding.

**Two steps, always.**

1. **Preview**, a dry run: every row parsed, validated and compared with what is stored; nothing is written. The
   screen shows new · updated · unchanged · rejected · held, each row with its column and reason, and the old and
   new value of every change.
2. **Apply** the valid rows. Rejected and held rows are skipped and listed for download, to be fixed and uploaded
   again. A record is the unit: a product and its variant rows apply together or not at all. A new antique or
   product arrives as a draft, and the result's **Publish these records** runs each one's publish checks and
   publishes those that pass. A change to an existing record applies to it as it stands, so a published price or
   description changes on the site at once — which is why the preview shows every old and new value — and a change
   that would fail the record's publish checks rejects its row. Nothing goes public without a person's click.

**What a row means.**

- **Matching is by key alone**, trimmed, case kept as written (`M.1044`). A key the file repeats rejects both rows.
- **An empty cell never clears a field**; it leaves the stored value. A field is emptied in the admin.
- **An import deletes and unpublishes nothing.** A record missing from the file is untouched; a store or a variant
  is retired by setting `active` to `no`.
- **Vocabulary is matched, never created by guess**: makers by name or alias, places by name or historical name
  (accents and case ignored), terms by label within their kind. No match, or two, holds the row with the nearest
  names as suggestions ("did you mean Valentijn, François?"); the owner adds the record or the alias, then reruns.
- **A record with unpublished edits in the admin is held**, never merged into or published over: publish or
  discard those edits first.
- **Money is whole numbers, never guessed.** `price_idr` is whole rupiah, digits optionally grouped in threes by
  `.` or `,` (`185000`, `185.000`). `asking_price` is in `asking_currency`, with no more decimals than that
  currency has. Anything else ("Rp 1,5jt") rejects the row with its fix. An editor's file may not carry
  `asking_price`.
- **Text is text.** A description is plain text, blank lines between paragraphs, with a small Markdown subset
  (bold, italic, lists, links) converted to the restricted rich text; raw HTML is refused. Every value is capped
  and cleaned of control characters (SECURITY.md §2.7).
- **`publicId`** comes from `legacy_id` when the row has one, so a migrated antique keeps its old address, and
  from the sequence otherwise (ARCHITECTURE.md §5). A `legacy_id` another record holds rejects the row.
- **Images** are named in `image_files`, the first the recto, each a file of the batch uploaded with the import
  (§5). A missing file holds the row.

**A stock row is a count on the shelf.** Units sold online but not yet collected by a driver are still on the
shelf, so the import stores `quantity = count − held`, where `held` is the units in that store's orders in
`pending_payment`, `paid`, `processing` or `waiting_driver`. It first locks the store's stock rows (`FOR UPDATE`),
so an order placed meanwhile waits and then takes from the new figure. A count below `held` stores 0 and flags
those orders for reassignment. A count made hours earlier overstates what drivers collected since: upload a count
the day it is taken. The admin's stock screen applies the same rule (COMMERCE.md §4).

**Order of loading**: vocabulary, stores, antiques, products (a `related_stock_number` must exist), stock.
**Idempotent**: the same file twice reports every row unchanged the second time and writes nothing, not even a
version.

## 4. The report and the review queue

Every run writes one report, shown in the user's admin language and downloadable:

| Column                       | Holds                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `row` · `key`                | the sheet's row number and its key                                                                                                                                   |
| `outcome`                    | `new` · `updated` · `unchanged` · `rejected` (invalid: fix the file) · `held` (valid, but waiting on a person: an unknown maker, a missing image, unpublished edits) |
| `column` · `problem` · `fix` | the cell, what is wrong and what to do, plainly: "Row 14, Price: 'Rp 1,5jt' is not a number. Write 1500000."                                                         |
| `was` → `now`                | each changed value of an update                                                                                                                                      |

The download holds the rejected and held rows with their original columns plus `problem` and `fix`, so it can be
corrected and uploaded as it stands; any cell a spreadsheet would run as a formula is prefixed with `'`. A summary
heads the report: counts per outcome, then the distinct unknown makers, places and terms with the rows each holds —
the review queue the owner clears first.

## 5. Images: intake and masters

The owner supplies every photograph (D19). The intake spec, [design/imagery/intake-spec.md](design/imagery/intake-spec.md),
says how each is judged; his guides say how to take one.

- **Everyday**: staff drop photos on an antique or a product in the admin (JPEG, PNG or WebP, at most 25 MB, typed
  by their bytes: SECURITY.md F1–F2). The file becomes the `media` record's private upload, and a job makes the
  derivatives and, where the image is large enough, the tiles (ARCHITECTURE.md §8).
- **A handover** (a folder of captures, TIFF scans): each file goes straight to the private bucket by presigned
  PUT, checked by length and SHA-256, into an intake batch (`masters/intake/<batch>/<checksum>.<ext>`) beside the
  batch's manifest (`intake.json`: each file's received name, reference, role, provenance, pixels, measured object
  box and ppi, verdict). Recording the manifest creates one `masters` record per file, idempotently by checksum.
  The Import screen sends a batch of photos this way; a large one goes through the intake CLI (DEPLOYMENT.md §6).
- **Linking**: a sheet's `image_files` name files of its batch. The import files each capture under its antique,
  its copy verified by checksum, and makes its `media` record, the first as the recto. A master moves once and is
  never deleted.
- **Legacy images** (the 2,289 from the public read) enter as one batch with the verdict `legacy`, assessed and
  never rejected; provenance `photograph`; an item's first image its recto, the rest `detail` until a person says
  otherwise (CONTENT-MODEL.md §5). Most are under 2,400 px, so they get derivatives and no tiles.
- **Bulk derivation runs off-box.** For hundreds of images, a workstation CLI makes the derivatives and tiles,
  writes them straight to the media bucket and marks the records: Helios shares its CPU and disk with other sites.
- Public derivatives and tiles carry no camera metadata; a GPS position stays on the private master (intake spec F6).

## 6. The gallery's old addresses

`antiquemapsindonesia.com`'s addresses are its search traffic, verified **by count, not by spot check**. The
inventory is `engine/packages/migrate/data/gallery/urls.tsv`: 7,665 URLs from the public read (1,823 products,
883 category and 813 maker listings, 4,111 images, 20 pages, 15 assets), joined by the export's list if it arrives.

| Old                                                                                                          | New                                                                           | Answered by                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/product/{id}-{slug}`                                                                                       | **the same address**, `publicId` being the old id                             | the item route: 200, or one 308 to the current slug, query kept                                                                                                                           |
| `/category/{id}-{slug}`, with `?s=`, `?o=`, `?p=`, `?page=`                                                  | the browse page of the same selection: type segment, place path, availability | a `redirects` row per category from the reviewed mapping; `?s=sold` includes sold, `?o=newest` sorts by newest; `?p=` (a price sort) and `?page=` are dropped, the gallery having neither |
| `/mapmaker/{id}-{name}`                                                                                      | `/makers/{slug}`                                                              | a row per old maker, after the makers' de-duplication                                                                                                                                     |
| `/storage/products/{product}-{image}.jpg`, its `S` and `M` sizes                                             | the image's largest public derivative                                         | a rule in the legacy handler, by the old product and image ids; no rows                                                                                                                   |
| static pages (`/about-us`, `/contact-us`, `/privacy-policy`, `/terms-conditions`, `/new-additions`, `/s`, …) | their new pages; `/sell-to-us` keeps its address                              | about 20 hand-made rows                                                                                                                                                                   |
| `/account/…`                                                                                                 | —                                                                             | 410 Gone: the new gallery has no accounts                                                                                                                                                 |
| the old site's CSS and scripts                                                                               | —                                                                             | 404                                                                                                                                                                                       |

- **The mechanism** (ARCHITECTURE.md §5): the proxy rewrites the old prefixes (`/category/`, `/mapmaker/`,
  `/storage/`, `/account/`) and exact old paths, all listed in `SITES`, to `/api/x/legacy/gallery/…`. The handler
  reads `redirects` (a cached map per site) and answers **301**, or 410 where a row says gone, else 404; the proxy
  never touches the database. A unit test keeps every old path off the live routes, and the pages validator
  refuses a slug equal to one.
- **Matching is exact**, on the path as the browser sent it, case and percent-encoding included. Next answers a
  trailing `/` or a doubled `//` itself with a 308 to the clean path before the proxy runs; the gate counts that
  normalising 308 and still requires the one permanent redirect after it. An old item link whose slug part does
  not decode still reaches its item by id.
- **A target is root-relative** (`^/(?![/\\])`), never `//host` or `/\host`, which a browser reads as another
  site. The image rule builds its target from `MEDIA_PUBLIC_URL`, never from a row.
- **The category mapping** — 98 old categories, each turned into a selection of type, place and subject — is
  drafted from the crawl and **reviewed by the curator**: about an hour, and the most valuable review the owner can
  give the new browse. It fixes the old tree's defects rather than copying them: counts that did not roll up,
  duplicate categories, a Tasmania plan filed under Indonesia.
- **The gate**: a script requests every inventory URL against staging and, before launch, against production with
  the real `Host`. Each answers 200, or exactly one permanent redirect (301 or 308) to a 200 after at most one
  normalising 308, or its documented 404 or 410. The launch waits until the failure count is zero.
- **The domain does not move with the platform.** `antiquemapsindonesia.com` holds the rankings and stays canonical
  (G1); `indiesgallery.com` stays an alias answering 301. A move to another domain would be its own later release:
  made together with a platform move, a drop in traffic could not be attributed to either.

## 7. The shop's old addresses

`oldeastindies.com` has had two stores and now forwards to a link page, while search engines still list old product
paths. The inventory, `engine/packages/migrate/data/shop/urls.csv`, holds 673 paths gathered from copies only (the
Wayback Machine's index and two archived sitemaps, D43): 503 products, 225 at `/products/<slug>` (2020–21) and 278
at `/our-collection/p/<slug>` (2022–24). A Search Console export (OA11) adds what neither archive holds.

- The same mechanism, with the shop's prefixes (`/products/`, `/our-collection/`, `/collection/`, `/lookbook/`,
  `/blog/`); that is why the new product route is the singular `/product/` (ARCHITECTURE.md §5).
- Once the owner's catalogue is in, old product paths are mapped to the matching new products (proposed by name,
  reviewed by a person) and old categories to the nearest category, as `redirects` rows with `site: shop`.
- **An unmapped path stays a 404.** A blanket redirect to the home page is a soft 404 to a search engine and
  helps nobody.

## 8. `@engine/migrate`

The package that turns outside data into rows the import loads. It reads copies only and never imports Payload.

| Part                               | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources/public-read`              | the reader of the old gallery's public pages (D41): GET only, robots.txt obeyed, one request at least 2 s after the previous answer, an honest User-Agent, every answer cached so nothing is asked for twice. It produced the 1,823 records and 2,289 images                                                                                                                                                                                                                                                                                 |
| `sources/laravel-catalogue`        | restores the old site's MySQL dump into a throwaway container and extracts it with SQL, never by stream-parsing the dump; proven on a mock dump (D42) until the owner's export arrives (OA9)                                                                                                                                                                                                                                                                                                                                                 |
| `sources/csv-products/legacy-urls` | the shop's address inventory, from the Wayback Machine and Search Console                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `normalise/`                       | raw values into the engine's shapes: dates with precision, millimetres (height and width read from the photograph, since the old site typed sizes in both orders), grades, references, titles with their SEO suffixes moved out, stock numbers. A reading below 0.9 confidence never enters a field: it goes to `review.csv` beside its raw value, as a proposal. Each dirty case met on the old site (`Year: Leiden`, `40 b7 22 cm`, the `G-` grade, stock numbers from `M.1044` to `M.Dav5` and `DavDw`, `-` for a price) has its own test |
| `import/`                          | the spreadsheet readers and row checks of §3: a file in, typed rows and problems out. The writes are `cms`'s                                                                                                                                                                                                                                                                                                                                                                                                                                 |

- **Raw data stays outside git**, in `LEGACY_DATA_DIR`, a workstation path never set on a server: the HTML cache,
  the records, the images, the normalised output. The CLIs refuse an output folder inside the checkout; the
  committed copies are the address inventories and, once reviewed, the mappings.
- **The full gallery seed is its output**: `records.jsonl` becomes an antiques import file carrying only parsed
  values, plus an image batch; `review.csv` goes to the curator. Parsed so far: titles 1,709 (114 for review),
  dates 1,749, conditions 1,783, dimensions 1,614, stock numbers 1,734,
  prices 1,628 (1,481 fixed in USD, 147 on request; 6 more for review).
- **The crawl exists on one workstation only** (3.3 GB). It is copied to the private bucket before the reshape: a
  second read needs the owner's OK again and takes hours (CARRY-OVER.md §6).
- _Reshape note:_ the inventories move out of the brand folders to `engine/packages/migrate/data/{gallery,shop}/`
  and the gazetteer to `engine/packages/cms/src/seed/`; `import/` is new.

## Open

- **The full gallery seed in production** — default no: production starts from the owner's sheet or export, the
  crawl staying a staging seed. _Owner._
- **The curator's review** of the category mapping and the maker clusters (OA12). _Owner._
- **The `publicId` sequence's start** — default 100000, to be confirmed above the export's highest product id
  when it arrives. _Developer._
- **The shop's old paths at launch** — default: mapped once the owner's catalogue is in, unmapped paths 404.
  _Owner._
- **Import files and reports** are kept 90 days, then purged with the other retention (COMPLIANCE.md §1).
  _Owner, counsel._
- **The old site's customers and subscribers** — default not imported: no collection holds them, and contacting
  them again would need fresh consent (COMPLIANCE.md). _Owner, counsel._
