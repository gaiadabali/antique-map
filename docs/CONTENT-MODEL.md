# Content model

Every collection below is a Payload 3 collection in **each** brand's database,
with **one schema for both** (BRANDS.md §6): a module that is off hides its
collections in the admin and its routes on the site, but never removes a table.
User-facing text fields are **localised** (`en` default, `id`; `nl`-ready) and
carry `translationStatus` (`entered` · `machine` · `reviewed`) — machine
translation is allowed, and shown to editors as such until reviewed (KOI).

This file is also the **glossary**: *work*, *product*, *variant*, *design*,
*hold* and *checkout lock* mean exactly what is written here, everywhere.

**Drafts are Payload's `_status`, and only that.** A document is a draft or
published through Payload's versions; no collection carries a second "draft"
value in its own status field. Every public read — loaders and the sister API —
filters `_status: 'published'`, passes `overrideAccess: false` and selects only
the fields its view model needs (ARCHITECTURE.md §12).

### The frozen slug list

Collections relate to each other across tasks that run in parallel, so every
slug exists from the Foundation stage as a **stub** in a registry the SCH lead owns (TASKS.md
3.2.e); tasks fill in fields, never invent slugs. Slugs are kebab-case:

`users` · `customers` · `addresses` · `saved-items` · `want-lists` ·
`subscribers` · `reviews` · `makers` · `places` · `terms` · `sources` ·
`curations` · `works` · `designs` · `products` · `product-types` · `variants` ·
`locations` · `stock-levels` · `media` · `masters` · `stories` · `pages` ·
`exhibitions` · `redirects` · `carts` · `reservations` · `orders` ·
`payment-attempts` · `refunds` · `shipments` · `returns` · `offers` ·
`enquiries` · `consignments` · `appointments` · `invoices` · `discounts` ·
`gift-cards` — and the globals `brand-settings` · `navigation` · `homepage` ·
`commerce-settings` · `consent` · `seo-defaults`.

---

## 1. The spine: works and products

**A work is the object. A product is how it is sold.** The 1726 Valentijn map of
Bali is a work; the original on offer at the gallery is one product; the giclée
print and the tote bag made from it at the merch shop are others.

```
                 ┌──────── Indies Gallery DB ────────┐      ┌──── Old East Indies DB ────┐
makers ─┐        │                                   │      │                            │
places ─┼─→   works ───1:1──→ products (original)    │ sync │ works (provenance copy)    │
sources ┘        │   └─ sameEdition → other copies   │ ───→ │   └─→ designs ─→ products  │
                 │                                   │      │         (crops)   └ variants
                 └───────────────────────────────────┘      └────────────────────────────┘
```

### Works

| Field | Type | Notes |
| ----- | ---- | ----- |
| `workUid` | text, unique, immutable | e.g. `<prefix>-000123`, the prefix from brand config — the stable id sister sync and redirects key on |
| `stockNumber` | text | the gallery's `M.1044` / `P.2098` / `F.…` numbers, preserved from the old site |
| `title` | localised text | the **hook title** buyers read: "Bali by François Valentijn, 1726 — the first large-scale map of the island" |
| `originalTitle` | text | diplomatic transcription: *Kaart van het Eyland Bali* |
| `objectType` | select | `map` · `sea-chart` · `city-plan` · `view` · `print` · `photograph` · `book` · `atlas` · `poster` · `document` · `ethnographic` · `other` — drives HS code and behaviour |
| `makers` | array `{ maker → makers, role, certainty }` | role: cartographer · engraver · publisher · author · artist · photographer · studio · printer; certainty: `certain` · `attributed` · `after` · `workshop` |
| `date` | group `{ from, to, precision, display }` | precision: `exact` · `circa` · `before` · `after` · `range` · `unknown` — **never implied certain** |
| `firstEdition`, `dateOnPlate` | dates, same shape | collation (Sanderus model) |
| `publication` | group `{ place, publisher, sourceWork, edition, state, textLanguage, verso }` | "From: *Oud en Nieuw Oost-Indiën*, 1724–26" · "Verso: blank" |
| `book` | group (books and atlases) `{ binding, pagination, plates, completeness, openings[] }` | a volume's collation; `openings` are image refs of spreads |
| `technique` | select (controlled) | woodcut · copperplate engraving · etching · steel engraving · lithograph · chromolithograph · aquatint · albumen print · gelatin silver print · collotype · photogravure · manuscript… |
| `colour` | select | `publisher's` · `original-hand` · `old-hand` · `later` · `printed` · `uncoloured` |
| `dimensions` | group `{ image{h,w}, sheet{h,w}, framed{h,w,d} }` in mm | inches are **derived**, never typed |
| `places` | array `{ place → places, role }` | one `primary` + capped secondaries; role: `depicts` · `published-at` · `photographed-at` |
| `subjects` | relationship → terms (subject) | Wayang, Batik, Temples, Spices, VOC, Costume… |
| `description` | blocks (C4) | the essay |
| `references` | array `{ source → sources, ref, note }` | "Tooley (Australia) 1268", Koeman, **Parry** numbers |
| `provenance` | array `{ holder, period, note }` | |
| `condition` | group `{ grade → terms (grade), notes, defects[], restoration }` | the grade is a **vocabulary term**, not a select — each brand's published scale (IG: VG+ · VG · G+ · G · Fair · As-is, each with a definition and an A–D equivalent) lives in data, so two scales never become one shared enum |
| `images` | array `{ media → media, role, caption }` | role: `primary` · `recto` · `verso` · `detail` · `raking` · `transmitted` · `framed` · `in-room` · `scale` |
| `master` | relationship → masters | private scan record; drives the print-size ceiling |
| `physical` | group (IG only, **never synced**) | `location` (→ locations), `exportStatus` (`cleared` · `domestic-only` · `permit-pending` · `not-applicable`), `acquisition` (source, cost, consignor, date — private), `coaIssued`. **No defaults**: a blank location or export status makes the item routable to no destination — it publishes as enquiry-only (COMMERCE.md §2). `not-applicable` (held outside Indonesia) must be set explicitly, from the owner's item register. |
| `rights` | group `{ status, holder, licenceRef, territories, expires, printAllowed }` | a reproduction cannot publish if `printAllowed` is false (COMPLIANCE.md §8) |
| `sameEdition` | relationship → works (hasMany) | "another example of this map" for sold-archive alternatives |
| `origin` | group `{ brand, workUid, syncedAt }` | set on provenance copies; synced fields are read-only there (BRANDS.md §5) |
| `cataloguing` | group `{ status, cataloguer, verifiedAt, aiDraft }` | `draft` · `catalogued` · `verified`; AI-drafted fields stay flagged until a human verifies them |
| `legacy` | group `{ id, sku, url, categories[] }` | from the migration; `legacy.id` is the public product id (MIGRATION.md §6) |
| `seo` | group | title / description / image overrides |

### Products

| Field | Type | Notes |
| ----- | ---- | ----- |
| `publicId` | integer, unique | the id in `/product/{id}-{slug}`; legacy ids preserved |
| `slug` | localised text | derived once from the title, **never re-derived on edit** (NOW! S1 lesson) |
| `title` | localised text | defaults from the work or design |
| `kind` | select | `original` · `edition` · `reproduction` · `merchandise` · `book` · `service` · `gift-card` |
| `inventoryModel` | select | `unique` · `edition` · `stocked` · `made-to-order` · `pod` · `service` (COMMERCE.md §4) |
| `work` | → works | required for `original`; `design` required for `reproduction`/`merchandise` |
| `design` | → designs | |
| `productType` | → product-types | reproductions and merchandise |
| `status` | select | `available` · `not-for-sale` · `archived` — drafts are Payload's `_status`; *on hold* and *sold* for unique items are **derived** by the availability machine from reservations (COMMERCE.md §6), never typed |
| `pricing` | group `{ mode, base (Money), marketPrices[], multiplier, offerFloorPct }` | mode: `fixed` · `on-request` · `offer-only`; `offerFloorPct` private |
| `purchaseModes` | derived | from tier + status + modules (COMMERCE.md §7) |
| `shippingProfile` | select | COMMERCE.md §8 |
| `taxClass` | select | `standard` · `zero` · `exempt` |
| `hsCode` | text (derived, overridable) | from object type and age, or the product type |
| `badges` | multi-select | `hero` · `printed-in-bali` · `limited-edition` · `new` (derived from `publishedAt`) |
| `channels` | multi-select | `web` · `showroom` · `marketplace` — originals can never be `marketplace` |
| `variants` | join ← variants | |
| `seo` | group | |

## 2. Merchandise: designs, product types, variants, stock

### Designs

A design is **a treatment of a work** made for reproduction: the whole sheet, or
a crop ("Batavia harbour" from a larger plan), cleaned and colour-managed.

`work` (→ works) · `title` · `crop` `{ x, y, w, h, rotation }` · `printFile` (→
masters: a colour-managed file under the `print-files/` prefix) · `aspect` ·
`printCeiling` (derived from the print file's pixels at the product types'
minimum ppi; enforced in phase 15, TASKS.md 15.4) · `story` (short, localised — the
100–150-word PDP story) · `archiveNumber` (shown on every product, the provenance
tag) · `status`.

### Product types

The template that turns a design into sellable variants, so a print is never
sixty hand-made variants.

`name` ("Giclée print", "Poster", "Postcard set", "Tote") · `axes`
(`format` · `size` · `paper` · `frame` · `mount` · `glazing` · `colour` ·
`apparelSize`, each with options) · `priceTable` (option combination × market →
price) · `constraints` (mount only with frame; glass only for pickup or Bali
delivery; size ≤ the design's print ceiling at `minPpi`) · `fulfilment`
(route per destination: own stock / local made-to-order / POD provider + SKU
template) · `shippingProfile` · `hsCode` · `materials` (localised copy) ·
`mockupScenes` (→ media, for the room view).

Generating variants from a design and a product type is an **admin tool**
(PLAN.md, the Admin stage), not a manual process.

### Variants

`product` · `options` (axis → value) · `sku` (`artwork × format × size × frame ×
mount`) · `marketPrices` (explicit, when the table is overridden) · `weight`,
`dimensions` · `barcode` · `fulfilment` `{ model, provider, providerSku }` ·
`active`.

### Stock

- **`locations`** — Denpasar showroom, Bali stockroom, Jakarta gallery, Singapore,
  and a virtual `print-on-demand`: address, hours, `pickup` flag, the seller it
  belongs to.
- **`stock-levels`** — `variant × location`: `onHand`, `reserved` (changed only by
  `reserve()`), `reorderPoint`.
- **`inventory_movements`** (engine table, append-only) — every change with its
  reason: sale, return, count, transfer, damage.

## 3. Discovery vocabulary

| Collection | Holds | Notes |
| ---------- | ----- | ----- |
| **makers** | name, sortName ("BLAEU, Willem Janszoon"), aliases (Valentyn, Valentijn), roles, life dates with precision, nationality, bio (blocks), portrait, `sameAs` (Wikidata, ULAN) | a maker page per maker — raremaps' strongest SEO asset |
| **places** | the **gazetteer**: modern name (localised), `historicalNames[] { name, language, period }` (Batavia, Iava, Celebes, Moluccas…), type, parent, `geo { lat, lng, bbox }`, description | hierarchy two levels deeper than any competitor (Java → Batavia/Jakarta, Buitenzorg/Bogor…); drives search expansion |
| **terms** | editable vocabularies: `subject`, `mood`, `room`, `occasion`, `recipient`, `grade` (each grade with its definition and A–D equivalent) | objectType and technique are controlled selects because behaviour depends on them |
| **sources** | the bibliography: short cite (Tooley, Koeman, Parry, Schilder, Suárez, Tibbetts), full citation, year, url | each reference on a work links to its source page |
| **curations** | `kind`: `collection` · `catalogue` · `exhibition` · `gift-guide` · `wall-set`; title, intro (blocks), hero, members (manual list **or** a saved facet query), dates, `pdf` (catalogues) | "Spice Islands", "Hofker's Bali Hotel", the End-of-Year Catalogue; a price-named curation ("Gifts under $350") stores **a threshold per market**, so an Indonesian-delivery page reads "Hadiah di bawah Rp 5 juta" and never shows dollars |

**Facets** exposed on browse (both brands, per module): object type · place
(hierarchical, historical names searchable) · maker · date range / century /
"VOC era 1602–1799" · technique · colour · condition grade · size (cm and
inches) · price in the **market's** currency (incl. "price on request") ·
availability computed at query time (available · on hold ·
sold · new in 30/60/90 days) · subject · and, for merchandise, format · size ·
orientation · dominant colour · room · mood · occasion · recipient ·
"in the showroom now" · "ships today" · made to order.

## 4. Transactions

| Collection | Holds | Notes |
| ---------- | ----- | ----- |
| **carts** | owner (customer or hashed guest token), market, destination, lines `{ product, variant, qty, configuration }`, codes, gift options, `expiresAt` | never reserves |
| **reservations** | `targetKey` (scalar, e.g. `product:123`, written only by `reserve()`), target (product / edition unit / variant+location), qty, kind, owner refs (cart, order, customer, hold request + who granted it, offer, invoice), `expiresAt`, status (`active` · `converted` · `released` · `expired` · `reversed`), createdBy | the partial unique index on `target_key` for `active` + `converted` exclusive targets (ARCHITECTURE.md §6), declared through the adapter's schema hook; holds are visible and grantable in the admin |
| **orders** | `number` (gapless per seller, prefix from the seller's config), channel (`web` · `showroom` · `manual` · `marketplace` · `legacy`), seller snapshot, customer + contact snapshot, market, `fx`, lines (snapshots), totals (every pipeline step), tax lines, addresses, shipping choice, status, notes, documents, `legacyOrderId` | written only by the domain — never by a public caller |
| **payment-attempts** | order, seller, `attemptRef` (our own reference, committed before the provider hears of it), provider, method, charge + display Money, fx, `providerRef` (write-once: null until the provider names it), the stored `SessionResult` (replayed on retry), status, `expiresAt`, `expectedBy` (past it, the reconciler asks) | order, seller, provider and `attemptRef` are immutable once inserted, enforced by a trigger — applying a payment event reads them without a lock |
| **refunds** | attempt, amount, reason, status, `refundRef` (the provider's own id, or `retrieve:<cumulative>` for one learnt from `retrieve()`), `idempotencyKey` (`late:` · `dup:` · `staff:`, for a refund the domain owes), `manual` flag + bank details task | unique `(attempt, refundRef)`; unique `idempotencyKey` |
| **shipments** | order, lines, carrier/service, tracking, label, insured + declared value, HS codes, POD job ref, events | |
| **returns** | order line, reason, photos, status, inspection, restock location | |
| **offers** | product, contact / customer, amount (Money), message, history of counters, status, `expiresAt`, resulting reservation + payment link | |
| **enquiries** | `topic`: `general` · `price-request` · `condition` · `shipping-quote` · `framing` · `export` (C6 `EnquiryTopic`) — no trade topic: every business buyer applies as a partner (D36); product, contact, message, attachments, status, assignee | **stored, not merely forwarded** (KOI) |
| **consignments** | "sell to us": contact, description, photos (item, titles, verso), condition notes, status (`received` · `reviewing` · `offer-made` · `accepted` · `declined`) | |
| **appointments** | location, slot, contact, purpose (viewing — with a pull list from the wishlist), status | |
| **invoices** | proforma / final, number per seller, customer (institution), PO number, lines, currency, bank details **on the document only**, due date, status, PDF | wire details are never on a public page (fraud) |
| **discounts** · **gift-cards** | COMMERCE.md §10 | gift-card ledger is append-only |

Engine tables (schema `engine`, created by the same migrations — written by the
SCH lead only — never edited by hand): `payment_events` (unique `provider,
seller_id, provider_event_id` — secrets, and so webhook routes, are per
seller, C13 `/api/x/webhooks/payments/[provider]/[seller]`), a matched event's
outcome (`ApplyPaymentEventOutcome`) and a hash of its redacted payload;
`payment_events_unmatched` (an event for no attempt this seller knows, kept
apart so it never consumes a dedupe key: the normalised event itself, so it
can be re-driven once its attempt turns up, first/last seen, a count);
**`domain_events`** (the outbox, COMMERCE.md §6); `idempotency_keys` (primary key
`operation, key` — the caller kept outside it, so another caller's reuse meets
the row rather than starting afresh — with `caller_ref`, a sha256 of the decoded
request, the stored response with its tokens left out (re-derived on replay) and
`created_at`: the same key from another caller or with another request answers
`invalid`, never the stored response; swept `IDEMPOTENCY_KEY_RETENTION`, 7 days,
after `created_at`, and indexed on `created_at` and on `caller_ref` for the sweep
and an erasure, C6 `IdempotencyKey`); `fx_rates`, `search_documents` (with per-market price columns), a
per-seller `document_sequences`, `inventory_movements`, `analytics_events` (+
rollups), `sister_sync_log`.

## 5. People

- **customers** (auth) — separate from staff, always (KOI): email (unique,
  normalised), name, `type` (`collector` · `institution` · `trade` · `retail`),
  organisation, tax id, phone/WhatsApp, locale, preferred market, price list
  (trade), consents (per purpose, with timestamp and policy version),
  `legacyId`, `claimedAt` (migrated accounts), staff notes; a `ref` and a
  `token_version` for the links that name it (an application's status link,
  C6 `links`), and a pending password link's nonce **hash** and expiry — the
  one link kept at all, single-use, because it sets a credential (C13
  `PASSWORD_LINK`).
- **addresses** — per customer, shaped per country (Indonesia down to
  sub-district + courier area id).
- **saved-items** (wishlist) — customer, product, note; a saved item that sells
  becomes a want-list suggestion.
- **want-lists** — a saved search or "tell me when another example arrives"
  (D39): a customer **or** an email address (never both), status (`pending` ·
  `active`), a `ref` (a random UUID) and a `token_version` — no token and no hash
  of one: every link to it is derived as its email is sent (C6 `links`) — its
  subject (a listing's public path, or
  the product it watches another example of), a budget in its own market
  currency, frequency (`instant` · `daily`), consent (alerts; marketing email,
  separate), `lastNotifiedAt`. Stopping erases the row whole — its address, its
  query and its consent — a `pending` row never confirmed is purged after
  `WANT_LIST_PENDING_DAYS` (7), and at most `WANT_LIST_PENDING_PER_ADDRESS` (10)
  of one address's rows wait at once.
- **subscribers** — newsletter without an account: double opt-in, source,
  status, a `ref` and a `token_version` (its confirm and stop links derived, never
  stored, C6 `links`), legacy flag (KOI).
- **reviews** (emporium) — product, verified order, rating, text, photos,
  moderation status.
- **users** (staff) — roles below.

## 6. Editorial and site

- **stories** — journal: title, slug, excerpt, body (blocks), hero, authors,
  related works / products / makers / places / curations, publishedAt, SEO.
  "Shop the story" rails come from the relations.
- **pages** — about, visit, FAQ, shipping, returns, guarantee, framing guide,
  authentication, privacy, terms: body (blocks), template hint, SEO.
- **exhibitions** — fairs, exhibitions, viewings, pop-ups (the Tong Tong Fair):
  dates, location, description, related curations.
- **media** — public uploads: `alt` (localised, **required**), caption, credit,
  licence, role, focal point, derivatives + blur (derived), IIIF status and tile
  source, `aiGenerated` (shown in the UI when set, KOI). Alt text has a
  **deterministic baseline** built from the record ("Engraved map of Bali by
  François Valentijn, 1726, hand-coloured, recto") — not AI, so it can publish —
  which a cataloguer improves over time; AI-drafted alt stays flagged until
  verified. The CMS guide carries alt-writing guidance for maps and prints
  (region, cartouche, colour, notable features). Without the baseline, the
  migration's 2,090 items could not publish.
- **masters** — a **plain collection, not an upload collection**: storage key,
  pixels, ppi, colour profile, checksum, owning brand, work, access log. Files go
  straight to the private bucket through presigned URLs (a large TIFF exceeds the
  CDN's request limit in front of the admin); provenance copies reference a master
  by storage key without re-uploading it. Never publicly addressable.
- **redirects** — from, to, code, source (`legacy` · `editor`), hits.

**Globals:** `brandSettings` (identity overrides: contact, social, announcement
bar, trust badges, WhatsApp templates and reply hours) · `navigation` (header,
mega menu, footer) · `homepage` (ordered bands) · `commerceSettings` (checkout
copy, bank transfer instructions, hold/offer policy text, **holiday calendar**
that delivery promises read — no prices: the free-shipping threshold is an
automatic discount and gift wrap is a product, COMMERCE.md §10) · `consent`
(banner copy, policy version) · `seoDefaults`.

## 7. Content blocks

The frozen list is DESIGN-SYSTEM.md §5 (C4) — fifteen blocks: `prose` (with note
marks citing sources) · `figure` · `zoomFigure` · `compare` · `shoppableImage` ·
`gallery` · `pullQuote` · `productRail` · `timeline` · `callout` · `faq` · `cta` ·
`embed` · `newsletter` · `divider`. Long-form fields are **runs of these blocks** — a work's
`description`, a maker's `bio`, a story's `body`, a page's `body` — never an open
rich-text field.

## 8. Roles

| Role | Can |
| ---- | --- |
| `admin` | everything, including users, settings, sellers' secrets references |
| `manager` | catalogue, prices, orders, refunds, holds, offers, discounts, customers |
| `cataloguer` | works, makers, places, sources, media, masters; drafts and **verify**; cannot change prices or orders |
| `editor` | stories, pages, curations, globals; publish |
| `fulfilment` | orders (read), shipments, returns, pickups, stock counts; no prices, no refunds above a limit |
| `analyst` | read-only + dashboards |
| `contributor` | create and edit drafts only (default for new accounts — the least that lets someone work, KOI) |

The draft → published transition is guarded in a publish hook, not only by
access control (KOI: Payload access cannot protect that transition on its own).

## 9. Validation — on save vs on publish

**Saving stays cheap** so a cataloguer working through a drawer of prints can type
what they have and come back. **Publishing is when a claim becomes public.**

| Rule | When |
| ---- | ---- |
| date `to` ≥ `from`; plate date ≤ issue date; dimensions positive; image ≤ sheet | every save |
| a unique product has exactly one work and a stock number | every save |
| a reproduction's size ≤ the design's print ceiling | every save (variant generation refuses it) |
| slug unique per locale (validated in a field, not a column — one document, two locales) | every save |
| synced fields on a provenance copy are unchanged | every save |
| work publish: title, object type, date (any precision), primary place **or** maker, a primary image with alt text, condition grade (originals) | publish |
| product publish: pricing mode, a price unless on-request, shipping profile, tax class, and a seller routable for at least one destination — **except** a unique item with no recorded location or export status, which publishes as enquiry-only (COMMERCE.md §2) so its URL and page stay live | publish |
| reproduction publish: the work's `rights.printAllowed` is true | publish |
| AI-drafted fields verified by a human | publish |

Validation modules are pure and unit-tested (`engine/packages/cms/src/validators`);
hooks only fetch what they need. **Guards run on every write path** — the admin,
the REST API, the seed and the migration importer all pass the same gates.

## 10. Seed data

`pnpm seed --brand <slug>` loads **real** shapes, chosen for the cases they force:

- **Indies Gallery**: ~20 works across object types, including a sold item with
  an available `sameEdition` alternative, a price-on-request item, a work with
  an uncertain attribution and a circa date, one held in Jakarta with
  `domestic-only` export status, and a photograph with a verso.
- **Old East Indies**: 3 designs (one Hofker line **flagged rights-pending**), 4
  product types, ~40 generated variants across stocked, made-to-order and POD,
  showroom stock, and a gift card.
- **test** brand: everything on, fictional catalogue, used by CI only.

Everything seeds as a **draft**; nothing is public on a script's authority.
