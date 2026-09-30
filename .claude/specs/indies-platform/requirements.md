# Requirements Document

## Introduction

The Indies Platform is one engine and one CMS serving two sister companies with
separate databases, sellers, payment gateways and looks:

- **Indies Gallery** sells original antique maps, prints, photographs and books
  of the Indonesian archipelago and Southeast Asia (one-of-one items, USD
  150–50,000+), migrating from its existing store at `antiquemapsindonesia.com`.
- **Old East Indies** sells merchandise reproduced from that archive (prints,
  posters, stationery, homeware, gifts; IDR 50k–5m) from its Denpasar showroom,
  with no store today.

The requirements below are the contract every task in the root `TASKS.md` traces to.
Background, reasoning and sources live in `docs/` (ARCHITECTURE, BRANDS,
CONTENT-MODEL, COMMERCE, PAYMENTS, COMPLIANCE, EXPERIENCE-GALLERY,
EXPERIENCE-SHOP, DESIGN-SYSTEM, MIGRATION, ANALYTICS, DEPLOYMENT, RESEARCH).
"The system" means the engine plus both storefront apps unless a requirement
names one.

## Requirements

### Requirement 1 — One engine, two brands

**User Story:** As the owner of two sister companies, I want both storefronts on
one engine with separate databases, so that every improvement reaches both
while their data and identities stay apart.

#### Acceptance Criteria

1. WHEN a brand process starts THEN the system SHALL load the brand named by `BRAND` and connect only to that brand's database.
2. The system SHALL provide two storefront apps, `gallery` and `emporium`, that share every engine package and differ only in UI and route tree.
3. IF any source file under `engine/` — code, styles or JSON that a build compiles, bundles or serves; Markdown documentation such as an app's `PRODUCT.md` may name the brand it serves (D44) — contains a brand slug, brand name or brand domain as a literal THEN CI SHALL fail.
4. WHEN CI runs THEN the system SHALL build the synthetic `test` brand on both storefront apps and run the full e2e suite against it.
5. WHEN migrations run THEN the system SHALL apply one migration set to every brand database AND CI SHALL fail if the schema hashes differ.
6. IF a storefront app does not mount every handler listed in the HTTP manifest THEN CI SHALL fail.
7. The system SHALL provision a new brand with one command plus configuration and no application code.
8. The Payload configuration SHALL be identical whichever brand is loaded (the superset of locales, collections, fields and options), AND CI SHALL fail if the configuration generated with `BRAND` unset differs from any brand's.

### Requirement 2 — Brand configuration and modules

**User Story:** As a developer maintaining both brands, I want every difference between them expressed as validated configuration, so that no difference hides in code.

#### Acceptance Criteria

1. IF any committed `brand.config.json` is invalid THEN CI's brand validation SHALL fail with a readable error; AND IF a deployed brand's configuration or environment is invalid when its process boots THEN the boot check SHALL refuse to start and the health check SHALL fail with the reason. (The build itself is brand-independent and validates no brand.)
2. IF a brand enables a module its storefront app does not declare in `supports` THEN validation SHALL reject the configuration.
3. WHEN an editor changes a CMS global (navigation, footer, contact, homepage bands, announcement bar) THEN the site SHALL reflect it without a deploy.
4. IF a CMS global is missing or unreadable THEN the system SHALL fall back to the configuration file value AND log the reason.
5. WHEN a module is disabled THEN its admin collections SHALL be hidden AND its routes SHALL return 404 WHILE the database schema remains identical.
6. IF a brand's token overrides fail WCAG AA contrast THEN the system SHALL reject the whole override AND render the app's default tokens.
7. The system SHALL support one or more sellers of record per brand, each with a legal entity, served stock locations and destinations, a tax regime, charge currencies and payment providers.

### Requirement 3 — CMS and content model

**User Story:** As a cataloguer and editor, I want a CMS that models the objects, their makers, places and sources precisely, so that every page is built from accurate, reusable records.

#### Acceptance Criteria

1. The system SHALL model works separately from products, with originals referencing a work and reproductions or merchandise referencing a design of a work.
2. WHEN a work is saved THEN the system SHALL validate dates with their precision, positive dimensions, and image size within sheet size.
3. WHEN a work or product is published THEN the system SHALL enforce the publish guards in CONTENT-MODEL.md §9 AND state every missing requirement in plain language.
4. The system SHALL localise user-facing fields in `en` and `id` (and be ready for `nl`), each with a translation status.
5. The system SHALL provide makers, places (a gazetteer with historical names and hierarchy), sources, curations, stories, pages, exhibitions and globals.
6. The system SHALL provide the staff roles admin, manager, cataloguer, editor, fulfilment, analyst and contributor, default new staff to contributor, AND guard publishing in a hook.
7. IF a work is a provenance copy from a sister brand THEN its synced fields SHALL be read-only.
8. The system SHALL restrict physical and acquisition data (location, export status, cost, consignor) to authorised roles AND never sync it to a sister brand.
9. The system SHALL keep drafts and versions for works, products, designs, stories, pages and curations, previewable by staff at their real URL.
10. IF a reproduction product is published AND its work's rights do not allow printing THEN publishing SHALL be refused.
11. Public reads — storefront loaders and the sister archive API — SHALL respect access control, return only published documents, AND select only the fields their view model or snapshot needs, so that no draft and no private field reaches a public response.

### Requirement 4 — Media and deep zoom

**User Story:** As a collector, I want to examine every millimetre of a sheet, recto and verso, so that I can judge condition and authenticity without handling it.

#### Acceptance Criteria

1. WHEN an image is uploaded THEN the system SHALL generate AVIF and WebP derivatives at 320, 640, 1024, 1600 and 2400 px and a blur placeholder.
2. WHEN a work image is uploaded THEN a background job SHALL generate static IIIF Level 0 tiles and update the work's IIIF manifest.
3. The system SHALL store master scans in a private bucket AND serve them only through short-lived presigned URLs to authorised staff and fulfilment providers.
4. The system SHALL compute a design's print-size ceiling from the pixels of its crop of the master — for a whole-sheet design, the object's own pixels, never the master file's long edge, which also holds the background, the colour card and the ruler — at the product type's minimum ppi, AND refuse variants that exceed it.
5. WHEN a visitor shows intent on an item image THEN the viewer SHALL load AND deep-zoom recto, verso and details with keyboard and touch controls.
6. The primary item image SHALL be a crawlable `<img>` with alt text and SHALL be the page's LCP element.
7. IF the visitor prefers reduced motion THEN zoom transitions SHALL be cuts.

### Requirement 5 — Search and discovery

**User Story:** As a buyer who knows a place by its old or new name, I want to find every relevant object, so that "Celebes" and "Sulawesi" lead to the same maps.

#### Acceptance Criteria

1. WHEN a visitor searches THEN results SHALL include matches on historical and modern place names through the gazetteer AND fuzzy matches on maker names.
2. WHEN facets are applied THEN the count for each facet option SHALL be computed with every other facet's filters applied and its own excluded.
3. The system SHALL provide the facet sets in EXPERIENCE-GALLERY.md §4 and EXPERIENCE-SHOP.md §2 per enabled modules.
4. The system SHALL expose named facet URLs for key combinations AND canonicalise other parameter combinations.
5. The search page SHALL work with JavaScript disabled.
6. WHEN a search returns no results THEN the system SHALL offer a want-list alert AND record the query for the demand dashboard.
7. The gallery SHALL default browse to available items with a visible sold toggle.

### Requirement 6 — Indies Gallery storefront

**User Story:** As a collector, institution or designer, I want an item page and flows worthy of a museum-grade object, so that I can trust, compare and buy with confidence.

#### Acceptance Criteria

1. The item page SHALL show the hook title, the original title, the maker line with certainty, the collation block, the condition grade linked to the published scale, references, provenance and the stock number.
2. The purchase panel SHALL show only the modes allowed by the item's price tier, status and the brand's modules (buy, reserve, offer, request price, enquire, book a viewing, proforma).
3. WHEN an item is sold THEN its page SHALL remain published AND show no price AND show available examples of the same edition AND offer an alert.
4. WHILE an item is reserved THEN its page SHALL show "On hold until {date}".
5. The gallery SHALL provide maker, place, source, curation, catalogue and story pages.
6. The gallery SHALL provide trust pages for guarantee and returns, authentication, condition grades, the certificate, shipping and insurance, framing and conservation, institutions, visiting, and FAQ.
7. WHEN a visitor chooses WhatsApp on an item THEN the message SHALL be prefilled with the stock number and title.
8. WHEN reproductions of a work exist in the sister shop THEN the item page SHALL link to those exact products.
9. The gallery SHALL provide consignment submissions with photo upload and viewing appointments.
10. Existing legacy product URLs SHALL resolve unchanged.
11. The purchase panel SHALL render a designed state for every combination of price tier, item status, the viewer's relation to the item (held for me, in my checkout, my offer pending), export status and ship-to destination, AND SHALL NOT render a purchase control before availability is known.
12. WHEN the gallery launches THEN its 200 most important items SHALL have at least a recto, a verso and one detail image shot to the capture standards.

### Requirement 7 — Old East Indies storefront

**User Story:** As a tourist, expat or gift buyer, I want to find, configure and gift a beautiful piece of the archive in minutes on my phone, so that I leave with something meaningful.

#### Acceptance Criteria

1. Every reproduction and merchandise product SHALL display the Reproduction label and its Archive No.
2. The configurator SHALL offer format, size, paper, frame, mount and glazing within the product type's constraints, disable impossible combinations with a stated reason, update the price live, and preview flat, on a wall and to scale.
3. The configuration SHALL be encoded in the URL so it can be shared and restored.
4. The shop SHALL provide collections, places and eras, gifts by price, recipient and occasion, filters and sorting per EXPERIENCE-SHOP.md §2.
5. The product page SHALL show a delivery promise for the current ship-to destination.
6. The product page SHALL show the original's status at the gallery (available with price, enquire, or sold).
7. The shop SHALL provide design pages listing every product made from one design.
8. The shop SHALL provide an `/ig` page, a showroom page with "In the showroom now" stock, a Partnership page — the one programme every business buyer applies through, with no separate "For Business" path (D36) — and gift cards.
9. The bag SHALL show a free-shipping progress bar, relevant upsells and a voucher field.
10. The shop SHALL let a guest look up and track an order by order number plus email or WhatsApp number, AND SHALL give pickup orders a pickup code with hours and location.
11. WHILE a payment awaits a virtual-account or QRIS transfer THEN the order page SHALL show the exact amount, the VA number with a copy action, per-bank steps, an expiry countdown and the bank-cap warning, offer save-to-gallery and e-wallet deep links for QR, AND switch to paid automatically.
12. WHEN the shop launches THEN every launch product SHALL have flat, in-room and detail images, with any synthetic mockup labelled as such.

### Requirement 8 — Commerce core: sellers, money, pricing, tax

**User Story:** As the owner, I want every price, currency and tax to be computed correctly and lawfully on the server, so that no order is ever wrong or illegal.

#### Acceptance Criteria

1. WHEN a checkout starts THEN the system SHALL route it to exactly one seller of record from the lines' stock locations and the destination.
2. IF a unique item is held in Indonesia AND is not export-cleared AND the destination is outside Indonesia THEN the system SHALL block that line with an explanation.
3. WHEN the destination is Indonesia THEN prices SHALL be displayed and charged in IDR only, with no foreign-currency amount beside them.
4. The system SHALL price every line on the server from market price lists (explicit, product-type table × artwork multiplier, or derived by FX + buffer + rounding).
5. The system SHALL store every pricing-pipeline figure and the FX snapshot on the order so its total can be reproduced exactly.
6. The system SHALL compute tax per seller regime (ID-PPN, SG-GST, none) with zero-rated exports.
7. The system SHALL support discount codes with atomically enforced usage limits, gift cards with a ledger, bundles and gift-wrap lines.
8. IF a request carries prices, totals, discounts or shipping amounts THEN the system SHALL ignore them.
9. The display and charge currency SHALL be decided only by the ship-to destination and the serving seller, AND the system SHALL NOT offer a free currency switch.
10. The system SHALL number each seller's documents gaplessly per series AND export each seller's sales and tax figures per document for its accountant.

### Requirement 9 — The one-of-one guarantee and reservations

**User Story:** As the gallery, I want a unique object to be sellable exactly once across every channel, so that no two buyers ever pay for the same map.

#### Acceptance Criteria

1. The system SHALL create, release and convert reservations only through the `reserve()` service.
2. WHEN two checkouts try to reserve the same unique item concurrently THEN exactly one SHALL succeed AND the other SHALL receive a typed conflict shown as a clear message.
3. WHEN a buyer continues to payment THEN the system SHALL take a checkout lock for the configured TTL AND show the remaining time.
4. WHEN a reservation's expiry passes THEN the item SHALL be treated as available even if the sweeper has not yet run.
5. The system SHALL support staff holds, offer holds and invoice holds with their TTLs AND show them publicly as "On hold".
6. WHEN an offer is submitted below the item's private floor THEN the system SHALL decline it automatically with a courteous message.
7. WHEN an offer is accepted THEN the system SHALL create an offer hold AND a payment link that expires before the hold.
8. IF a payment arrives after its reservation expired AND the item was sold elsewhere THEN the system SHALL refund it automatically AND notify the buyer.
9. IF a unique item has been sold (its reservation converted) THEN the database SHALL refuse any further reservation of it, whatever path the request takes.

### Requirement 10 — Checkout and orders

**User Story:** As a buyer in Indonesia or abroad, I want a checkout that fits how I pay and receive goods, so that I can finish without friction or surprises.

#### Acceptance Criteria

1. The system SHALL compute checkout steps from the seller, the destination and the lines.
2. WHEN the destination is Indonesia THEN checkout SHALL ask for a WhatsApp number first AND take the address down to sub-district with courier area resolution.
3. The system SHALL offer pickup at locations that hold the items.
4. Order, payment, reservation and offer statuses SHALL change only through their state-machine tables AND each change SHALL write a domain event to the outbox in the same transaction; an item's availability SHALL be derived from them, never edited directly.
5. The system SHALL generate order documents (confirmation, proforma, receipt and tax data, certificate of authenticity for originals, commercial invoice, packing slip) in English and Indonesian.
6. The system SHALL support return requests per order line and refunds through the gateway or as a tracked manual refund.
7. Marketing consent SHALL be a separate, unticked checkbox.
8. WHEN the destination is Indonesia THEN checkout SHALL use a single full-name field, normalise phone numbers to `+62`, and offer searchable address pickers with an optional map pin and the postcode filled from the sub-district.

### Requirement 11 — Payments

**User Story:** As the finance manager of each seller, I want payments taken through the right gateway with no double charge and no lost payment, so that the books always reconcile.

#### Acceptance Criteria

1. Every payment adapter SHALL implement the `PaymentGateway` contract AND pass the shared contract suite.
2. WHEN checkout reaches payment THEN the system SHALL offer only the methods the seller's providers support for the currency, destination and amount, with per-method caps held as dated data.
3. WHEN a payment webhook arrives THEN the system SHALL verify its signature on the raw body, AND record its provider event id, apply it to the payment, reservation and order, and write its domain events in **one** database transaction; IF that transaction fails THEN the dedupe record SHALL roll back with it AND the handler SHALL answer 5xx so the provider retries.
4. The system SHALL reconcile pending payment attempts at least every 10 minutes through the provider's status API.
5. The system SHALL issue payment links for accepted offers, staff holds, institutional invoices and WhatsApp sales.
6. WHEN a buyer chooses a payment method for a unique item THEN the system SHALL extend the checkout lock to cover that method's session lifetime plus a margin, AND SHALL capture or settle only while the reservation is live; no payment SHALL complete against an expired reservation except through the late-payment path (9.8).
7. The system SHALL support manual, bank transfer, Midtrans, Stripe and PayPal providers per seller, and Xendit or DOKU if chosen.
8. IF sandbox credentials are configured in production, or live credentials outside it, THEN boot SHALL fail.

### Requirement 12 — Shipping and fulfilment

**User Story:** As a buyer, I want accurate delivery options, costs and duties for my destination, so that fragile paper and gifts arrive safely without surprise charges.

#### Acceptance Criteria

1. The system SHALL support shipping profiles and rate sources (flat tables, carrier APIs, quotes, pickup) per seller and destination.
2. IF an original's value exceeds the seller's insured threshold THEN shipping SHALL require a quote that includes fine-art transit insurance.
3. The system SHALL show a duties estimate for the destination before payment.
4. The system SHALL route each merchandise line to own stock, then local made-to-order for Indonesian destinations, then — only while `fulfilment.pod` is enabled (not at launch, D23) — print-on-demand near the buyer for export, otherwise not offer it.
5. IF the destination is Indonesia THEN the system SHALL NOT route a line to overseas print-on-demand.
6. International shipments SHALL get a generated commercial invoice with HS codes.
7. Shipments SHALL carry tracking that drives buyer notifications.

### Requirement 13 — Accounts, retention and notifications

**User Story:** As a returning collector or shopper, I want my orders, saved items and alerts in one place, so that the brand remembers what I care about.

#### Acceptance Criteria

1. Customers SHALL be a separate authentication collection from staff users.
2. Gallery customers SHALL manage orders with their documents, wishlist, want-lists, addresses, profile and consents, AND request data export or deletion. Old East Indies SHALL offer shoppers guest checkout only, with accounts for approved retailers alone — applied for from a Partnership page, approved by staff, holding orders, quotes, documents and the trade terms (D31, 2026-09-28).
3. WHEN a newly published item matches a want-list THEN the system SHALL notify its owner within 15 minutes or in a daily digest, per their choice.
4. Newsletter sign-ups SHALL use double opt-in AND the gallery's digest SHALL be generated from inventory published since the previous issue.
5. The system SHALL send transactional email and WhatsApp deep links for every order, offer, hold and enquiry event.
6. Abandoned-bag emails SHALL be sent only to buyers who consented.
7. The shop SHALL support reviews by verified buyers with moderation, back-in-stock alerts and a welcome offer.

### Requirement 14 — Admin tooling

**User Story:** As a cataloguer and shop manager, I want purpose-built screens for my daily work, so that 9,500 originals get catalogued and the archive becomes merchandise without developer help.

#### Acceptance Criteria

1. The admin SHALL provide a desk with queues for offers, expiring holds, enquiries, price requests, consignments, orders to fulfil, low stock and drafts to verify.
2. The cataloguing screen SHALL support save-and-add-another with retained context, fuzzy date and dimension parsing, inline creation of makers and places, duplicate warnings, autosave and side-by-side locales.
3. Bulk upload SHALL match images to works by stock number in the filename AND let staff tag image roles and captions inline.
4. IF `ai.cataloguing` is enabled THEN every AI-suggested field SHALL stay flagged until a human verifies it AND an item with unverified AI fields SHALL NOT publish.
5. The merch wizard SHALL create a design and its products with variants from a work within the print ceiling, priced from product-type tables, with generated mockups.
6. Staff SHALL fulfil, refund, process returns and generate documents from the order screen.
7. Staff SHALL accept, counter or decline offers, grant or release holds, and answer price requests from one inbox.
8. The admin SHALL wear the brand's tokens AND every custom view SHALL render inside Payload's navigation.

### Requirement 15 — Sister brands

**User Story:** As a buyer on either site, I want to move between an original and its reproductions, so that I can own the piece that suits me.

#### Acceptance Criteria

1. The gallery SHALL expose a signed, read-only archive API AND emit `work.published`, `work.updated` and `work.availability` webhooks.
2. The shop SHALL maintain provenance copies of the works it uses, updated from the origin, with synced fields read-only.
3. The shop SHALL show the original's availability from its copy AND the gallery SHALL link to the products made from each of its works.
4. Customer accounts, carts, newsletters and consents SHALL NOT be shared between brands.
5. No request path SHALL join across brand databases.

### Requirement 16 — Migration and legacy URLs

**User Story:** As the gallery's owner, I want the existing catalogue, customers and search rankings carried across intact, so that the new site starts with everything the old one earned.

#### Acceptance Criteria

1. The importer SHALL load legacy items idempotently by legacy id as drafts, preserving stock numbers AND using legacy ids as public ids.
2. Normalisers SHALL parse dates, dimensions, condition, prices and references, AND send low-confidence values to a review queue with the raw value beside the proposal.
3. Legacy categories SHALL map to facet selections through a curator-reviewed mapping file.
4. Customers SHALL import with a random, unusable password and a claim flow (no legacy hash is imported), AND subscribers SHALL import with their recorded consent.
5. Every legacy URL gathered from the owner's export and the URL inventory SHALL resolve on the new site with 200 or a single 301 to a 200, verified by count before cutover.
6. Old East Indies' legacy Squarespace URLs SHALL redirect by map to their new products or collections, AND the new gallery item pages SHALL link to the exact products made from each work (the old "Buy Reproduction" links, which all point at one home page, redirect like any other URL).
7. The importer SHALL support a delta import by `updated_at` for cutover.
8. IF an original has no stock location or export status from the owner's item register THEN it SHALL publish enquiry-only AND SHALL NOT be sellable online until both are set.

### Requirement 17 — SEO, analytics and feeds

**User Story:** As the owner, I want both sites to be found and their funnels measured, so that I know what sells and what buyers want that we lack.

#### Acceptance Criteria

1. Every page SHALL have a templated title, a canonical URL, reciprocal `hreflang` and an Open Graph image.
2. Items SHALL carry JSON-LD (`Product` + `VisualArtwork` in the gallery; `Product` + `Offer` in the shop) with honest availability (`InStock`, `Reserved`, `SoldOut`) AND no price for price-on-request items.
3. Sitemaps per locale SHALL include sold items and images.
4. The system SHALL produce a Google Merchant feed for both brands and a Meta catalogue feed for the shop.
5. The system SHALL record first-party events per the taxonomy, cookieless until consent.
6. GA4 and Meta tags SHALL load only after marketing consent.
7. Each brand's admin SHALL show funnels, leads, unmet demand, payments and Web Vitals dashboards.

### Requirement 18 — Localisation, currency and legal compliance

**User Story:** As a buyer and as the business, I want the sites to speak my language and obey the law where I buy, so that transactions are clear and lawful.

#### Acceptance Criteria

1. The default locale SHALL be served unprefixed AND other locales prefixed, AND the root SHALL never be negotiated from `Accept-Language`.
2. Money, dates with their precision, and dimensions in millimetres and inches SHALL be formatted per locale.
3. The serving seller's legal identity SHALL appear in the footer and on every order document.
4. Legal pages SHALL exist in Indonesian and English.
5. Consent records SHALL store purpose, timestamp and policy version.
6. The system SHALL provide a record-of-processing export and data-subject export and deletion.
7. Payment methods SHALL respect the per-transaction legal caps of each channel.
8. Every user-facing string SHALL come from the brand's EN/ID lexicon AND the Indonesian copy SHALL be reviewed by a native writer before launch.

### Requirement 19 — Performance, accessibility, security and operations

**User Story:** As any visitor and as the team running the platform, I want fast, accessible, secure and recoverable sites, so that they work for everyone and survive incidents.

#### Acceptance Criteria

1. Pages SHALL meet the budgets in DESIGN-SYSTEM.md §7 on a mid-range Android over 4G, enforced in CI.
2. The system SHALL meet WCAG 2.2 AA, including checkout with a screen reader and at 200% zoom.
3. No source file SHALL exceed 300 lines.
4. The build SHALL NOT require a database AND nothing SHALL prerender from the CMS at build time.
5. The app SHALL send tested security headers and CSP AND rate-limit authentication, forms, offers and checkout.
6. Card data SHALL never touch the platform's servers (PCI SAQ-A).
7. Deployments SHALL be pull-based with health-checked rollback, AND migrations SHALL be additive first.
8. Each brand database SHALL be backed up nightly off-box AND restore-drilled quarterly.
9. The health endpoint SHALL report app, database, storage, job-queue lag and provider reachability.
10. WHEN a UI phase closes THEN a design gate — impeccable critique and audit against the approved comp at 360, 390, 768 and 1440 px in English and Indonesian — SHALL report zero P0/P1 findings AND the owner SHALL sign off the screenshot set; directions and storefronts SHALL be tested with real buyers before their phases close.
11. The storefronts SHALL work in the Instagram, WhatsApp and TikTok in-app browsers AND a payment step that cannot complete there SHALL offer to open the page in the device's browser.
12. WHEN an item's availability or price changes THEN every cached page and fragment showing it SHALL be expired immediately, so that no cache ever serves a sold or held item as available.
