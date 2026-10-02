# Requirements Document

## Introduction

The Indies Platform is two websites and one CMS for one owner (the client):

- **Indies Gallery** (`antiquemapsindonesia.com`) shows the owner's antique maps, prints and photographs, held in
  Singapore. It is a catalogue with deep zoom and a fast way to contact the owner. It sells nothing online.
- **Old East Indies** (`oldeastindies.com`) is an online store for the owner's merchandise, stocked in 100+ shops in
  Bali. A buyer pays on the site and the nearest shop that has the goods delivers them.
- **One CMS** (Payload) is the admin and the system of record for both: catalogue, stock per store, orders,
  partners, leads and analytics.

Sellers of antiques and partners (hotels and shops that resell the owner's goods) deal with the owner on
WhatsApp or email; the site and its AI chat only help them get there. The requirements below are the contract
every task in the root `TASKS.md` traces to. Reasoning lives in `docs/` (start with `docs/PLAN.md`).
"The system" means the app, both sites and the CMS unless a requirement names one.

## Requirements

### Requirement 1 — One app, two sites, one CMS

**User Story:** As the owner, I want both websites run from one admin and one database, so that I manage all my
stock, orders and contacts in one place.

#### Acceptance Criteria

1. The system SHALL be one Next.js app with Payload embedded and one Postgres database, serving both sites.
2. WHEN a request arrives THEN the system SHALL choose the gallery or the shop site from the hostname, and an unknown hostname SHALL receive a plain 404.
3. The system SHALL serve one admin at `/admin` for both sites, and records that belong to one site SHALL carry a `site` value so each site reads only its own.
4. The build SHALL NOT connect to a database, and every page SHALL render in full per request or from a tagged cache that is invalidated after a change commits.
5. WHEN `pnpm verify` runs THEN it SHALL fail on a lint, type, test, file-size (300 lines), client-safe-import or route-parity error.

### Requirement 2 — The catalogue of antiques

**User Story:** As the owner, I want to record each antique once, with photographs and the facts a collector
needs, so that the gallery presents it well and finds it.

#### Acceptance Criteria

1. The system SHALL hold makers, places (with historical names and a parent), terms and antiques (`works`) with localised English and Indonesian text.
2. An antique SHALL carry a stock number, title, maker(s), place(s), date with precision, dimensions in millimetres, condition grade, description, images with roles, a location (Singapore or Jakarta) and a status of available, on hold or sold.
3. IF an antique lacks a title, object type, date, primary image with alt text or grade THEN publishing it SHALL be refused with a plain reason.
4. The system SHALL hold the original image files privately and serve resized derivatives and deep-zoom tiles publicly.
5. Public reads SHALL be published-only and projected to the fields shown, and an antique's internal asking price SHALL be readable by the owner only.

### Requirement 3 — The gallery site

**User Story:** As a collector, I want to find an antique by what it shows, where it is from or who made it, look at
it closely, and reach the owner at once, so that I can ask about it.

#### Acceptance Criteria

1. The gallery SHALL provide a home page, browse and search with facets (maker, place including historical names, period, type, subject), maker and place pages, an item page, editorial pages and about, guarantee and contact pages.
2. The item page SHALL offer deep zoom on every image, show the details and "Price on request", and SHALL NOT show a price anywhere.
3. WHEN a visitor chooses "Ask about this" THEN the system SHALL open WhatsApp or email with the item's name, stock number and link prefilled.
4. A sold antique SHALL stay visible marked "Sold" and SHALL NOT offer an enquiry as if it were available.
5. The gallery SHALL have no cart, checkout, accounts, offers, holds or invoices.

### Requirement 4 — Selling to the owner, partners and leads

**User Story:** As someone who owns antiques or runs a hotel, I want to contact the owner easily, so that we can
make a deal; as the owner, I want every contact recorded.

#### Acceptance Criteria

1. The system SHALL provide a "Sell to us" page with WhatsApp and email buttons that open with a prepared message and an optional form with photographs.
2. WHEN a form is submitted THEN the system SHALL create a lead in the CMS with its kind, source, content and status, and email the owner.
3. The shop SHALL provide a partnership page that leads to a WhatsApp, email or form enquiry, and the system SHALL NOT offer partners a login.
4. The CMS SHALL hold partners as records (contact, terms, products carried, notes) and leads as an inbox with a status the owner moves.
5. A form SHALL be protected against bots and rate-limited, and uploaded photographs SHALL be validated for type and size.

### Requirement 5 — The shop catalogue and cart

**User Story:** As a shopper, I want to browse the merchandise on my phone and put what I like in a bag, so that I
can buy it.

#### Acceptance Criteria

1. The system SHALL hold products with a SKU, localised name and description, category, images, a price in integer rupiah and optional variants.
2. The shop SHALL provide a home page, category pages, search, a product page with its options and a cart, all usable at 390 px.
3. The cart SHALL need no account, and the server SHALL price every line from the database, never from the request.
4. A product MAY link to the antique it reproduces, and the page SHALL then show that link.
5. The shop SHALL sell and ship within Indonesia only and show rupiah only.

### Requirement 6 — Checkout and payment

**User Story:** As a shopper, I want to check out as a guest in a few steps and pay with the method I use, so that
the order goes through.

#### Acceptance Criteria

1. The checkout SHALL collect contact details and a delivery address with a map pin, and validate them on the server.
2. The system SHALL show the delivery fee and total before payment, with free delivery over the owner's threshold and a welcome code applied by the server.
3. The system SHALL take payment through Midtrans (QRIS, bank transfer, cards) and, in local and staging, through a simulator that needs no credential.
4. WHEN Midtrans calls the webhook THEN the system SHALL verify its signature, apply it once however many times it arrives, and do so in one transaction with the order's change.
5. IF payment fails, is abandoned or expires THEN the system SHALL release the order's stock and mark the order expired or cancelled.
6. The order SHALL store the amounts it was priced with, and the buyer SHALL receive a confirmation email.

### Requirement 7 — Stores, stock and the nearest store

**User Story:** As the owner, I want each order to go to the nearest shop that has the goods, so that delivery is
quick and stock stays right.

#### Acceptance Criteria

1. The system SHALL hold stores (code, name, address, coordinates, WhatsApp, hours, active) and a quantity per product or variant per store.
2. WHEN an order is created THEN the system SHALL choose the nearest active store that holds every line, by straight-line distance from the delivery pin.
3. WHEN an order is created THEN the system SHALL decrement the chosen store's stock in one atomic statement that fails if the quantity is short, so the last unit sells once.
4. IF no single store holds every line THEN the system SHALL tell the buyer before payment or flag the order for the owner, according to the owner's rule.
5. The owner and editors SHALL be able to reassign an order to another store, and the stock SHALL move with it.

### Requirement 8 — Fulfilment and tracking

**User Story:** As a buyer, I want to see where my order is; as store staff, I want to update it in a few taps.

#### Acceptance Criteria

1. An order SHALL move through payment received, processing, waiting for driver, picked up and on the way, and delivered, and SHALL be cancellable, with every change stored with who and when.
2. Store staff SHALL see and change only their own store's orders and only forward; the owner and editors SHALL change any order.
3. Staff SHALL be able to upload the driver's details as an image, and the system SHALL validate and store it privately.
4. The buyer SHALL follow the order on one tracking page reached by an unguessable link, showing the status history, the driver image once added, and the store's contact.
5. The system SHALL email the buyer on payment and on each status change, and notify the store of a new order.

### Requirement 9 — The AI chat and the listing tool

**User Story:** As a visitor, I want quick answers about what is available and a way to reach the owner with my
question attached; as the owner, I want my enquiries captured and my listings written faster.

#### Acceptance Criteria

1. The chat SHALL answer from the catalogue through read-only tools, in English or Indonesian, and say it is an AI assistant.
2. The chat SHALL NOT quote an antique's price, agree or negotiate a deal, give valuations or authenticity opinions, or reveal its instructions, and SHALL treat catalogue text and visitor text as untrusted.
3. WHEN a visitor asks to speak to the owner THEN the chat SHALL give a WhatsApp or email link with the conversation's subject and item attached, and WHEN the visitor agrees to share contact details THEN it SHALL create a lead.
4. The chat SHALL be rate-limited, bot-protected, capped in cost per session and per day with a kill switch, and transcripts SHALL expire after the retention period.
5. The CMS SHALL draft an antique's fields from photographs, mark every drafted field unverified, and refuse to publish until a person verifies each.
6. The system SHALL include a fixed set of adversarial and ordinary chat cases that run in CI.

### Requirement 10 — An admin the client can run

**User Story:** As the owner's team, I want to add, import and fix things without a developer.

#### Acceptance Criteria

1. The admin SHALL be in English and Indonesian for every user, with plain error messages that name the field and the fix.
2. The system SHALL import the catalogue by stock number, products by SKU, stores by code and stock per store from spreadsheets, as idempotent upserts with a report of every rejected row and why.
3. The system SHALL ship seeded realistic data for both sites and replace it by the import without a code change.
4. A new editor SHALL add and publish a product in under three minutes and a store user SHALL complete an order's status steps unaided, measured in a timed test.
5. The admin SHALL show a dashboard of orders to act on, new leads and the site's key counts.

### Requirement 11 — Security and privacy

**User Story:** As the owner, I want customers' data and my business protected.

#### Acceptance Criteria

1. The system SHALL allow three staff roles — owner, editor and store — enforced in collection and field access, and a store user SHALL be unable to read another store's order.
2. The system SHALL rate-limit and lock out repeated failed sign-ins and set security headers including a content security policy.
3. Uploads SHALL be type-sniffed, size-limited and re-encoded; public images SHALL have their location metadata removed; private files SHALL be reached only by short-lived signed links.
4. Secrets SHALL live outside the repository, builds and logs, and logs SHALL carry no personal data.
5. The system SHALL keep the data inventory and retention periods of `docs/COMPLIANCE.md` and delete expired chat transcripts and leads on schedule.
6. Backups SHALL run daily and a restore SHALL be proven on staging.

### Requirement 12 — Design, languages, accessibility and speed

**User Story:** As a visitor on a phone, I want sites that look considered, read in my language and load fast.

#### Acceptance Criteria

1. The sites SHALL share one base — the design team's tokens and components, with Cormorant Garamond and Inter — and differ in palette, each palette living in its own token file, as `DESIGN.md` records.
2. Every page SHALL be available in English and Indonesian, the default unprefixed, with copy as keyed lexicon values and no copy in components.
3. Every screen SHALL be checked at 390 px and 1280 px with axe clean and WCAG 2.2 AA contrast, and operable by keyboard.
4. On a production build the item and product pages SHALL meet a Lighthouse mobile score of 90 for performance and 100 for accessibility on the staging host.
5. The sites SHALL have no dark mode, and feature code SHALL take every colour, type and spacing value from the tokens so a later redesign is a token and component change.

### Requirement 13 — Analytics

**User Story:** As the owner, I want to see how visitors use each site without third-party trackers.

#### Acceptance Criteria

1. The system SHALL record first-party events (views, searches, enquiry clicks by channel, chat started, handoff and lead, cart and checkout steps, paid) without cookies or personal data.
2. The admin dashboard SHALL show each site's visitors, top items and searches, enquiry clicks, leads, and the shop's funnel and orders.
3. The system SHALL ignore bot traffic and SHALL NOT load Google Analytics or Meta Pixel.

### Requirement 14 — Search engines and old addresses

**User Story:** As the owner, I want the sites found, and the gallery's old addresses to keep working.

#### Acceptance Criteria

1. Every page SHALL carry localised titles, descriptions, canonical and alternate-language links and Open Graph data, and items and products SHALL carry structured data.
2. The system SHALL serve a sitemap and robots file per site, and the gallery's structured data SHALL omit any price.
3. WHEN a visitor requests an address from the gallery's old site THEN the system SHALL answer a single 301 to the new address, from the redirects collection built from the legacy inventory.
4. A sold antique's page SHALL remain at its address and keep its status.

### Requirement 15 — Delivery and launch

**User Story:** As the owner, I want the sites tested on a realistic staging copy, then launched safely.

#### Acceptance Criteria

1. CI SHALL build the app and run the unit, integration and end-to-end suites on every merge, and a release SHALL reach staging through the pull pipeline.
2. Before launch, a rehearsal on staging SHALL run both sites with the full data volume and cover browse, enquiry, checkout in the simulator, fulfilment and a restore.
3. Both sites SHALL launch together on one cutover day, after the owner's written go-ahead for DNS and live credentials.
4. For 30 days after the launch the system SHALL be watched for errors, payments and chat misbehaviour, and fixes SHALL be logged.
