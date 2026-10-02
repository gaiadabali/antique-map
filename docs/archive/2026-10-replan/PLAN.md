# Build plan

Fourteen stages to launch — forty-four small phases — and a v2 backlog after
them. Each phase ends in something you can open and judge — no phase is purely
internal (KOI) — and each stage ends in a gate. Durations are focused-developer days, as sequencing guidance, not a contract; with lanes
running in parallel the calendar is roughly **12 weeks to the shop's launch and
14–15 weeks to the gallery's cutover**, provided the owner decisions, the pilot
photo shoot, the item register and the buyer sessions below arrive on time. (An
earlier estimate said 10–12 weeks to both; the architecture review added the
money-safety work — the outbox, the in-transaction webhook pipeline, returns,
the tax export — the Cache Components spike and the gallery's dark import, and the
schedule was re-derived from real dependencies.)

The executable version of this plan — every phase, task, subtask, lane, agent
type and dependency — is **[`TASKS.md`](../TASKS.md)** — the progress board at the repo root.
How lanes run side by side without colliding is
**[PARALLEL-TRACKS.md](PARALLEL-TRACKS.md)** — read it before dispatching a
second agent.

**Decisions already locked** (reasoning in the docs): one engine with two
storefront apps (`gallery`, `emporium`) · Payload 3 embedded, one brand-independent
config, one database per brand, one migration set · commerce built natively on
Payload, no ecommerce plugin at runtime · sellers of record as data · the ship-to
destination decides the currency, and Indonesian delivery shows rupiah alone ·
one `reserve()` service guarded by a partial unique index · webhooks deduped
inside the transaction that applies them · Next 16 Cache Components, proven by a
spike in phase 4 with a documented fallback · static IIIF tiles on object storage ·
Postgres search with a gazetteer · Helios via the GDA pull pipeline, one artifact
with a subdir per brand · English + Indonesian, the default locale unprefixed ·
the existing gallery product URLs preserved byte-for-byte · no dark mode on the
storefronts · a design gate on every UI phase.

---

## Milestones

| | Milestone | Closed by phase |
| - | --------- | ----------- |
| **M0** | Both brand shells live on staging (`indies-gallery.gaiada.com`, `old-east-indies.gaiada.com`), admin logs in on both | 5 |
| **M1** | A direction picked per brand; both style guides on staging | 22 (after the Design stage, 14) |
| **M2** | Catalogue, deep zoom, search and commerce core working on staging with sandbox payments | 21 (with 10 and 16) |
| **M3** | **Old East Indies live** on `oldeastindies.com` | 42 — after the Shop, Admin, Integrations, Accounts, SEO and Migration gates, with the gallery's dark import (42.7) done |
| **M4** | **Indies Gallery cut over** on `antiquemapsindonesia.com` | 43 — after the Gallery gate and phase 42 |
| **M5** | The 30-day iteration done; v2 underway | 44, then the v2 backlog |

**Launch order — Old East Indies first (default, owner may reverse).** It has no
store today, so every week without one is lost sales; its tickets are small, so
the commerce engine meets real money at low stakes; and it has no ranking estate
to protect. The gallery follows once the rehearsal import and the redirect
verification are clean — its launch is a migration, and a migration is safest
on an engine that has already taken payments.

**But the shop cannot launch on an empty archive.** Its designs are copies of the
gallery's works and its "own the original" blocks show the originals' status and
price, all from the gallery's archive API. So before the shop launches, the
gallery's **production** database is provisioned and imported **dark** — no DNS,
no public traffic, only the archive API the shop's sister sync reads (TASKS.md
42.7, MIGRATION.md §8 step 0, D25). Its public cutover follows later on the same
database, with a final delta import.

## Running phases in parallel

Each phase is small — at most eight tasks in at most three waves — and names the
phases it needs in its heading. A phase opens when those are ✅, lowest number
first, with **at most three open at once**; inside it, its waves run in order and
each wave's tasks run in parallel on file-disjoint paths. Waves belong to their
phase (`17·W2` is the second wave of phase 17): there is no calendar of waves
across phases, so "which phase are we in" always has an answer. The cap of three
assumes one senior reviewer per lane family (PARALLEL-TRACKS.md §6); with one
reviewer, run one or two.

The Design and Migration stages wait mostly on the owner, so they run beside the
build line: the Foundation opens them, and they join it where a later phase needs
them (the app foundations need the picked directions; the migration load needs
the catalogue and the tiling). The critical path runs through the owner as much
as the code: the direction pick and the buyer test (phase 13), the Midtrans
sandbox (19.3), the item register (before the load, 36.3), and the launch
go-aheads (phases 42 and 43).

---

## Foundation — phases 1–5 _(≈5 days)_

Monorepo (pnpm 11, TS strict, ESLint 9, Prettier, Vitest, Playwright + axe,
Lighthouse CI), the **gates** — 300-line rule, brand-literal lint, schema-hash
across brand databases, config drift with `BRAND` unset, route and handler
parity, generated-file checks, `tasks:lint` — local infrastructure (Postgres 18,
Mailpit, MinIO), CI with a two-brand artifact, the **config spine**, the
**thirteen contracts** (C1–C13) frozen, the **Cache Components spike** (a cached
item page with a runtime purchase panel, tag invalidation and a build with no
database — or the recorded switch to the fallback), both storefront apps booting
against two databases, the synthetic `test` brand on both apps, and staging
provisioned on Helios.

**Done when:** `pnpm dev --brand indies-gallery` and `--brand old-east-indies`
serve two differently branded shells (theming is the Design stage's, D9) in English and Indonesian from two
databases, `/admin` logs in on both, the `test` brand runs on both apps, the
spike's verdict is recorded in ARCHITECTURE.md §9, every gate fails on a planted
violation, and both staging hostnames serve a CI-built release.

## Design — phases 6, 12–14 _(≈10–12 days, owner reviews, a pilot shoot and buyer tests included)_

The impeccable workflow KOI uses, run in full, because a research recommendation
is only the category default. Product briefs and **journeys** (the WhatsApp,
payment-link and showroom-QR handoffs included); **capture standards and a pilot
photo shoot** — photography decides perceived quality more than any component;
a **voice and EN/ID lexicon** per brand reviewed by a native Indonesian writer;
then one **direction round for the shared base** both sites use — layout,
components, buttons, type (Cormorant Garamond + Karla, kept at the client's
request), with the owner's draft as the lead candidate and Etalage and Everart as
references — and **each brand's accents** on top (palette and signature details),
comping the signature surfaces at full fidelity (the gallery's item page, the
shop's product page with its configurator) on the pilot photography, with a
cultural review of the shop's accents. The **sister system** is drawn in the
shared base; the owner picks the base and the accents on their own phone; a
**prototype is tested with real buyers**; and only then are `DESIGN.md` (motion,
iconography, image treatment, font budget, the no-dark-mode decision) and the
token files written.

**Done when:** the owner has approved the shared base and each brand's accents on
their own phone and a desktop, after a prototype test with real buyers; both
`DESIGN.md` files and token files are committed; each brand has a native-reviewed
voice and lexicon; the sister system exists in the shared base.

## Catalogue — phases 8–10 _(≈8 days, parallel with Design)_

Every collection in CONTENT-MODEL.md — works, products, makers, the gazetteer,
sources, designs, product types, variants, stock, curations, stories, pages,
customers, media and masters — with validation, localisation, drafts, roles,
publish guards, admin grouping in plain language, and real-shaped seeds. The
commerce collections follow in the Commerce stage.

**Done when:** a non-developer, in the gallery's admin, creates a maker, a place
with a historical name, a work with a circa date and a verso image, and a unique
product; in the shop's admin, a design, a product type and a product with
variants; sees them through the API; and an incomplete work is refused on publish
with a reason they understand. Schema hashes are identical across all three
databases.

## Design systems — phases 11 and 22 _(≈8 days; phase 22 after the owner's pick)_

The headless primitives in `@engine/ui`, the token pipeline with runtime brand
overrides and the contrast gate, each app's shell (header, mega navigation,
footer with seller identity and the sister strip, consent banner, the ship-to
selector that decides the currency, the bottom-edge stacking policy), every block
renderer, **a surface brief for every surface the Design stage did not comp** (so nothing
is designed by default in code), **state fixtures** for every surface (loading,
empty, partial, error, no-JS, long content, extreme values, every purchase
state), every surface's skeleton, and each app's `/style-guide` with a state
switcher.

**Done when:** changing a brand's token overrides re-skins every component with
no code change and a failing palette is rejected; every surface has an approved
brief; both style guides render every component, block and state at 360, 768 and
1440 px with axe clean and the budgets met; the design gate passes.

## Media and search — phases 15 and 16 _(≈7 days)_

The derivative ladder, the IIIF tiling job, IIIF manifests, private masters and
the print-size ceiling, the zoom viewer (on intent, keyboard-complete), the
search index with the gazetteer's historical names, and the facet engine with
the all-but-this-facet count rule.

**Done when:** a 3543 × 2840 scan becomes derivatives and tiles and deep-zooms
smoothly on a mid-range Android without moving the item page's JavaScript budget;
"Celebes" and "Sulawesi" return the same works; facet counts are provably right.

## Commerce — phases 17–21 _(≈12 days — the stage that decides whether money is safe)_

Commerce collections, money and market price lists with FX, seller routing with
export-status gating, the rupiah rule, the reservation service with its
database guarantee, cart, the pricing pipeline, tax regimes and the tax export,
discounts and gift cards, checkout as data, returns, the **five state machines**
(order, payment, reservation, availability, offer) and the outbox, the payments
core (routing with per-method caps, the webhook pipeline with its in-transaction
dedupe, reconciliation, late-payment handling, payment links), **Midtrans in
sandbox**, shipping basics, transactional email, and every commerce API handler.

**Done when:** on staging, two parallel checkouts on one unique gallery item
yield exactly one paid order and one clean "someone else was first" message; a
sold item cannot be reserved again; one webhook delivered twice yields one
payment, and a crash after the dedupe insert rolls back and applies once on the
retry; a payment that lands after its reservation expired takes the late-payment
path; a multi-line shop cart to a Bali address prices in IDR only, never offers
QRIS above IDR 10 m, pays by virtual account in the Midtrans sandbox, and its
emails arrive; and every order reproduces its own total from its stored figures.

## Gallery — phases 33–35 _(≈12 days)_

Loaders for every gallery surface; home, browse, search; the item page with its
collation, condition, references, deep zoom and purchase panel; request price,
offer, reserve, proforma, viewing and WhatsApp flows; sold and hold states;
maker, place, source, curation and story pages; every trust page; consignment and
appointments; cart, checkout and order pages.

**Done when:** the Design stage's journeys (6.1.c) pass on a phone — a visitor lands on a place
page, filters Java maps under USD 2,000, zooms into an item's verso, requests the
price, reserves or buys it in the sandbox and receives the confirmation; an
institution turns a cart into a proforma; a sold item shows its available
alternative and "own a print of this map" and takes an alert — budgets pass on
home, browse and item; axe is clean; five real buyers have run the journeys; the
design gate passes against the approved comp.

## Shop — phases 30–32 _(≈12 days, parallel with Gallery)_

Loaders for every shop surface; home, the Shop menu, collections, places and eras,
gifts, search and filters; the product page and **the configurator** (constraints
with reasons, live price, flat / on the wall / to scale, state in the URL); design
pages; stories with shop-the-story; the **Partnership** page — the one
programme for every business buyer, never a separate "For Business" path
(D31, D36); the `/ig` page; the showroom
page; gift cards; the bag drawer and both checkout flows (Indonesian and export).

**Done when:** the Design stage's journeys (6.1.c) pass on a phone **inside the Instagram in-app
browser** — a visitor opens a collection, configures the largest giclée the
seed scan allows (≈ 37 cm on the long edge at 240 ppi from today's 3543 px
images, D26) with a teak frame and a mount, sees it to scale, adds gift wrap and
a voucher, pays by QRIS or
VA (through the designed payment-pending page) in the sandbox in IDR only, and
tracks the order as a guest; switching ship-to to the Netherlands shows euro
prices and a duties estimate; a showroom QR opens the in-showroom mode; budgets
pass; axe is clean; five real buyers have run the journeys; the design gate passes.

## Admin — phases 23, 24 and 38 _(≈10 days — "the admin is half the product")_

It starts by **watching the work** — a cataloguer at the drawer, the shop manager
on WhatsApp and in the showroom — and writing an *Operate*-mode brief for each
screen. Then the desk (queues for offers, expiring holds, enquiries, price
requests, consignments, orders to fulfil, low stock, drafts to verify), **fast
cataloguing**
(save-and-add-another, fuzzy dates, dimension parsing, inline makers and places,
duplicate warnings, autosave, side-by-side locales), **bulk image upload** matched
by stock number, **AI-assisted cataloguing** behind its flag with human
verification, the **merch-from-work wizard**, order operations with documents,
the offers/holds/enquiries inbox (usable on a phone), stock and showroom sales
(on the counter's tablet), homepage and navigation editors with preview — and the
**printed collateral**: the certificate of authenticity, the designers'
factsheet, invoices, packing slips, gift cards, the shop's story card and
showroom labels, designed and test-printed.

**Done when:** — measured with real people, not assumed (KOI) — a cataloguer
enters twenty works from a drawer at the median time agreed with the owner,
images included, without help; a shop manager turns one work into a twelve-variant
giclée product with mockups in under five minutes; an accepted offer reaches the
buyer as a working payment link; and every custom admin view has been **opened**
and has the Payload sidebar.

## Integrations — phases 25–27 _(≈10 days)_

Stripe (Singapore seller) and PayPal, and Xendit or DOKU only if chosen;
Biteship and DHL Express; **sister sync** (the gallery's archive API and
webhooks, the shop's provenance copies, both cross-links); WhatsApp
notifications through the provider the owner picks (D14). Print-on-demand
abroad (Prodigi, Gelato) is **not part of the launch** (D23) — its adapters are
built after launch, behind the router that already exists.

**Done when:** every adapter passes the shared contract suite against recorded
sandbox fixtures (bad signature, duplicate, out-of-order, crash after dedupe,
refund idempotency, and for Stripe a session that outlives a 30-minute
expiry); a Denpasar order gets live Biteship rates and tracking; a Netherlands
order ships from Bali by DHL Express with a duties estimate; publishing a work in
the gallery updates its copy in the shop within a minute, and the shop's "own the
original" block reads "sold" after the gallery sells it.

## Accounts — phases 28 and 29 _(≈6 days)_

Customer accounts (with the legacy claim flow), both account areas, want-list
matching and alerts, the newsletter generated from inventory, the shop's welcome
offer, reviews, back-in-stock and consented abandoned-bag email, gift cards, the
consent banner and records, and **data-subject operations** (access, export,
correction, erasure with the retention the law requires kept).

**Done when:** a guest's saved search ("Valentijn, Bali, under USD 2,000") emails
them when a match is published; a confirmed subscriber receives the next
generated digest; a consented abandoned bag sends one email and a non-consented
one sends none; and a customer's erasure request removes their personal data
while their orders stay reproducible for the accountant.

## Migration — phases 7, 36 and 37, plus 42.7 and 43.7 _(≈8 days; the extract starts right after phase 2)_

The owner's export of the old catalogue (with, only if it never arrives and
only with the owner's OK, a read-only look at the public pages — the old site
itself is never touched),
normalisers with a review queue, maker de-duplication, the category → facet
mapping for the curator, the **item register** (location and export status per
original), idempotent loading as drafts, off-box tiling of the archive,
customers with an unusable random password and a claim flow, the redirect map,
the verification report, Old East Indies' legacy URLs, a full rehearsal on
staging — and, before the shop launches, the gallery's **dark production
import**.

**Done when:** a rehearsal import loads every item with its images tiled and no
unexplained discrepancy in the report; every original has a location and export
status from the register or publishes enquiry-only; **every** legacy URL, counted
from the export and the URL inventory, resolves on the new site with 200 or one
301 to 200; the curator has
signed the mapping; and the dark production import serves the shop's sister sync.

## SEO and analytics — phases 39 and 40 _(≈5 days)_

Titles, canonicals, `hreflang`, OG images, JSON-LD (`Product` + `VisualArtwork`
with honest availability), sitemaps including sold items, the Google Merchant and
Meta catalogue feeds, the beacon and events table, GA4/Meta mapping behind
consent, and the admin dashboards.

**Done when:** the Rich Results test passes for an item, a sold item, a design and
a location; sitemaps validate and include sold items; the Merchant feed validates;
a purchase funnel and a lead funnel from real staging sessions are **visible in
the dashboard**; and rejecting consent provably stops every non-essential tag.

## Launch — phases 41–44 _(≈8 days)_

Performance on a real mid-range Android; a WCAG 2.2 AA audit with screen readers
and 200% zoom; security (a CSP built per request from brand config, headers, rate
limits, webhook replay, lockout, dependency and secret scanning); the compliance
implementation check and a breach-response runbook; production provisioning, a
timed restore drill, monitoring; the manuals (user
guide and CMS guide, with screenshots) and staff training; a **photography
coverage gate** (the gallery's top 200 items with recto, verso and a detail; every
shop launch product with flat, in-room and detail images) and a **full copy review
in both languages**; then **the shop's launch** and **the gallery's cutover**
(MIGRATION.md §8); and, after launch, a **30-day design iteration** on real
behaviour.

**Done when:** both brands are live on their production domains, the budgets pass
in CI, the restore drill is recorded, redirect verification is 100%, photography
and copy meet their gates, the design gate passes on the live sites, and someone
who has never seen the project can catalogue a work and fulfil an order using
only the CMS guide.

## v2 _(backlog, sequenced after launch)_

Binding offers, deposits and instalments · catalogues as printable PDFs ·
print-on-demand abroad (Prodigi, Gelato) · AR and in-room views · map-based
browse and the Archipelago Explorer ·
Dutch and Chinese · My Collection · the trade portal and the designer programme ·
the shop's Singapore seller with duties-paid export · the full "print from the
archive" range · the gallery-wall builder · personalised town maps · loyalty ·
a showroom till on the same stock · marketplace sync through an omnichannel hub ·
georeferenced then/now overlays · the Parry cartobibliography · a verifiable QR
certificate · image licensing.

---

## Open decisions

The owner's decisions **D1–D29** — each with the default used until it is
answered, who answers it and the task that needs it — and the owner's actions
(the data export, the item register, accounts, bookings, go-aheads) are tracked
on the board: **[TASKS.md → Decisions for the owner](../TASKS.md#decisions-for-the-owner)**.
Answers are recorded there with the date, and in the doc each one changes.

## The risks worth naming now

| Risk | Mitigation |
| ---- | ---------- |
| **A one-of-one map sold twice** | One `reserve()` writing a scalar `targetKey`; a partial unique index over active **and converted** reservations, so a sold item cannot be reserved again; the lock outlives the payment method's window; capture only while the reservation is live; one transaction for payment + sale; concurrency tests in the Commerce gate (21.2); IG never on marketplaces (ARCHITECTURE.md §6). |
| **A webhook applied twice, or lost** | Dedupe row inserted inside the transaction that applies the event, so a crash rolls both back and the provider's retry applies it once; Midtrans events re-fetched before applying; reconciliation every 10 minutes (PAYMENTS.md §4). |
| **Exporting a cultural object illegally** | Location + export status on every unique item, from the owner's item register and never defaulted; a blank location sells nowhere online; international checkout blocked for uncleared Indonesian stock; D5 defaults to `domestic-only`. |
| **Showing prices the law forbids** | Currency by destination; IDR only for Indonesian delivery, enforced in the VM layer and tested e2e. |
| **SEO loss at the gallery's migration** | Product URLs unchanged; redirects verified by count; domain unchanged in the same release; sold pages kept and indexed. |
| **The sites never fill up** | The Admin stage is product work measured with real users; the migration brings ~2,090 items on day one; the merch wizard turns one work into dozens of products. |
| **Hofker is in copyright** | D6 gates publication; the shop's design must not depend on one artist. |
| **Money code written by agents** | Pure modules with property-based tests, contract suites, idempotency everywhere, mandatory senior review on `domain` and `payments`. |
| **Parallel agents collide** | Worktree per agent, subdirectory ownership, single-threaded migrations, orchestrator-only task ticking (PARALLEL-TRACKS.md). |
| **Green gates, broken screens** | "Open the thing" is part of every done-criterion; QA drives each phase in a browser (CONVENTIONS.md §11). |
| **Well-built but generic UI** | Directions derived through the full round, not assumed; photography as a production track; every surface briefed before it is built; state fixtures; a design gate on every UI phase; real buyers testing the prototype and both storefronts; a 30-day iteration after launch (DESIGN-SYSTEM.md §11–13). |
| **Gateway fee or policy changes** | Providers are adapters behind one contract; method caps and fees are dated data (Xendit's Oct-2026 repricing is why Midtrans is the default). |
| **Helios disk and shared host** | Media on object storage; alerts at 80%; one process per brand with memory limits; Helios writes only with the owner's go-ahead. |
| **Payload 4 churn** | Pin 3.90.x exactly; no deprecated APIs; upgrade only after 4 is stable with a migration guide. |
| **Cache Components is young** | A spike in phase 4 proves the item page (cached record, runtime purchase panel, immediate tag expiry for availability, a build with no database) before anything is built on it; the fallback is documented and chosen as a whole (ARCHITECTURE.md §9). |
| **Drafts or private fields leak** | Public loaders and the sister API read with `overrideAccess: false`, published only, and a field `select`; an e2e test requests a draft and a private field and must get neither (ARCHITECTURE.md §12). |
| **The item register arrives late** | Items without a row publish enquiry-only, so legacy URLs still resolve at cutover and nothing sells without a known location (D24). |
