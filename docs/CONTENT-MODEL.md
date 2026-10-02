# Content model

**Purpose:** every Payload collection and global, its key fields, relations, languages, who may read and write
it, and what must be true before it publishes. This file is also the glossary: the names below are used
everywhere, exactly. How orders and stock move is [COMMERCE.md](COMMERCE.md); analytics events are
[ANALYTICS.md](ANALYTICS.md); how spreadsheets are loaded is [DATA.md](DATA.md) (this file defines the columns it
maps to, §8).

## 1. Ground rules

- **One database, one schema** (DR-1). A record that belongs to one site carries `site` (`gallery` | `shop`); the
  hostname picks the site, and every public read filters by it.
- **Drafts are Payload's `_status`, and only that.** Collections with drafts: `works`, `products`, `makers`,
  `places`, `terms`, `pages`. No status field holds a second "draft" value.
- **Public reads are published-only and projected**: `overrideAccess: false`, `_status: 'published'`, and a
  `select` of the fields the page shows. Fields marked *staff* below are never selected by a public read.
- **Languages** (DR-12): `en` is the default and required where a field is required; `id` is optional and falls
  back to `en`. Localised fields are marked **L**. Each localised collection has `translationStatus` per locale
  (`entered` · `machine` · `reviewed`, staff only) — machine translation is allowed and shown as such to staff.
- **Slugs** are one string for every locale (never localised), lower-case ASCII kebab-case, made once from the
  English title on first save and **never re-derived on edit**; staff may set one by hand. Unique per collection
  and site. A changed slug writes a `redirects` row.
- **Money** is an integer in minor units. For rupiah the minor unit is one rupiah (Rp 95.000 is `95000`).
- **Long text** is Payload's rich text (Lexical) with a restricted feature set: headings, paragraphs, lists,
  links, bold/italic, and an inline image from `media`. No raw HTML, no embeds.
- **Guards run on every write path** — admin, REST, import, seed. Publish guards live in a `beforeChange` hook,
  because access control alone cannot protect the draft → published transition.

## 2. One-glance overview

```
 GALLERY                                          SHOP
 makers ─┐                                         terms(category) ─→ products ─┬─ variants[] (rows)
 places ─┼─→ works ◄──────── relatedWork ──────────────────────────────────────┘     │
 terms ──┘   │  (subject, technique, grade)                                         │
             └─ images[] ─→ media ─→ masters (private)   stores ◄── stock-levels ───┘ (store × product/variant)
                               ▲                           ▲  ▲
           products.images ────┘                           │  └─ users (role store → one store)
                                                           │
 leads ◄── chat-sessions        orders ── assigned store ──┘ ── payment-events (Midtrans ledger)
   │  (kind ask|sell|partnership|contact|chat)  │ └─ status history, driver image, tracking token
   └─→ item (works | products)                  └─ discounts (welcome code)
 partners ─→ products carried     pages · redirects · events (analytics) · site-settings (global)
```

## 3. Catalogue

### `works` — admin label **Antiques** (gallery)

| Field | Type | Notes |
| --- | --- | --- |
| `stockNumber` | text, unique, required | as the gallery writes it: `M.1044`, `P.2098`, `F.…`; trimmed, case kept. The import's key |
| `publicId` | integer, unique, required | the old site's product id for a migrated work, otherwise a number from a sequence starting at 100000 (DATA.md §3); part of the item's address, `/product/{publicId}-{slug}` (ARCHITECTURE.md §5) |
| `title` **L** | text, required | the title buyers read: "Bali by François Valentijn, 1726" |
| `originalTitle` | text | diplomatic transcription: *Kaart van het Eyland Bali* |
| `slug` | text | §1 |
| `objectType` | select, required | `map` · `sea-chart` · `city-plan` · `view` · `print` · `photograph` · `book` · `atlas` · `poster` · `document` · `other` |
| `makers` | array `{ maker → makers, role, certainty }` | role: `cartographer` · `engraver` · `publisher` · `author` · `artist` · `photographer` · `studio` · `printer`; certainty: `certain` · `attributed` · `after` · `workshop` |
| `date` | group `{ from, to, precision, display }` | precision: `exact` · `circa` · `before` · `after` · `range` · `unknown` — a date is never implied certain; `display` ("1724–26") wins over the formatter |
| `places` | array `{ place → places, role }` | the first row is the primary place; role: `depicts` · `published-at` · `photographed-at` |
| `technique` | → terms (`technique`) | engraving, lithograph, albumen print… |
| `colour` | select | `original-hand` · `later-hand` · `printed` · `uncoloured` · `unknown` |
| `dimensions` | group `{ image {h, w}, sheet {h, w} }`, mm | inches are derived on the page, never typed |
| `condition` | group `{ grade → terms (grade), notes L }` | the grade is the gallery's published scale (VG+ · VG · G+ · G · Fair · As-is), each term with its definition |
| `subjects` | → terms (`subject`), many | Wayang, Batik, Temples, Spices, VOC… |
| `description` **L** | rich text | the essay |
| `references` | array `{ citation, note }` | "Tooley (Australia) 1268", Parry numbers — text, as catalogued |
| `images` | array `{ media → media, caption L }` | roles and the primary: §5 |
| `status` | select, required | `available` · `on-hold` · `sold` — set by staff; default `available` |
| `location` | select, required | `singapore` · `jakarta` (G2) |
| `askingPrice` | group `{ amount, currency }` | **owner only** (read and write) — the start of a negotiation and the insured value. Never on a page, a feed, structured data, an event or an AI answer (DR-3, G4) |
| `aiDraft` | group `{ fields[] { path, state, model, promptVersion, at, verifiedBy, verifiedAt }, runs[] }` *staff* | what the drafting tool filled (AI.md §5); `state` is `drafted` until a person ticks **Verified** |
| `legacy` | group `{ id, url }` *staff* | the old site's product id and URL — the redirect source (DR-11) |
| `seo` | group `{ title L, description L }` | overrides; the image is always the primary |
| `notes` | textarea *staff* | internal |

### `products` (shop)

| Field | Type | Notes |
| --- | --- | --- |
| `sku` | text, unique, required | the import's key; also the SKU of a product without variants |
| `name` **L** | text, required | |
| `slug` | text | §1 |
| `description` **L** | rich text | |
| `category` | → terms (`category`), required | prints, stationery, homeware, gifts… |
| `images` | array `{ media → media, caption L }` | §5 |
| `price` | integer IDR, required, > 0 | the one list price; priced on the server only (COMMERCE.md §2) |
| `variants` | array `{ sku (unique across all products), label L, price?, active }` | optional: "A3", "Indigo". A variant without its own price takes the product's |
| `relatedWork` | → works, optional | "See the original" — shown only while that work is published |
| `seo` | group `{ title L, description L }` | |

Availability is never typed on a product: it is read from `stock-levels` (COMMERCE.md §4).

### Vocabularies

| Collection | Key fields | Notes |
| --- | --- | --- |
| `makers` | `name`, `sortName` ("BLAEU, Willem Janszoon"), `slug`, `aliases[]` (Valentyn, Valentijn), `roles` (the list above), `born`/`died` `{ precision, from, to, display }`, `nationality` **L**, `bio` **L** rich text, `portrait` → media, `sameAs[]` (Wikidata, ULAN; https only) | a maker page per maker |
| `places` | `name` **L**, `slug`, `type` (`region` · `country` · `island-group` · `island` · `province` · `kingdom` · `city` · `town` · `sea` · `strait` · `ocean`), `parent` → places, `historicalNames[] { name, language, period }` (Batavia, Iava, Celebes), `geo { lat, lng, bbox }` (WGS 84) | the gazetteer; search finds a place under every historical name; no cycles in `parent` |
| `terms` | `kind` (`subject` · `technique` · `grade` · `category`, fixed once created), `label` **L**, `slug` (unique within its kind), `position`, and for a grade `definition` **L** + `equivalent` (A–D) | `category` serves the shop; the rest the gallery |

Reshape note: the code's `terms` kinds (`mood`, `room`, `occasion`, `recipient`) and the `sources` collection give
way to `technique`, `category` and text references.

## 4. Shop operations

| Collection | Key fields | Notes |
| --- | --- | --- |
| `stores` | `code` (unique, required — the import's key), `name`, `address`, `area` ("Ubud"), `lat`, `lng` (required, decimal degrees, inside Indonesia), `whatsapp` (+62…), `hours` **L** (text), `images[]` (role `showroom`, photographs only), `active`, `notes` *staff* | an inactive store is never assigned an order |
| `stock-levels` | `store` → stores, `product` → products, `variantSku` (null for a product without variants), `quantity` (integer ≥ 0): what the store can still sell — its physical count less the units held by its orders in `pending_payment`, `paid`, `processing` or `waiting_driver` | unique `(store, product, variantSku)`. Written by the atomic decrement and its release (COMMERCE.md §4); a staff count or the stock import enters the physical count and the server stores count − held (DATA.md §3), so a count never re-sells a held unit |
| `orders` | `number`, `site` (`shop`), `lines[]` (snapshots), `contact`, `delivery { address, notes, lat, lng }`, `store` → stores, `distanceKm`, totals, `discount`, `status`, `history[]`, `driverImage`, `payment`, `trackingTokenHash`, `expiresAt` | the full shape and its rules are COMMERCE.md §8. Written only by the server's order code and the staff actions it allows |
| `payment-events` | `provider` (`midtrans`), `dedupeKey` (unique), `order` → orders, `transactionStatus`, `fraudStatus`, `grossAmount`, `source` (`webhook` · `reconcile` · `simulate`), `outcome`, `payloadHash`, `receivedAt` | append-only ledger (COMMERCE.md §6); the payload itself is never stored or logged. Nobody edits a row |
| `discounts` | `code` (unique, stored upper-case), `kind` (`percent` · `fixed`), `value`, `minSpend`, `oncePerBuyer`, `startsAt`, `endsAt`, `usageLimit`, `usedCount` (server only), `active` | the welcome code (S13). Free shipping is a setting, not a discount |
| `partners` | `name`, `kind` (`hotel` · `shop` · `restaurant` · `other`), `site`, `contact { person, whatsapp, email, phone }`, `address`, `terms` (textarea — negotiated case by case, S5), `productsCarried` → products (many), `status` (`prospect` · `active` · `paused` · `ended`), `notes` | records only, no login (DR-8) |

## 5. Images: media and masters

**The words.** A **capture** is a file as a camera or scanner made it, kept privately as a **master**. The
**media** record is the public image processed from it — colour-corrected, straightened, cropped outside the
object — from which the derivatives and deep-zoom tiles are made. An image's **role** says what it is and its
**provenance** how it was made; both are set once, at intake, on the master and its media alike.

**`media`** — `alt` **L** (required, not blank, ≤ 500 characters), `altSource` (`baseline` · `cataloguer` ·
`ai-draft`), `caption` **L**, `credit`, `licence`, `role` (required), `provenance` (required, **no default**),
`master` → masters (*staff*), focal point, and the pipeline's read-only `assetId`, `derivatives { status,
version, blurDataUri }` and `iiif { status }` (deep zoom). `role` and `provenance` never change after creation.

- **The upload is never public.** It lands under the private `uploads/` prefix; the public reads only
  `derivatives/` and capped `iiif/` tiles, written without camera metadata. A public REST or GraphQL read of
  `media` is refused: images are reached through the published record that places them.
- **Alt text** has a deterministic baseline built from the record ("Engraved map of Bali by François Valentijn,
  1726, hand-coloured, recto"), which can publish; staff improve it. An `ai-draft` alt cannot publish until a
  person verifies it.
- **A synthetic image is labelled at render, from `provenance`** ("Digital mockup", "AI-generated image") — on
  the image, at the start of the rendered alt and in the caption. The label is never stored in `alt`.

| Subject | Roles, in page order | Provenance allowed |
| --- | --- | --- |
| work | `recto` · `verso` · `detail` · `raking` · `transmitted` · `framed` · `in-room` · `scale` | photographs only, except an `in-room` view, which may be a labelled composite or render and is never first. **Nothing AI-generated on a work**; the images of condition (`recto` to `transmitted`) are never retouched |
| product | `in-room` · `flat` · `detail` · `lifestyle` · `scale` · `packaging` | any, labelled; photographs sort before mockups within a role |
| store | `showroom` | photographs only — they prove the place is real |
| other | `editorial` (a story image, a banner, a maker's portrait) | any, labelled |

**The primary** a page leads with (its LCP, card and social image): for a work, its first photographed `recto`
— never a detail or a synthetic image; for a product, its first photographed `in-room` or `flat`, else its first
image in page order. A migrated item's one legacy image is its `recto`.

**`masters`** — a plain collection (not an upload collection), one record per private file: `kind` (`capture`),
`storageKey` (unique), `checksum` (SHA-256, unique), `byteSize`, `widthPx` × `heightPx`, `colourProfile`,
`work` → works (null until filed), `role` (a media role, or `reference` — a colour-card frame, never
published), `provenance`, `objectBox { x, y, width, height }` (the sheet's edge in the frame's pixels),
`objectPpi` (measured from the ruler, never the file's DPI tag), `captureTier` (`good` · `better` · `best`), and
`intake { batch, reference (a stock number or SKU), receivedAs, verdict, retouching, notes[] }`. `verdict`:
`pass` · `fix-owner` (kept, never shown under its role until re-taken) · `legacy` (assessed, never rejected).
Files go straight to the private bucket by presigned URL; a master is never publicly addressable.

Reshape note: the code's `masters.brand`, `design` and the `print-file` kind, and the `room-plate` media role, go
(no multi-brand, no designs, no configurator). The code's `location` subject is `store` here.

## 6. People, leads and site

| Collection | Key fields | Notes |
| --- | --- | --- |
| `users` | `email`, `name`, `role` (`owner` · `editor` · `store`), `store` → stores (required when role is `store`, empty otherwise), `language` (`en` · `id` — the admin's language, G15), `active` | Payload auth. Only the owner sets `role` or `store`; nobody can remove the last owner |
| `leads` | `kind` (`ask` · `sell` · `partnership` · `contact` · `chat`), `site`, `source` (`chat` · `form` · `page`), `payload` (name, WhatsApp in E.164 and/or email, preferred channel, message, locale, the consent text's version and time), `items` → works or products, `chatSession` → chat-sessions, `status` (`new` · `contacted` · `in_progress` · `closed` · `spam`, each change with who and when), `firstReplyAt`, `notes` | the shape is AI.md §4's. Created only by the server's lead service, never by a public REST write. The sell form takes **no files**: photos travel on WhatsApp or email |
| `chat-sessions` | `site`, `locale`, `startedAt`, `lastMessageAt`, `items` → works or products, `transcript[]` (masked text), `ipHash` (daily-salted), labels, usage, `outcome` (`refused` · `blocked` · `handoff` · `lead`), `lead` → leads | written by the chat only; deleted 30 days after the last message (AI.md §3.4) |
| `pages` | `site`, `kind` (`page` · `story` · `collection`), `title` **L**, `slug`, `intro` **L**, `hero` → media, `body` **L** rich text, `products[]` / `works[]` (a `collection` lists them), `seo` | `page`: about, visit, FAQ, delivery, legal pages (counsel's words) · `story`: a gallery or shop article at `/stories/{slug}` · `collection`: a curated shop list at `/collections/{slug}`. Bodies are the restricted rich text of §1 — no blocks, no embeds |
| `redirects` | `site`, `from` (path, unique per site), `to`, `code` (301 · 302), `source` (`legacy` · `editor` · `slug-change`), `hits` | Payload's redirects plugin with `site` added |
| `events` | ANALYTICS.md §4 | append-only; read by the dashboard |

**Global `site-settings`** — one group per site (`gallery`, `shop`), each: `contact { whatsapp, email, phone }`,
`replyPromise` **L** (G9: "the same working day, Singapore time"), `hours` **L**, `announcement` **L**,
`social[]`, `leadNotifyEmails[]`, `ai { chatEnabled, draftingEnabled, dailyBudgetUsd, sessionTokenCap }` (AI.md).
The shop's group adds `checkoutEnabled` (the kill switch, SECURITY.md), `delivery { bands[] { upToKm, feeIdr },
freeOverIdr }` (the last band's `upToKm` is the delivery reach; free over Rp 500.000, S13), `welcomeDiscount` →
discounts, `orderExpiryMinutes` (the payment window, COMMERCE.md §4), `storeAlerts`.

## 7. Who may do what

Public means a visitor on the site, through the server's projected reads; nobody signs in but staff (DR-10).

| Collection | Public | `owner` | `editor` | `store` |
| --- | --- | --- | --- | --- |
| works | published, projected (no `askingPrice`, `aiDraft`, `legacy`, `notes`) | all, incl. `askingPrice` | all but `askingPrice` (not readable) | — |
| products | published, projected | all | all | read |
| makers, places, terms, pages, redirects | published, projected | all | all | — |
| media, masters | through published records only; masters never | all | all | read media |
| stores | name, area and hours of active stores, through the server | all | read | read own store |
| stock-levels | never directly — "in stock" is computed on the server | all | read and update: enter the physical count at any store | read own store's rows; update only their counts |
| orders | the tracking page only, by token, projected (COMMERCE.md §10) | all | read all; move any status, reassign, cancel, upload the driver image (COMMERCE.md §7) | read own store's; move them forward only, upload the driver image, hand one back with a reason |
| payment-events | — | read | — | — |
| leads, chat-sessions, partners, discounts, events, site-settings | — (the server writes and reads them) | all | — | — |
| users | — | all | own name, language, password | own name, language, password |

Store staff see their store's orders and stock only — enforced by a `Where` on `store` in the access function, so
lists, counts and lookups are all scoped, never by hiding menu items (SECURITY.md §2.2). Reassigning an order is
the owner's or an editor's. Whoever enters a count enters the physical count, stored less held units (§4).

## 8. Validation — on save and on publish

Saving stays cheap, so staff can type what they have and come back; publishing is when a claim becomes public.

| Rule | When |
| --- | --- |
| `stockNumber`, `sku`, variant `sku`, store `code`, discount `code` unique (variant SKUs across all products) | save |
| date: a typed year needs a precision; `to` ≥ `from`; dimensions positive, image ≤ sheet | save |
| prices and quantities are whole numbers; price > 0; quantity ≥ 0; `askingPrice` ≥ 0 | save |
| store `lat`/`lng` are numbers inside Indonesia's bounds; a `store` user has exactly one store | save |
| an image's role is one its subject takes, and its provenance one that role allows there (§5) | save |
| media alt not blank; a place's parent is not itself or a descendant | save |
| **antique**: `title` (en), `objectType`, a date (a precision other than `unknown`, or a `display` such as "undated"), a **primary image with alt text**, a condition `grade`, a `location` | publish |
| **antique**: no `aiDraft` field still `drafted` and no `ai-draft` alt on its images — AI-drafted text cannot publish unverified (DR-9) | publish |
| no image is shown under its role while its master's verdict is `fix-owner` | publish |
| **product**: `name` (en), `category`, `price`, at least one image with alt text, no unverified AI draft | publish |
| a grade term has its `definition` and `equivalent` | publish |

Validators are pure functions with unit tests (`engine/packages/cms/src/validators`); hooks only fetch what they
need. A record the seed or the import creates arrives as a **draft**; a change to an existing record applies only
on the previewed **Apply**, and one that would fail the record's publish checks rejects its row (DATA.md §3).
Nothing goes public without a person's click.

## 9. Spreadsheet columns

The owner's real data arrives as spreadsheets (DR-11). [DATA.md](DATA.md) owns the import: matching, dry run,
review queue, report. These are the columns and the fields they fill. `*` is required; `L` columns come in
`_en` / `_id` pairs; lists are separated by `;`.

**Antiques** (key `stock_number`): `stock_number*` · `title_en*`, `title_id` · `original_title` ·
`object_type*` · `makers` (`name | role | certainty`; …) · `date_display`, `date_from`, `date_to`,
`date_precision` · `places` (first is primary) · `technique` · `colour` · `image_h_mm`, `image_w_mm`,
`sheet_h_mm`, `sheet_w_mm` · `grade*` · `condition_notes_en`, `_id` · `description_en`, `_id` · `subjects` ·
`references` · `location*` · `status` · `asking_price`, `asking_currency` (owner's sheet only) · `legacy_id`,
`legacy_url` · `image_files` (first is the recto).

**Products** (key `sku`; one row per product, and one per variant with `parent_sku` set): `sku*` · `parent_sku` ·
`name_en*`, `name_id` · `variant_label_en`, `_id` · `category*` · `description_en`, `_id` · `price_idr*` (whole
rupiah: `95000`) · `related_stock_number` · `image_files` · `active`.

**Stores** (key `store_code`): `store_code*` · `name*` · `address*` · `area` · `lat*`, `lng*` · `whatsapp` ·
`hours_en`, `hours_id` · `active`.

**Stock** (key `store_code` + `sku`): `store_code*` · `sku*` (a product's or a variant's) · `quantity*` — the
physical count on the shelf, units packed for an order not yet collected included; the import stores it less the
units the store's open orders hold (DATA.md §3), and never adds to it.

Makers, places, techniques, subjects and categories are matched by name, alias or historical name; what does not
match goes to DATA.md's review queue and is never created by guess.

## Open

- **Asking-price currency** — default `USD` (the old site's prices); the owner confirms. *Owner.*
- **Public store list** — default: active stores are listed on `/stores` (ARCHITECTURE.md §5) with their area and
  hours, as EXPERIENCE-SHOP.md describes; the tracking page names the sending store. *Owner.*
- **Photos on the sell form** — default none (WhatsApp/email carry them); revisit if leads arrive without
  photos. *Owner.*
- **Lead retention** — default 24 months after `closed`, then purged (COMPLIANCE.md §1). *Owner, counsel.*
