# Indies Platform — Build Plan and Progress

**Finish line:** two new sites on one engine, live on their own domains — **Old East Indies** on `oldeastindies.com` (phase 42), then **Indies Gallery** on `antiquemapsindonesia.com` (phase 43) — each through the launch gate (44.1).

- **New builds, not changes to what exists.** The current sites stay exactly as they are: this plan never logs in to, fixes, changes, freezes or switches them off. What the new sites take from them is a copy — an export the owner hands over or, only with the owner's OK, a read-only look at their public pages.
- **One engine, two storefront apps** (`engine/apps/gallery`, `engine/apps/emporium`), one database per brand. The reasoning lives in `docs/` — start with [docs/PLAN.md](docs/PLAN.md), [docs/PARALLEL-TRACKS.md](docs/PARALLEL-TRACKS.md) and [design.md](.claude/specs/indies-platform/design.md).
- **44 small phases, waves inside each.** A phase has at most eight tasks in at most three waves and ends in something you can open. A phase opens when the phases it needs are ✅; nothing inside it waits on anything outside it except an owner item (👤). There is no calendar across phases.
- **Many agents at once, inside a bound.** At most **three phases are open at once**; inside a phase each wave's tasks run in parallel, one agent each, in its own worktree, on paths nobody else in that wave owns.
- **Every task ends in a Check** — the evidence that it works — and the progress table counts ticked subtasks, so a phase only moves the bar as its steps are proven.

Written 2026-09-25 from the reviewed plan (a UX review and an architecture review, both applied); **replanned 2026-09-28** from 14 large phases, whose waves ran across each other, into 44 small ones (the id mapping is in the Log). Every task lists the requirements it satisfies ([requirements.md](.claude/specs/indies-platform/requirements.md), 161 criteria).

## Progress

Rebuilt from the checkboxes by `node scripts/progress.mjs` — run it after every tick; never edit the table by hand.

<!-- progress:start -->
| Phase | Stage | Needs | Status | Tasks | Subtasks | 👤 open | Progress |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1** Repository, contracts and agent workspace | Foundation | — | ✅ done | 3/3 | 24/24 | 0 | `██████████` 100% |
| **2** Local infrastructure, quality gates and CI | Foundation | 1 | ✅ done | 4/4 | 22/22 | 0 | `██████████` 100% |
| **3** Config spine and Payload boot | Foundation | 2 | ✅ done | 5/5 | 31/31 | 0 | `██████████` 100% |
| **4** App shells and the Cache Components spike | Foundation | 3 | 🔄 in progress | 6/8 | 30/40 | 0 | `████████░░`  75% |
| **5** Staging and the foundation gate 👤 | Foundation | 4 | · not started | 0/4 | 0/22 | 1 | `░░░░░░░░░░`   0% |
| **6** Briefs, image direction and voice | Design | 4 | · not started | 0/3 | 0/12 | 3 | `░░░░░░░░░░`   0% |
| **7** The old catalogue export and the shop's URL discovery 👤 | Migration | 2 | 🔄 in progress | 0/3 | 2/14 | 2 | `█░░░░░░░░░`  14% |
| **8** Makers, places, terms, works and media | Catalogue | 3, 4 | · not started | 0/3 | 0/16 | 0 | `░░░░░░░░░░`   0% |
| **9** Products, merchandise, editorial and people | Catalogue | 8 | · not started | 0/4 | 0/22 | 0 | `░░░░░░░░░░`   0% |
| **10** Admin organisation, seeds and the catalogue gate | Catalogue | 9 | · not started | 0/4 | 0/19 | 0 | `░░░░░░░░░░`   0% |
| **11** Primitives, tokens, the loader interface and state fixtures | Design systems | 4 | · not started | 0/4 | 0/20 | 0 | `░░░░░░░░░░`   0% |
| **12** The shared base, each brand's accents and the sister system | Design | 6 | · not started | 0/3 | 0/12 | 1 | `░░░░░░░░░░`   0% |
| **13** The owner's pick and the buyer test 👤 | Design | 12 | · not started | 0/3 | 0/14 | 2 | `░░░░░░░░░░`   0% |
| **14** DESIGN.md, tokens and the design gate 👤 | Design | 13 | · not started | 0/2 | 0/11 | 2 | `░░░░░░░░░░`   0% |
| **15** Derivatives, IIIF tiles, manifests and masters | Media and search | 9 | · not started | 0/4 | 0/16 | 0 | `░░░░░░░░░░`   0% |
| **16** The viewer, the search index, facets and the media gate | Media and search | 11, 15 | · not started | 0/4 | 0/17 | 0 | `░░░░░░░░░░`   0% |
| **17** Commerce schema, money, sellers, pricing and tax | Commerce | 10 | · not started | 0/4 | 0/17 | 0 | `░░░░░░░░░░`   0% |
| **18** Reservations, state machines and the cart | Commerce | 17 | · not started | 0/3 | 0/16 | 0 | `░░░░░░░░░░`   0% |
| **19** Checkout, the payment pipeline and Midtrans 👤 | Commerce | 18 | · not started | 0/4 | 0/24 | 1 | `░░░░░░░░░░`   0% |
| **20** Shipping, discounts, notifications, documents, returns and the tax export | Commerce | 19 | · not started | 0/5 | 0/22 | 0 | `░░░░░░░░░░`   0% |
| **21** The commerce API and the money-safety gate 👤 | Commerce | 20 | · not started | 0/2 | 0/12 | 1 | `░░░░░░░░░░`   0% |
| **22** App foundations and surfaces from fixtures | Design systems | 3, 5, 11, 14 | · not started | 0/7 | 0/36 | 1 | `░░░░░░░░░░`   0% |
| **23** The admin shell and cataloguing 👤 | Admin | 10, 14, 15 | · not started | 0/6 | 0/27 | 2 | `░░░░░░░░░░`   0% |
| **24** Admin operations: merch wizard, orders, inbox, stock and manual orders | Admin | 20, 23 | · not started | 0/5 | 0/22 | 0 | `░░░░░░░░░░`   0% |
| **25** Payment adapters 👤 | Integrations | 19 | · not started | 0/3 | 0/13 | 2 | `░░░░░░░░░░`   0% |
| **26** Couriers and the fulfilment router 👤 | Integrations | 15, 20 | · not started | 0/3 | 0/12 | 2 | `░░░░░░░░░░`   0% |
| **27** Sister sync, WhatsApp and the integrations gate 👤 | Integrations | 25, 26 | · not started | 0/3 | 0/12 | 1 | `░░░░░░░░░░`   0% |
| **28** Accounts, consent and data-subject operations | Accounts | 17, 22 | · not started | 0/5 | 0/22 | 0 | `░░░░░░░░░░`   0% |
| **29** Alerts, newsletter, retention and the accounts gate | Accounts | 16, 20, 28 | · not started | 0/4 | 0/18 | 0 | `░░░░░░░░░░`   0% |
| **30** Shop: loaders, home and collections, the product page and the configurator | Shop | 16, 21, 22 | · not started | 0/4 | 0/18 | 0 | `░░░░░░░░░░`   0% |
| **31** Shop: stories, the bag and checkout, order tracking | Shop | 21, 22 | · not started | 0/3 | 0/15 | 0 | `░░░░░░░░░░`   0% |
| **32** Shop: polish, buyers and the shop gate 👤 | Shop | 30, 31 | · not started | 0/3 | 0/14 | 2 | `░░░░░░░░░░`   0% |
| **33** Gallery: loaders, browse, the item page and editorial | Gallery | 16, 21, 22 | · not started | 0/4 | 0/20 | 0 | `░░░░░░░░░░`   0% |
| **34** Gallery: the purchase panel, forms and checkout | Gallery | 33 | · not started | 0/3 | 0/15 | 1 | `░░░░░░░░░░`   0% |
| **35** Gallery: polish, buyers and the gallery gate 👤 | Gallery | 34 | · not started | 0/3 | 0/14 | 2 | `░░░░░░░░░░`   0% |
| **36** Mapping, the loader, the item register and redirects 👤 | Migration | 4, 7, 10, 15 | · not started | 0/4 | 0/14 | 3 | `░░░░░░░░░░`   0% |
| **37** Verification, the staging rehearsal and the migration gate 👤 | Migration | 5, 36 | · not started | 0/3 | 0/12 | 1 | `░░░░░░░░░░`   0% |
| **38** Editors, the timed tests and the admin gate 👤 | Admin | 24, 30, 33 | · not started | 0/3 | 0/14 | 2 | `░░░░░░░░░░`   0% |
| **39** Metadata, JSON-LD, sitemaps and feeds 👤 | SEO and analytics | 30, 33 | · not started | 0/4 | 0/16 | 1 | `░░░░░░░░░░`   0% |
| **40** Analytics, dashboards and the SEO gate | SEO and analytics | 23, 28, 39 | · not started | 0/4 | 0/15 | 0 | `░░░░░░░░░░`   0% |
| **41** Security hardening and production provisioning 👤 | Launch | 5, 21, 27 | · not started | 0/2 | 0/8 | 0 | `░░░░░░░░░░`   0% |
| **42** Old East Indies: readiness, the gallery's dark import and launch 👤 | Launch | 29, 32, 37, 38, 40, 41 | · not started | 0/8 | 0/22 | 7 | `░░░░░░░░░░`   0% |
| **43** Indies Gallery: readiness, the content sprint and cutover 👤 | Launch | 35, 42 | · not started | 0/8 | 0/22 | 6 | `░░░░░░░░░░`   0% |
| **44** The launch gate and the 30-day iteration 👤 | Launch | 43 | · not started | 0/2 | 0/9 | 1 | `░░░░░░░░░░`   0% |
| **All** | 44 phases | | | **18/173** | **109/793** | **47** | `█░░░░░░░░░`  14% |
<!-- progress:end -->

## Stages and milestones

A **stage** is a run of phases on one subject; its last phase ends in the stage's gate, which drives every phase's **Done when** in the stage end to end. The Design and Migration stages wait mostly on the owner (the photographer, the buyers, the export, the register), so they run beside the build line rather than in it.

| Stage | Phases | Gate | Closes |
| --- | --- | --- | --- |
| **Foundation** | 1–5 | 5.2 | **M0** (5) |
| **Design** | 6, 12, 13 and 14 | 14.2 | — |
| **Migration** | 7, 36 and 37 | 37.3 | — |
| **Catalogue** | 8–10 | 10.4 | — |
| **Design systems** | 11 and 22 | 22.6 | **M1** (22) |
| **Media and search** | 15 and 16 | 16.4 | — |
| **Commerce** | 17–21 | 21.2 | **M2** (21) |
| **Admin** | 23, 24 and 38 | 38.3 | — |
| **Integrations** | 25–27 | 27.3 | — |
| **Accounts** | 28 and 29 | 29.4 | — |
| **Shop** | 30–32 | 32.3 | — |
| **Gallery** | 33–35 | 35.3 | — |
| **SEO and analytics** | 39 and 40 | 40.4 | — |
| **Launch** | 41–44 | 44.2 | **M3** (42), **M4** (43), **M5** (44) |

| Milestone | What the owner can open | Phase |
| --- | --- | --- |
| **M0** | Both brand shells live on staging (`ig.gaiada.com`, `oei.gaiada.com`), admin logs in on both | 5 |
| **M1** | A direction picked per brand; both style guides on staging | 22 |
| **M2** | Catalogue, deep zoom, search and commerce core working on staging with sandbox payments | 21 |
| **M3** | **Old East Indies live** on `oldeastindies.com`, with the gallery's archive imported dark behind it | 42 |
| **M4** | **Indies Gallery cut over** on `antiquemapsindonesia.com` | 43 |
| **M5** | The 30-day design iteration done; v2 underway | 44 |

## Running order

A phase opens when every phase in its **Needs** column is ✅, lowest number first, with **at most three open at once** — usually one build phase and one from Design or Migration. Inside a phase, wave W1 runs, merges and passes its gate before W2 is dispatched. Sizes are agent-days of work, not calendar time.

| Phase | Stage | Needs | Waves | Tasks | Size | Closes |
| --- | --- | --- | --- | --- | --- | --- |
| **1** Repository, contracts and agent workspace | Foundation | — | 2 | 3 | ~1.5d |  |
| **2** Local infrastructure, quality gates and CI | Foundation | 1 | 2 | 3 | ~1.5d |  |
| **3** Config spine and Payload boot | Foundation | 2 | 2 | 2 | ~1d |  |
| **4** App shells and the Cache Components spike | Foundation | 3 | 3 | 8 | ~2.5d |  |
| **5** Staging and the foundation gate 👤 | Foundation | 4 | 3 | 4 | ~2d | **M0** |
| **6** Briefs, image direction and voice | Design | 4 | 1 | 3 | ~3d |  |
| **7** The old catalogue export and the shop's URL discovery 👤 | Migration | 2 | 2 | 3 | ~2d |  |
| **8** Makers, places, terms, works and media | Catalogue | 3, 4 | 2 | 3 | ~2d |  |
| **9** Products, merchandise, editorial and people | Catalogue | 8 | 2 | 4 | ~3d |  |
| **10** Admin organisation, seeds and the catalogue gate | Catalogue | 9 | 2 | 4 | ~2.5d |  |
| **11** Primitives, tokens, the loader interface and state fixtures | Design systems | 4 | 2 | 4 | ~3d |  |
| **12** Direction rounds and the sister system | Design | 6 | 2 | 3 | ~2.5d |  |
| **13** The owner's pick and the buyer test 👤 | Design | 12 | 2 | 3 | ~3d |  |
| **14** DESIGN.md, tokens and the design gate 👤 | Design | 13 | 2 | 2 | ~2.5d |  |
| **15** Derivatives, IIIF tiles, manifests and masters | Media and search | 9 | 3 | 4 | ~3.5d |  |
| **16** The viewer, the search index, facets and the media gate | Media and search | 11, 15 | 3 | 4 | ~3.5d |  |
| **17** Commerce schema, money, sellers, pricing and tax | Commerce | 10 | 3 | 4 | ~2.5d |  |
| **18** Reservations, state machines and the cart | Commerce | 17 | 1 | 3 | ~2d |  |
| **19** Checkout, the payment pipeline and Midtrans 👤 | Commerce | 18 | 3 | 4 | ~3d |  |
| **20** Shipping, discounts, notifications, documents, returns and the tax export | Commerce | 19 | 1 | 5 | ~3d |  |
| **21** The commerce API and the money-safety gate 👤 | Commerce | 20 | 2 | 2 | ~1.5d | **M2** |
| **22** App foundations and surfaces from fixtures | Design systems | 5, 11, 14 | 3 | 6 | ~5d | **M1** |
| **23** The admin shell and cataloguing 👤 | Admin | 10, 14, 15 | 3 | 6 | ~4.5d |  |
| **24** Admin operations: merch wizard, orders, inbox, stock and manual orders | Admin | 20, 23 | 1 | 5 | ~3.5d |  |
| **25** Payment adapters 👤 | Integrations | 19 | 1 | 3 | ~3.5d |  |
| **26** Couriers and the fulfilment router 👤 | Integrations | 15, 20 | 1 | 3 | ~3d |  |
| **27** Sister sync, WhatsApp and the integrations gate 👤 | Integrations | 25, 26 | 2 | 3 | ~3d |  |
| **28** Accounts, consent and data-subject operations | Accounts | 17, 22 | 2 | 4 | ~3d |  |
| **29** Alerts, newsletter, retention and the accounts gate | Accounts | 16, 20, 28 | 2 | 4 | ~3d |  |
| **30** Shop: loaders, home and collections, the product page and the configurator | Shop | 16, 21, 22 | 1 | 4 | ~4.5d |  |
| **31** Shop: stories, the bag and checkout, order tracking | Shop | 21, 22 | 2 | 3 | ~3.5d |  |
| **32** Shop: polish, buyers and the shop gate 👤 | Shop | 30, 31 | 3 | 3 | ~3.5d |  |
| **33** Gallery: loaders, browse, the item page and editorial | Gallery | 16, 21, 22 | 1 | 4 | ~5d |  |
| **34** Gallery: the purchase panel, forms and checkout | Gallery | 33 | 1 | 3 | ~3.5d |  |
| **35** Gallery: polish, buyers and the gallery gate 👤 | Gallery | 34 | 3 | 3 | ~3.5d |  |
| **36** Mapping, the loader, the item register and redirects 👤 | Migration | 4, 7, 10, 15 | 2 | 4 | ~2.5d |  |
| **37** Verification, the staging rehearsal and the migration gate 👤 | Migration | 5, 36 | 3 | 3 | ~2d |  |
| **38** Editors, the timed tests and the admin gate 👤 | Admin | 24, 30, 33 | 3 | 3 | ~2d |  |
| **39** Metadata, JSON-LD, sitemaps and feeds 👤 | SEO and analytics | 30, 33 | 2 | 4 | ~2.5d |  |
| **40** Analytics, dashboards and the SEO gate | SEO and analytics | 23, 28, 39 | 3 | 4 | ~2.5d |  |
| **41** Security hardening and production provisioning 👤 | Launch | 5, 21, 27 | 1 | 2 | ~1.5d |  |
| **42** Old East Indies: readiness, the gallery's dark import and launch 👤 | Launch | 29, 32, 37, 38, 40, 41 | 2 | 8 | ~4d | **M3** |
| **43** Indies Gallery: readiness, the content sprint and cutover 👤 | Launch | 35, 42 | 2 | 8 | ~4d | **M4** |
| **44** The launch gate and the 30-day iteration 👤 | Launch | 43 | 2 | 2 | ~1.5d | **M5** |

**Start the owner's long-lead items on day one**, whatever phase is open: booking the
photographer (6.2.b), the export of the old catalogue (7.1.a), the item register (36.3.a,
D24), counsel's legal texts and breach contacts (42.3.b), the gateway and courier
merchant accounts (D1–D5), and the buyers for the tests (D21). None of them needs
engineering, and each one blocks a phase if it arrives late.

## Now

One row per agent in flight. The orchestrator adds a row when it dispatches a task and removes it when the task closes. A wave is written `<phase>·W<k>` — `17·W2` is the second wave of phase 17.

| Wave | Task | Agent | Worktree / branch | Since | Note |
| ---- | ---- | ----- | ----------------- | ----- | ---- |
| 4·W2 | 4.8 `@engine/cms/instance` and `@engine/cache` | senior-be | `antique-map-p4-sch` / `feat/p4-sch` | 2026-09-30 | review: senior-db (after-commit ordering) |
| 7·W1 | 7.1 The old catalogue export (mock dump + public read) | senior-integrator | `antique-map-p7-mig-a` / `feat/p7-mig-a` | 2026-09-30 | OA9 outstanding: mock dump per D42; the public read runs per D41; `LEGACY_DATA_DIR` = `../indies-legacy-data/<brand>` |
| 7·W1 | 7.3 Old East Indies legacy URL discovery | — (merged d2a3d05, 4a3168a) | `antique-map-p7-mig-b` / `feat/p7-mig-b` | 2026-09-30 | ⛔ 👤 OA11 (the Search Console half of 7.3.a and the Check); 7.3.d done |

## Decisions for the owner

**How a session asks:** with `AskUserQuestion`, 2–4 options, **the recommended one first, labelled "(Recommended)"**, and one line on what each option means. The answer is recorded under **Answered** with the date, and in the doc the decision changes. Until the owner answers, the default is used, so work never waits.

### Open

| # | Decision | Default until answered | Who answers | Needed by |
| --- | --- | --- | --- | --- |
| **D1** | Selling entities: is Indies Gallery a Singapore company, an Indonesian PT, or both? Where is its stock physically? | one Singapore seller for Singapore stock and export + one Indonesian seller for Jakarta stock sold domestically (COMPLIANCE.md §2) | legal/tax adviser | 17.3 (draft values until then); real values before 42.8 |
| **D2** | Old East Indies' entity; a Singapore seller for export later? | Indonesian PT only at launch; export charged in IDR by card, or PayPal in USD | owner + adviser | 19.3, 42.8 |
| **D3** | Gateways | IG: Stripe SG + bank transfer; OEI: Midtrans + PayPal | merchant accounts + sandbox keys | 19.3, 25.1, 25.2, 25.3 |
| **D4** | PKP / GST registration status of each seller | PPN not charged by OEI until registration is confirmed; IG GST off | accountant | 17.4, 42.3, 43.3 |
| **D5** | Export clearance for items held in Jakarta | every Jakarta item `domestic-only` until a written determination exists | lawyer / customs broker | 17.3 |
| **D6** | **Hofker rights** for the Bali Hotel line | line built but **not published** until confirmed | estate / licence | 12.2 (no direction may depend on it), 42.8 (publish the line or not) |
| **D7** | Launch order | Old East Indies first | owner | 42.8 |
| **D8** | Gallery domain | keep `antiquemapsindonesia.com` canonical; `indiesgallery.com` stays a 301 alias; a brand move is a later, separate release | owner | 43.8 |
| **D9** | The design: which shared base and which accents per brand (the Design stage) | **no default** — the shape is answered (one shared base, distinct accents; see Answered); the owner still picks the base candidate and the accents in 13.1, with their draft as the lead candidate | owner | 13.1 |
| **D10** | Grading scale wording | VG+ · VG · G+ · G · Fair · As-is with A–D equivalents | curator | 8.2, 34.2 |
| **D11** | Returns policy text per seller | none published until drafted — the engine supports returns on every line | counsel | 20.4, 42.3, 43.3 |
| **D12** | Object storage provider | Cloudflare R2 | owner (account) | 5.1 |
| **D13** | Transactional email for each brand's domain | the brand's Google Workspace SMTP with SPF/DKIM/DMARC; a transactional provider if it has none | owner (DNS) | 5.1, 20.3 |
| **D14** | WhatsApp notifications provider — **needed before phase 27 opens**, because viewing reminders, payment instructions and order updates are promised on WhatsApp | if unanswered by then: click-to-chat only, every notification goes by email, and no copy promises a WhatsApp message | owner | 27.2 — before phase 27 opens |
| **D15** | Legacy passwords | no import; "claim your account" email (bcrypt rehash-on-login is a one-day option) | owner | 28.1, 36.3 |
| **D16** | AI cataloguing model provider | a production model behind the `ai.cataloguing` flag, human-verified; Ollama Cloud for development only (not a production dependency) | owner | 23.5 |
| **D17** | Staging tier after launch | staging stays on Helios `.gaiada.com`; Delphi `staging` branch only if wanted | owner | 44.2 |
| **D18** | Default locale per brand (served unprefixed) | English for both; Indonesian at `/id/…` | owner | 3.1 |
| **D19** | Photographer and the pilot shoot (the Design stage) | **no default** — the Design stage cannot finish its comps on today's single web JPEGs | owner (booking, budget) | 6.2 |
| **D20** | Native Indonesian copywriter | **no default** — the lexicon and the launch copy review need one | owner | 6.3 |
| **D21** | Buyers for the prototype test and usability runs (≈ 10 + 10 people) | collectors from the gallery's client list; shoppers recruited through the shop's Instagram | owner (introductions) | 13.2, 35.2, 32.2 |
| **D22** | Offers at launch | **non-binding offers** in v1: accept / counter / decline in the admin; an accepted offer becomes a hold and a private pay link. Binding offers (a contract on acceptance) are v2 | owner | 19.1 |
| **D23** | Print-on-demand abroad at launch | **not at launch** — export orders ship from Bali stock or local production, DAP; Prodigi / Gelato switch on in v2 behind the existing router | owner | 26.3 |
| **D24** | The item register — who compiles location and export status for every original, and by when | the gallery's staff, by the staging rehearsal (37.2); an original without a row publishes **enquiry-only** and sells nowhere online | owner (staff time) | 36.3 |
| **D25** | Dark production import of the gallery before the shop launches | yes, whenever the shop launches first — its sister links and original prices come from the gallery's archive API | owner (Helios go-ahead) | 42.7 |
| **D26** | Minimum print resolution for reproductions | **240 ppi** (≈ 37 cm long edge from today's 3543 px images); a product type may demand more | owner + print partner | 9.2, 15.4 |
| **D27** | FX source for derived prices | ECB reference rates, refreshed daily, plus the per-market buffer; each order stores the rate it used | accountant | 17.2 |
| **D28** | Newsletter sender | a bulk-sending provider for the newsletter and alerts (Workspace SMTP caps daily sends and would put transactional mail at risk); transactional mail stays per D13 | owner (account) | 29.2 |
| **D32** | What a retail partner gets at launch | an application approved by staff; a trade price tier and a minimum order as data; orders placed as quotes through the order builder (24.5) and paid by bank transfer or pay link; no self-serve wholesale cart until the trade portal (v2.7) | owner | 28.5 |
| **D29** | The Singapore seller selling Singapore-held stock to an Indonesian address | priced and charged in **IDR** (the rupiah rule governs what the buyer sees), card or bank transfer, import duties the buyer's (DAP) | tax adviser | 17.3, 25.1 |

### Owner actions (not questions)

| # | Action | Needed by |
| --- | --- | --- |
| **OA1** | ✅ 2026-09-28 — `gaiadabali/antique-map` (private, internal), deploy account `web-gaiada` (admin); `main` pushed | 1.1.f |
| **OA2** | The owner interview — at most 15 questions per brand | 6.1.b |
| **OA3** | Book a photographer and the pilot shoot (D19) | 6.2.b |
| **OA4** | A native Indonesian copywriter for the lexicon and the launch copy (D20) | 6.3.c, 42.6, 43.6 |
| **OA5** | Two or three Indonesian designers or buyers for the shop's cultural review | 12.2.a |
| **OA6** | Buyers for the prototype test and the usability runs — about 10 + 10 people (D21) | 13.2, 35.2, 32.2 |
| **OA7** | A commercial font licence, if a commercial face is chosen | 14.1.f |
| **OA8** | Go-ahead to provision staging on Helios; DNS for `ig.gaiada.com` and `oei.gaiada.com`; the object-storage account; Infisical entries | 5.1.b |
| **OA9** | **The export of the old catalogue** — a MySQL dump and the product-images folder, from whoever hosts the old site. We never log in to it. | 7.1.a |
| **OA10** | **The item register** — stock location and export status for every original (D24) | 36.3 |
| **OA11** | A Search Console export for `oldeastindies.com` | 7.3.a |
| **OA12** | The curator's review of the maker clusters and the category → facet mapping (about an hour) | 36.1 |
| **OA13** | Two observation sessions (a cataloguer, the shop manager), and the same people for the timed tests | 23.1.a, 38.2 |
| **OA14** | Sandbox accounts: Midtrans, Stripe Singapore, PayPal, Biteship, DHL Express (D3) | 19.3, 25.1, 25.2, 26.1, 26.2 |
| **OA15** | A WhatsApp Business account and provider (D14) | 27.2 |
| **OA16** | Merchant Center and Meta Commerce Manager access for each brand | 39.4 |
| **OA17** | Counsel's bilingual legal pages per seller; breach-response contacts; the data-protection-officer decision | 42.3.b |
| **OA18** | Go-aheads on Helios for the staging import, the gallery's dark production import and production provisioning | 37.2, 42.7, 41.2 |
| **OA19** | At launch: live payment and courier credentials; pointing `oldeastindies.com`, then `antiquemapsindonesia.com` and `indiesgallery.com`, at the new sites | 42.8, 43.8 |

### Answered

| # | Answer | Date |
| --- | --- | --- |
| **D43** | **The two archived `oldeastindies.com/sitemap.xml` captures may be read** through Wayback playback on web.archive.org (two requests; nothing sent to the old site) — 7.3.d. | 2026-09-30 |
| **D41** | **The gallery's old public pages may be read**, read-only and rate-limited (about one request every two seconds, robots.txt respected, no login, no form, no write), as MIGRATION.md §3's fallback while the export (OA9) is outstanding; raw output stays in `LEGACY_DATA_DIR`, outside git. | 2026-09-30 |
| **D42** | **Until the export (OA9) arrives, 7.1 works on a mock dump** — a synthetic Laravel-shaped MySQL dump committed as a fixture — so the restore, the schema notes and the extraction are proven; the real restore closes 7.1.a when the dump is handed over. | 2026-09-30 |
| **D44** | **Requirement 1.3 covers source, not docs:** no brand literal in code, styles or JSON a build compiles, bundles or serves under `engine/`; Markdown documentation (an app's `PRODUCT.md`, `DESIGN.md`) may name the brand it serves, and nothing a build reads may embed Markdown (CONVENTIONS.md §1; 4.3). | 2026-09-30 |
| **D39** | **The shop's want list is an email alert, no account:** a shopper saves a search with an email (double opt-in); alerts arrive by email with an unsubscribe link. Needs an additive contract change (C6 subscribe intent, C2 VM, C1 module variant) — a minor version per CONTRACTS.md, landed with the want-list task. | 2026-09-29 |
| **D40** | **"Forgot password" resends the approval link to an approved partner who has not set a password yet;** applicants never get a link, and a first password only comes from an approval link. | 2026-09-29 |
| **D37** | **Only the owner role moves a partner to another trade tier** (`change-tier`, audited), as D33 for the tiers themselves; approval assigning the default tier needs no such right. | 2026-09-29 |
| **D38** | **Consent rule for all tracking stays as ANALYTICS.md §1:** the first-party cookieless beacon counts events (no personal data, no cross-site ids) before consent; GA4 and Meta fire only after consent. D35's wishlist events follow it. | 2026-09-29 |
| **D33** | **Trade tiers** default from the brand config; only an **owner-role** CMS user may override them, every change audited; editors never can. | 2026-09-28 |
| **D34** | **An ended partnership deactivates the retailer's account** — it can no longer sign in; its orders and history stay with the owner (the products are the owner's; partners help sell them). No former-partner area. | 2026-09-28 |
| **D35** | **The shop's wishlist lives on the guest's device** (no account), and every wishlist action is tracked for marketing — within the consent rules of ANALYTICS.md §1 (see D38). | 2026-09-28 |
| **D36** | **One Partnership programme for every business buyer** — retail shops, hotels, villas, cafés and companies alike apply as partners; there is no separate "For Business" path or header item on the shop. | 2026-09-28 |
| **D30** | **The gallery keeps online sales** (reserve, checkout, offers and pay links as planned). The design project note of 11 Sept 2026 recorded "no transactions, enquiry by email form only"; the owner confirmed that note is superseded. | 2026-09-28 |
| **D31** | **Old East Indies: shoppers buy as guests; accounts are for retailers only**, through a Partnership page (a highlight in the home hero and a **Partnership** header item; sign-up or sign-in at the page's last section). The client's decision of 11 Sept 2026, confirmed. Changes 28.1, 28.2, 29.3; adds 28.5 and 1.2.l. | 2026-09-28 |
| **D9 (shape)** | **One shared base, distinct accents:** both sites share layout, components, buttons and type — **Cormorant Garamond + Karla**, which the client asked to keep — and differ in palette and signature details (C3's overridable subset). References: Etalage and Everart, mixed, not copied. The owner's draft (`docs/design/input/claude-design-2026-09/`) is the lead candidate, draft input only. Phases 12–14 reworded. | 2026-09-28 |

## How to update this file — the rule

This file is how the owner sees progress without asking. **It is updated as work happens, not afterwards.**

1. **Opening a phase:** only when every phase its heading **needs** is ✅ and fewer than three phases are open. Check its 👤 items are in hand first; a task that would stall waits in the phase rather than holding an agent.
2. **Dispatching a task:** append `— 🔄 17·W2` (its phase and wave) to the task line and add its row to **Now**. A wave is dispatched only when every earlier wave of its phase is merged.
3. **Finishing a subtask:** when an agent's report evidences it, tick it `[x]` **in this file in the main checkout** — never in a worktree's copy — and run `node scripts/progress.mjs`. Re-read the file just before each edit.
4. **Finishing a task:** only when every subtask is ticked, its **Check** passed on merged `main` and `qa` has driven it. Tick the task line, replace `🔄 …` with `✅ YYYY-MM-DD <short sha>`, add one line to the top of **Log**, update **Now**.
5. **Closing a phase:** when every task in it is ✅, `qa` opens the phase's **Done when** on merged `main` (a production build, a phone viewport) and the orchestrator logs `✅ phase N — <evidence>`. The stage gate later drives every phase of its stage again, together.
6. **Blocked:** append `— ⛔ <reason>` (an owner item: `— ⛔ 👤 D14`), note it in **Now**, and move on to the next unblocked task or phase.
7. **New work:** add it as a subtask, or as a new task at the end of its phase, with the next free id. A phase that would pass eight tasks or three waves gets a **new phase** instead, numbered after the last one and placed by its needs. **Never delete a task** — a dropped one gets `— ✂️ cut: <reason>` and stops counting.
8. **Size a task before dispatch:** one agent, about a day, at most six subtasks plus its Check. A larger one is split first — the contract freeze (1.2: two architects, fourteen commits, two review rounds) is the example not to repeat.
9. **Agents never edit this file.** They report (PARALLEL-TRACKS.md §5); the orchestrator ticks. A solo session outside a wave may tick its own task.

**What "done" means here:** the **Check** is evidenced — a test name, a command output, or a screenshot of the opened screen on a production build (CONVENTIONS.md §11). A UI is shown at 390 px and 1280 px with axe clean (360/390/768/1440 in a design gate). A library passing its own tests is not done.

## Session protocol — the orchestrator

Paste this into a Claude Code session opened at the repo root:

> You are the orchestrator for the Indies Platform. Read `AGENTS.md`, then `TASKS.md` and `.claude/specs/indies-platform/DISPATCH.md`.
>
> 1. List the open phases (needs ✅, not every task ✅). If fewer than three are open, open the next phase whose needs are ✅, lowest number first, and check its 👤 items are in hand.
> 2. In each open phase, take its first wave that is not all ✅. Once the tasks-lint gate has landed (2.2), run `pnpm tasks:lint --phase <n> --wave <k>` and fix the plan if it is red.
> 3. Dispatch one agent per task in that wave with the DISPATCH.md prompt — `model: "opus"`, `isolation: "worktree"` — mark each task 🔄 here, with a row in **Now**.
> 4. As reports arrive, tick the evidenced subtasks here and run `node scripts/progress.mjs`.
> 5. Merge each branch in a clean worktree, run the full gate, have `qa` drive the user-visible criteria, then close the tasks (✅ date sha), update **Now** and add to **Log**. When a phase's last task closes, have `qa` open its **Done when** and log the phase.
> 6. Ask the owner for 👤 items with options and a recommendation; record the answers under **Decisions**.
> 7. Never touch the current live sites, and never write to Helios, DNS or production credentials without the owner's go-ahead.

Each agent's prompt, and the before- and after-wave checklists, are in [DISPATCH.md](.claude/specs/indies-platform/DISPATCH.md).

## Legend

👤 needs the owner (an agent cannot finish it — PARALLEL-TRACKS.md §7) · 🔄 in flight · ✅ done · ⛔ blocked · ✂️ cut · **Lane** codes and file ownership are [PARALLEL-TRACKS.md §1](docs/PARALLEL-TRACKS.md) · agent types are the project's subagents (`architect`, `devops`, `senior-be`, `senior-db`, `senior-fe`, `senior-uiux`, `senior-integrator`, `medior`, `junior`, `qa`).

**Ids, phases and waves.** A task is `N.M` — task M of phase N; its subtasks are `N.M.a`, `N.M.b`… and the last one is always the **Check**. A phase heading reads `Phase N — title · stage · needs … · ~size`. A wave is local to its phase — **W1, W2, W3** — and written `N·Wk` outside it; a task never shares a wave with a task it depends on. `needs:` lists tasks (`17.1`), subtasks (`1.2.f`, that one only) or whole phases (`phase 10`, gate included). Contract files (`@contract`, C1–C13) stay ARC's even inside a folder a task owns.

---

## Phase 1 — Repository, contracts and agent workspace · Foundation · needs — · ~1.5d

**Goal:** the workspace and its verify gate, the frozen contracts C1–C13 every lane builds against, and the worktree helper agents work in.
**Done when:** a fresh clone runs `pnpm install && pnpm verify` green; every contract compiles, is marked `@contract` with an owner and is signed off by its reviewers; `pnpm worktree` gives an agent its own branch, port and database suffix.
**Waves:** W1 — 1.1, 1.2 · W2 — 1.3

- [x] **1.1 Initialise the repository and pnpm workspace** · needs: — — ✅ 2026-09-28 f7e32c1
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - **Owns** root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.gitattributes`, `.editorconfig`
  - **Read** ARCHITECTURE.md §3–4, CONVENTIONS.md §9
  - _Requirements: 1.2, 19.3_
  - [x] 1.1.a `git init`; `.gitignore` (node_modules, `.next`, `.env*` except `.env.example`, `*/db/`, `*/content/legacy/raw/**` — the old site's raw extracts live in `LEGACY_DATA_DIR`, never in git, while mapping files and URL inventories under `content/legacy/` **are** committed — `test-results/`, `TASKS.md.lock`); `.gitattributes` forcing LF (CRLF breaks deploy scripts — GDA memory); the first commit holds the planning docs, `TASKS.md` and `scripts/progress.mjs` as they stand
  - [x] 1.1.b `pnpm-workspace.yaml` listing `engine/apps/*`, `engine/packages/*`, `engine/tooling`; `allowBuilds` for sharp, esbuild, @tailwindcss/oxide, unrs-resolver
  - [x] 1.1.c root `package.json`: `packageManager` pnpm 11 pinned, `engines.node >=22`, scripts `verify`, `dev`, `build`, `test`, `test:e2e`, `lhci`, `db:*`, `brand:create` (delegating to tooling)
  - [x] 1.1.d `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `@engine/*` paths) and a per-package tsconfig template
  - [x] 1.1.e ESLint 9 flat config + typescript-eslint + Prettier; import-boundary rules: apps may not import `payload` outside `(payload)`, packages may not import apps, `view-models` has no runtime dependencies
  - [x] 1.1.f 👤 owner creates the GitHub repository under the organisation and grants the deploy account write access; first push
  - [x] 1.1.g **Check:** a fresh clone on Windows and Linux runs `pnpm install && pnpm verify` green with the empty workspace.

- [x] **1.2 Freeze the contracts C1–C13** · needs: — — ✅ 2026-09-29 e16d73b
  - **Lane** ARC · **Agent** architect ×2, types and docs only — **ARC-P** (platform and UI: 1.2.a–1.2.d, 1.2.h, 1.2.i) and **ARC-D** (domain: 1.2.e–1.2.g, 1.2.j); ARC-P writes 1.2.k · **Wave** W1
  - **Owns** ARC-P: `engine/packages/config/src/{schema,routes}.ts`, `engine/packages/view-models/**`, `engine/packages/ui/src/tokens/contract.ts`, `engine/packages/media/src/contract.ts`, `engine/packages/http/src/manifest.ts`, `engine/packages/CONTRACTS.md` · ARC-D: `engine/packages/domain/src/{money/contract.ts,contracts/**,*/machine.ts,reservations/contract.ts}`, `engine/packages/{payments,shipping,fulfilment,analytics,sister}/src/contract.ts` · each: `engine/packages/<pkg>/{package.json,tsconfig.json}` skeletons (the tsconfig extending the 1.1 template) of the packages it touches
  - **Read** PARALLEL-TRACKS.md §4, BRANDS.md, CONTENT-MODEL.md, COMMERCE.md, PAYMENTS.md §2–4, ARCHITECTURE.md §6, §9, §11, DESIGN-SYSTEM.md §2–5
  - _Requirements: 1.2, 2.7, 3.1, 8.4, 9.1, 10.4, 11.1_
  - [x] 1.2.a C1 `BrandConfig` zod schema: identity, domains, storefront, tokens, locales, routes, ids, money/markets and rounding, sellers (serves, tax, charge currencies, payments, method order, card ceiling, insured threshold, document prefix), commerce (inventory models, named TTLs, purchase tiers), shipping, fulfilment, analytics ids (runtime), modules (a typed registry with descriptions — `hasModule()` keys), sisters
  - [x] 1.2.b C2 view models for every surface in DESIGN-SYSTEM.md §2 + `ShellVM` (with the runtime analytics ids and brand assets); typed fixtures (`item-unique`, `item-sold-with-alternative`, `item-on-hold`, `item-price-on-request`, `item-enquiry-only`, `item-variants`, `listing`, `design`, `cart`, `checkout-id`, `checkout-export`, …); `loadItem` returns `{ vm } | { redirectTo } | null`
  - [x] 1.2.c C3 token contract (DESIGN-SYSTEM.md §4) + the overridable subset
  - [x] 1.2.d C4 block union (15 blocks, DESIGN-SYSTEM.md §5 — incl. `zoomFigure`, `compare`, `shoppableImage`, and note marks in `prose`) with prop shapes; C2 also carries the viewer-relative `ItemVM.purchase` states, the `book` part, and the `Pay`, `Quote`, `OrderLookup`, `Source`, `Exhibition`, `Location`, `Ig`, `GiftCard` and `NewsletterArchive` view models
  - [x] 1.2.e C5 `Money` (safe-integer minor units), `PriceSet`, the pricing-pipeline step signature and the named rounding points; C6 commerce API request/response shapes (cart, ship-to, checkout, offer, hold, enquiry, price request, consignment, appointment, return request, order lookup, quote)
  - [x] 1.2.f C7 `PaymentGateway` (incl. `sessionTtl`, `capture?`, `cancel?`, `retrieve()` and the `providerEventId` rule per adapter), `ShippingProvider`, `FulfilmentProvider`, normalised events (PAYMENTS.md §2–4)
  - [x] 1.2.g C8 state-machine tables as types — order, payment, reservation, availability (derived), offer — the domain-event names they emit, and the service signatures `reserve()` (`reserve` · `extend` · `release` · `convert` · `reverse`) and `applyPaymentEvent()`
  - [x] 1.2.h C9 media artefacts (derivative names and sizes, public 512 px tile cap, private full-resolution prefix, `print-files/` prefix, master access)
  - [x] 1.2.i C10 route map — per-locale segments, facet vocabularies, legacy prefixes, `href(surface, params, locale)`; C13 HTTP handler manifest — every `/api/x/*` route and the literal proxy `matcher`
  - [x] 1.2.j C11 analytics event names (ANALYTICS.md §2); C12 sister work snapshot (published fields only) + webhook events
  - [x] 1.2.k `engine/packages/CONTRACTS.md`: how a contract changes (versioned, announced to consuming lanes, ARC approval)
  - [x] 1.2.l The shop's Partnership surface and retailer accounts (D31, 2026-09-28): a `partnership` route in C10, `PartnershipVM` and the retailer account VM in C2, the retailer application intent in C6, and `retailer` pricing as a tier C5/C6 can carry — routed to ARC-P and ARC-D before phase 1 closes
  - [x] 1.2.m **Check:** every contract compiles, is marked `@contract` with an owner, every fixture type-checks against its view model, and a senior-be and a senior-fe reviewer have signed off in the report.

- [x] **1.3 Agent workspace** · needs: 1.1 — ✅ 2026-09-28 6b30621
  - **Lane** HAR · **Agent** junior · **Wave** W2
  - **Owns** `engine/tooling/worktree/**`, `.claude/skills/**`, `.claude/agents/impeccable-*`
  - **Read** PARALLEL-TRACKS.md §3
  - _Requirements: 19.7_
  - [x] 1.3.a worktree helper script (`worktree` and `worktree:env`)
  - [x] 1.3.b copy the impeccable skill and its agents from Kingdom of Indonesia into `.claude/` (the design workflow the Design stage uses)
  - [x] 1.3.d `.claude/**` ignored by ESLint (as by Prettier); the skill's engine binary gitignored (the launcher downloads and verifies it); the five browser scripts committed unchanged
  - [x] 1.3.c **Check:** `pnpm worktree <phase> <lane>` creates a worktree + branch + `.env.local` with a unique `PORT` and database suffix, `pnpm worktree:env <phase> <lane>` does the `.env.local` part inside a worktree that already exists (agents dispatched with `isolation: "worktree"`), and an agent in either can `db:fresh` and `dev` without touching another worktree. — worktree, branch, unique `PORT`/`DB_SUFFIX` (`p<phase>_<lane>`) and `worktree:env` proven (10 Vitest tests, throwaway-repo runs); the `db:fresh`/`dev` clause moved to 2.1.b/2.1.d, which build those commands

---

## Phase 2 — Local infrastructure, quality gates and CI · Foundation · needs 1 · ~1.5d

**Goal:** Postgres, mail and object storage on a laptop; every quality gate; CI and the release artifact.
**Done when:** `pnpm db:fresh` creates a brand database with `unaccent` and `pg_trgm`; every gate fails on a planted violation and passes once it is removed; a push to `main` runs CI green and a push to `production` runs the release workflow (its tarball of both standalone builds is proven at 4.1.g, once the apps exist).
**Waves:** W1 — 2.1, 2.2, 2.4 · W2 — 2.3

- [x] **2.1 Local infrastructure and database scripts** · needs: 1.1 — ✅ 2026-09-29 463bd91
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - **Owns** `docker-compose.dev.yml`, `.env.example`, `engine/tooling/db/**`
  - **Read** DEPLOYMENT.md §1, §8
  - _Requirements: 1.1, 19.7_
  - [x] 2.1.a compose: `postgres:18` with an init script enabling `unaccent`, `pg_trgm`; Mailpit; MinIO with bootstrap buckets `ig-media`, `oei-media`, `test-media`, `archive-masters`
  - [x] 2.1.b `db:fresh --brand <slug> [--suffix <lane>]` (`--suffix` and the port default to `DB_SUFFIX`/`PORT` in `.env.local`, written by 1.3's `pnpm worktree:env`; add both to `.env.example`), `db:drop`, `db:list` (create, migrate, seed — seed hook no-op until 10.2)
  - [x] 2.1.c `.env.example` documenting every variable in DEPLOYMENT.md §8, grouped, with safe local defaults
  - [x] 2.1.d **Check:** `docker compose -f docker-compose.dev.yml up -d` then `pnpm db:fresh --brand test --suffix smoke` creates a database with `unaccent` and `pg_trgm` on Windows (Docker Desktop) and in CI; and two worktrees made by `pnpm worktree` each run `db:fresh` against their own suffix without touching the other (1.3.c's deferred clause). — Docker Desktop: `test_smoke` has `unaccent` 1.1 and `pg_trgm` 1.6 (template1 carries both); two `pnpm worktree` checkouts made `test_p2_zza` and `test_p2_zzb`, and a table in one was absent from the other; the CI clause moved to 2.3.d, which builds CI

- [x] **2.2 Quality-gate tooling** · needs: 1.1 — ✅ 2026-09-29 13a56d8
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - **Owns** `engine/tooling/{check-file-size,lint-brand-literals,schema-hash,route-parity,tasks-lint,config-drift,brand-create}/**`, `vitest.config.ts` (Vitest 5 has no workspace file — `test.projects`; found in 1.1), `playwright.config.ts`, `lighthouserc*.json`, root `package.json` (scripts and devDependencies for its gates only; the only task in its wave touching it)
  - **Read** CONVENTIONS.md §1–2, BRANDS.md §6–7, ARCHITECTURE.md §2, §11, DESIGN-SYSTEM.md §7, PARALLEL-TRACKS.md §2, §5
  - _Requirements: 1.3, 1.5, 1.6, 1.7, 1.8, 19.1, 19.3_
  - [x] 2.2.a `check-file-size` (port KOI's `scripts/check-file-size.mjs`; 300 lines over `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.css` in `engine/` and `scripts/`; generated files, migrations and fixtures excluded — CONVENTIONS.md §2)
  - [x] 2.2.b `lint-brand-literals`: banned terms read from each brand folder's config (slug, names, domains); scans `engine/**`; excludes generated migrations, fixtures with catalogue text, `.env*`
  - [x] 2.2.c `schema-hash`: normalised `pg_dump --schema-only` → sha256 per database; `--all` compares every brand database
  - [x] 2.2.d `route-parity`: reads the `@engine/http` manifest (C13) and fails if an app lacks a mounted `/api/x/*` route, if an engine route's first segment after `/api/` — `x` for every engine route, `health` for the health route; none for `/brand-assets/…` — equals a collection slug, `payload-jobs` or `graphql`, so no collection may be named `x` or `health` (3.5.a), or if an app's `proxy.ts` matcher differs from the manifest's literal
  - [x] 2.2.e Vitest workspace; Playwright projects `{ig, oei, test-gallery, test-emporium} × {desktop, mobile}` with axe; LHCI configs per app with the DESIGN-SYSTEM.md §7 budgets
  - [x] 2.2.f `tasks-lint`: parses the root `TASKS.md` — unique ids, every `needs:` resolvable (a task, a subtask, a range or "phase N"), every phase heading's needs earlier-numbered and equal to what its tasks need from outside it, no task sharing a wave with its own dependency, no two tasks in one wave with overlapping **Owns**, at most eight tasks and three waves per phase, every task ending in a **Check** subtask, every requirement covered; `--phase <n> --wave <k>` checks one wave against the ticked boxes, including that the phase's needs are ✅
  - [x] 2.2.g `config-drift` (`pnpm check:generated`): regenerates the migration snapshot, the one `engine/packages/cms/payload-types.ts` and both apps' `importMap.js` **with `BRAND` unset** and once per brand, and fails on any diff (ARCHITECTURE.md §2)
  - [x] 2.2.h `brand:create <slug> --storefront gallery|emporium`: scaffolds `<slug>/site/` from the matching `test` config with `"draft": true`, database and bucket names, and a copy folder; the result passes `validateBrandConfigs()` (Req 1.7)
  - [x] 2.2.j move the contract smoke tests from `.claude/specs/indies-platform/reviews/smoke-tests/` (C1 config, the C10 round trip, the C13 addresses) into their packages so `pnpm test` runs them (qa, phase 1: no contract package has a test in the gate)
  - [x] 2.2.i **Check:** each gate fails on a planted violation in a CI test (a 301-line file, a brand literal in `engine/`, a drifted schema, a missing route, an engine route shadowing a collection slug, a proxy without a literal matcher, a config that differs with `BRAND` unset, a stale import map, a wave with overlapping **Owns**) and passes once it is removed; `pnpm brand:create` scaffolds a brand that validates.

- [x] **2.3 CI pipeline, artifact and deploy manifest** · needs: 2.1, 2.2 — ✅ 2026-09-29 2c4ecd9
  - **Lane** HAR · **Agent** devops · **Wave** W2
  - **Owns** `.github/**`, `.gaiadeploy.yml`
  - **Read** DEPLOYMENT.md §3–4
  - _Requirements: 1.4, 1.5, 19.4, 19.7_
  - [x] 2.3.a `ci.yml`: change detection; static job (file size, brand literals, `check:generated`, `validateBrandConfigs()`, `tasks:lint`, format, lint, types, unit); e2e job (Postgres service, migrate the four databases — ig, oei and the two `test` configs — seed, build both apps **with no database env**, Playwright for ig/oei/test-gallery/test-emporium); Lighthouse job
  - [x] 2.3.b `artifact` job: build `engine/apps/gallery` and `engine/apps/emporium` standalone, assemble subdirs with `sharp`/`@img` copied beside the server, tar + sha256; `publish` job creating the release (use the GDA deploy-workflows stub pinned by tag, if it fits)
  - [x] 2.3.c `.gaiadeploy.yml` with the two Helios targets and `subdir` (DEPLOYMENT.md §3); a CI check that fails on the string `TBD`
  - [x] 2.3.d **Check:** a push to `main` runs static checks, unit and e2e jobs green, and the e2e job's databases have `unaccent` and `pg_trgm` (2.1.d's CI clause); a push to `production` runs the release workflow, which says it has no app to build and publishes nothing. The tarball clause — a `deploy/production-*` release holding `indies-gallery/` and `old-east-indies/` standalone builds with their brand `site/` folders and a `.sha256` — moved to 4.1.g, the first point at which both apps exist. — CI run 36519600189 on `main` at 2c4ecd9: static, unit, e2e and Lighthouse green; `db:fresh` made the four databases and each reports `pg_trgm,unaccent`; `schema-hash --all` ok. Release run 36519473034 on `production` at cecf862: the artifact job said it had no app to build, publish skipped, no release created.

- [x] **2.4 Contract follow-ups (v1.1)** · needs: 1.2 — ✅ 2026-09-29 e2e10ae
  - **Lane** ARC · **Agent** architect · **Wave** W1
  - **Owns** the contract files of 1.2 (`engine/packages/**` contract files, `engine/packages/CONTRACTS.md`) and the doc sections they change
  - **Read** `.claude/specs/indies-platform/reviews/1.2-arc-d-senior-fe.md`, `1.2l-senior-fe.md`, `1.2l-senior-be.md`, `1.2-arc-d-fix-report.md`, `1.2-arc-p-fix-report.md`
  - _Requirements: 1.2_
  - [x] 2.4.a the should-fix rows 3–17 of the senior-fe review of the domain contracts (order-line snapshot, `QuoteView.buyer`, payment-option UX fields, money display and the exponent note, form decoding and idempotency keys, buyer-facing order status, analytics props the page can know, lead counting, C12 per-market prices and the shop → gallery prints feed)
  - [x] 2.4.b D39's want-list contract (C6 subscribe intent with double opt-in, C2 VM, C1 module variant) and C6 `api.ts`'s "read once" wording aligned with C13 `FORM_RESULT`
  - [x] 2.4.c doc sync: "For Business"/wholesale remnants (22.3.d, 31.1, COMMERCE §3, CONTENT-MODEL, PLAN, C6 `EnquiryTopic`), ANALYTICS §2 (`item.unsaved`, retailer events), COMPLIANCE §7 (application retention, counsel to confirm), DESIGN-SYSTEM §3–4, DEPLOYMENT §8, ARCHITECTURE §6, PAYMENTS §4, CONTENT-MODEL §4–5, design.md sketches, and the task checks the fix reports list
  - [x] 2.4.d **Check:** every contract bumped to v1.1 with a CONTRACTS.md changelog entry; `pnpm verify` green; one senior-fe and one senior-be pass sign it off. — all of C1–C13 at v1.1 with the changelog's v1.1 entry and its "sign-off fixes" (2.4.e, 2.4.f); `pnpm verify` green at e2e10ae (203 tests); senior-be signed off in its confirmation round, and senior-fe's last blocker (B2, the pay and order poll scopes) closed by `_NoLookupTokenInThePayPoll` and `_NoPayLinkTokenInTheOrderPoll`, the condition its review set for sign-off (`.claude/specs/indies-platform/reviews/2.4-senior-{be,fe}.md`).

---

## Phase 3 — Config spine and Payload boot · Foundation · needs 2 · ~1d

**Goal:** brand configs loaded and validated, i18n and the proxy helpers, and one brand-independent Payload config.
**Done when:** each brand's config loads and a broken one is refused with the field named; `bootCheck()` refuses a missing secret; `/admin` logs in against two different databases whose schema hashes are equal.
**Waves:** W1 — 3.1 · W2 — 3.2, 3.3, 3.4 · W3 — 3.5

- [x] **3.1 Platform spine: config loader, i18n, proxy helpers, brand folders** · needs: 1.2.a, 1.2.i — ✅ 2026-09-30 ff71f66
  - **Lane** PLT (+ BRD for brand folders) · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/config/src/{loader,validate,boot-check}/**`, `engine/packages/i18n/**`, `engine/packages/http/src/proxy/**`, `indies-gallery/site/**`, `old-east-indies/site/**`, `test/site/**`
  - **Read** BRANDS.md §3–4, ARCHITECTURE.md §2, §11, COMPLIANCE.md §1
  - _Requirements: 2.1, 2.2, 2.4, 18.1, 18.2_
  - [x] 3.1.a `loadBrandConfig()` from `BRAND_ROOT` / `BRAND` → `<brand>/site/brand.config.json` (for `test`, the file `TEST_STOREFRONT` names); **`validateBrandConfigs()`** for CI — every committed config: schema, modules ⊆ the app's `supports`, a rounding rule per currency, sellers covering every market, `retention.wantList` only together with `accounts.buyers` **and** `retention.emailWantList` (D39) — and **`bootCheck()`** at process start — environment, per-seller provider secrets present, `LINK_TOKEN_KEYS` a well-formed ring (C6 `links`: exactly one current key, a unique `kid` each, secrets of 32 random bytes or more and none of one repeated byte, retirement days not in the future), sandbox vs live, loader source; the CMS-global merge seam with file fallback and a logged reason
  - [x] 3.1.b `@engine/i18n`: locales, the message-key loader (keys from the app, **values from `<brand>/site/copy/{en,id}.json`**), `formatMoney`, `formatDate` with precision, `formatDimensions` (mm + inches)
  - [x] 3.1.c proxy helpers — **rewrites only**: locale resolution (default unprefixed), route-map rewrites for localised segments and facet vocabularies (C10), 404 for internal paths, legacy-prefix rewrite to `/api/x/legacy/…` (the handler answers 404 until 36.4), admin-in-English default (KOI)
  - [x] 3.1.d draft brand configs for `indies-gallery`, `old-east-indies` and `test` (two configs, `brand.gallery.json` and `brand.emporium.json`) with staging domains, sellers with clearly fictional placeholder legal entities flagged `"draft": true` (owner fills real values later — D1–D3), and empty `copy/` folders
  - [x] 3.1.e **Check:** `BRAND=test TEST_STOREFRONT=gallery` loads and validates; `validateBrandConfigs()` rejects a broken committed config with a readable message naming the field, including a `retention.wantList` brand missing `accounts.buyers` or `retention.emailWantList`; `bootCheck()` refuses to start on a missing secret (a missing or malformed `LINK_TOKEN_KEYS` included: no current key or two, a repeated `kid`, a short secret or the vectors' test key, a future retirement day), a sandbox key in production or `LOADERS_SOURCE=fixtures` in production; formatter tests pass — IDR has no decimals, `c. 1750`, 450 mm → 17¾ in, `formatMoney` pins every currency's fraction digits to `CURRENCY_EXPONENT` and never the runtime's ICU default, and a display estimate renders with none at all; the proxy serves the default locale unprefixed and `/id/…` prefixed, answers 404 for internal paths, rewrites legacy prefixes to `/api/x/legacy/…`, never touches the database, and redirects nothing at the root by `Accept-Language`. — qa on `main` at ff71f66, by its own probes: all four configs load and validate; 16 planted breakages each refused naming the field; 41 bootCheck scenarios refused as specified, 0 secrets in any report; 0 fraction-digit mismatches over 6 currencies × 3 locales, also under a patched ICU; the proxy with no DATABASE_URL and sockets patched to throw made 0 network calls over ~70 requests, no `Location` on any, spoofed `x-public-path`/`x-locale`/CSP headers overwritten, module-off surfaces not found. The 404 status itself is 4.1.e's (the proxy rewrites to `/<locale>/not-found`).

- [x] **3.2 Payload bootstrap: one brand-independent config, staff users, migrations in the web process** · needs: 2.1, 3.1.a — ✅ 2026-09-30 58bf19f
  - **Lane** SCH · **Agent** senior-be · **Wave** W2
  - **Owns** `engine/packages/cms/src/{payload.config.ts,collections/users,access,migrations,db,registries}/**`, `engine/packages/cms/package.json`
  - **Read** ARCHITECTURE.md §2, §6, §10, §12, DEPLOYMENT.md §3–4, PARALLEL-TRACKS.md §1 (registries), KOI `src/lib/cms/db-adapter.ts`
  - _Requirements: 1.1, 1.5, 1.8, 3.6, 19.7_
  - [x] 3.2.a `buildConfig()` — **brand-independent** (ARCHITECTURE.md §2): Postgres adapter from `DATABASE_URL`, `push: false`, the superset locales `en`/`id`/`nl`, every collection registered whatever the modules (flags only set `admin.hidden` and access), the S3 storage adapter with `alwaysInsertFields: true` (MinIO locally), nodemailer (Mailpit locally); `BRAND` may set only the server URL, CSRF/CORS, email sender and admin branding (through runtime-reading admin components, not config values)
  - [x] 3.2.b `users` collection with the seven roles (default `contributor`), access helpers — including **`publishedOrStaff`** (the public sees `_status: 'published'` only) and field-level `staffOnly` — first-user flow, lockout
  - [x] 3.2.c initial migration (creating `unaccent` and `pg_trgm`) + `prodMigrations` wiring gated by `RUN_MIGRATIONS=1` and `pg_advisory_lock`; the "No schema changes detected" check script
  - [x] 3.2.d `generate:types` writing the one `engine/packages/cms/payload-types.ts` both apps read, and `generate:importmap` per app (checked by 2.2.g)
  - [x] 3.2.e the `db/` DDL seam — engine tables (in `public`, under plain names) and indexes Payload cannot express, declared through the adapter's `afterSchemaInit` / `extendTable` so migrations carry them — proven with one engine table; `registries/collections.ts` registering every frozen slug (CONTENT-MODEL.md) as a stub, and the `registries/{jobs,views,plugins}.ts` that import each package's barrel (PARALLEL-TRACKS.md §1)
  - [x] 3.2.g each frozen slug's stub in its own `collections/<slug>/index.ts`, which `registries/collections.ts` imports, so a collection task (8.x–9.x, 17.1) edits only the folder its **Owns** names and never the registry; likewise `db/engine-tables.ts` imports each area's `db/<area>.ts` (PARALLEL-TRACKS.md §1)
  - [x] 3.2.f **Check:** both apps' `/admin` log in against two different databases; `push: false` is set; migrations apply only in a production build (`NODE_ENV=production`) with `RUN_MIGRATIONS=1`, under an advisory lock, when `/api/health` first calls `getPayload()`; the config generated with `BRAND` unset equals every brand's (2.2.g); and `schema-hash --all` is equal for the ig, oei and test databases. — qa on `main` at baff54b: a throwaway Next 16.3.6 production build (built with no database, brand or secret) signed in at `/admin` against the ig and oei databases at a 390 px viewport, IG's credentials refused on OEI; `push` false in every mode; migrations only in a production build with `RUN_MIGRATIONS=1` — two `next start` processes raced on one empty database, one migrated under the lock, one row in `payload_migrations`; `check:generated` no drift over 5 contexts; `schema-hash` equal over the four databases; 8 rounds of concurrent demotions and every bulk form left an admin, first-register races made one admin; 38 public and signed-in REST reads leaked no draft or staff-only field. **The two-apps and `/api/health` parts moved to 4.1.g.**

- [x] **3.3 Tooling follow-ups from 3.1: a valid brand scaffold and a dev link-key ring** · needs: 3.1 — ✅ 2026-09-30 63ad811
  - **Lane** HAR · **Agent** devops · **Wave** W2
  - **Owns** `engine/tooling/brand-create/**`, `engine/tooling/worktree/**`, `engine/tooling/tasks-lint/**`, `.env.example`, root `package.json` (the `verify` script only)
  - **Read** 3.1's report (Follow-ups F3, F5; the Log line of 2026-09-30); BRANDS.md §6; DEPLOYMENT.md §8; C1 (`config/src/schema*`) and C6 `links`
  - _Requirements: 1.7, 19.7_
  - [x] 3.3.a `brand:create`'s scaffold satisfies C1's rupiah rule (an `ID` market in IDR, an IDR rounding ladder and buffer, the seller charging IDR), `createBrand` validates with `validateBrandConfig()` from `@engine/config/validate` rather than the schema alone, and the CLI's "does not exist yet — 3.1" message goes
  - [x] 3.3.b `worktree:env` writes a fresh random `LINK_TOKEN_KEYS` ring (one current `dev` key of 32 random bytes) into `.env.local` when absent; `.env.example` documents `LINK_TOKEN_KEYS`, `LOADERS_SOURCE` and the provider `*_MODE` variables bootCheck reads
  - [x] 3.3.d `tasks-lint` accepts the board's own status suffixes on a task line — `— 🔄 N·Wk`, `— ⛔ <reason>`, `— ✂️ cut: <reason>` — as well as `— ✅ date sha` (today only ✅ parses, so a dispatched task fails `needs-resolvable`)
  - [x] 3.3.e `pnpm verify` runs the gates DISPATCH.md says it does — `check:filesize`, `lint:brand-literals`, `check:routes`, `check:generated`, `tasks:lint` — after format, lint, types and unit (today it runs only the last four, so a merge can pass `verify` with a gate red)
  - [x] 3.3.c **Check:** `pnpm brand:create` for each storefront scaffolds a brand that passes `validateBrandConfigs()` (a test); a new worktree's `.env.local` carries a ring that `bootCheck()` accepts, and re-running `worktree:env` keeps it; a task line marked 🔄, ⛔ or ✂️ lints clean (a test); `pnpm verify` green. — merged at 63ad811: `pnpm verify` (now every gate) exit 0, 388 tests; `brand:create` for gallery and emporium printed "validated with validateBrandConfig()"; `worktree:env` added a ring, a second run kept it (`.env.local` sha1 unchanged); `status.test.mjs` lints 🔄, ⛔ and ✂️ lines clean; `runBootCheck()` accepts a fresh worktree's ring (`link-keys.test.mjs`).

- [x] **3.4 Contract follow-ups from the 3.1 reviews (v1.2)** · needs: 3.1 — ✅ 2026-09-30 58bf19f
  - **Lane** ARC · **Agent** architect · **Wave** W2
  - **Owns** `engine/packages/config/src/boot-check/**` and `engine/packages/config/src/loader/redact.ts` (3.1 closed; for 3.4.b and 3.4.f), the contract files of C1, C10 and C13 (`engine/packages/config/src/{schema,routes}{.ts,/**}`, `engine/packages/config/src/constants/**` (new), `engine/packages/http/src/manifest{.ts,/**}`), the `@engine/config` package.json `exports`, the two C5 imports in `engine/packages/i18n/src/{locales,money}.ts` and `engine/packages/i18n/test/client-safe.test.ts`, `engine/packages/CONTRACTS.md`, and the doc sections named below
  - **Read** `.claude/specs/indies-platform/reviews/3.1-senior-{be,fe}.md`; CONTRACTS.md (minor versions); DESIGN-SYSTEM.md §7; COMMERCE.md §2; DEPLOYMENT.md §1, §8; PAYMENTS.md §8; MIGRATION.md §6
  - _Requirements: 1.2, 2.1_
  - [x] 3.4.a a zod-free `@engine/config/constants` leaf (`LOCALE_CODES`, `LocaleCode`, `CURRENCY_EXPONENT`, `CurrencyCode`) that `schema/*` re-exports; `@engine/i18n` imports it, and `client-safe.test.ts` asserts the root entry reaches no `zod` (fe #1: 31.9 KB gzip today)
  - [x] 3.4.b C1 additions: `sellers[].shipping?` defaulting to the brand's providers, and bootCheck's per-seller secrets following it (be #2, DEPLOYMENT §8); `identity.social` and `sisters[].baseUrl` https-only (be #4); `sister.links` needing a sister, a derived currency needing its `fx.bufferPct` (be #9)
  - [x] 3.4.c C10 / C13: a segment that does not survive decode-then-encode is refused (fe #13); the icon and manifest requests in `ROOT_REWRITES` (fe #12); a decision, written into MIGRATION.md §6, on how the legacy static pages (`/about-us`…) reach `/api/x/legacy` when a legacy prefix must end in `/`
  - [x] 3.4.d doc sync: BRANDS.md §4 `fulfilment.pod` for OEI → "v2 (D23)"; PAYMENTS.md §8 and DEPLOYMENT.md §8 — the environment is read from `SITE_URL` against the brand's `domains`, and the provider secret names and `*_MODE` variables of `boot-check/provider-secrets.ts`; a CONVENTIONS.md line: Client Components receive preformatted money and dates (fe #7), and the facet panel never builds listing state from `useSearchParams()` (C10 drops the public query on rewrite)
  - [x] 3.4.f from 3.1's qa: a patterned `LINK_TOKEN_KEYS` secret (bytes 0x00…0x1f) is refused; `redactCredentials()` also hides a `password=` query parameter and a libpq `password=` pair; decide and record whether a production build with a loopback `SITE_URL` may be judged `local` (senior-be nit #5, qa #2); and whether the C10 `account` surface is gated on `accounts.buyers` or `accounts.retailers`
  - [x] 3.4.g settle what 3.2 found against the docs: engine tables in `public` under plain names, not `engine.*` (PARALLEL-TRACKS §1, `domain/src/contracts/storage.ts`, 10.3.c); every frozen slug a stub from Foundation (CONTENT-MODEL vs 3.2.e); the dev push (`PAYLOAD_DEV_PUSH=1`) failing on its second boot on Payload 3.90.2 (PARALLEL-TRACKS §3.2, ARCHITECTURE §6); boot migrations needing `NODE_ENV=production` besides `RUN_MIGRATIONS=1` (DEPLOYMENT §3–4); one shared `engine/packages/cms/payload-types.ts` (2.2.g vs 10.3); GraphQL off, so no `(payload)/api/graphql` mount (4.1.a)
  - [x] 3.4.e **Check:** C1, C10 and C13 at v1.2 with a CONTRACTS.md changelog entry; `import { formatMoney } from '@engine/i18n'` bundles under 2 KB gzip (a measured number) with no `zod`; a planted `%6F` segment is refused and IG's Singapore seller boots without Biteship secrets (tests); `pnpm verify` green; one senior-be and one senior-fe pass sign it off. — C1, C10, C13 at v1.2 with changelog entries; qa bundled `formatMoney` for the browser at 657 B gzip with no zod; `/pr%6Fduct/1706` not found; IG's `sg` seller boots on the staging host asking no Biteship secret; a loopback production build without `LOCAL_PRODUCTION_BUILD=1` judged production and refused; `/account` not found with both account modules off; signed off by senior-be and senior-fe (`reviews/3.4-senior-{be,fe}.md`) and their fix round landed; CI green at 58bf19f after the `URL` type fix.

- [x] **3.5 Tooling for the CMS: route parity, the generators and the migrate hook** · needs: 3.2, 3.4 — ✅ 2026-09-30 58bf19f
  - **Lane** HAR · **Agent** devops · **Wave** W3
  - **Owns** `engine/tooling/{route-parity,config-drift,db,worktree}/**`, `.prettierignore`, `.env.example`, `.github/workflows/e2e.yml`
  - **Read** 3.2's report (the Log line of 2026-09-30); ARCHITECTURE.md §2; DEPLOYMENT.md §8; `engine/packages/cms/package.json` scripts (`schema:check`, `generate:types`, `generate:importmap`, `migrate`)
  - _Requirements: 1.5, 1.8_
  - [x] 3.5.a `route-parity`: its test stops asserting the real repo has no `cms/src/collections` (build discovery from a sandbox root, or assert `users` is found); discovery also reads `COLLECTION_SLUGS` from `cms/src/registries/collections.ts`, so a stub slug counts
  - [x] 3.5.b `check:generated` runs the real generators with `BRAND` unset and once per brand (and each `TEST_STOREFRONT`): the migration snapshot through `schema:check` / `schema:check print`, the one `engine/packages/cms/payload-types.ts` through `generate:types`, and `generate:importmap <app>` once an app has an admin mount (skipped with a notice before 4.1) — none of them given a `DATABASE_URL`
  - [x] 3.5.c `db:fresh`'s migrate hook runs `pnpm --filter @engine/cms migrate` against the new database with a dev `PAYLOAD_SECRET`, and `--no-migrate` leaves it empty for a schema author's push, should one fail on a database that has tables (PARALLEL-TRACKS.md §3.2); `.prettierignore` gains `**/importMap.js`; `.env.example` documents `PAYLOAD_SECRET`, `PAYLOAD_DEV_PUSH` (a schema author's own suffixed database only, never a production build — senior-db's 3.2 re-review: three push boots, no `42P02`), `RUN_MIGRATIONS` with `NODE_ENV=production`, and optional `S3_REGION`
  - [x] 3.5.e `worktree:env`'s `generateDevRing()` refuses everything C1 v1.2's `parseLinkTokenKeys()` refuses (stepped runs, repeated blocks — 3.4.f), and its test's "accepted" draw is random (today a stride of 37, which v1.2 rightly refuses); `.env.example` says a seller's shipping secrets follow its own `sellers[].shipping`
  - [x] 3.5.f `e2e.yml` makes the two `test` databases with `db:fresh --brand test --storefront gallery|emporium --suffix ci` (now migrated for real), its extension loop and comments follow, and the CI run on the merge is green — CI run 36656199326 at 58bf19f green: e2e migrated `indies_gallery_ci`, `old_east_indies_ci`, `test_ci_gallery`, `test_ci_emporium` (each `pg_trgm,unaccent`, one shared schema) and ran `admins.db.test.ts` 9/9.
  - [x] 3.5.g `worktree:env` writes `LOCAL_PRODUCTION_BUILD=1` into a worktree's `.env.local`; `.env.example` documents `LOCAL_PRODUCTION_BUILD` blank — `1` only in a worktree's `.env.local` and in CI, never in a host's `shared/.env` — and `SISTER_BASE_URL` — production: required, the sister's production origin, never `sisters[0].baseUrl` (its staging site); staging: unset; a workstation: unset, or a local sister at `http://localhost:<port>`; every CI job that starts a production build sets `LOCAL_PRODUCTION_BUILD=1` (C1 v1.2 as amended by 3.4's review round: be #1, #6; DEPLOYMENT.md §8)
  - [x] 3.5.d **Check:** `pnpm verify` green on 3.2, 3.4 and this merged together; a planted field in `users` makes `check:generated` fail and passes once removed; a brand-shaped difference in the config fails it; `pnpm db:fresh --brand test --storefront gallery` leaves a migrated database whose `schema-hash` equals the others'; `pnpm worktree:env` writes `LOCAL_PRODUCTION_BUILD=1`, and `.env.example` documents it and `SISTER_BASE_URL`. — merged at baff54b, `pnpm verify` exit 0 (562 tests, every gate); qa: a planted `users` field drifts 6 generator runs, a brand-shaped difference drifts the three brands without `nl`, `db:fresh --brand test --storefront gallery` migrated 54 tables with the shared hash, `worktree:env` added and kept `LOCAL_PRODUCTION_BUILD=1`; real-database tests 82/82.

---

## Phase 4 — App shells and the Cache Components spike · Foundation · needs 3 · ~2.5d

**Goal:** both storefront apps booting from brand config, and the spike that proves the item page's caching model before anything is built on it.
**Done when:** both apps serve their brand and `test` in EN and ID with Payload at `/admin`, `/api/health` green and route parity passing; the spike's verdict is recorded in ARCHITECTURE.md §9; the client-safe gate runs in `pnpm verify`.
**Waves:** W1 — 4.1, 4.2 · W2 — 4.3, 4.4, 4.5, 4.7, 4.8 · W3 — 4.6

- [x] **4.1 Storefront app shells, the health route and the Cache Components spike** · needs: 1.2, phase 3 — ✅ 2026-09-30 f82f315
  - **Lane** WEB (mount files, `@engine/http`) + UXG + UXE (app scaffolds) · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/apps/gallery/**`, `engine/apps/emporium/**`, `engine/packages/http/src/{index.ts,health,brand-assets,legacy,cron}/**`, `docs/spikes/cache-components.md`
  - **Read** ARCHITECTURE.md §9–11, DESIGN-SYSTEM.md §2, BRANDS.md §2, KOI AGENTS.md (Next 16 differs from training data — read `node_modules/next/dist/docs/`)
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 19.4, 19.9, 19.12_
  - [x] 4.1.a scaffold both Next 16 apps: `next.config.ts` with `withPayload`, `output: 'standalone'`, `cacheComponents: true`, **no route segment config anywhere**; `src/proxy.ts` re-exporting the engine proxy with a **literal** `matcher`; the `(payload)` mount — `admin/[[...segments]]` and the REST `api/[...slug]` only: GraphQL is off (`graphQL.disable`), so no `api/graphql` or `api/graphql-playground` route (C13); the `(site)` root layout awaiting `connection()` and reading `ShellVM` from the fixture, its icons and web manifest linked through `generateMetadata()` from the brand's assets — never `app/icon.*`, `app/apple-icon.*`, `app/favicon.ico` or `app/manifest.ts`, which one build would bake in for every brand (C13 `ROOT_REWRITES`); `src/app/api/x/**` one-line re-exports
  - [x] 4.1.b `/api/health` in `@engine/http` (calls `getPayload()`, and reports the environment `bootCheck()` judged — `production`, `staging` or `local` — so the release flow's check at the brand's domain sees it, DEPLOYMENT.md §3, §8) + mounted in both apps; the `/api/x/cron/jobs` route (runs the queue with a per-run limit, `CRON_SECRET`, 503 when unset); manifest entries. **The `getPayload()` database and queue checks and the jobs run moved to 4.6** — `@engine/http` cannot reach Payload yet (4.3.a decides how).
  - [x] 4.1.c an app `supports` declaration file per app (modules it can render)
  - [x] 4.1.d placeholder `PRODUCT.md` stays as drafted in planning (do not overwrite); `DESIGN.md` absent until 14.1
  - [x] 4.1.e **the Cache Components spike** (ARCHITECTURE.md §9): a fixture item route resolved by public id with `permanentRedirect()` on a slug mismatch — an encoded slug (`/product/1706-caf%C3%A9-java`) and an old link's odd one (`/product/1706-van-t%27hoff`) included, each answered by one 301 whose `Location` is encoded once (twice would loop), the route comparing the slug as Next hands it and never decoding it again (a second decode makes `b%61li` a second 200 address), and Next's own 308 for a trailing `/` or `//` observed (MIGRATION.md §6); a `'use cache'` + `cacheTag` record; a `<Suspense>` purchase panel reading the `shipTo` cookie and a fake availability source; `revalidateTag(tag, 'max')` for the record and `{ expire: 0 }` for availability, proven by a test that flips availability and never sees it stale; `next build` with the admin mounted and **no database, brand or secrets**; one gallery build serving `test` and Indies Gallery with different mastheads. Written up in `docs/spikes/cache-components.md` The spike also proves a **JavaScript-off** request gets the page body and every form in the first flush, not only a root fallback (senior-fe, 1.2.l): a streamed part never carries a form or a post result. It posts the ship-to selector and a bag-line removal with JavaScript off (every write is a POST form, C13). It also prototypes the **CSP as the proxy will set it** (C13: the proxy's headers include it; 41.1.a builds the real one) and proves hashes or `strict-dynamic` hold with Next's per-request inline scripts under Cache Components — or adopts per-request nonces, in which case the proxy carries the CSP on the request too (C13 `PROXY_REQUEST_HEADERS.contentSecurityPolicy`), because Next takes the nonce from the request's header (confirmed against the installed docs) — and records which in `docs/spikes/cache-components.md` (ARCHITECTURE.md §13).
  - [x] 4.1.f `/brand-assets/[...path]` in `@engine/http`: serves the brand's assets folder under `BRAND_ROOT` — logo, favicon, OG base, fonts, the touch icon and the web manifest — only C1's `BRAND_ASSET_TYPES`, each with its type (`.webmanifest` → `application/manifest+json`, `.woff2` → `font/woff2`), `X-Content-Type-Options: nosniff`, an SVG under `Content-Security-Policy: default-src 'none'`, and a 404 for anything else or any path outside the folder (`..`, an absolute path, a link out); caching per C13 `BRAND_ASSET_URL` — `immutable` only when `?v=` is the file's current version (the first 8 hex digits of its SHA-256), else `max-age=300` with a strong `ETag` and a 304 on `If-None-Match` — and the helper that mints a versioned URL for `ShellVM`; the legacy handler stub at `/api/x/legacy/[...path]` (404 until 36.4)
  - [x] 4.1.g **Check:** both apps run for their brand and for `test`, render the brand name and logo from config with placeholder tokens in EN and ID, mount Payload at `/admin` and sign in there against two different databases (3.2.f, moved here), serve `/api/health` (app, DB, storage — and it initialises Payload, applying migrations under the lock in a production build with `RUN_MIGRATIONS=1`), serve brand files at `/brand-assets/…`, and route parity passes; **the spike's verdict is recorded** in ARCHITECTURE.md §9 — Cache Components confirmed, or the fallback adopted whole; and a push to `production` publishes a `deploy/production-*` release whose tarball holds `indies-gallery/` and `old-east-indies/` standalone builds, each with its brand `site/` folder and `sharp`, and a `.sha256` — `.github/scripts/assemble-artifact.sh` checked against the real standalone output first (moved from 2.3.d). **Moved:** the `/api/health` database, storage and migrations-under-the-lock clause → 4.6.c; the release tarball and the `production` push → 4.4.f (4.1 found the script's two defects and proved the fixed tarball in `node:22.13.0`). — qa on `main` at f82f315: both apps built with no database, brand, secret or `SITE_URL` and no brand string in `.next`; four production servers (ig, test/gallery, oei, test/emporium) each boot-checked and rendered name and versioned logo in each locale; 28 Playwright cases at 390/1280 px, axe 0, no overflow, one document request per first visit; one gallery build served two mastheads; `/admin` first user and sign-in on ig and oei, each brand's credentials 401 on the other (and a JWT from one refused by the other under a shared secret); `/api/health` 503 `not-wired` with the environment (`local`, and `staging` at `ig.gaiada.com`), nothing leaked; brand assets' types, `nosniff`, SVG CSP, `immutable` only on the current `?v=`, ETag/304, ~20 traversal spellings 404; route parity 41; the 308 table, `status.spec.ts` 26 passed / 4 gated skips, JS-off ship-to and bag removal posted once; `/robots.txt` `Disallow: /`; the spike refused on staging and 404 when off; `Critical-CH` only under `/admin`.

- [x] **4.2 The client-safe gate** · needs: phase 3 — ✅ 2026-09-30 f82f315
  - **Lane** HAR · **Agent** medior · **Wave** W1
  - **Owns** `engine/tooling/tsconfig/package.tsconfig.json`, the `compilerOptions.types` line of `engine/packages/{config,cms,http,i18n}/tsconfig.json`, `engine/tooling/client-safe/**`, the `check:client-safe` script and its step in `pnpm verify`, `engine/packages/i18n/test/client-safe.test.ts`, `.github/workflows/ci.yml` (the `lighthouse` job's `env` only)
  - **Read** CONVENTIONS.md §6, DESIGN-SYSTEM.md §7, CONTRACTS.md (C1 `@engine/config/constants`)
  - _Requirements: 19.1_
  - [x] 4.2.a `check:client-safe`: the walker of `engine/packages/i18n/test/client-safe.test.ts` (static and dynamic imports, `@engine/*` packages under the browser conditions), moved into the tool and imported back by that test, run over every module under `engine/` whose first statement is `'use client'`; it fails on a reach of `zod`, `@engine/config/{schema,routes,loader,validate,boot-check}`, `node:*`, `payload`, `@payloadcms/*` or `@engine/cms`, naming the import chain
  - [x] 4.2.b a CI test plants each violation — direct, through a relative import, through a workspace package, through a dynamic `import()` — and sees it fail, then pass once removed
  - [x] 4.2.d `ci.yml`'s `lighthouse` job sets `env: LOCAL_PRODUCTION_BUILD: '1'` (it serves a production build at `localhost:4200`, which C1 v1.2 judges production without the opt-in — 3.5's report)
  - [x] 4.2.e type-check as CI does on every platform: `"types": []` in `engine/tooling/tsconfig/package.tsconfig.json` and `"types": ["node"]` in the packages that declare `@types/node` (config, cms, http, i18n), so an ancestor folder's `@types` never leaks in on a workstation (the leak behind 3.4's red CI and 2.3's first four runs); `pnpm typecheck` green on Windows and in a `node:22.13.0` container
  - [x] 4.2.c **Check:** `pnpm verify` runs `check:client-safe`; each planted violation fails it with its import chain and passes once removed; the i18n root entry and every `'use client'` module in the apps pass. — merged ae719b7; qa on `main` at f82f315: the gate ok over the apps; plants of `@engine/cms`, zod through a relative helper, a dynamic `import('@engine/config/schema')`, `export * from 'zod'`, `@engine/http/brand-assets` (→ `node:crypto`/`fs`) and a relative reach of the Payload config each failed with their chain and passed once removed; a type-only Payload import passes; typecheck green on Windows and in `node:22.13.0`.

- [x] **4.3 Contract and doc follow-ups from 4.1 (v1.3)** · needs: 4.1 — ✅ 2026-09-30 87e19eb
  - **Lane** ARC · **Agent** architect · **Wave** W2
  - **Owns** the contract files of C2 (`engine/packages/view-models/src/shell.ts` and its fixture `engine/packages/view-models/src/fixtures/shell.ts`; `engine/packages/view-models/src/loaders.ts` for 4.3.f) and C13 (`engine/packages/http/src/manifest{.ts,/**}`), `engine/packages/CONTRACTS.md`, `AGENTS.md` (the Cache Components rule only), and the doc sections named below
  - **Read** 4.1's report (the Log line of 2026-09-30), `docs/spikes/cache-components.md`, `.claude/specs/indies-platform/reviews/4.1-senior-{fe,be}.md`; CONVENTIONS.md §1, §12; ARCHITECTURE.md §9, §13; MIGRATION.md §6; DESIGN-SYSTEM.md §2; PARALLEL-TRACKS.md §1
  - _Requirements: 1.2, 19.4_
  - [x] 4.3.a decide how `/api/health` and `/api/x/cron/jobs` reach Payload — `@engine/http` depending on `payload` and `@engine/cms`, or each app injecting a Payload-backed port — under the ESLint boundaries and the client-safe gate; record it in ARCHITECTURE.md and PARALLEL-TRACKS.md §1, with the exact files 4.6 changes. senior-be recommends http → `@engine/cms` (boundary 1 forbids `@engine/cms` in an app's `api/health` and `instrumentation.ts`), on conditions: SCH exports a `getPayload` getter from cms so http declares no `payload` (else pinned exactly); the Payload ports loaded by a lazy `import()` inside the handlers; a lint rule keeping Payload out of `http/src/{proxy,manifest,brand-assets,legacy}`; cms never imports http (`invalidate(tags)` lives outside http)
  - [x] 4.3.b C2 `ShellVM.assets` gains `touchIcon` and `manifest` (C13 says the shell carries every brand-asset URL a page links); C13: what the proxy sets when a request has no `User-Agent` (a prerendered shell otherwise loses a 404 or redirect status); the policy for C13 mounts whose lane has not built its handler (4.1's shared `@engine/http/legacy/unbuilt` 404, or stubs in each lane's folder) and whether route parity asserts `handlerOf(path)` (or a tooling check that no mount stays on the placeholder once its handler exists); a C13 rule that a one-shot post result survives a router prefetch (every prefetch is a full render under `htmlLimitedBots`) and a convention that storefront links are `<a>` or `<Link prefetch={false}>` (senior-fe #4); the `FORM_RESULT` carrier — 4.1 consumes a result only on a document load (`Sec-Fetch-Dest`, `Sec-Purpose`), because a result id in the 303's URL cannot survive: Next replaces a rewritten request's query with the destination's — so C10/C13 decide whether an item request's query is carried through the rewrite, which also decides whether a stale-slug redirect keeps an old link's query; the placeholder's name (`@engine/http/unbuilt` rather than `legacy/unbuilt`)
  - [x] 4.3.c doc sync with the spike: the one sanctioned segment config (`export const instant = false` on `(site)/[locale]/layout.tsx`) and `htmlLimitedBots` in AGENTS.md and CONVENTIONS.md §12; a route handler reads its request or it runs at build; `permanentRedirect()` answers **308**, not 301 (MIGRATION.md §6, and the text of 37.1.b); lower-case percent-escapes are one URI with upper-case (RFC 3986 §6.2.2.1) — drop them from the odd spellings (MIGRATION.md §6, C10); per-request nonces, not hashes (ARCHITECTURE.md §13); CONVENTIONS.md §12 and AGENTS.md's "runtime reads inside `<Suspense>`" rewritten for the item page, whose first-flush forms read the cookie and a header outside it (senior-fe #6); availability's cache — never in a shared cache, or tagged with a short `cacheLife` backstop (ARCHITECTURE.md §9 says both; senior-fe #8 recommends the backstop)
  - [x] 4.3.d settle the rest of 4.1's **Found**: the apps' `PRODUCT.md` brand names vs CONVENTIONS.md §1 (the lint skips `.md`); a JavaScript-off NotFound/Gone body (DESIGN-SYSTEM.md §2 — a request-time `notFound()` sends an empty `<body>`), Next 16.3.6's own behaviour, also without `lang` (senior-fe: the proxy's not-founds served as server-rendered HTML by a route handler, or a documented blank page without JavaScript), routed to a 22.x subtask; Latin-1 and raw UTF-8 slugs answering 404 from the proxy instead of 308 (C10); a malformed percent-escape under `/brand-assets/` or `/api/x/` answering Next's bare 500 (senior-be #12, for the 5xx alert); each app's `next.config.ts`, `tsconfig.json`, `package.json` — HAR's (PARALLEL-TRACKS.md §1) or the app lane's; the e2e folder (`e2e/` vs `tests/e2e/`)
  - [x] 4.3.f C2 v1.3, amended in 4.3's fix round: `Loaders.item` takes `{ locale, publicId, asked }` — `asked` the public path and query the page reads from the proxy's headers (C13 `PROXY_REQUEST_HEADERS`) — and no `slug`, which Next hands the route in two spellings; the cached read keyed by `(locale, publicId)` alone, `asked` compared outside it; a change breaking in shape that breaks no lane (no implementer, 11.3 unbuilt), with its changelog line
  - [x] 4.3.e **Check:** C2 and C13 at v1.3 with a CONTRACTS.md changelog entry; every **Found** item of 4.1's report answered in the doc that owns it; `pnpm verify` green; one senior-fe and one senior-be pass sign it off.

- [x] **4.4 The release script and CI against the real apps** · needs: 4.1, 4.2 — ✅ 2026-09-30 d2c5786
  - **Lane** HAR · **Agent** devops · **Wave** W2
  - **Owns** `.github/**`, `playwright.config.ts`, `lighthouserc*.json`, root `.gitignore`, `.prettierignore`, `.env.example`, `engine/tooling/config-drift/**`, the root `package.json` scripts, the `BRAND_ROOT` and `HOSTNAME` lines of DEPLOYMENT.md §8
  - **Read** 4.1's report (Contracts 2, Follow-ups), `.github/scripts/assemble-artifact.sh`, `release.yml`, `e2e.yml`, `ci.yml`, DEPLOYMENT.md §3, §8
  - _Requirements: 19.7, 19.9_
  - [x] 4.4.a `assemble-artifact.sh` against the real standalone output: `sharp` copied from the pnpm store (`readlink -f` of the app's `node_modules/sharp`, with `@img/*` and `detect-libc`), the brand folder at `<release>/brand/site/`, so a host's `BRAND_ROOT` is `<current>/brand` (`.env.example`, DEPLOYMENT.md §8); the "UNVERIFIED" header goes
  - [x] 4.4.b `e2e.yml` starts the four production servers (gallery and emporium for their brands and for `test`) on the `_ci` databases with `BRAND`, `BRAND_ROOT`, `TEST_STOREFRONT`, `DATABASE_URL`, `PAYLOAD_SECRET`, a CI `LINK_TOKEN_KEYS` ring, `SITE_URL` and `LOCAL_PRODUCTION_BUILD=1`, and a first Playwright smoke per server (home 200 with the brand's name in EN and ID, `/admin/login` 200, `/brand-assets/` type and caching headers), so a run never ends on "No tests found"; and 4.1's `engine/apps/gallery/e2e/status.spec.ts` in `playwright.config.ts` and CI, against a gallery server started with `SPIKE_ROUTES=1` (local hosts only) — `E2E_EXPECT_CSP=1` once 41.1.a lands, `E2E_EXPECT_UA_FIX=1` once the proxy sets a missing `User-Agent` (4.3.b)
  - [x] 4.4.c Lighthouse starts a server and audits routes that exist today (the home and the spike item page); a named **Client-safe gate** step in `ci.yml`'s static job
  - [x] 4.4.d `**/next-env.d.ts` in `.gitignore` and `.prettierignore` (`next typegen` recreates it, so a second `pnpm verify` fails `format:check`)
  - [x] 4.4.g a server bound to a loopback IP hangs every storefront page (`HOSTNAME=127.0.0.1`: Next renames `127.x` to `localhost`, so the proxy's rewrite looks external and is proxied — qa F1): pin `HOSTNAME` in DEPLOYMENT.md §8, `.env.example` and the release smoke (`0.0.0.0`, or `localhost`), and tell PLT whether the rewrite's origin should come from Next's own URL
  - [x] 4.4.f **Check:** the tarball built from `main` by the release steps in `node:22.13.0` holds `indies-gallery/` and `old-east-indies/`, each with `brand/site/brand.config.json`, `server.js`, `.next/static` and a loadable `sharp`, and each boots from it (home 200, `/admin/login` 200); CI green on `main` with the e2e smoke and Lighthouse running for real; then, **with the owner's go-ahead (👤 — Helios polls `production`; given 2026-09-30)**, a push to `production` publishes a `deploy/production-*` release and its `.sha256` (4.1.g, moved here). — the release job ran in `node:22.13.0` locally (a 68 MB tarball, both subdirs booting: `/`, `/id`, `/admin/login` 200); CI run 36685866936 green on `main` at d2c5786 (static, e2e with five production servers — smoke × 8 projects and the status spec — and Lighthouse with the budgets asserting for the first time); `main` pushed to `production` with the owner's go-ahead: Release run 36686348116 green, `deploy/production-20260930T075511Z-d2c5786` published, downloaded, `sha256sum -c` OK, and the tarball lists `indies-gallery/` and `old-east-indies/` each with `brand/site/brand.config.json` and `engine/apps/<app>/server.js`.

- [x] **4.5 Placeholder brand assets and shell copy** · needs: 4.1 — ✅ 2026-09-30 8f63ade
  - **Lane** BRD · **Agent** junior · **Wave** W2
  - **Owns** `indies-gallery/site/{assets,copy}/**`, `old-east-indies/site/{assets,copy}/**`, `test/site/{assets,copy}/**`
  - **Read** BRANDS.md §2–§4, C1 `BRAND_ASSET_TYPES`, the apps' message keys (`engine/apps/*/src/shell/messages.ts`), 4.1's report (the Check's caveat)
  - _Requirements: 1.2, 2.1_
  - [x] 4.5.a clearly placeholder assets for each brand — `logo.svg`, `favicon.ico`, `og.png`, `apple-touch-icon.png`, `site.webmanifest` (and `mark.svg` for `test`) — only C1's types, marked as placeholders until 14.1
  - [x] 4.5.b English and Indonesian values in `site/copy/{en,id}.json` for every key the shells use today (the Indonesian marked for the copywriter's review, D20)
  - [x] 4.5.c **Check:** with each brand's committed `site/` as `BRAND_ROOT`, both apps show the brand's logo, favicon and manifest (each asset 200 with its type) and the Indonesian pages show Indonesian copy, at 390 px and 1280 px on a production build; `validateBrandConfigs()` and `pnpm verify` green.

- [ ] **4.6 Wire `/api/health` and the jobs route to Payload** · needs: 4.3, 4.4, 4.8
  - **Lane** WEB (+ UXG/UXE for 4.6.e's shell files) · **Agent** senior-fe · **Wave** W3
  - **Owns** the files ARCHITECTURE.md §15 names (4.3.a) — `engine/packages/http/package.json` (the `@engine/cms` and `@engine/cache` dependencies, and their peers `next`, `react`, `react-dom` as devDependencies if pnpm reports them unmet; `pnpm-lock.yaml` as the side effect), `engine/packages/http/src/{health,cron/jobs,revalidate}/**`, `engine/packages/http/src/cron/{auth.ts,cron.test.ts}`; for the placeholder (4.6.d) `engine/packages/http/src/{legacy,unbuilt,shared,brand-assets}/**` and every placeholder mount, `engine/apps/*/src/app/api/x/**/route.ts`; for the shell (4.6.e) `engine/apps/*/src/shell/load-shell.ts` and `engine/apps/*/src/app/(site)/[locale]/layout.tsx`
  - **Read** ARCHITECTURE.md §9 (invalidation after commit) and §15 (4.3.a's decision), C13 v1.3 (`UNBUILT_HANDLER`, `BRAND_ROOT_ASSETS`, `REVALIDATE_REQUEST`), `.claude/specs/indies-platform/reviews/4.1-senior-be.md`, `reviews/4.3-senior-be.md` #1, #4, #13, DEPLOYMENT.md §3–§5
  - _Requirements: 1.1, 19.4, 19.9_
  - [ ] 4.6.a `/api/health` checks the database and storage through `@engine/cms/instance`'s `cms()` (4.8), from `health/payload-ports.ts` loaded with `import()` after the request is read (ARCHITECTURE.md §15) — its unit tests never load Payload: the route exports a factory taking the port loader, or they `vi.mock` it — and reports the queue — queue lag **reported, never gating** the status (a failed health check rolls a deploy back; DEPLOYMENT.md §7 makes lag an alert), counted with `runJobs`' own filter (no `hasError` or future `waitUntil` jobs); the database probed once per check, behind a ~5 s single-flight memo; `/api/x/cron/jobs` runs every queue (`allQueues: true`) with the per-run limit, from `cron/jobs/payload-queue.ts` loaded the same way, single-flight in the process, a throw logged and answered 500 (senior-be #3–#5)
  - [ ] 4.6.b the e2e smoke (`.github/e2e/smoke.spec.ts`, 4.4.b) and the release smoke (`.github/scripts/smoke-artifact.sh`) assert `/api/health` 200 on every server (HAR's files — 4.6 proposes the lines or the orchestrator adds them at merge)
  - [ ] 4.6.d the placeholder moves to C13 v1.3's `UNBUILT_HANDLER`: `engine/packages/http/src/legacy/unbuilt/**` to `engine/packages/http/src/unbuilt/**` (`@engine/http/unbuilt`, and `@engine/http/unbuilt/robots`, still failing closed), the shared plain answers (`plain`, `notFound`, `atRequestTime`) out of `legacy/respond.ts` into `engine/packages/http/src/shared/respond.ts`, and every placeholder mount in both apps repointed at `unbuiltHandlerOf(path)`, its comment naming the handler that replaces it
  - [ ] 4.6.e the apps move to C2 v1.3's shell fields: each app's `src/shell/load-shell.ts` sets `assets.touchIcon` and `assets.manifest` — `versionedBrandAssetUrl(paths.assetsDir, BRAND_ROOT_ASSETS.touchIcon)` and `.manifest`, `null` where the brand ships none — and each `(site)/[locale]/layout.tsx`'s `generateMetadata()` links `icons.apple` and `manifest` from `shell.assets`; `brandIcons()` and `rootFileAsset()` go
  - [ ] 4.6.f `/api/x/revalidate` (`@engine/http/revalidate`, C13 `REVALIDATE_REQUEST`): POST only; `REVALIDATE_SECRET` as a bearer, compared in constant time like `cron/auth.ts` (503 unset, 401 wrong); a JSON body of at most `maxTags` tags, each checked against `@engine/cache`'s grammar (400, nothing expired, on any other); each tag's profile from its builder, never the request, expired through `invalidate()` in its in-request mode; `no-store` 204; both apps' mounts repointed in the same change
  - [ ] 4.6.c **Check:** on a production build with `RUN_MIGRATIONS=1`, two processes racing on one empty database — one migrates under the advisory lock, one waits and applies nothing, one `payload_migrations` row — and `/api/health` then answers 200 (app, database, storage, environment); `cron/jobs` answers 503 unset, 401 without the bearer and runs the queue with it; the build touches no database — built with `DATABASE_URL` and `PGHOST` at a sentinel listener that accepts no connection (an unset variable lets `pg` reach `localhost:5432`); every C13 mount loads, in a one-off run the report shows, under a resolve hook that refuses `payload`, `@payloadcms/*` and `@engine/cms`, and none is refused (5.4.a makes the hook route parity's for good); every placeholder mount names `unbuiltHandlerOf(path)` and route parity passes; each app links its touch icon and manifest from `ShellVM.assets`, and none for a brand that ships none; on a production build with `SPIKE_ROUTES=1`, with the spike record's edition changed in its store and nothing revalidated, a post of its `item:<id>` tag (4.8's builder; the spike already tags so) to `/api/x/revalidate` expires it through `after()` — the next request may still show the old edition (`'max'` serves stale while it regenerates), the one after shows the new — and its `availability:<id>` tag expires at once, whatever the body asks, while a wrong bearer answers 401 and an unknown tag 400, expiring nothing; the client-safe gate still passes (4.1.g, moved here).


- [x] **4.7 Tooling hardening from phase 4: the client-safe gate and real `supports`** · needs: 4.1, 4.2 — ✅ 2026-09-30 7141961
  - **Lane** HAR · **Agent** medior · **Wave** W2
  - **Owns** `engine/tooling/client-safe/**`, `engine/tooling/brand-create/**`, and the brand-validation tooling that `check:brands` names (a new `engine/tooling/check-brands/**` if none exists) — never the root scripts file, which is 4.4's this wave: the orchestrator adds the `check:brands` script and its `verify` step when it merges 4.7 after 4.4
  - **Read** qa's 4.1/4.2 report (the Log line of 2026-09-30, F2); `engine/apps/{gallery,emporium}/src/supports.ts`; `engine/packages/config/src/validate/**`; 3.3's Log line (the `supports` follow-up)
  - _Requirements: 1.7, 19.1_
  - [x] 4.7.a `check:client-safe` refuses bare Node built-ins as well as `node:*` (`builtinModules` — `crypto`, `path`, … — which Next polyfills into client bundles), and fails closed, naming the import, on a dynamic `import()` whose specifier it cannot resolve (a variable or a template with an expression) — each with a planted test
  - [x] 4.7.b `createBrand` and a `check:brands` step validate each brand against the app that renders it with that app's real `engine/apps/<app>/src/supports.ts` (the apps' own `supports.test.ts` stays), so a module an app cannot render fails the scaffold and the gate (3.3's follow-up, moved from 4.4.e)
  - [x] 4.7.c **Check:** planted `import 'crypto'`, `import p from 'path'` and `import(variable)` in a `'use client'` module each fail `check:client-safe` with their chain and pass once removed; `pnpm brand:create` for each storefront still validates, and a config turning on a module its app does not support fails `check:brands` naming the module; `pnpm verify` green.

- [ ] **4.8 The process's one Payload, and the cache tags: `@engine/cms/instance`, `@engine/cache`** · needs: 3.2 — 🔄 4·W2
  - **Lane** SCH · **Agent** senior-be · **Wave** W2 (dispatched once 4.3 has merged: it builds against ARCHITECTURE.md §9 and §15)
  - **Owns** `engine/packages/cms/src/instance.ts`, `engine/packages/cms/src/instance.test.ts`, the `exports` field of `engine/packages/cms/package.json`, `engine/packages/cache/**` (a new package; `pnpm-lock.yaml` as its install's side effect)
  - **Read** ARCHITECTURE.md §9 (invalidation after commit), §15 (4.3.a); C13 `REVALIDATE_REQUEST`; `engine/packages/cms/src/{payload.config.ts,db/probe.ts,db/adapter.ts,db/cli.ts}`; `.claude/specs/indies-platform/reviews/4.1-senior-be.md` item 5, `reviews/4.3-senior-be.md` #1, #2, #4, #12
  - _Requirements: 1.1, 19.4, 19.12_
  - [ ] 4.8.a `instance.ts`: `cms(): Promise<Payload>` — `getPayload({ config })` over `./payload.config`, the one call a server route makes (cms's own CLI and tests keep theirs) — with `type Payload` re-exported, and `cmsPool(payload): Pick<LockPool, 'connect'>`, exactly `@engine/cms/db/probe`'s `databaseProbe()` parameter, a cast that throws when `payload.db.pool?.connect` is no function; importing the module opens nothing, and only `cms()`'s first call connects (and, in the web process of a production build with `RUN_MIGRATIONS=1`, migrates)
  - [ ] 4.8.b `"./instance": "./src/instance.ts"` in cms's `exports`, so `@engine/http` declares `@engine/cms` and never `payload` (4.6)
  - [ ] 4.8.c `@engine/cache`, a leaf package — `next` a peerDependency (and a devDependency at the apps' exact version, as cms declares it), C1's types its one engine import: the cache-tag builders the loaders tag reads with and the hooks expire (`item:<publicId>`, `availability:<publicId>`, `price:<publicId>`, `work:<workUid>`, one per content kind known today, each with its expiry — editorial `'max'`, availability and price `{ expire: 0 }` — and the grammar the revalidate route checks); `AVAILABILITY_STATUS_LIFE` (`{ stale: 30, revalidate: 30, expire: 60 }`), the backstop every cached scope that shows a status declares; and `invalidate(tags)`, which revalidates only after the write commits: inside a Next request it schedules `revalidateTag` with `after()`; outside one the caller puts a collector on Payload's `req.context` and flushes it once its operation returns (dropping it on a throw), by a post on C13 `REVALIDATE_REQUEST`'s terms — an explicit mode, never a probe of Next's internals
  - [ ] 4.8.d **Check:** a test imports `@engine/cms/instance` with `DATABASE_URL` and `PGHOST` at a sentinel listener, and the listener accepts no connection; against a `db:fresh` database `cms()` twice resolves one instance and `databaseProbe(cmsPool(payload))()` answers READ COMMITTED; no module under `engine/packages/**` but cms's CLI and tests calls `getPayload(`; `@engine/cache`'s tests cover each builder's grammar and profile, a collector that flushes only when told, and `invalidate()` outside a request without a collector throwing rather than doing nothing; its only imports are `next` and C1's types, and the lockfile still resolves one `next`; `pnpm verify` green. (The production-build proofs are 4.6.f's, for the revalidate route and `after()`, and 33.3.e's, for a hook's save.)

---

## Phase 5 — Staging and the foundation gate 👤 · Foundation · needs 4 · ~2d

**Goal:** both shells on staging from a CI-built release, and the gate over the whole Foundation stage.
**Done when:** `pnpm dev --brand indies-gallery` and `--brand old-east-indies` serve two differently themed shells in EN and ID from two databases; `/admin` logs in on both; `test` runs on both apps; the Cache Components spike's verdict is recorded; every gate fails on a planted violation; both staging hostnames serve a CI-built release.
**Waves:** W1 — 5.1, 5.3 · W2 — 5.4 · W3 — 5.2 · closes **M0**

- [ ] **5.1 Staging on Helios 👤** · needs: 2.3, 4.1
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - **Owns** `scripts/ops/**`
  - **Read** DEPLOYMENT.md §2, §3 (the pm2 entry and the bind), §9; KOI docs/ops/helios-koi-setup.sh; memory: Helios writes need the owner's go-ahead each time
  - _Requirements: 19.7, 19.8, 19.9_
  - [ ] 5.1.a `scripts/ops/helios-provision.sh` (idempotent, shellchecked): site users `uig`/`uoei`, ports (verify free), databases and roles, `shared/.env` skeletons (with `BRAND_ROOT`, `SITE_URL=https://<its domain>`, `RUN_MIGRATIONS=1` and, in production, `SISTER_BASE_URL` — never `LOCAL_PRODUCTION_BUILD`, DEPLOYMENT.md §8), pm2 ecosystem (DEPLOYMENT.md §3: `node <current>/engine/apps/<app>/server.js`, `exec_mode: 'fork'`, `instances: 1`, `node_args: --dns-result-order=ipv4first`, `HOSTNAME=localhost`, nginx's upstream `http://127.0.0.1:<port>`), crontab for the jobs-queue route and the sweepers (DEPLOYMENT.md §5) — the jobs line only once 4.6 has landed, or it answers 503 1,440 times a day (senior-be, 4.1) — backup timers
  - [ ] 5.1.b 👤 owner approves and runs it; DNS for both staging hostnames; object-storage buckets and keys; Infisical entries
  - [ ] 5.1.c first release deployed; rollback rehearsed; results recorded in `docs/DEPLOYMENT.md`
  - [ ] 5.1.d **Check:** `ig.gaiada.com` and `oei.gaiada.com` serve the shells from a CI-built release, health checks are green, and one rollback has been rehearsed; each app listens on `127.0.0.1` alone (`ss -ltnp`), and its port refuses a connection from outside (`curl http://<public-ip>:4030`), the host firewall confirmed with the owner's go-ahead.

- [ ] **5.2 Foundation gate** · needs: phase 1, phase 2, phase 3, 4.1, 5.1, 5.3, 5.4
  - **Lane** QA · **Agent** qa · **Wave** W3
  - **Owns** `docs/gates/foundation.md`
  - **Read** the **Done when** of phases 1–5
  - _Requirements: 1.1–1.8_
  - [ ] 5.2.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 5.2.b Drive every clause of the **Done when** of phases 1–5 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/foundation.md`
  - [ ] 5.2.c A planted violation for every gate (a 301-line file, a brand literal, a drifted schema, a missing route, a shadowing route, a non-literal matcher, config drift, a stale import map, an overlapping wave, a mount left on the placeholder once its handler exists, Payload reached from an `@engine/http` module that is no `payload-*.ts`, a route segment config outside the `(site)` layout, the two apps' `next.config.ts` apart) — each fails, then passes once removed
  - [ ] 5.2.d Screenshots of both shells in English and Indonesian and both admins, on staging; the Cache Components spike write-up reviewed
  - [ ] 5.2.e File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 5.2.f **Check:** every clause of the **Done when** of phases 1–5 is evidenced in `docs/gates/foundation.md`, with no failure left open.

- [ ] **5.3 The proxy's v1.3 answers: a missing User-Agent, the item's query, its not-found's 404** · needs: 4.3
  - **Lane** PLT · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/http/src/proxy/**`, `engine/packages/config/src/boot-check/**`
  - **Read** C13 v1.3 (`engine/packages/http/src/manifest/proxy.ts`); ARCHITECTURE.md §9, §11, §13; DESIGN-SYSTEM.md §2 (NotFound and Gone without JavaScript); DEPLOYMENT.md §3; `reviews/4.3-senior-be.md` #6, #7
  - _Requirements: 1.2, 19.4_
  - [ ] 5.3.a a request whose `User-Agent` is missing or empty gets C13 `PROXY_USER_AGENT` on the request passed on; a client's own is never replaced
  - [ ] 5.3.b the proxy's not-found — every decision rewritten to `/<locale>/not-found` — answers with C13 `PROXY_NOT_FOUND_STATUS` on its rewrite (`toResponse`); every other decision keeps the status Next's render gives it
  - [ ] 5.3.c `PROXY_REQUEST_HEADERS.publicSearch` on the item route's rewrite alone — the public URL's `search`, `''` when it has none — and `''` on every other request, a client's copy dropped everywhere; a unit test that Next's `_rsc` never reaches it (`skipProxyUrlNormalize` stays off)
  - [ ] 5.3.d `bootCheck()` refuses, in every environment, a `HOSTNAME` that is a loopback IP: normalised the way Next reads it (``new URL(`http://${host}`).hostname``, bracketing a bare IPv6), then tested as Next tests it (`127.` plus three octets, or `[::1]`), so `127.0.0.1`, `127.1`, `2130706433`, `0x7f.0.0.1` and `::1` are refused and `localhost`, `0.0.0.0` and a host name pass; the finding names the standalone `server.js`, which binds `HOSTNAME`, and says `next dev`/`next start` take `-H`, which hangs at a loopback address too (4.1's qa F1, 4.4.g; DEPLOYMENT.md §3)
  - [ ] 5.3.e **Check:** unit tests for each (`proxy.test.ts`, `respond.test.ts`, the boot check's); on a production build, a request with no `User-Agent` gets 404 for `/nope` and 308 for a stale slug of the spike's fixture item (`SPIKE_ROUTES=1`), a browser's gets 404 for `/nope` through the rewrite's status, and a stale slug's 308 keeps its query while a query on any other page never reaches `x-public-search`; the status spec's no-User-Agent case passes with `E2E_EXPECT_UA_FIX=1`; a start with `HOSTNAME=127.1` is refused; `pnpm verify` green.

- [ ] **5.4 Gates for the v1.3 contracts** · needs: 4.6, 5.3
  - **Lane** HAR · **Agent** medior · **Wave** W2
  - **Owns** `engine/tooling/route-parity/**`, `eslint.config.mjs` (its boundary rules), `engine/tooling/next-config-parity/**`, `.github/workflows/e2e.yml` (the status run's env), `playwright.config.ts`, `.env.example` (its `HOSTNAME` comment), and the e2e moves: `tests/e2e/{smoke,status}/**`, `.github/e2e/**`, `engine/apps/gallery/e2e/**`
  - **Read** C13 v1.3 (`manifest.ts` `UNBUILT_HANDLER`, `manifest/proxy.ts`); ARCHITECTURE.md §15; CONVENTIONS.md §12; PARALLEL-TRACKS.md §1; DEPLOYMENT.md §3; `reviews/4.3-senior-{be,fe}.md`
  - _Requirements: 1.6, 19.4_
  - [ ] 5.4.a route parity: a mount's re-export specifier is `handlerOf(path)` or C13's `unbuiltHandlerOf(path)`; it names the placeholder only while `engine/packages/http/src/<area>/route.ts` for `handlerOf(path)` does not exist; both apps name the same specifier for each route; and the runner loads every C13 mount (`ENGINE_ROUTES`, not Payload's own `(payload)` routes) under a resolve hook that refuses `payload`, `@payloadcms/*` and `@engine/cms`, so a static path to Payload fails however indirect — each rule proven by a planted violation
  - [ ] 5.4.b ESLint (ARCHITECTURE.md §15, CONVENTIONS.md §12): under `engine/packages/http/src/**` only a `payload-*.ts` module imports `payload`, `@payloadcms/*` or `@engine/cms` by value, statically or by `import()` (`import type` stays free); no module but a test imports or re-exports a `payload-*` module statically; nothing under `engine/packages/cms/**` imports `@engine/http`; nothing under `engine/packages/http/**` imports `@engine/loaders`, and nothing under `engine/packages/loaders/**` imports `@engine/http` but `@engine/http/manifest`; `engine/packages/http/src/manifest{.ts,/**}` imports other packages as types only, its tests excepted; `engine/packages/cache/**` imports nothing of the engine's but C1's types; and under `engine/apps/*/src/app/**` outside `(payload)`, no route segment config is exported (`dynamic`, `revalidate`, `fetchCache`, `runtime`, `preferredRegion`, `maxDuration`, `prefetch`, `instant`, `dynamicParams`, `generateStaticParams`) but `instant = false` and `generateStaticParams` in `(site)/[locale]/layout.tsx` — each proven by a planted violation
  - [ ] 5.4.c ESLint: in every file that renders storefront JSX — `engine/apps/*/src/**` outside `(payload)`, and every package but `cms` — only the link primitive under `engine/packages/ui/src/primitives/` (11.1.c) imports `next/link`; `next/form` is imported nowhere (its `<Form>` prefetches its action by default; a storefront form is a plain `<form>`, which works without JavaScript); and `useRouter().prefetch()` is called nowhere — so no storefront link or form prefetches (CONVENTIONS.md §12)
  - [ ] 5.4.d a test compares the two apps' `next.config.ts` on what the storefront's guarantees rest on — `cacheComponents`, `htmlLimitedBots`, `output`, `poweredByHeader`, and `withPayload`'s client hints on `/admin/:path*` alone — and asserts both `(site)/[locale]/layout.tsx` export `instant = false` (PARALLEL-TRACKS.md §1)
  - [ ] 5.4.e the one e2e folder (PARALLEL-TRACKS.md §1): the status spec moves from `engine/apps/gallery/e2e/` to `tests/e2e/status/` and 4.4's smoke from `.github/e2e/` to `tests/e2e/smoke/`, each Playwright project's `testDir` following; CI runs the status spec with `E2E_EXPECT_UA_FIX=1` (5.3), its app-independent cases (a path that names no page, a not-found route, an unsupported locale prefix, robots, the admin-only client hints) against an emporium server too, and — behind `E2E_EXPECT_NOT_FOUND_BODY=1`, set when 22.4.e lands — a non-empty `<main>` in a 404's body
  - [ ] 5.4.f `.env.example`'s `HOSTNAME` comment follows DEPLOYMENT.md §3: `localhost` on a host with `--dns-result-order=ipv4first` (so it binds 127.0.0.1 behind nginx), `0.0.0.0` only in CI, never a loopback IP — and `next dev`/`next start` take `-H`, which hangs at a loopback address too
  - [ ] 5.4.g **Check:** each planted violation of 5.4.a–d fails its gate naming the file and passes once removed; CI's status run passes its no-User-Agent case on both apps; `pnpm verify` green.

---

## Phase 6 — Briefs, image direction and voice · Design · needs 4 · ~3d

**Goal:** what each brand is for and who it serves, the photography it will stand on, and how it speaks in both languages.
**Done when:** the product briefs and the 1.1.c journeys are written and approved; the capture standards exist and the pilot shoot is delivered; each brand has a native-reviewed EN/ID voice and lexicon.
**Waves:** W1 — 6.1, 6.2, 6.3

**Why the Design stage is long.** A research recommendation is the category default —
"Print Room" is what a premium dealer site already looks like; a Deco travel
poster is the stock look of vintage-poster print shops. The direction round
exists to beat the default, photography decides perceived quality more than any
component, and the only honest test of a direction is a real buyer on a real
phone (DESIGN-SYSTEM.md §11, §13). Its phases wait mostly on the owner, so they
run beside the build line rather than in it.

- [ ] **6.1 Product briefs and journeys** · needs: 1.3.b
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W1
  - **Owns** `engine/apps/gallery/PRODUCT.md`, `engine/apps/emporium/PRODUCT.md`, `PRODUCT.md`, `docs/design/journeys/**`
  - **Read** the drafted PRODUCT.md files, EXPERIENCE-GALLERY.md, EXPERIENCE-SHOP.md, RESEARCH.md §1, §3
  - _Requirements: 6.1, 7.1_
  - [ ] 6.1.a impeccable `init` against the drafts; list the questions only the owner can answer
  - [ ] 6.1.b 👤 owner interview (≤ 15 questions per brand); fold answers in
  - [ ] 6.1.c journeys and scenarios — gallery: a collector from Google on a phone → item → verso zoom → request price → WhatsApp → payment link; an institution → proforma → bank transfer; a designer → factsheet → client; a diaspora buyer → town search. Shop: the Instagram in-app browser → configurator → QRIS; a tourist buying in Bali, shipped home to the Netherlands; a hotel → quote → payment link; a showroom QR walk-in; a gift to a recipient abroad. These become the Gallery and Shop stages' done-criteria and the usability scripts for 13.2, 35.2 and 32.2.
  - [ ] 6.1.d **Check:** each PRODUCT.md follows the impeccable product schema with no invented facts and the owner's answers folded in, and 6–8 journeys per brand exist, each naming its surfaces, states, channel handoffs and the moment that decides trust.

- [ ] **6.2 👤 Image direction, capture standards and the pilot shoot** · needs: 1.3.b
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W1
  - **Owns** `docs/design/imagery/**`
  - **Read** DESIGN-SYSTEM.md §11, CONTENT-MODEL.md (image roles), MIGRATION.md §9, the drafted PRODUCT.md files
  - _Requirements: 4.5, 6.12, 7.12_
  - [ ] 6.2.a capture standards per brand: lighting and colour temperature, a colour target in every frame, the raking-light angle, minimum ppi, backgrounds, mat and shadow, **retouching limits (never restore a defect on an original)**, the studio/lifestyle split (gallery: studio, object, raking light, no people; shop: sun, hands, rooms, packaging, the showroom), and how synthetic mockups are labelled
  - [ ] 6.2.b 👤 book a photographer; pilot shoot of six gallery items — including one **typical migrated item** at real data quality — and one day in the Denpasar showroom
  - [ ] 6.2.c the configurator's room scenes: wall colours, scale props, perspective, pre-composited plates
  - [ ] 6.2.d **Check:** each brand has capture standards, a photographer has shot the pilot set, and the pilot images are in the private masters bucket ready for the comps; any owner answer from 6.1.b that changes the standards is folded in before closing.

- [ ] **6.3 👤 Voice and lexicon** · needs: 3.1.b, 4.1
  - **Lane** UXG + UXE + BRD · **Agent** senior-uiux · **Wave** W1
  - **Owns** `docs/design/{gallery,emporium}/voice.md`, `engine/apps/*/src/messages/keys.ts` (the keys), `indies-gallery/site/copy/**`, `old-east-indies/site/copy/**`, `test/site/copy/**` (the values)
  - **Read** DESIGN-SYSTEM.md §10, BRANDS.md §2, NOW! docs/DESIGN-SYSTEM.md §6 (copy), the drafted PRODUCT.md files
  - _Requirements: 18.8_
  - [ ] 6.3.a voice principles and register per brand
  - [ ] 6.3.b the lexicon as app keys + brand values ("Price on request", "On hold until", "Reproduction / Reproduksi", "Made to order"…); the `test` brand gets deliberately long values (+30%) to catch overflow
  - [ ] 6.3.c 👤 native Indonesian copywriter review
  - [ ] 6.3.d **Check:** each brand has voice principles, a decided Indonesian register (*Anda* for the gallery; the shop's to confirm — likely *kamu*), and an EN/ID lexicon covering every status, purchase mode, configurator label, checkout step, error, empty state and prefilled WhatsApp message — its **keys** in each app, its **values** in each brand's `site/copy/` (no brand copy in `engine/`) — reviewed by a native Indonesian writer; owner answers from 6.1.b folded in.

---

## Phase 7 — The old catalogue export and the shop's URL discovery 👤 · Migration · needs 2 · ~2d

**Goal:** the owner's export restored and normalised, and the shop's legacy URLs inventoried — all from copies, never from the live sites.
**Done when:** the owner's export (or, with the owner's OK, a read-only public read) is restored with its schema documented; dates, dimensions, grades, prices and titles parse with a fixture test per dirty-data case and a review file for the rest; every Squarespace path is inventoried; nothing was done to the old sites.
**Waves:** W1 — 7.1, 7.3 · W2 — 7.2

- [ ] **7.1 👤 Receive the old catalogue export** · needs: 2.1 — 🔄 7·W1
  - **Lane** MIG · **Agent** senior-integrator (MIG-A) · **Wave** W1
  - **Owns** `engine/packages/migrate/{package.json,tsconfig.json,vitest.config.ts,README.md,src/index.ts}` (the package scaffold), `pnpm-lock.yaml` (through `pnpm install` only), `engine/packages/migrate/src/sources/{laravel-catalogue,public-read}/**`, `indies-gallery/content/legacy/{schema,inventory}/**` (committed notes and the URL inventory; raw extracts stay in `LEGACY_DATA_DIR`, outside git)
  - **Read** MIGRATION.md §1–3
  - _Requirements: 16.1, 16.5_
  - [ ] 7.1.a 👤 The owner asks whoever hosts the old site for a MySQL dump and the product-images folder, and hands them over — we never log in to, fix or change the old site
  - [ ] 7.1.b restore + schema discovery notes (tables → collections)
  - [ ] 7.1.c A read-only, rate-limited reader of the old site's public pages and sitemap — run only with the owner's OK — that gathers the old URL list for verification
  - [ ] 7.1.e the `@engine/migrate` package scaffold (package.json, tsconfig, vitest config, README, `src/index.ts`) in the workspace, `pnpm verify` green with it
  - [ ] 7.1.f a mock Laravel-shaped MySQL dump (D42) committed as a fixture — synthetic rows only, covering MIGRATION.md §4's dirty-data cases — restored into a throwaway MySQL container by the restore harness, and extracted by SQL
  - [ ] 7.1.d **Check:** the owner's export is restored into a throwaway MySQL container with its schema documented — **or**, as a fallback and only with the owner's OK, a read-only, rate-limited read of the public pages has produced a URL inventory, product JSON (sold included) and images; either way the legacy URL list for verification exists, nothing personal or raw has been committed, and nothing was done to the old site.

- [ ] **7.2 Normalisers and the review queue** · needs: 7.1
  - **Lane** MIG · **Agent** medior (MIG-A) · **Wave** W2
  - **Owns** `engine/packages/migrate/src/normalise/**`
  - **Read** MIGRATION.md §4 (dirty data list)
  - _Requirements: 16.2_
  - [ ] 7.2.a Parsers for dates, dimensions, condition grades, prices, references and titles (hook vs original; SEO suffixes removed)
  - [ ] 7.2.b A fixture test for each dirty-data case in MIGRATION.md §4
  - [ ] 7.2.c The review file — raw value beside the proposal — for everything below confidence
  - [ ] 7.2.d **Check:** dates, dimensions, condition grades, prices, references and titles (hook vs original, SEO suffixes removed) parse from the real extract, with a fixture test per dirty-data case listed in MIGRATION.md, and everything below confidence goes to a review file with raw value beside proposal.

- [ ] **7.3 Old East Indies legacy URL discovery** · needs: 2.1 — 🔄 7·W1
  - **Lane** MIG · **Agent** medior (MIG-B) · **Wave** W1
  - **Owns** `engine/packages/migrate/src/sources/csv-products/**`, `old-east-indies/content/legacy/**`
  - **Read** MIGRATION.md §10
  - _Requirements: 16.6_
  - [ ] 7.3.a URL discovery (CDX + Search Console export 👤)
  - [x] 7.3.c the Wayback CDX half now — every archived `oldeastindies.com` path inventoried — and an importer for the Search Console CSV (OA11), tested on a synthetic CSV, ready for the owner's export
  - [x] 7.3.d the two archived `/sitemap.xml` captures (2024-06-24, 2024-08-08) read through Wayback playback on web.archive.org — never the old site — as a third source, since the CDX index holds only 4 Squarespace product paths; the owner's OK is D43
  - [ ] 7.3.b **Check:** every Squarespace path from the Search Console export and the Wayback CDX index is inventoried in `old-east-indies/content/legacy/`, and nothing was done to the old site.

---

## Phase 8 — Makers, places, terms, works and media · Catalogue · needs 3, 4 · ~2d

**Goal:** the discovery vocabulary, the works collection and the media and masters collections.
**Done when:** in the gallery admin a non-developer creates a maker, a place with a historical name, and a work with a circa date and a verso image; an incomplete work is refused on publish with a plain reason; all of it appears in the API.
**Waves:** W1 — 8.1, 8.3 · W2 — 8.2

- [ ] **8.1 Discovery vocabulary: makers, places (gazetteer), terms, sources** · needs: 3.2
  - **Lane** SCH · **Agent** senior-db · **Wave** W1
  - **Owns** `engine/packages/cms/src/collections/{makers,places,terms,sources}/**`, their validators
  - **Read** CONTENT-MODEL.md §3, ARCHITECTURE.md §8, EXPERIENCE-GALLERY.md §2
  - _Requirements: 3.4, 3.5, 5.1_
  - [ ] 8.1.a makers: names, sortName, aliases, roles, life dates with precision, bio (blocks), portrait, `sameAs`
  - [ ] 8.1.b places: localised modern name, `historicalNames[]`, type, parent, geo point + bbox; cycle guard
  - [ ] 8.1.c terms (subject, mood, room, occasion, recipient) and sources (bibliography)
  - [ ] 8.1.d gazetteer seed data file (`test/content/seed/gazetteer.json` shape, reused by every brand): the place hierarchy of EXPERIENCE-GALLERY.md §2 and the historical names of ARCHITECTURE.md §8
  - [ ] 8.1.e **Check:** each collection saves with validation, localisation and slugs; a place stores historical names and a parent; a unit test proves a place cannot be its own ancestor.

- [ ] **8.2 Works** · needs: 8.1, 8.3, 4.8
  - **Lane** SCH · **Agent** senior-db · **Wave** W2
  - **Owns** `engine/packages/cms/src/collections/works/**`, `validators/work-*.ts`, `hooks/work-*.ts`
  - **Read** CONTENT-MODEL.md §1, §9; COMPLIANCE.md §1, §8
  - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.9, 3.10, 3.11_
  - [ ] 8.2.a fields and groups (collation, dimensions in mm, condition with the grade as a `terms(grade)` reference, references, provenance, images with roles, master, rights, **physical with no defaults** — location and export status stay blank until the item register sets them — origin, cataloguing, the `book` group for books and atlases, legacy, seo); the print ceiling lives on designs, not works
  - [ ] 8.2.b pure validators: date order and precision, positive dimensions, image ≤ sheet
  - [ ] 8.2.c publish guard (title, object type, date, primary place or maker, primary image with alt, grade for originals, verified AI fields) — a blank location or export status **never blocks publishing**; it makes the item enquiry-only (Req 16.8)
  - [ ] 8.2.d field-level access for `physical`; read-only guard for synced fields on copies; `publishedOrStaff` read access
  - [ ] 8.2.e `afterChange` / `afterDelete` → `@engine/cache`'s `invalidate(tags)` (4.8) for the work and everything that lists it, run after the commit: `after()` inside a request, the caller's collector outside one (ARCHITECTURE.md §9)
  - [ ] 8.2.f **Check:** every field in CONTENT-MODEL.md §1 exists; save-time validation and the publish guard are unit-tested; public read is `publishedOrStaff`; `physical` fields are invisible to roles without access and to the public; a provenance copy's synced fields reject edits; against a real database and outside a request (a collector on `req.context`), a save whose transaction rolls back flushes nothing, and a committed save's tags are flushed only once its operation has returned.

- [ ] **8.3 Media and masters** · needs: 3.2
  - **Lane** MED · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/cms/src/collections/{media,masters}/**` (by agreement with SCH), `engine/packages/media/src/storage/**`
  - **Read** ARCHITECTURE.md §7, CONTENT-MODEL.md §6, KOI CONTENT-MODEL Media
  - _Requirements: 4.3, 4.6_
  - [ ] 8.3.a `media` upload collection: localised alt text required, image roles, the brand bucket through `@payloadcms/storage-s3`
  - [ ] 8.3.b `masters` as a plain collection: a presigned PUT straight to the private bucket (never through the app server), checksum recorded on completion, no public URL
  - [ ] 8.3.c Bucket policies: the shop's credentials write only under `print-files/`; local MinIO policies mirror production
  - [ ] 8.3.d Upload size limits and allowed types
  - [ ] 8.3.e **Check:** a public upload requires localised alt text and lands in the brand bucket; `masters` is a **plain collection** (not an upload collection) whose files go straight to the private bucket by presigned PUT — never through the app server — and have no public URL; the shop's credentials can write only under `print-files/`; upload limits and allowed types are enforced.

---

## Phase 9 — Products, merchandise, editorial and people · Catalogue · needs 8 · ~3d

**Goal:** the product collections for both brands, the merchandise model, editorial content and the customer-side collections.
**Done when:** in the gallery admin a unique product is created from a work; in the shop admin a design, a product type and a product with variants; a story with blocks and a page publish; all appear in the API.
**Waves:** W1 — 9.1, 9.3, 9.4 · W2 — 9.2

- [ ] **9.1 Products** · needs: 8.1, 8.3, 4.8
  - **Lane** SCH · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/cms/src/collections/products/**`, `validators/product-*.ts`, `hooks/product-*.ts`
  - **Read** CONTENT-MODEL.md §1, COMMERCE.md §3–4, §7
  - _Requirements: 3.1, 3.3, 3.11, 6.10, 8.4, 16.8_
  - [ ] 9.1.a fields (kind, inventoryModel, work/design/productType, status, pricing group with market prices, shipping profile, tax class, HS code derivation, badges, channels, seo)
  - [ ] 9.1.b `publicId` sequence starting above the highest legacy id; slug derivation (NOW! S1 rule: never re-derive on edit)
  - [ ] 9.1.c publish guard (pricing mode, price unless on request, shipping profile, tax class, a routable seller — **or**, for a unique item whose work has no location or export status, publish as enquiry-only — rights for reproductions)
  - [ ] 9.1.d guard: originals can never have channel `marketplace`
  - [ ] 9.1.e `afterChange` → `@engine/cache`'s `invalidate(tags)` (4.8), after the commit: editorial tags stale-while-revalidate, the product's price and availability tags expired immediately (Req 19.12)
  - [ ] 9.1.f **Check:** `publicId` is a unique integer sequence that accepts preserved legacy ids; slugs derive once and never re-derive; `status` is only `available · not-for-sale · archived` — *on hold* and *sold* are derived from reservations (C8 availability), never stored; public read is `publishedOrStaff`; the publish guard is tested.

- [ ] **9.2 Merchandise schema: designs, product types, variants, locations, stock** · needs: 8.2, 9.1
  - **Lane** SCH · **Agent** senior-db · **Wave** W2
  - **Owns** `engine/packages/cms/src/collections/{designs,product-types,variants,locations,stock-levels}/**`, `engine/packages/cms/src/db/inventory.ts`
  - **Read** CONTENT-MODEL.md §2, COMMERCE.md §4, §8, ARCHITECTURE.md §7
  - _Requirements: 3.1, 4.4, 7.2, 12.4_
  - [ ] 9.2.a designs (work, crop, print file stored under `print-files/` in the masters bucket, aspect, derived print ceiling, story, archive number)
  - [ ] 9.2.b product types (axes and options, price table per market, constraints, minimum ppi — 240 by default, D26 — fulfilment routes, shipping profile, HS code, materials, mockup scenes)
  - [ ] 9.2.c variants (options, SKU pattern, market prices, weight/dimensions, fulfilment mapping)
  - [ ] 9.2.d locations and stock levels; `inventory_movements` append-only table declared in `db/inventory.ts`
  - [ ] 9.2.e **Check:** a product type with axes, a price table and constraints saves; a variant cannot exceed its design's print ceiling (enforced again in 15.4); `stockLevels.reserved` is not editable in the admin; `inventory_movements` exists as an engine table in the wave migration.

- [ ] **9.3 Editorial and site: stories, pages, curations, exhibitions, redirects, globals, blocks** · needs: 1.2.d, 3.2
  - **Lane** SCH · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/cms/src/{collections/{stories,pages,curations,exhibitions,redirects},globals,blocks}/**`
  - **Read** CONTENT-MODEL.md §6–7, DESIGN-SYSTEM.md §5, BRANDS.md §3
  - _Requirements: 2.3, 2.4, 3.5, 3.9, 3.11_
  - [ ] 9.3.a block definitions from C4 + an exhaustiveness test against `@engine/view-models` blocks
  - [ ] 9.3.b stories, pages (template hints; a slug validator refusing a root segment of any locale — C10 `RESERVED_SEGMENTS`, `CLAIMED_SEGMENTS`, the route map's surfaces, forms and named-facet values — a legacy prefix's first segment and a one-segment legacy path, MIGRATION.md §6), curations (kinds, members or query, PDF field), exhibitions
  - [ ] 9.3.c globals: brandSettings, navigation, homepage (ordered bands), commerceSettings, consent, seoDefaults — wired into the config merge seam (3.1.a)
  - [ ] 9.3.d redirects collection (from, to, code, source, hits) with a unique `from` and a root-relative `to` — `^/(?![/\\])`, never `//host` or `/\host` (MIGRATION.md §6)
  - [ ] 9.3.e draft preview at the real URL for staff (NOW! S4 pattern: staff session, not a token) and live preview config
  - [ ] 9.3.f **Check:** all fifteen blocks from C4 have Payload definitions matching the union exactly (a test compares them), including `prose` note marks that cite a source and `zoomFigure` regions addressed in IIIF coordinates; the six globals save (the holiday calendar inside `commerceSettings`, which holds **no prices**); a curation can be a manual list or a saved facet query, with price thresholds **per market currency**; every drafts-enabled collection reads `publishedOrStaff`.

- [ ] **9.4 People (non-commerce): customers, addresses, saved items, want-lists, subscribers, reviews** · needs: 3.2
  - **Lane** SCH · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/cms/src/collections/{customers,addresses,saved-items,want-lists,subscribers,reviews}/**`
  - **Read** CONTENT-MODEL.md §5, ARCHITECTURE.md §12, COMPLIANCE.md §7
  - _Requirements: 13.1, 13.2, 18.5_
  - [ ] 9.4.a `customers` as its own auth collection (profile, verification, consents; a `ref`, a `token_version` and a `links_anchor_at` for the links that name it, C6 `links`; a pending password link's nonce **hash** and expiry, C13 `PASSWORD_LINK`) — never the staff collection; the custom strategy and its cookie arrive in 28.1
  - [ ] 9.4.b `addresses` with the Indonesian shape (province → city → district → sub-district, postcode) and an international form
  - [ ] 9.4.c `saved-items`, `want-lists` (a customer **or** an email address, never both; status `pending`/`active`; a `ref` (a random UUID) and a `token_version` — no token and no hash of one (C6 `links`); at most `WANT_LIST_PENDING_PER_ADDRESS` (10) pending per address; subject — a listing's path or a product it watches another example of; budget stored with its market currency; frequency `instant`/`daily`; consent for alerts, separate from marketing email), `subscribers` (with recorded consent, a `ref` and a `token_version`), `reviews` (verified buyer, moderation state)
  - [ ] 9.4.d Access rules — a customer reads and edits only their own records — with tests
  - [ ] 9.4.e **Check:** `customers` is its own auth collection (the custom strategy and its separate session cookie arrive in 28.1), a customer can read and edit only their own records (tested), addresses validate the Indonesian shape, want-list budgets store their market currency, an email-held want list stores no token and no hash of one — only its `ref` and `token_version` (C6 `links`) — and starts `pending` until confirmed, and consents store purpose, timestamp and policy version.

---

## Phase 10 — Admin organisation, seeds and the catalogue gate · Catalogue · needs 9 · ~2.5d

**Goal:** the admin grouped and worded for non-developers, seeds for every brand, the stage's migration, and the gate over the Catalogue stage.
**Done when:** in the gallery admin a non-developer creates a maker, a place with a historical name, a work with a circa date and a verso image, and a unique product; in the shop admin a design, a product type and a product with variants; all appear in the API; an incomplete work is refused on publish with a plain reason; schema hashes are identical across three databases.
**Waves:** W1 — 10.1, 10.2 · W2 — 10.4 · 10.3 after each wave's merge

- [ ] **10.1 Admin organisation and plain language** · needs: phase 8, phase 9
  - **Lane** SCH · **Agent** senior-uiux · **Wave** W1
  - **Owns** `admin.*` settings inside `engine/packages/cms/src/collections/**` (after the wave's authors hand off)
  - **Read** NOW! docs/SURFACES-PLAN.md §2.2 and S3 (writer-first screens, legacy fields in tabs, plain labels)
  - _Requirements: 2.5, 14.8_
  - [ ] 10.1.a Sidebar groups — Catalogue · Merchandise · Commerce · Editorial · People · Settings — through `admin.group`
  - [ ] 10.1.b A cataloguer's default screens: engine and legacy fields in collapsed tabs, list columns chosen for the job
  - [ ] 10.1.c Plain-language labels and descriptions in English and Indonesian
  - [ ] 10.1.d `admin.hidden` driven by module flags, so a disabled module's collections disappear
  - [ ] 10.1.e **Check:** the sidebar is grouped (Catalogue · Merchandise · Commerce · Editorial · People · Settings), a cataloguer's default screen shows no engine or legacy field, every label a cataloguer sees is in plain English and Indonesian, and disabled modules' collections are hidden.

- [ ] **10.2 Seeds** · needs: phase 8, phase 9
  - **Lane** BRD (+ SCH for the seed runner) · **Agent** medior · **Wave** W1
  - **Owns** `engine/packages/cms/src/seed/**`, `*/content/seed/**`
  - **Read** CONTENT-MODEL.md §10
  - _Requirements: 3.9, 9.5_
  - [ ] 10.2.a The seed runner: re-runnable, idempotent by natural key, everything landing as drafts
  - [ ] 10.2.b Gallery cases: sold with an alternative, price on request, a circa date, Jakarta `domestic-only`, an original with **no location** (enquiry-only), a verso photograph
  - [ ] 10.2.c Shop cases: three designs (one rights-pending), four product types, showroom stock, a gift card
  - [ ] 10.2.d The `test` brand's fictional catalogue for both of its configs
  - [ ] 10.2.e **Check:** `pnpm seed --brand <slug>` is re-runnable, lands everything as drafts, and loads the cases CONTENT-MODEL.md §10 lists (sold with alternative, price on request, circa date, Jakarta `domestic-only`, an original with **no location** (enquiry-only), verso photograph; three designs incl. one rights-pending; four product types; showroom stock; a gift card).

- [ ] **10.3 Migrations and schema verification (per wave)** · needs: each wave's merge
  - **Lane** SCH · **Agent** senior-db (SCH lead) · **Wave** after each wave's merge in phases 8–10
  - **Owns** `engine/packages/cms/src/migrations/**`, `engine/packages/cms/payload-types.ts` (generated)
  - _Requirements: 1.5, 19.7_
  - [ ] 10.3.a wave A migration
  - [ ] 10.3.b wave B migration
  - [ ] 10.3.c wave C migration (incl. the `inventory_movements` engine table)
  - [ ] 10.3.d a verify script creating a work + product through the Local API with hooks (NOW! `verify-*` pattern), then reading them **as the public** (`overrideAccess: false`) to prove a draft and a `physical` field never come back; run in CI
  - [ ] 10.3.e **Check:** each wave has exactly one generated migration, `payload migrate:create` reports "No schema changes detected" after it, the one `engine/packages/cms/payload-types.ts` is regenerated, and `schema-hash --all` is equal.

- [ ] **10.4 Catalogue gate** · needs: phase 8, phase 9, 10.1–10.3
  - **Lane** QA · **Agent** qa · **Wave** W2
  - **Owns** `docs/gates/catalogue.md`
  - **Read** the **Done when** of phases 8–10
  - _Requirements: 3.1–3.11_
  - [ ] 10.4.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 10.4.b Drive every clause of the **Done when** of phases 8–10 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/catalogue.md`
  - [ ] 10.4.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 10.4.d **Check:** every clause of the **Done when** of phases 8–10 is evidenced in `docs/gates/catalogue.md`, with no failure left open.

---

## Phase 11 — Primitives, tokens, the loader interface and state fixtures · Design systems · needs 4 · ~3d

**Goal:** the brand-agnostic UI base — everything that does not need the owner's pick of a direction.
**Done when:** the headless primitives pass their keyboard and axe tests; changing a brand's token overrides re-skins every primitive and a failing palette is rejected; a surface loads through the loader interface from the fixture source; every purchase and availability state has a fixture.
**Waves:** W1 — 11.1, 11.2, 11.3 · W2 — 11.4

- [ ] **11.1 Headless primitives** · needs: 1.2
  - **Lane** WEB · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/ui/src/primitives/**`
  - **Read** DESIGN-SYSTEM.md §1, §9
  - _Requirements: 19.2_
  - [ ] 11.1.a Overlay primitives — dialog, sheet, drawer, toast — with focus trap, focus return and an inert background
  - [ ] 11.1.b Disclosure, tabs, combobox and radio group
  - [ ] 11.1.c Form fields (label, hint, error), price, skip link, visually-hidden, and the storefront link — `next/link` with `prefetch={false}`, whose props omit `prefetch`: the storefront's one import of `next/link` (CONVENTIONS.md §12)
  - [ ] 11.1.d Component tests for every interaction state and keyboard path
  - [ ] 11.1.e **Check:** dialog, sheet, drawer, tabs, disclosure, combobox, radio group, toast, form fields, price, skip link, visually-hidden and the storefront link (never prefetching) are keyboard-complete and screen-reader-labelled, unstyled and token-driven, with component tests for their interaction states.

- [ ] **11.2 Token pipeline, runtime overrides and the contrast gate** · needs: 1.2.c, 3.1.a
  - **Lane** WEB · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/ui/src/tokens/**` (not `contract.ts`, which is C3)
  - **Read** DESIGN-SYSTEM.md §4, KOI DESIGN-SYSTEM.md §1 and "Secondary text"
  - _Requirements: 2.6, 19.2_
  - [ ] 11.2.a Inject brand token overrides from config into the root layout as CSS custom properties, at runtime
  - [ ] 11.2.b Derive `--c-ink-soft` against the deepest surface; the contrast validator checks every text pairing against WCAG AA
  - [ ] 11.2.c A failing palette is rejected whole: the app's default tokens render and the reason is logged (unit tests)
  - [ ] 11.2.d **Check:** brand overrides are injected at runtime, `--c-ink-soft` is derived against the deepest surface, and a unit test proves a failing palette is rejected whole.

- [ ] **11.3 Loader interface with a fixture source** · needs: 1.2.b, 4.1.e, 4.8
  - **Lane** WEB · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/loaders/**`
  - **Read** DESIGN-SYSTEM.md §2–3, ARCHITECTURE.md §9, §12, the spike write-up
  - _Requirements: 1.2, 3.11_
  - [ ] 11.3.a `loadX(params)` per surface returning its VM; `loadItem({ locale, publicId, asked })` returns `{ vm } | { redirectTo } | null` (C2 4.3.f): its cached read keyed by `(locale, publicId)` alone, `asked.path` compared with `href()`'s spelling byte for byte outside it, `redirectTo` carrying `asked.search` — the rule of 4.1's `engine/apps/gallery/src/item/canonical.ts`, carried in with its tests; every slug or path input decoded text from C10's parse of the public path, never a raw `params` segment; a loader that both a page and its `generateMetadata` call deduplicated per request with React `cache()`, and brand-asset URLs taken from the memoised minting (4.1 senior-fe #10, #11); the shell's loader sets `ShellVM.assets.touchIcon` and `.manifest` (C13 `BRAND_ROOT_ASSETS`, `null` where the brand ships none) — both required by then: ARC tightens them at 4.6's merge, once 4.6.e's apps set them
  - [ ] 11.3.b The fixture source behind `LOADERS_SOURCE=fixtures` — the boot check refuses it in production
  - [ ] 11.3.c The one Payload read helper — always `overrideAccess: false`, `_status: 'published'` and a `select` — and a lint rule failing any other Local API call in `loaders/`
  - [ ] 11.3.d Stubbed Payload sources per surface, ready for the storefront stages
  - [ ] 11.3.f availability (ARCHITECTURE.md §9): the purchase panel's read is live, never `'use cache'`, one indexed read the page awaits in its body behind a short timeout that resolves `unverified`, so its forms reach the first flush; every cached scope that shows an availability status declares `@engine/cache`'s `AVAILABILITY_STATUS_LIFE` as its own `cacheLife` and tags `availability:<id>`, batching `cacheTag()` calls of at most 128 tags each
  - [ ] 11.3.e **Check:** every surface has a `loadX(params)` returning its VM (`loadItem` returns `{ vm } | { redirectTo } | null`: two spellings of one item's address read one cache entry, and every spelling but `href()`'s answers `redirectTo` carrying the asked query; a timed-out availability read gives the purchase panel `unverified`; a status-showing cached scope declares `AVAILABILITY_STATUS_LIFE`), backed by fixtures when `LOADERS_SOURCE=fixtures` (dev and component tests — the boot check refuses it in production), with the Payload source stubbed for the storefront stages behind one read helper that **always** passes `overrideAccess: false`, `_status: 'published'` and a `select` for published content (a lint rule fails any other Local API call in `loaders/`); a caller-scoped surface — cart, checkout, order, pay, quote, order-lookup, and now `wantList` — reads instead by the caller's own session or access cookie, never a public id (a `wantList` whose `watch` is not its listing's canonical path redirects to the canonical URL; the `quote` form, where `accounts.retailers` is on, redirects anyone but a signed-in partner to the Partnership page), and its request-time parts (a form, a post's result, on the want-list page the list an email's link opened) are resolved and rendered in the page's own body, never behind a nested `<Suspense>`, so a visitor with no JavaScript still sees them.

- [ ] **11.4 State matrix fixtures** · needs: 1.2.b, 11.3
  - **Lane** WEB · **Agent** senior-fe · **Wave** W2
  - **Owns** `engine/packages/view-models/src/fixtures/states/**`
  - **Read** DESIGN-SYSTEM.md §3
  - _Requirements: 6.11, 19.2_
  - [ ] 11.4.a Per-surface state fixtures: loading/streaming, empty, partial, error, JavaScript off
  - [ ] 11.4.b Long content and extreme values — Dutch titles, 300-character Latin transcriptions, +30% text, `Rp 1.250.000.000` — and images at aspects 0.3, 1 and 3.5
  - [ ] 11.4.c The purchase-panel matrix: one fixture per combination, including *enquiry-only*
  - [ ] 11.4.d Register every fixture with both apps' `/style-guide` state switchers
  - [ ] 11.4.e **Check:** every surface has fixtures for loading/streaming, empty, partial, error, JavaScript off, long content (Dutch titles, 300-character Latin transcriptions, +30% text expansion) and extreme values (`Rp 1.250.000.000`), and the gallery purchase panel has one fixture per purchase-state combination (including *enquiry-only*: an original with no known location), each action linking to a page that posts its operation (C10's `hold` and `quote` forms, never an enquiry topic or a CMS page); the form page has a fixture per form kind (`hold` and `quote` among them) and per result it can show — sent back, refused, received, rate-limited; the want-list page has a fixture per state of its own small matrix — a subject named or not, an opened list present, gone or none, and each result its form can show — resolved, never streamed, proving it renders without JavaScript; both apps' `/style-guide` state switchers list them.

---

## Phase 12 — The shared base, each brand's accents and the sister system · Design · needs 6 · ~2.5d

**Goal:** one base system both sites share — layout, components, buttons, type (Cormorant Garamond + Karla) — with each brand's own accents on top, on real photography, and the sister system drawn in it (D9, 2026-09-28).
**Done when:** the base-system candidates are on staging as comps on real photography — the owner's draft (`docs/design/input/claude-design-2026-09/`) as the lead candidate, Etalage and Everart as the references — each shown as a pair: the gallery's item page and the shop's product page with the configurator open, each in its brand's accents; the sister system exists in the shared base, ready for the owner to judge.
**Waves:** W1 — 12.1 · W2 — 12.2 · W3 — 12.3

- [ ] **12.1 The shared base-system round** · needs: 6.1.c, 6.2.b
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W1
  - **Owns** `docs/design/base/**`
  - **Read** `docs/design/input/claude-design-2026-09/` (the owner's draft and `project-notes.md` — draft input, not decided), impeccable `reference/new-work.md` §3, EXPERIENCE-GALLERY.md, EXPERIENCE-SHOP.md, RESEARCH.md §1.5, §3, DESIGN-SYSTEM.md
  - _Requirements: 6.1, 6.2, 7.2, 19.2_
  - [ ] 12.1.a Audit the owner's draft against the surfaces (DESIGN-SYSTEM.md §2) and the two references — Etalage (showcase catalogue, detailed product presentation) and Everart (a consistent catalogue in artistic frames, complete filtering) — taking their look and feel, mixed, never copied; list what the draft settles and what it leaves open (states, phone layouts, Indonesian text, interaction)
  - [ ] 12.1.b Run impeccable's direction round **for the shared base only** — layout grid, components, buttons, type scale on the locked pair Cormorant Garamond + Karla — with the owner's draft as the lead candidate and at most four challengers; `concept-seed --scope direction`, IMPECCABLE'S PICK and a canon card for each survivor
  - [ ] 12.1.c Comp, for the top two or three base candidates at full fidelity on the pilot photography (first viewport and one scroll, phone first): **the gallery's item page** — including the typical migrated item and its hook-title fallback — and **the shop's product page with the configurator open**, each in a neutral accent
  - [ ] 12.1.d Structure cards for home and browse per candidate, and an impeccable critique of each
  - [ ] 12.1.e **Check:** the owner's draft is audited against every surface and both references, with its open points listed; the base round has run — the draft as lead, at most four challengers, a `concept-seed --scope direction` roll, IMPECCABLE'S PICK and a canon card — on the locked type pair; the top two or three candidates show the gallery's item page and the shop's product page with the configurator open at full fidelity, phone first on the pilot photography, including the typical migrated item and its hook-title fallback; home and browse appear as structure cards; each finalist has an impeccable critique.

- [ ] **12.2 Each brand's accents and the cultural review** · needs: 12.1.b
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W2
  - **Owns** `docs/design/gallery/**`, `docs/design/emporium/**`
  - **Read** DESIGN-SYSTEM.md §4 (the overridable token subset), BRANDS.md, `docs/design/input/claude-design-2026-09/project-notes.md` (the logo colours)
  - _Requirements: 6.1, 7.2, 19.2_
  - [ ] 12.2.a For each base candidate, the gallery's accents (super premium, for one-of-one originals) and the shop's (warmer, for prints and souvenirs, starting from its logo's brown `#593D21` and cream `#F1E5D3`) — palette, signature details, image mats and frames — kept inside C3's overridable subset, so accents never change layout, components or type
  - [ ] 12.2.b 👤 recruit two or three Indonesian designers or buyers for the cultural review
  - [ ] 12.2.c **Check:** every base candidate has a gallery and a shop accent set inside C3's overridable subset, every text pairing clearing AA; every shop set works **without** the Hofker line as hero (D6); and a cultural review by Indonesian designers and buyers has produced a written position on what the shop's accents celebrate and avoid.

- [ ] **12.3 The sister system** · needs: 12.1, 12.2
  - **Lane** UXG + UXE · **Agent** senior-uiux · **Wave** W3
  - **Owns** `docs/design/sister/**`
  - **Read** BRANDS.md §5
  - _Requirements: 15.3_
  - [ ] 12.3.a The shared lockup and the Archive No. / stock-number tag — one format both brands print and show
  - [ ] 12.3.b The cross-link components — sister strip, "own the original", "get a print", the separate-account note — drawn once in each base candidate: the two-way bridge between the sites the client asked for
  - [ ] 12.3.c The same components shown in each brand's accents, so every candidate is judged with its sister system
  - [ ] 12.3.d **Check:** a shared lockup, the shared Archive No. / stock-number tag and format, and each cross-link component (sister strip, "own the original", "get a print", the separate-account note) are drawn in each base candidate and shown in both brands' accents.

---

## Phase 13 — The owner's pick and the buyer test 👤 · Design · needs 12 · ~3d

**Goal:** the shared base and each brand's accents, picked by the owner and tested with real buyers, and the admin's visual brief.
**Done when:** the owner has picked the shared base and each brand's accents — judged side by side, on their own phone and on a desktop; real buyers have run the prototype and their findings are written up against each direction; the admin has its visual brief.
**Waves:** W1 — 13.1 · W2 — 13.2, 13.3

- [ ] **13.1 👤 Owner picks the shared base and each brand's accents** · needs: 12.3
  - **Lane** ARC · **Agent** — (orchestrator presents) · **Wave** W1
  - **Owns** `docs/design/DECISIONS.md`
  - _Requirements: 6.1, 7.1_
  - [ ] 13.1.a Prepare each base candidate with both brands' accents as phone-sized and desktop comps, behind one link the owner opens on their own phone
  - [ ] 13.1.b 👤 The review session: the owner compares the candidates side by side, gallery and shop together, phone first, then desktop
  - [ ] 13.1.c Record the choice, the device used and every requested change verbatim, with the date, in `docs/design/DECISIONS.md`; hand the changes to 13.2
  - [ ] 13.1.d **Check:** the owner has compared the base candidates, each with both brands' accents, side by side on their own phone and on a desktop, and the choice, the device used and every requested change are recorded verbatim with the date.

- [ ] **13.2 👤 Prototype test with real buyers** · needs: 13.1
  - **Lane** UXG + UXE · **Agent** senior-uiux, qa · **Wave** W2
  - **Owns** `docs/design/research/prototype-test/**`
  - _Requirements: 19.10_
  - [ ] 13.2.a Build a clickable phone prototype of the chosen item page and configurator, with 13.1's requested changes
  - [ ] 13.2.b Write the test script from the 6.1.c journeys — tasks, success criteria, what to observe — in English and Indonesian
  - [ ] 13.2.c 👤 Recruit five collectors and five Instagram-type shoppers (D21), two of the sessions in Indonesian
  - [ ] 13.2.d Run and record the ten sessions: task time, success, quotes, findings ranked by severity
  - [ ] 13.2.e Turn the findings into a list of design changes for 14.1
  - [ ] 13.2.f **Check:** a clickable phone prototype of the chosen item page and configurator has been tested with five collectors and five Instagram-type shoppers — two sessions in Indonesian — on the 6.1.c journeys, with task times, success and findings recorded and folded into 14.1.

- [ ] **13.3 Admin visual brief** · needs: 13.1
  - **Lane** ADM · **Agent** senior-uiux · **Wave** W2
  - **Owns** `docs/design/admin/visual-brief.md`
  - _Requirements: 14.8_
  - [ ] 13.3.a Each brand's admin colour application — chrome and accents only, never dense tables or form fields
  - [ ] 13.3.b Decide whether Payload's dark theme is tokenised to AA or disabled, and record it
  - [ ] 13.3.c Density, type size and target size for long cataloguing sessions
  - [ ] 13.3.d **Check:** each brand's admin colour application is specified (chrome and accents only — never dense tables or form fields), Payload's dark theme is either tokenised to AA or disabled (decided and recorded), and density and target size for long cataloguing sessions are set.

---

## Phase 14 — DESIGN.md, tokens and the design gate 👤 · Design · needs 13 · ~2.5d

**Goal:** the picked base and accents recorded as `DESIGN.md` and token files, and the gate over the Design stage.
**Done when:** the owner has approved the shared base and each brand's accents — on their own phone and on a desktop — after a prototype test with real buyers; both `DESIGN.md` files (sharing one base section) (with motion, iconography, image treatment, font budget and the dark-mode decision) and token files are committed; each brand has a native-reviewed EN/ID voice and lexicon; the sister system exists in both worlds; the admin has its visual brief.
**Waves:** W1 — 14.1 · W2 — 14.2

- [ ] **14.1 👤 DESIGN.md and token files** · needs: 13.1, 13.2
  - **Lane** UXG + UXE (one agent each) · **Agent** senior-uiux · **Wave** W1
  - **Owns** `engine/apps/gallery/{DESIGN.md,src/styles/tokens.css}`, `engine/apps/emporium/{DESIGN.md,src/styles/tokens.css}`
  - **Read** DESIGN-SYSTEM.md §4, §7–13, the chosen comps, the prototype findings
  - _Requirements: 2.6, 19.2_
  - [ ] 14.1.a motion spec: at most six named motions, each with trigger, duration, easing and reduced-motion fallback
  - [ ] 14.1.b iconography: one family per app matched to the type's stroke; the viewer's glyphs (recto, verso, raking, transmitted, reset, loupe); payment, courier and WhatsApp marks per their owners' guidelines
  - [ ] 14.1.c image treatment: box behaviour at aspects 0.3, 1 and 3.5; mats against toned paper; the contact shadow; black-and-white and albumen photographs
  - [ ] 14.1.d font budget: ≤ 3 files on first paint, subsets for Latin + Indonesian + Dutch, glyph coverage checked against real original titles (`ſ`, ligatures, diacritics), a CJK plan
  - [ ] 14.1.e record the dark-mode decision (storefronts: none; the viewer's lightbox rung) — DESIGN-SYSTEM.md §4
  - [ ] 14.1.f 👤 owner approves and buys any commercial font licence (web + PDF embedding for 23.6), or accepts the free alternative
  - [ ] 14.1.g **Check:** each DESIGN.md records the shared base with its canon card — word for word the same in both — and its brand's accents; every C3 token is defined, the brands differing only in the overridable subset, with every text pairing clearing AA, font licences are confirmed (a commercial face like DTL Elzevir needs the owner — else its Google alternative), and the sections below exist; the signature surface has had a full-fidelity pass in the chosen direction.

- [ ] **14.2 Design gate — with the design gate** · needs: phase 6, phase 12, phase 13, 14.1
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W2
  - **Owns** `docs/gates/design.md`
  - **Read** the **Done when** of phases 6, 12, 13 and 14, DESIGN-SYSTEM.md §13
  - _Requirements: 6.1, 7.1, 19.10_
  - [ ] 14.2.a Collect the evidence for every clause of the **Done when** of phases 6, 12, 13 and 14 — the approved base and accents, both DESIGN.md and token files, the native-reviewed lexicons, the sister system — in `docs/gates/design.md`
  - [ ] 14.2.b The design gate on the final comps (DESIGN-SYSTEM.md §13): impeccable `critique` at 360, 390, 768 and 1440 px, in English and Indonesian — zero P0/P1 left
  - [ ] 14.2.c 👤 The owner confirms the final comps are the ones they approved; recorded in `docs/design/DECISIONS.md`
  - [ ] 14.2.d **Check:** every clause of the **Done when** of phases 6, 12, 13 and 14 is evidenced in `docs/gates/design.md`, the design gate reports zero P0/P1, and the owner has confirmed the comps.

---

## Phase 15 — Derivatives, IIIF tiles, manifests and masters · Media and search · needs 9 · ~3.5d

**Goal:** every image turned into the derivatives, tiles and manifests the storefronts and the viewer need, with the masters kept private.
**Done when:** a 3543 × 2840 scan becomes the derivative ladder and IIIF tiles (by the queue job and by the bulk CLI) with a valid Presentation manifest; the master stays private and its print ceiling is computed.
**Waves:** W1 — 15.1, 15.4 · W2 — 15.2 · W3 — 15.3

- [ ] **15.1 Derivative ladder and image loader** · needs: 8.3
  - **Lane** MED · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/media/src/{derivatives,jobs/derivatives}/**`
  - **Read** ARCHITECTURE.md §7, DESIGN-SYSTEM.md §7
  - _Requirements: 4.1, 4.6_
  - [ ] 15.1.a The derivative job: AVIF + WebP at 320/640/1024/1600/2400 px and a blur placeholder, with `sharp` concurrency capped
  - [ ] 15.1.b Queue wiring through `@engine/media/jobs` (run by `/api/x/cron/jobs`), with the job's status on the media record
  - [ ] 15.1.c A custom `next/image` loader that picks from the ladder
  - [ ] 15.1.d **Check:** an upload produces AVIF + WebP at 320/640/1024/1600/2400 and a blur placeholder via a Payload job with a concurrency cap, and a custom `next/image` loader picks from the ladder.

- [ ] **15.2 IIIF tiling — the queue job and the bulk CLI** · needs: 15.1
  - **Lane** MED · **Agent** senior-be · **Wave** W2
  - **Owns** `engine/packages/media/src/{iiif,jobs/tiles,cli}/**`
  - **Read** ARCHITECTURE.md §7, §10, DEPLOYMENT.md §2
  - _Requirements: 4.2_
  - [ ] 15.2.a the tiler (pure, shared by both paths) and the queue job
  - [ ] 15.2.b the off-box CLI with resume, a dry run and a per-item report
  - [ ] 15.2.c **Check:** `sharp().tile({ layout: 'iiif3', size: 512 })` writes Level 0 tiles and `info.json` to the brand bucket; **public tiles stop at the configured resolution cap** while the full-resolution pyramid goes to the private prefix; the queue job (new uploads, `sharp.concurrency` capped, run by `/api/x/cron/jobs`) is idempotent and retried and the media record shows its status; and `pnpm media:tile` tiles a batch **off-box** — on a workstation or CI runner, straight to the bucket, resumable, updating records through the API — for the migration (36.3).

- [ ] **15.3 IIIF Presentation manifests** · needs: 8.2, 15.2
  - **Lane** MED · **Agent** medior · **Wave** W3
  - **Owns** `engine/packages/media/src/manifests/**`, `engine/packages/http/src/media/**`
  - _Requirements: 4.2, 4.3_
  - [ ] 15.3.a A IIIF Presentation 3 manifest per work, images ordered by role, labels localised
  - [ ] 15.3.b A signed full-resolution manifest for staff, reading the private prefix
  - [ ] 15.3.c Served under `/api/x/media/…`, cached and invalidated by tag
  - [ ] 15.3.d **Check:** each work serves a Presentation 3 manifest ordering images by role with localised labels, and a signed full-resolution manifest is available to staff.

- [ ] **15.4 Masters and the print ceiling** · needs: 8.3, 9.2
  - **Lane** MED · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/media/src/masters/**`
  - **Read** ARCHITECTURE.md §7, MIGRATION.md §9
  - _Requirements: 4.3, 4.4_
  - [ ] 15.4.a The presigned-PUT upload flow into the private bucket, recording pixels, ppi, colour profile and checksum
  - [ ] 15.4.b Presigned read URLs with an expiry, and an access log
  - [ ] 15.4.c The print ceiling per design, computed from its master at the product type's minimum ppi, stored and shown
  - [ ] 15.4.d Enforcement on variant save and on publish; the MinIO-policy test for `print-files/`
  - [ ] 15.4.e **Check:** masters are uploaded by presigned PUT straight to the private bucket and record pixels, ppi, colour profile and checksum; presigned read URLs expire and are logged; the shop's key is refused outside `print-files/` (a test against MinIO policies); a design's print ceiling is computed from its master at the product type's minimum ppi (240 by default: a 3543 px long edge → 375 mm) and stored; a test proves an over-ceiling variant is refused on save and on publish.

---

## Phase 16 — The viewer, the search index, facets and the media gate · Media and search · needs 11, 15 · ~3.5d

**Goal:** deep zoom, search with the gazetteer, the facet engine, and the gate over the Media and search stage.
**Done when:** a 3543 × 2840 scan becomes derivatives and tiles and deep-zooms smoothly on a mid-range Android without moving the item page's JS budget; "Celebes" and "Sulawesi" return the same works; facet counts follow the rule.
**Waves:** W1 — 16.1, 16.2 · W2 — 16.3 · W3 — 16.4

- [ ] **16.1 The zoom viewer** · needs: 1.2.h, 11.1
  - **Lane** WEB · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/ui/src/viewer/**`
  - **Read** EXPERIENCE-GALLERY.md §6
  - _Requirements: 4.5, 4.7, 19.1_
  - [ ] 16.1.a An OpenSeadragon wrapper that loads on intent (first tap or hover, or idle after LCP); until then the primary image is a plain responsive image
  - [ ] 16.1.b A filmstrip across recto, verso and details; controls as real buttons; the keyboard map
  - [ ] 16.1.c Touch: pinch and double-tap zoom, one-finger pan only once zoomed, `touch-action`; full screen as a fixed overlay
  - [ ] 16.1.d Reduced motion as cuts; a Lighthouse run proving the item page's initial JavaScript is unchanged
  - [ ] 16.1.e **Check:** OpenSeadragon loads only on intent, shows a filmstrip across recto/verso/details, has keyboard controls and a reset, pans with one finger only once zoomed, honours reduced motion, and a Lighthouse run shows the item page's initial JS unchanged by it.

- [ ] **16.2 Search index with the gazetteer** · needs: 8.1, 8.2, 9.1
  - **Lane** SRC (+ SCH lead for 16.2.a) · **Agent** senior-db · **Wave** W1
  - **Owns** `engine/packages/search/src/{index-builder,pg,gazetteer}/**`, `engine/packages/cms/src/db/search.ts` (16.2.a, SCH lead)
  - **Read** ARCHITECTURE.md §8, NOW! ARCHITECTURE §8.G
  - _Requirements: 5.1, 5.5_
  - [ ] 16.2.a (SCH lead) the DDL in `db/search.ts`: the table, the text-search configuration, the IMMUTABLE `unaccent` wrapper and the indexes, in the wave migration
  - [ ] 16.2.b the index builder, gazetteer expansion and publish/nightly rebuilds
  - [ ] 16.2.c **Check:** `search_documents` is rebuilt on publish and nightly, per locale, with trigram and tsvector indexes on an `unaccent` + `simple` text-search configuration wrapped in an IMMUTABLE function (so the index can use it), **per-market price columns** refreshed by the FX job, and **no stored availability** (it is joined from live reservations at query time); a test proves historical-name expansion (Celebes ⇄ Sulawesi, Batavia ⇄ Jakarta, Iava ⇄ Java) and fuzzy maker matching (Valentyn → Valentijn).

- [ ] **16.3 Facet engine, SearchPort and the search API** · needs: 16.2
  - **Lane** SRC · **Agent** senior-db · **Wave** W2
  - **Owns** `engine/packages/search/src/{port.ts,facets}/**`, `engine/packages/http/src/search/**`
  - _Requirements: 5.2, 5.3, 5.4, 5.6, 8.3_
  - [ ] 16.3.a `SearchPort` and the Postgres facet counts with the all-but-this-facet rule
  - [ ] 16.3.b The place facet rolled up over the hierarchy; availability joined from live reservations at query time
  - [ ] 16.3.c Price facets per market currency — rupiah only for an Indonesian destination — with "on request"; zero-result queries recorded
  - [ ] 16.3.d The `/api/x/search` handler mounted in both apps; unit and e2e tests
  - [ ] 16.3.e **Check:** facets per brand and module compute counts with the all-but-this-facet rule (unit + e2e), the place facet rolls up the hierarchy, availability is computed at query time, **price facets are in the viewer's market currency** (rupiah only for an Indonesian destination — a test fails on any foreign amount) and include "on request", zero-result queries are recorded, and the handler is mounted in both apps under `/api/x/search`.

- [ ] **16.4 Media and search gate** · needs: phase 15, 16.1–16.3
  - **Lane** QA · **Agent** qa · **Wave** W3
  - **Owns** `docs/gates/media-and-search.md`
  - **Read** the **Done when** of phases 15 and 16
  - _Requirements: 4.1–4.7, 5.1–5.6_
  - [ ] 16.4.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 16.4.b Drive every clause of the **Done when** of phases 15 and 16 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/media-and-search.md`
  - [ ] 16.4.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 16.4.d **Check:** every clause of the **Done when** of phases 15 and 16 is evidenced in `docs/gates/media-and-search.md`, with no failure left open.

---

## Phase 17 — Commerce schema, money, sellers, pricing and tax · Commerce · needs 10 · ~2.5d

**Goal:** the commerce collections, money and FX, seller routing with the rupiah rule, and the pricing pipeline with tax.
**Done when:** a basket priced for Bali, Singapore and the Netherlands comes out of the server pipeline in the right seller, currency and tax for each — IDR only for an Indonesian address — and every figure reproduces from its stored inputs.
**Waves:** W1 — 17.1, 17.2 · W2 — 17.3 · W3 — 17.4

**Money-path review.** Every task in the Commerce stage (phases 17–21) that touches `domain/**` or
`payments/**` gets a senior-be review **and** a senior-db review of its
transactions before merge (PARALLEL-TRACKS.md §6) — the reservation service, the
state machines and `applyPaymentEvent()` above all.

- [ ] **17.1 Commerce schema** · needs: phase 10
  - **Lane** SCH · **Agent** senior-db (SCH lead) · **Wave** W1
  - **Owns** `engine/packages/cms/src/collections/{carts,reservations,orders,payment-attempts,refunds,shipments,returns,offers,enquiries,consignments,appointments,invoices,discounts,gift-cards}/**`, `engine/packages/cms/src/db/{reservations,payments,outbox,fx,documents}.ts`, the wave migration
  - **Read** CONTENT-MODEL.md §4, §8, COMMERCE.md §4, §6, §12–13, PAYMENTS.md §4, ARCHITECTURE.md §6
  - _Requirements: 8.5, 8.10, 9.1, 9.9, 11.3_
  - [ ] 17.1.a collections and access rules; `payment-attempts` store the provider's `SessionResult` (domain-held idempotency); every record a derived link names (C6 `LINK_PURPOSES`: an order, a pay link, a quote or proforma, an offer, a hold request, an appointment, a return, an enquiry, a consignment) carries a `ref` (a random UUID, never sequential), a `token_version` and a `links_anchor_at` (C6 `LINK_WINDOW_DAYS` counts from it), and no column holds a token or a hash of one (C5–C8 `storage.ts`)
  - [ ] 17.1.b DDL in `db/`: the reservation partial unique index (on the reservations table itself — never on a relationship table, which would not see the scalar key); `payment_events` (unique `provider` + `seller_id` + `provider_event_id`); `idempotency_keys` (already built by 3.2.e — amended here additively if the writer needs it; unique `operation` + `key` over NOT NULL columns, no composite primary key, then `caller_ref`, `request_sha256`, the stored response with its tokens left out, `created_at`, with an index on `created_at` and one on `caller_ref`; swept after `IDEMPOTENCY_KEY_RETENTION`, 7 days); `domain_events` (the outbox: id, type, payload, created, dispatched, attempts); `fx_rates`; `document_sequences` (gapless per seller and series); the gift-card ledger
  - [ ] 17.1.c wave migration + schema hash
  - [ ] 17.1.d **Check:** every collection exists with access rules (nothing public reads orders; customers read only their own); reservations carry a scalar **`targetKey`** (`product:<id>` for a unique item, `unit:<id>` for a numbered edition unit; counted stock is guarded by the conditional `stock_levels` update instead) and the partial unique index on `target_key WHERE status IN ('active','converted')` for exclusive targets is declared through `afterSchemaInit` and present in the migration; the engine tables below exist; and admin list views minimise PII.

- [ ] **17.2 Money, FX and market price lists** · needs: 1.2.e
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W1
  - **Owns** `engine/packages/domain/src/{money,fx,markets}/**` (not `money/contract.ts`, which is C5)
  - **Read** COMMERCE.md §3, CONVENTIONS.md §3
  - _Requirements: 8.4, 8.5, 8.8_
  - [ ] 17.2.a money module, rounding points, allocation + property tests
  - [ ] 17.2.b FX: rate source port (ECB reference rates by default, D27), daily refresh job, snapshots
  - [ ] 17.2.c market price resolution + "From" price for a destination
  - [ ] 17.2.d **Check:** safe-integer money arithmetic with the **engine's own exponents** (not ISO 4217's — a guard rejects any non-safe-integer at every boundary), the **named rounding points** with their methods — half-even, and largest-remainder allocation so parts sum to the whole (COMMERCE.md §3) — the **five price sources** (explicit, product-type table × multiplier, derived — FX + buffer + market price point — an accepted offer's agreed price, an issued quote's or proforma's line), "From" prices and the FX snapshot are pure and **property-tested** (no float, no rounding outside a named point, totals reproducible).

- [ ] **17.3 Seller routing, destination and the rupiah rule** · needs: 3.1.a, 17.2
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W2
  - **Owns** `engine/packages/domain/src/{sellers,destination}/**`, `engine/packages/http/src/commerce/destination/**`
  - **Read** COMMERCE.md §2–3, COMPLIANCE.md §1–2
  - _Requirements: 8.1, 8.2, 8.3, 8.9, 16.8, 18.7_
  - [ ] 17.3.a `routeSeller()` from stock location and destination, with typed blocked-line reasons (no known location → enquiry-only; `domestic-only` abroad)
  - [ ] 17.3.b The one `shipTo` cookie (defaulted from `CF-IPCountry`) and its API under `/api/x/commerce/destination` — no currency parameter anywhere
  - [ ] 17.3.c The rupiah rule in VM formatting, with a test that fails on any foreign amount for an Indonesian destination
  - [ ] 17.3.d The Singapore seller's Indonesian deliveries priced and charged in IDR (D29)
  - [ ] 17.3.e **Check:** `routeSeller()` picks one seller from stock location and destination, or explains blocked lines; an original with **no known location sells nowhere** (enquiry-only); a Jakarta `domestic-only` item is blocked for a Dutch destination with the stated message; the Singapore seller shipping to Indonesia prices in IDR (D29); the one `shipTo` cookie (defaulted from `CF-IPCountry`) and its API are the **only** input to the market — there is no currency parameter anywhere; VM formatting provably renders **IDR only** for Indonesian destinations (a test fails if any foreign amount is present).

- [ ] **17.4 Pricing pipeline and tax** · needs: 17.2, 17.3
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W3
  - **Owns** `engine/packages/domain/src/{pricing,tax}/**`
  - **Read** COMMERCE.md §3, §9; COMPLIANCE.md §3
  - _Requirements: 8.5, 8.6_
  - [ ] 17.4.a Every pipeline step as a pure function returning its intermediate figures for the order snapshot
  - [ ] 17.4.b Tax regimes as dated data — ID-PPN 12% on an 11/12 base, SG-GST 9%, `none` — with exports zero-rated
  - [ ] 17.4.c Inclusive and exclusive price lists producing the right tax lines, under property tests
  - [ ] 17.4.d **Check:** each pipeline step is a pure function; ID-PPN (12% on an 11/12 base), SG-GST 9% and `none` are data with effective dates; exports are zero-rated; inclusive and exclusive price lists produce the right tax lines; every intermediate figure is returned for the order snapshot.

---

## Phase 18 — Reservations, state machines and the cart · Commerce · needs 17 · ~2d

**Goal:** the one-of-one guarantee, the state machines and the outbox, and the cart.
**Done when:** two parallel reservations of one unique item yield exactly one and one clean conflict; a sold item cannot be reserved again; every machine refuses an illegal transition and each transition writes its outbox event in the same transaction; a cart holds lines and re-prices on the server.
**Waves:** W1 — 18.1, 18.2, 18.3

- [ ] **18.1 The reservation service** · needs: 1.2.g, 17.1
  - **Lane** DOM · **Agent** senior-be (DOM-B), reviewed by senior-db · **Wave** W1
  - **Owns** `engine/packages/domain/src/{reservations,inventory}/**` (not `reservations/contract.ts`, which is C8), `engine/packages/testing/src/concurrency/**`, `engine/packages/http/src/cron/sweeps/**`
  - **Read** ARCHITECTURE.md §6, COMMERCE.md §4, PAYMENTS.md §1
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.9, 11.6_
  - [ ] 18.1.a `reserve()` writing the scalar `targetKey` and first expiring stale active rows for that target, in one transaction
  - [ ] 18.1.b `reserveAll` (several targets at once, all-or-nothing under a savepoint — a bag at "Continue to payment"); `extend`, `release`, `convert` and `reverse`, each taking reservation ids in bulk; counted stock through the conditional `stock_levels` update
  - [ ] 18.1.c The concurrency harness: 50 parallel reservations → one success and 49 typed conflicts; a sold item refusing a new reservation, even by direct insert
  - [ ] 18.1.d The sweeper route `/api/x/cron/sweeps` (C13; it runs C8 `DomainSweeps`) — housekeeping only; among its sweeps, the daily delete of idempotency keys older than `IDEMPOTENCY_KEY_RETENTION` (7 days, C8 `DomainSweeps.idempotencyKeys`)
  - [ ] 18.1.e **Check:** `reserve()` — `reserve` · `reserveAll` · `extend` · `release` · `convert` · `reverse` — is the only writer and always writes the scalar `targetKey`; inside its transaction it first expires stale active rows **for that target**, so correctness never waits on the sweeper; 50 parallel reservations of one unique item yield exactly one success and 49 typed conflicts (test); `reserveAll` reserves several targets under one savepoint, all or nothing, rolling back only its own work on any conflict (test); **a converted (sold) item refuses every new reservation at the database** (test, including a direct insert); `extend` lengthens a checkout lock to the chosen method's `sessionTtl` + margin within the configured ceiling; stocked quantity races never oversell; an expired active row reads as available; the sweeper claims its rows with `FOR UPDATE SKIP LOCKED` and is otherwise housekeeping only; it deletes idempotency keys older than `IDEMPOTENCY_KEY_RETENTION` and keeps younger ones (test).

- [ ] **18.2 State machines and the outbox** · needs: 1.2.g, 17.1, 4.8
  - **Lane** DOM · **Agent** senior-be (DOM-D), reviewed by senior-db · **Wave** W1
  - **Owns** `engine/packages/domain/src/{machines,outbox,availability}/**` (not `availability/machine.ts`, which is C8), `engine/packages/http/src/cron/outbox/**`, `engine/packages/domain/src/links/**`
  - **Read** COMMERCE.md §6, §13, ANALYTICS.md §1
  - _Requirements: 10.4, 19.12_
  - [ ] 18.2.a The machine runner enforcing the C8 tables for order, payment, reservation and offer — an illegal transition throws
  - [ ] 18.2.b The outbox writer: each transition's event into `domain_events` in the same transaction
  - [ ] 18.2.c Availability as a pure function of product status and live reservations, never stored
  - [ ] 18.2.d The dispatcher job: at-least-once delivery with event ids and backoff, to email, analytics, the sister webhook and `@engine/cache`'s `invalidate(tags)` (4.8), flushed once per dispatched batch after it commits
  - [ ] 18.2.e A rollback test proving an event never leaves a rolled-back transaction
  - [ ] 18.2.g The capability-link module (C6 `links`), the one implementation that NTF, the handlers and the loaders call. `deriveLink(purpose, ref, version)` and `verifyLink(purpose, token)` use HMAC-SHA256 over the input C6 `links` pins byte for byte, under the key its `kid` names in `LINK_TOKEN_KEYS` (one current key; retired ones by day; `revoked` ones), truncated to `LINK_TOKEN.macBytes` and compared in constant time; a retired `kid` verifies for `LINK_TOKEN.keyOverlapDays` after its day, a revoked one never. The purpose's state rule and its `LINK_WINDOW_DAYS` window are checked on the record after the MAC, and issuing a link moves the record's `links_anchor_at` — bumping `token_version` first if the window had already run out.
  - [ ] 18.2.f **Check:** one machine runner enforces the C8 tables for order, payment, reservation and offer — an illegal transition throws — and **writes each transition's domain event to `domain_events` in the same transaction**; availability is a pure function of product status and live reservations, never stored; a dispatcher job (run by the jobs queue) delivers each event **at least once** with its id to its consumers (email, analytics, sister webhook, cache invalidation) and retries with backoff; a test rolls back a transaction and proves its event never leaves; `deriveLink()` reproduces C6 `LINK_TOKEN_VECTORS`, and `verifyLink()` refuses, alike, a token of another purpose, an older `token_version`, a `kid` past its overlap, revoked or unknown, a token not in its canonical form (an uppercase `ref`), a lapsed window, and a flipped bit; a link issued after its window lapsed carries a new `token_version`, so the lapsed one stays dead (test).

- [ ] **18.3 Cart** · needs: 17.1, 17.2
  - **Lane** DOM · **Agent** senior-be (DOM-C) · **Wave** W1
  - **Owns** `engine/packages/domain/src/cart/**`
  - **Read** COMMERCE.md §5
  - _Requirements: 8.8, 9.1_
  - [ ] 18.3.a Guest carts behind a hashed token, merged on sign-in
  - [ ] 18.3.b Line validation (status, active variant, routable) and 30-day expiry
  - [ ] 18.3.c `CartVM` computation, and a test proving a cart never reserves
  - [ ] 18.3.d **Check:** guest carts (hashed token), merge on sign-in, line validation (status, variant active, routable), 30-day expiry and `CartVM` computation are tested; **a cart never reserves**.

---

## Phase 19 — Checkout, the payment pipeline and Midtrans 👤 · Commerce · needs 18 · ~3d

**Goal:** order placement, payments core, the Midtrans sandbox adapter and `applyPaymentEvent()`.
**Done when:** a checkout places an order and pays by VA in the Midtrans sandbox; one webhook delivered twice yields one payment; a crash after the dedupe insert rolls back and applies once on the retry; a payment landing after its reservation expired takes the late-payment path.
**Waves:** W1 — 19.1 · W2 — 19.2, 19.4 · W3 — 19.3

- [ ] **19.1 Checkout and order placement** · needs: 17.4, phase 18
  - **Lane** DOM · **Agent** senior-be (DOM-B) · **Wave** W1
  - **Owns** `engine/packages/domain/src/{orders,checkout,offers,holds}/**` (not their `machine.ts`, which are C8)
  - **Read** COMMERCE.md §5–7, PAYMENTS.md §1–3
  - _Requirements: 9.3, 9.5, 9.6, 9.7, 10.1, 10.4, 11.6_
  - [ ] 19.1.a `CheckoutVM.steps` derived from seller, destination and lines
  - [ ] 19.1.b Order placement snapshotting every figure: lines, pipeline, tax, FX, seller
  - [ ] 19.1.c The payment step: take the checkout lock, `extend()` it at method choice to the method's `sessionTtl` + margin (no cash-at-retail for a unique item), close any other open attempt of the order first (so a provider reference is never used twice, and every reservation the new attempt pays for carries the order's id), and create the payment attempt idempotently — a retry returns its stored `SessionResult`; inside the attempt's lease (`PAYMENT_ATTEMPT_LEASE`, C8) a retry answers `rate-limited` and never voids it, and past the lease a missing session is a crash, voided and made again — the store and the void each a compare-and-set under the attempt's row lock, so a store that lands past the lease and a concurrent retry never both win (the loser's provider session is cancelled); a method whose floor (C7 `minSessionTtl`) no longer fits before the lock's ceiling or the hold's end is not offered, and a start that finds so answers `method-unavailable` (`window-too-short`) — a session is never cut below its floor
  - [ ] 19.1.d Offers (non-binding, D22): submit, auto-decline below the floor, accept → an offer hold and a payment link that expires before it; a submitted or countered offer closes as declined — never left open — the moment its item sells or is withdrawn elsewhere (`offer.closedUnavailable`); staff holds
  - [ ] 19.1.e Every transition through the 18.2 machine runner
  - [ ] 19.1.f **Check:** `CheckoutVM.steps` derive from seller, destination and lines; placing an order snapshots every figure; the checkout lock is taken at the payment step and **extended at method choice** to that method's `sessionTtl` + margin (no cash-at-retail for a unique item); the payment step creates a payment attempt idempotently and returns its **stored `SessionResult`** on a retry, and a store that lands past `PAYMENT_ATTEMPT_LEASE` against a concurrent retry leaves exactly one attempt (test); offers are non-binding (D22), auto-decline below the floor, an accepted offer creates an offer hold and a payment link that expires before it, and one left open closes as declined the moment its item sells or is withdrawn elsewhere; every transition goes through the 18.2 machine runner; a pure `buyerOrderStatus()` derives the buyer-facing status from the order's own status, the attempt that paid it (or the latest, before one has) and its shipments (COMMERCE.md §6), tested over `ORDER_STATUSES` × the paying attempt's `PAYMENT_STATUSES` × {nothing shipped, a label printed, a pickup ready, a pickup collected while another line waits, one shipment on its way, partly delivered, an exception, returned to sender, nothing to ship (a gift card)} (each shipment case in one of C6's `ShipmentOnItsWay`, `ShipmentAtPickup` and `ShipmentNotYetGone`), each case asserting `OrderVM.status` and `OrderVM.payment.state` from one row — a buyer's answer never carries a raw `OrderStatus`, a `PaymentStatus` or a dispute.

- [ ] **19.2 Payments core** · needs: 1.2.f, 17.3, 19.1
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W2
  - **Owns** `engine/packages/payments/src/{registry,routing,limits.ts,reconcile,links,boot-check,adapters/manual,adapters/bank-transfer}/**`, `engine/packages/http/src/webhooks/payments/**`, `engine/packages/http/src/cron/reconcile/**`, `tests/contract/payments/**`
  - **Read** PAYMENTS.md
  - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.8, 18.7_
  - [ ] 19.2.a provider registry per seller (secrets as `PAYMENT_<SELLER>_<PROVIDER>_*`) + the shared contract suite: signature failure, duplicate, out-of-order, **crash after the dedupe insert**, pending → settlement, refund idempotency, a session outliving its reservation window, late payment after the item sold, an event for an unknown attempt routed to `payment_events_unmatched` without consuming the dedupe key, and a provider figure that is no whole minor unit coming back `InexactMoney` — **flagged by `applyPaymentEvent()`, never rounded or paid**
  - [ ] 19.2.b routing with `limits.ts` (sourced, dated caps)
  - [ ] 19.2.c the thin webhook handler, mounted **per seller** (`/api/x/webhooks/payments/[provider]/[seller]`: parse → retrieve → apply; no business logic)
  - [ ] 19.2.d reconciliation cron route `/api/x/cron/reconcile`
  - [ ] 19.2.e payment links `/pay/{token}`; manual and bank-transfer providers (instructions, proforma reference)
  - [ ] 19.2.f the payments part of the boot check: sandbox/live key vs environment
  - [ ] 19.2.g **Check:** routing offers only allowed methods with dated caps (no retail method for a unique item, and none whose `minSessionTtl` no longer fits before the lock's ceiling or the hold's end); the webhook handler at `/api/x/webhooks/payments/{provider}/{seller}` verifies the signature on the raw body with that seller's secret, calls `retrieve()` where the adapter says so, and hands one normalised event to `domain.applyPaymentEvent()` (19.4), answering 200 for every outcome and 5xx only on a throw; reconciliation runs every 10 minutes through the same path; payment links work; `manual` and `bank-transfer` pass the contract suite, and every `Money` across an adapter is in C5's minor units (C7's header).

- [ ] **19.3 👤 Midtrans adapter (sandbox)** · needs: 19.2.a · 👤 a Midtrans sandbox merchant account and keys
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W3
  - **Owns** `engine/packages/payments/src/adapters/midtrans/**`
  - **Read** PAYMENTS.md §2–4, §6; Midtrans docs (Snap, Core API, notification signature, status API)
  - _Requirements: 11.1, 11.3, 11.7_
  - [ ] 19.3.a 👤 The owner opens a Midtrans **sandbox** merchant account; its keys go into Infisical, never into chat
  - [ ] 19.3.b Snap redirect and Core API sessions (virtual account, QRIS) in IDR, each method's `sessionTtl` declared
  - [ ] 19.3.c The notification signature check, `retrieve()` before applying, and the `providerEventId` hash
  - [ ] 19.3.d `cancel`, refunds, and manual refund tasks for VA and retail
  - [ ] 19.3.e Recorded sandbox fixtures and the shared contract suite
  - [ ] 19.3.f **Check:** Snap redirect and Core API VA/QRIS sessions are created in IDR with each method's `sessionTtl` declared; notifications are signature-verified and **re-fetched with `retrieve()` before they are applied**; `providerEventId` is the hash of `transaction_id | transaction_status | fraud_status | status_code` (Midtrans sends no event id), so a repeated status dedupes and a new status does not; `cancel`, refunds (or manual refund tasks for VA/retail) work; and the adapter passes the contract suite against recorded sandbox fixtures.

- [ ] **19.4 The payment-event pipeline — `applyPaymentEvent()`** · needs: 18.1, 18.2, 19.1
  - **Lane** DOM · **Agent** senior-be (DOM-B), reviewed by senior-db and senior-integrator · **Wave** W2
  - **Owns** `engine/packages/domain/src/payments/**` (not its `machine.ts`)
  - **Read** PAYMENTS.md §1, §4, ARCHITECTURE.md §6
  - _Requirements: 9.8, 11.3, 11.6_
  - [ ] 19.4.a Find the attempt first — by our own reference, else `(provider, sellerId, providerRef)` — then the one transaction: `INSERT … payment_events (provider, seller_id, provider_event_id, attempt_id) … ON CONFLICT DO NOTHING RETURNING id`, then the payment transition, reservation conversion, order transition and outbox events
  - [ ] 19.4.b Capture or settlement only while the reservation is live
  - [ ] 19.4.c The late-payment path: re-reserve if the item is still free, otherwise void or refund automatically and tell the buyer
  - [ ] 19.4.d Stale and out-of-order events never move a machine backwards; the crash-after-dedupe contract test passes
  - [ ] 19.4.e **Check:** `applyPaymentEvent()` finds the attempt by our reference, else by `(provider, sellerId, providerRef)`, then runs **one** transaction — `INSERT … payment_events (provider, seller_id, provider_event_id, attempt_id) … ON CONFLICT DO NOTHING RETURNING id` (no row → commit as a no-op), then the payment transition, reservation conversion, order transition and outbox events — and any failure rolls back **the dedupe row too**, so the provider's retry applies it once (the crash-after-dedupe contract test passes); capture or settlement happens only while the reservation is live; a **late payment** re-reserves the item if it is still free, otherwise voids or refunds automatically and notifies the buyer; a second payment settling on an order another attempt already paid is given back whole under `dup:{attemptId}`, the order untouched; an event for no known attempt (or another seller's) is recorded in `payment_events_unmatched` and alerted, its dedupe key **not** consumed; an early event is caught up through `retrieve()` before it applies; a stale or out-of-order event never moves a machine backwards.

---

## Phase 20 — Shipping, discounts, notifications, documents, returns and the tax export · Commerce · needs 19 · ~3d

**Goal:** everything around a placed order: shipping and duties, discounts and gift cards, the order's emails and documents, returns and the tax export.
**Done when:** an order to Bali and one to the Netherlands get their shipping and duties; a discount, a gift card and gift wrap apply; the order's emails arrive with its PDF documents numbered in sequence; a return refunds; the tax export reproduces the period.
**Waves:** W1 — 20.1, 20.2, 20.3, 20.4, 20.5

- [ ] **20.1 Discounts, gift cards, bundles, gift wrap** · needs: 17.4, 18.3
  - **Lane** DOM · **Agent** senior-be (DOM-C) · **Wave** W1
  - **Owns** `engine/packages/domain/src/{discounts,gift-cards,bundles}/**`
  - **Read** COMMERCE.md §10
  - _Requirements: 8.7_
  - [ ] 20.1.a Discount codes with usage limits enforced atomically (a concurrency test)
  - [ ] 20.1.b The gift-card ledger, which never goes below zero
  - [ ] 20.1.c Bundles and "3 for 2" at line level; order discounts allocated by largest remainder
  - [ ] 20.1.d The free-shipping threshold as an automatic rule per market; gift wrap as a priced product line
  - [ ] 20.1.e **Check:** codes enforce usage limits atomically under concurrency (test), gift cards debit a ledger and never go below zero, bundles and "3 for 2" apply at line level with the order discount allocated by largest remainder, the free-shipping threshold is an automatic rule per market, and gift wrap is a priced product line.

- [ ] **20.2 Shipping basics and duties** · needs: 1.2.f, 9.2
  - **Lane** LOG · **Agent** medior · **Wave** W1
  - **Owns** `engine/packages/shipping/src/{profiles,rates,duties,adapters/{flat,quote,collect}}/**`
  - **Read** COMMERCE.md §8, COMPLIANCE.md §3–4
  - _Requirements: 10.3, 12.1, 12.2, 12.3_
  - [ ] 20.2.a Shipping profiles and flat zone tables per seller and destination
  - [ ] 20.2.b Pickup at stocked locations; "quote required" above the insured threshold
  - [ ] 20.2.c The duties estimate per destination (a data table)
  - [ ] 20.2.d All of it through the `ShippingProvider` contract, with unit tests
  - [ ] 20.2.e **Check:** shipping profiles, flat zone tables, pickup at stocked locations, quote-required for originals above the insured threshold, and a per-destination duties estimate (data table) work through the `ShippingProvider` contract.

- [ ] **20.3 Transactional notifications and the documents job** · needs: 1.2.g, 18.2, 19.1
  - **Lane** NTF · **Agent** medior · **Wave** W1
  - **Owns** `engine/packages/{mail,documents}/**`
  - **Read** COMMERCE.md §12–13, ANALYTICS.md §1–2
  - _Requirements: 10.5, 13.5_
  - [ ] 20.3.a template system and senders (SMTP), bilingual, `List-Unsubscribe` (RFC 8058, one-click) where marketing **or** a want-list alert
  - [ ] 20.3.b event → template wiring; PDF job infrastructure (confirmation, proforma; COA and commercial invoice in 24.2)
  - [ ] 20.3.c email design system per brand (senior-uiux): layouts that work with images off and in dark-mode clients, stay under Gmail's 102 KB clipping limit and render in Outlook; the payment-instructions email designed as carefully as the payment-pending page; the newsletter layout for 29.2
  - [ ] 20.3.d **Check:** EN/ID templates exist for order received/paid, payment instructions (VA, QR), pickup ready, shipped, refund, return received, offer received/accepted/countered/expired, hold granted/expiring, enquiry acknowledged + staff alert, consignment received, viewing confirmed and rescheduled (its `.ics` attached, never linked), **a want-list's double opt-in confirmation and its instant/daily alert** (each with its own RFC 8058 one-click stop link); WhatsApp deep links are built; a Payload job renders order PDFs; **the outbox dispatcher (18.2) triggers them** — never a request handler — with the event id as the idempotency key, and **derives each email's link token as it sends** (C6 `links`): no outbox row carries a token, and a test proves it (Mailpit in CI).

- [ ] **20.4 Returns** · needs: 17.4, 19.1
  - **Lane** DOM · **Agent** senior-be (DOM-B) · **Wave** W1
  - **Owns** `engine/packages/domain/src/returns/**`
  - **Read** COMMERCE.md §11, COMPLIANCE.md §6
  - _Requirements: 10.6_
  - [ ] 20.4.a The return request per order line and its states (requested → approved → received → refunded | rejected), through the machine runner
  - [ ] 20.4.b Refunds through the gateway adapter or as a tracked manual refund task; partial refunds allocated by largest remainder
  - [ ] 20.4.c `reverse` for a unique item only after staff confirm it is back in the drawer; restock for counted stock
  - [ ] 20.4.d **Check:** a return request per order line moves through its states (requested → approved → received → refunded | rejected), a refund goes through the gateway adapter or becomes a tracked manual refund task, a partial refund across lines is allocated by largest remainder, a unique item's `reverse` puts it back on sale only after staff confirm it is back in the drawer, and every step writes its domain event.

- [ ] **20.5 Document numbering and the tax export** · needs: 17.4, 19.1
  - **Lane** DOM · **Agent** senior-be (DOM-A) · **Wave** W1
  - **Owns** `engine/packages/domain/src/{documents,tax-export}/**`
  - **Read** COMMERCE.md §9, §12, COMPLIANCE.md §3
  - _Requirements: 8.6, 8.10_
  - [ ] 20.5.a Gapless numbering per seller and series from `document_sequences`, inside the transaction that issues the document
  - [ ] 20.5.b A concurrency test: no gap, no duplicate
  - [ ] 20.5.c The per-seller CSV export, one row per document: date, number, customer country, net, tax base, tax, currency, FX snapshot
  - [ ] 20.5.d **Check:** every seller's orders, invoices, credit notes and receipts are numbered **gaplessly per series** from `document_sequences` inside the transaction that issues them (a concurrency test proves no gap and no duplicate), and a per-seller export (CSV, per document: date, number, customer country, net, tax base, tax, currency, FX snapshot) reproduces the tax figures the accountant files.

---

## Phase 21 — The commerce API and the money-safety gate 👤 · Commerce · needs 20 · ~1.5d

**Goal:** the handlers the storefronts call, and the gate over the Commerce stage.
**Done when:** two parallel checkouts on one unique gallery item yield exactly one paid order and one clean conflict; a sold item cannot be reserved again; one webhook delivered twice yields one payment, and a crash after the dedupe insert rolls back and applies once on the retry; a payment landing after its reservation expired takes the late-payment path; a multi-line shop cart to Bali prices in IDR only, never offers QRIS above IDR 10 m, pays by VA in the Midtrans sandbox, and its emails arrive; every order reproduces its own total.
**Waves:** W1 — 21.1 · W2 — 21.2 · closes **M2**

- [ ] **21.1 Commerce API handlers** · needs: 17.4, 18.3, 19.1, 19.2, 19.4, 20.1, 20.4
  - **Lane** DOM (+ WEB for mounting) · **Agent** senior-be (DOM-C) · **Wave** W1
  - **Owns** `engine/packages/http/src/commerce/**` (not `commerce/destination/**`, 17.3's), app `src/app/api/x/commerce/**` re-exports
  - **Read** C6, C13, COMMERCE.md
  - _Requirements: 8.8, 19.5_
  - [ ] 21.1.a Handlers under `/api/x/commerce/…`: cart, ship-to, checkout, offer (`offer.respond` by the session and the offer's id, or by an email's token: C6 `OfferAccess`), hold request, price request, enquiry
  - [ ] 21.1.b Consignment, appointment (`appointment.change` by the session and the viewing's id, or by an email's token: C6 `AppointmentAccess`; `ics?appointment=` by session alone), return request, order lookup and quote (`quote.proforma`'s checkout bound to the cart cookie or the session, as the checkout's own operations are)
  - [ ] 21.1.c zod validation on every input, client prices ignored, rate limits
  - [ ] 21.1.d Mounted in both apps, parity green
  - [ ] 21.1.f A `FORM_DECODING` conformance table (C13) — form body → request or `FieldError`, covering the settled cases: a password never trimmed, an absent radio `null`, an empty array element dropped, an index gap `format`, the money grammar for exponents 0 and 2 (`4200000.`, `.50`, `4,20` refused; `4200.50` → `420050`), no `shipTo` → `required`, a zero bid `out-of-range`, a body or field count past the limit → 413 — which every DOM handler here and WEB's form route (22) both run, so there is one decoder in practice
  - [ ] 21.1.e **Check:** cart, ship-to, checkout, offer, hold request, price request, enquiry, consignment, appointment, return request, order lookup and quote endpoints under `/api/x/commerce/…` validate input with zod, ignore any client price, are rate-limited, decode every HTML form post through the one `FORM_DECODING` decoder and pass its conformance table (21.1.f), and are mounted in both apps (parity green; the manifest entries were declared in C13); an account's session answers its offer and changes its viewing by id, the `.ics` route refuses a token, and `quote.proforma` refuses a checkout id not bound to the caller's cart cookie or session (tests).

- [ ] **21.2 👤 Commerce gate — the money-safety gate** · needs: phase 17, phase 18, phase 19, phase 20, 21.1 · 👤 the Midtrans sandbox keys in staging's `shared/.env`
  - **Lane** QA · **Agent** qa · **Wave** W2
  - **Owns** `docs/gates/commerce.md`
  - **Read** the **Done when** of phases 17–21
  - _Requirements: 8.1–8.10, 9.1–9.9, 10.1, 10.4, 10.6, 11.1–11.8_
  - [ ] 21.2.a 👤 The Midtrans sandbox keys in staging's `shared/.env` (through Infisical)
  - [ ] 21.2.b The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build
  - [ ] 21.2.c On staging: the concurrency test against the real database, a sold-item re-reservation attempt, a duplicate-webhook replay, and a forced crash between the dedupe insert and the commit
  - [ ] 21.2.d On staging: the multi-line shop cart to a Bali address — IDR only, no QRIS above IDR 10 m, paid by virtual account in the Midtrans sandbox, emails arriving — and every order reproducing its own total
  - [ ] 21.2.e Evidence per clause in `docs/gates/commerce.md`; every failure filed as a subtask of the task that owns it and re-run after the fix
  - [ ] 21.2.f **Check:** the **Done when** of phases 17–21 runs on staging with the Midtrans sandbox, including the concurrency test against the real database, a sold-item re-reservation attempt, a duplicate-webhook replay and a forced crash between the dedupe insert and the commit — evidenced in `docs/gates/commerce.md`.

---

## Phase 22 — App foundations and surfaces from fixtures · Design systems · needs 3, 5, 11, 14 · ~5d

**Goal:** each app's shell and blocks in its picked direction, a brief for every surface, every surface built from fixtures, and the gate over the Design systems stage.
**Done when:** changing a brand's token overrides re-skins every component and a failing palette is rejected; every surface has an approved brief; both `/style-guide` pages render every component, block and state at 360/768/1440 px with axe clean and budgets met; the design gate passes.
**Waves:** W1 — 22.1, 22.2, 22.3, 22.7 · W2 — 22.4, 22.5 · W3 — 22.6 · closes **M1**

- [ ] **22.1 Gallery app foundation** · needs: 11.1, 11.2, 14.1
  - **Lane** UXG · **Agent** senior-uiux (app lead) · **Wave** W1
  - **Owns** `engine/apps/gallery/src/{styles,components,app/(site)/[locale]/layout.tsx,app/(site)/[locale]/style-guide}/**`, `engine/apps/gallery/src/surfaces/_blocks/**`
  - **Read** engine/apps/gallery/DESIGN.md, EXPERIENCE-GALLERY.md §2, DESIGN-SYSTEM.md §6, §9, §12
  - _Requirements: 6.1, 8.9, 18.3, 19.1, 19.2_
  - [ ] 22.1.a fonts via `next/font` (self-hosted, within the 14.1.d budget); Tailwind v4 `@theme inline` roles
  - [ ] 22.1.b shell components fed by `ShellVM`; the bottom-edge slot with its priority order (DESIGN-SYSTEM.md §9)
  - [ ] 22.1.c the work card (image on its mat, never cropped — verified with fixtures at aspects 0.3, 1 and 3.5; one link; the wishlist button outside the link with its own focus stop; status as text)
  - [ ] 22.1.d block renderers (exhaustive map against C4)
  - [ ] 22.1.e `/style-guide` (an underscore folder would be private in the App Router) with a token-override picker, module toggles and the state switcher from 11.4 (noindex)
  - [ ] 22.1.f **Check:** the shell (header with utility row, navigation — with the phone menu's prioritised order and the place drill-down — footer with seller identity and sister strip, consent banner, the ship-to selector that decides the currency, locale banner), the **bottom-edge stacking policy**, the work card, the type scale and all fifteen block renderers exist and appear in `/style-guide`.

- [ ] **22.2 Shop app foundation** · needs: 11.1, 11.2, 14.1
  - **Lane** UXE · **Agent** senior-uiux (app lead) · **Wave** W1
  - **Owns** `engine/apps/emporium/src/{styles,components,app/(site)/[locale]/layout.tsx,app/(site)/[locale]/style-guide}/**`, `engine/apps/emporium/src/surfaces/_blocks/**`
  - **Read** engine/apps/emporium/DESIGN.md, EXPERIENCE-SHOP.md §2, DESIGN-SYSTEM.md §6, §9, §12
  - _Requirements: 7.1, 8.9, 18.3, 19.1, 19.2_
  - [ ] 22.2.a Fonts via `next/font` (self-hosted, within the 14.1.d budget); Tailwind v4 `@theme inline` roles
  - [ ] 22.2.b Shell components fed by `ShellVM`: the utility bar (ship-to, WhatsApp, account, bag), the Shop mega-menu, the footer
  - [ ] 22.2.c The bottom-edge stacking policy: WhatsApp merged into the buy bar on product pages, no welcome offer before first engagement, no exit-intent pop-up on phones
  - [ ] 22.2.d The product tile: named swatches, badge, Reproduction label, "From" price
  - [ ] 22.2.e Block renderers (an exhaustive map against C4)
  - [ ] 22.2.f `/style-guide` with a token-override picker, module toggles and the 11.4 state switcher (noindex)
  - [ ] 22.2.g **Check:** the shell (utility bar with ship-to, WhatsApp, account, bag; Shop mega-menu; footer), the bottom-edge stacking policy (WhatsApp merged into the buy bar on product pages; no welcome offer before first engagement; no exit-intent pop-up on phones), the product tile (named swatches, badge, Reproduction label, "From" price), all fifteen block renderers and `/style-guide` (with the state switcher) exist.

- [ ] **22.3 Surface briefs** · needs: 14.1
  - **Lane** UXG + UXE · **Agent** senior-uiux (one per app, not the app leads) · **Wave** W1
  - **Owns** `docs/design/{gallery,emporium}/surfaces/**`, `.impeccable/` surface briefs per app
  - **Read** DESIGN-SYSTEM.md §2, §12, EXPERIENCE-*.md, the 6.1.c journeys
  - _Requirements: 6.11, 7.11, 19.10_
  - [ ] 22.3.a gallery surface briefs
  - [ ] 22.3.b shop surface briefs
  - [ ] 22.3.c cross-cutting behaviours, designed: switching ship-to (which moves currency) and locale; the language banner's place; the WhatsApp handoff (DESIGN-SYSTEM.md §12)
  - [ ] 22.3.d **Check:** every surface not comped in the Design stage has an impeccable `shape` brief naming its mode (Experience · Operate · Read · Persuade), its states and its content rules, with `concept-seed --scope surface` run for the open ones — including 404/410/500, the payment-pending page, the bag's edge cases, `Pay`, `Quote`, `OrderLookup`, `WantList`, the trust pages, Partnership and the design page.

- [ ] **22.4 Surface skeletons from fixtures in both apps** · needs: 11.3, 22.1–22.3, 22.7, 5.3
  - **Lane** UXG + UXE · **Agent** medior (one per app) · **Wave** W2
  - **Owns** `engine/apps/*/src/app/(site)/[locale]/**` route folders and `src/surfaces/*/` skeletons (not the layout, not `style-guide`)
  - **Read** DESIGN-SYSTEM.md §2, the surface briefs from 22.3
  - _Requirements: 1.2, 18.1_
  - [ ] 22.4.a Gallery: a route folder and a skeleton for every supported surface, rendering its fixture view model to its surface brief
  - [ ] 22.4.b Shop: the same for every shop surface
  - [ ] 22.4.c Landmarks and heading order per surface, and route-map resolution in both locales (an e2e smoke test), with a non-ASCII slug among them, so a page and its `generateMetadata` resolve one record (CONVENTIONS.md §12)
  - [ ] 22.4.e NotFound without JavaScript (DESIGN-SYSTEM.md §2): `(site)/[locale]/not-found/page.tsx` renders the designed NotFound surface in its own body — never `notFound()` — for the proxy's not-founds, which arrive with C13 `PROXY_NOT_FOUND_STATUS` (5.3), and exports no metadata: the localised title and description are the `not-found.tsx` boundary's `generateMetadata`, the one Next reads under a 404; that boundary renders the same surface, or Gone, for a miss only the database decides; `[...missing]` keeps `notFound()`
  - [ ] 22.4.d **Check:** every surface the app supports renders its fixture view model following its surface brief, with correct landmarks and heading order, and routes resolve through the route map in both locales; with JavaScript off, a path that names no page answers 404 and `noindex` on both apps with the brand's shell, `lang`, the NotFound surface, its title and its search form, which the status spec asserts (`E2E_EXPECT_NOT_FOUND_BODY=1`).

- [ ] **22.5 Accessibility and performance baseline** · needs: 22.1, 22.2
  - **Lane** QA · **Agent** qa · **Wave** W2
  - **Owns** `tests/e2e/design-system/**`
  - _Requirements: 19.1, 19.2_
  - [ ] 22.5.a e2e: the skip link is the first tab stop; focus is visible and never obscured with every bottom-edge element open (WCAG 2.4.11)
  - [ ] 22.5.b e2e: every drag has a non-drag alternative (2.5.7), reduced motion collapses transitions, search works without JavaScript
  - [ ] 22.5.c axe on both style guides and LHCI budgets on them, in CI
  - [ ] 22.5.d **Check:** e2e asserts the skip link is the first tab stop, focus is visible **and never obscured** with every bottom-edge element open (WCAG 2.4.11), every drag has a non-drag alternative (2.5.7), reduced motion collapses transitions, search works without JavaScript, axe is clean on both style guides, and LHCI budgets pass on them.

- [ ] **22.6 Design-systems gate — with the design gate** · needs: phase 11, 22.1–22.5
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W3
  - **Owns** `docs/gates/design-systems.md`
  - **Read** the **Done when** of phases 11 and 22, DESIGN-SYSTEM.md §13
  - _Requirements: 2.6, 19.1, 19.2, 19.10_
  - [ ] 22.6.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 22.6.b Drive every clause of the **Done when** of phases 11 and 22 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/design-systems.md`
  - [ ] 22.6.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 22.6.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 22.6.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 22.6.f **Check:** every clause of the **Done when** of phases 11 and 22 is evidenced in `docs/gates/design-systems.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

- [ ] **22.7 The configurator's contracts: its selection in the URL, its prices as text** · needs: 3.4
  - **Lane** ARC · **Agent** architect · **Wave** W1
  - **Owns** `engine/packages/config/src/{schema,routes}{.ts,/**}` (C1, C10), `engine/packages/view-models/src/surfaces/purchase-variants.ts` and its fixtures (C2), `engine/packages/CONTRACTS.md`
  - **Read** `.claude/specs/indies-platform/reviews/3.4-senior-fe.md` (#3, #9); CONVENTIONS.md §6; DESIGN-SYSTEM.md §7; EXPERIENCE-SHOP.md §5; COMMERCE.md §1
  - _Requirements: 7.2, 19.1_
  - [ ] 22.7.a C10's next minor version (v1.4 after 4.3's v1.3): the product-type axes move to C1 (`AXIS_KEYS`; C2's `AxisKey` imports it — config is the leaf); `HrefParams['design']` and `['item']` (a variant product at the gallery) take the selection (axis → value), `href()` writes it as the query in `AXIS_KEYS` order, and `parsePublicPath()` carries it — one value per axis, value-shaped, unknown keys dropped — into the internal URL's query, since Next replaces a rewritten request's query and the GET form's selection otherwise never reaches the server render; the loader redirects a selection the product type does not take to its canonical URL (3.4 senior-fe #9)
  - [ ] 22.7.b C2's next minor version (v1.4 after 4.3's v1.3): every price the configurator renders as its selection changes — `priceTable` rows, each `AxisOptionVM.from`, `selected.price`, `giftWrap.price` — carries the server's display string beside its `PriceVM` (CONVENTIONS.md §6); fixtures follow
  - [ ] 22.7.d C10: an old item link whose slug part does not decode as UTF-8 — `%FF`, a Latin-1 `caf%E9`, raw UTF-8 bytes in the request line — reaches the item route by its canonical id with a fixed ASCII slug no item has (C10 names it), never the bytes as asked, which Next cannot decode into the route's param and answers with a bare 500; so it gets the one 308, its query kept (MIGRATION.md §6; 4.1 senior-fe #12, 4.3 senior-fe #4)
  - [ ] 22.7.c **Check:** a round-trip test over `href()` and `parsePublicPath()` with a selection; `/product/1706-caf%E9` and `/product/1706-%FF` parse to item 1706 with the fixed slug (`strict-paths.test.ts`), and on a production build the status spec sees each answer 308, never 500 (two cases in `tests/e2e/status/`, HAR's file: proposed in the report, added at merge); the proxy rewrites a design URL with `?size=a3&frame=teak` to the design route with both in canonical order and drops an unknown key; the configurator's view model type-checks with a display string on every price it renders, and its fixture carries them.

---

## Phase 23 — The admin shell and cataloguing 👤 · Admin · needs 10, 14, 15 · ~4.5d

**Goal:** the admin the staff actually work in: observed first, then the shell, fast cataloguing, bulk upload, AI drafts and the printed collateral.
**Done when:** the contextual inquiry is written up as admin surface briefs; each brand's admin opens on its desk with its branding; a work is catalogued with images through the fast form and the bulk upload; AI drafts appear behind `ai.cataloguing`, marked unverified; the printed collateral renders from a real work.
**Waves:** W1 — 23.1, 23.4, 23.6 · W2 — 23.2, 23.3 · W3 — 23.5

Every custom admin component is registered through ADM's `views` barrel (PARALLEL-TRACKS.md §1)
and reaches Payload through the regenerated `importMap.js` — never a hand edit; the config-drift gate
fails the build when the import map is stale. This holds for phases 23, 24 and 38.

- [ ] **23.1 👤 Contextual inquiry and admin surface briefs** · needs: 10.1
  - **Lane** ADM · **Agent** senior-uiux · **Wave** W1
  - **Owns** `docs/design/admin/{inquiry,briefs}/**`
  - **Read** CONTENT-OPERATIONS.md, KOI CONTENT-OPERATIONS.md
  - _Requirements: 14.1, 14.2, 14.8_
  - [ ] 23.1.a 👤 the owner schedules the two observation sessions and names the cataloguer and shop manager who will also sit the 38.2 timed tests
  - [ ] 23.1.b observation notes (what they do, in what order, with what at hand, where they wait)
  - [ ] 23.1.c the *Operate* briefs
  - [ ] 23.1.d **Check:** a cataloguer has been observed at the drawer and the shop manager on WhatsApp and in the showroom (about two hours each), and impeccable `shape` briefs in *Operate* mode exist for the desk, cataloguing, bulk upload, the merch wizard, the inbox, the order builder and the showroom sale — each with a keyboard map and a density spec — and Payload's Indonesian admin translation has been checked against the custom views.

- [ ] **23.2 Admin shell, branding and the desk** · needs: 10.1, 13.3, 23.1
  - **Lane** ADM · **Agent** senior-uiux (ADM-A) · **Wave** W2
  - **Owns** `engine/packages/cms/src/admin/{shell,desk,theme}/**`
  - **Read** NOW! SURFACES-PLAN S3.1 (custom views inside `DefaultTemplate`), DESIGN-SYSTEM.md §4
  - _Requirements: 14.1, 14.8_
  - [ ] 23.2.a The admin wearing the brand's tokens (chrome and accents, per 13.3)
  - [ ] 23.2.b The desk: the queues in Req 14.1, each with its count
  - [ ] 23.2.c Custom views inside Payload's `DefaultTemplate` so they keep its navigation, registered through ADM's `views` barrel
  - [ ] 23.2.d **Check:** the admin wears the brand's tokens, the desk shows the queues in Req 14.1 with counts, and every custom view renders inside Payload's navigation (opened, not assumed).

- [ ] **23.3 Fast cataloguing** · needs: 8.2, 23.1
  - **Lane** ADM · **Agent** senior-fe (ADM-B) · **Wave** W2
  - **Owns** `engine/packages/cms/src/admin/cataloguing/**`
  - **Read** the 23.1 cataloguing brief, CONTENT-OPERATIONS.md §2, KOI CONTENT-OPERATIONS.md (fast person screen), CONTENT-MODEL.md §1
  - _Requirements: 14.2, 16.8_
  - [ ] 23.3.a Save-and-add-another keeping context (drawer, source work, maker)
  - [ ] 23.3.b Fuzzy dates (`c. 1750`, `1724–26`, `abad ke-18`) and dimensions (cm/in) parsed with a visible interpretation
  - [ ] 23.3.c Inline maker and place creation with alias hints; duplicate warnings; autosave; locales side by side
  - [ ] 23.3.d The grade picker with definitions; the enquiry-only state for a work missing location or export status
  - [ ] 23.3.e **Check:** save-and-add-another keeps context (drawer, source work, maker), fuzzy dates (`c. 1750`, `1724–26`, `abad ke-18`) and dimensions (cm/in) parse with visible interpretation, makers and places can be created inline with alias hints, duplicates warn, drafts autosave, locales sit side by side, the grade picker shows definitions, and a work whose location or export status is blank carries a visible "Enquiry only until location and export status are set" state (staff with `physical` access set them here).

- [ ] **23.4 Bulk image upload** · needs: 8.3, 15.1
  - **Lane** ADM · **Agent** medior (ADM-C) · **Wave** W1
  - **Owns** `engine/packages/cms/src/admin/bulk-upload/**`
  - _Requirements: 14.3_
  - [ ] 23.4.a A drop zone matching files to works by the stock number in the filename, with a list of what did not match
  - [ ] 23.4.b Inline role tags (recto, verso, detail…) and captions
  - [ ] 23.4.c Each file's derivative and tiling status
  - [ ] 23.4.d **Check:** dropping many files matches them to works by stock number in the filename, lets staff tag roles (recto, verso, detail…) and caption inline, and shows each file's derivative and tiling status.

- [ ] **23.5 👤 AI-assisted cataloguing (behind `ai.cataloguing`)** · needs: 23.3 · 👤 the production model provider (D16)
  - **Lane** ADM + senior-integrator · **Agent** senior-integrator · **Wave** W3
  - **Owns** `engine/packages/cms/src/admin/ai-assist/**`, `engine/packages/media/src/vision/**`
  - **Read** ARCHITECTURE.md §1 principle 7; owner decision D16
  - _Requirements: 14.4, 3.3_
  - [ ] 23.5.a 👤 The owner chooses the production model provider (D16)
  - [ ] 23.5.b The pluggable provider interface — a development provider locally (Ollama Cloud is dev-only), the owner's choice in production
  - [ ] 23.5.c Proposals for title, original-title transcription, places, makers and description, each flagged unverified
  - [ ] 23.5.d The verification UI, and the publish guard refusing unverified fields
  - [ ] 23.5.e **Check:** the assistant proposes title, original-title transcription, places, makers and a description from the scan, every proposal is flagged until a human verifies it, publishing refuses unverified fields, and the provider is pluggable (a development provider may be used locally; production uses the owner-approved one).

- [ ] **23.6 Printed collateral design** · needs: 14.1
  - **Lane** ADM + NTF · **Agent** senior-uiux · **Wave** W1
  - **Owns** `docs/design/collateral/**`, `engine/packages/documents/src/templates/**`
  - **Read** COMMERCE.md §12, DESIGN-SYSTEM.md §11
  - _Requirements: 10.5, 19.10_
  - [ ] 23.6.a The certificate of authenticity (image, stock number, grade, the Parry signature block, a slot for the v2 verification QR) and the designers' item factsheet
  - [ ] 23.6.b The proforma, the commercial invoice, the packing slip and its gift variant
  - [ ] 23.6.c The gift card (digital and print), the shop's story card, the showroom QR placard, the hang tag / Archive No. label
  - [ ] 23.6.d Bilingual, A4 and US Letter, fonts embedded — and test-printed on a real printer
  - [ ] 23.6.e **Check:** each brand's printed and PDF artefacts are designed, bilingual, in A4 and US Letter with embedded fonts, and **test-printed on a real printer**: the certificate of authenticity (image, stock number, grade, the Parry signature block, a slot for the v2 verification QR), the item factsheet designers present, the proforma, the commercial invoice, the packing slip (and its gift variant), the gift card (digital and print), the shop's story card, the showroom QR placard, and the hang tag / Archive No. label.

---

## Phase 24 — Admin operations: merch wizard, orders, inbox, stock and manual orders · Admin · needs 20, 23 · ~3.5d

**Goal:** the screens that run the business once orders arrive.
**Done when:** a shop manager turns one work into a twelve-variant giclée product with mockups; an order is fulfilled with its documents; an accepted offer reaches the buyer as a working payment link; stock moves between locations and a showroom sale records; a manual quote becomes an order.
**Waves:** W1 — 24.1, 24.2, 24.3, 24.4, 24.5

- [ ] **24.1 Merch-from-work wizard and mockups** · needs: 9.2, 15.4
  - **Lane** ADM (+ MED for compositing) · **Agent** senior-fe (ADM-A), senior-be (MED) · **Wave** W1
  - **Owns** `engine/packages/cms/src/admin/merch-wizard/**`, `engine/packages/media/src/mockups/**`
  - **Read** CONTENT-MODEL.md §2, EXPERIENCE-SHOP.md §5
  - _Requirements: 14.5, 4.4_
  - [ ] 24.1.a Pick a work (a provenance copy) and crop a design with the print ceiling visible
  - [ ] 24.1.b Choose product types; preview the generated variants within constraints and ceilings, priced from the tables
  - [ ] 24.1.c Composite room mockups (MED) and create the drafts
  - [ ] 24.1.d **Check:** a manager picks a work (provenance copy), crops a design with the print ceiling visible, selects product types, previews generated variants that respect constraints and ceilings, sees prices from the tables, and creates drafts with composited room mockups.

- [ ] **24.2 Order operations and documents** · needs: 19.1, 19.2, 20.3, 23.6
  - **Lane** ADM + NTF · **Agent** senior-fe (ADM-B), medior (NTF) · **Wave** W1
  - **Owns** `engine/packages/cms/src/admin/orders/**`, `engine/packages/documents/src/{coa,factsheet,commercial-invoice,packing-slip}/**`
  - **Read** COMMERCE.md §6, §11–12, the 23.6 collateral designs
  - _Requirements: 10.5, 10.6, 14.6_
  - [ ] 24.2.a The order screen with its state-machine timeline
  - [ ] 24.2.b Shipments with tracking; pickups marked ready
  - [ ] 24.2.c Refunds (gateway or manual task) and returns, including the shop's photo claim for a damaged print
  - [ ] 24.2.d Documents to the 23.6 designs: the COA with the curator signature block, the factsheet, the commercial invoice, the packing slip and its gift variant
  - [ ] 24.2.e **Check:** the order screen shows the state-machine timeline, creates shipments with tracking, marks pickups ready, issues refunds (gateway or manual task), processes returns (including the shop's photo claim for a damaged print), and generates — **to the 23.6 designs** — the COA (with curator signature block), the item factsheet, the commercial invoice and the packing slip (with a gift variant that hides prices).

- [ ] **24.3 The inbox: offers, holds, price requests, enquiries, consignments, appointments** · needs: 19.1, 19.2.e
  - **Lane** ADM · **Agent** senior-fe (ADM-A) · **Wave** W1
  - **Owns** `engine/packages/cms/src/admin/inbox/**`
  - _Requirements: 9.5, 9.7, 11.5, 14.7_
  - [ ] 24.3.a Offers: accept (issuing a payment link), counter, decline
  - [ ] 24.3.b Holds (grant, release, expiry) and price-request answers from templates
  - [ ] 24.3.c Consignment statuses and the appointments calendar
  - [ ] 24.3.d Layouts that work at 390 px and 768 px as well as on a desktop
  - [ ] 24.3.e **Check:** staff accept (issuing a payment link), counter or decline offers; grant or release holds with expiry; answer price requests from templates; move consignments through their statuses; and see appointments on a calendar — **on a phone (390 px) and a tablet (768 px)** as well as a desktop, because the shop manager works from a phone.

- [ ] **24.4 Stock, locations and showroom sales** · needs: 18.1
  - **Lane** ADM · **Agent** medior (ADM-C) · **Wave** W1
  - **Owns** `engine/packages/cms/src/admin/stock/**`
  - _Requirements: 9.1, 7.8_
  - [ ] 24.4.a Stock counts and transfers between locations; the showroom stock view
  - [ ] 24.4.b Low-stock alerts
  - [ ] 24.4.c The showroom sale, reserving and converting through `reserve()` (channel `showroom`), on the counter's tablet and a phone
  - [ ] 24.4.d **Check:** staff count and transfer stock, see showroom stock, get low-stock alerts, and record a showroom sale that reserves and converts through `reserve()` (channel `showroom`) — the showroom-sale screen working on the counter's tablet (768 px) and a phone.

- [ ] **24.5 Manual order and quote builder** · needs: 19.1, 19.2, 23.1
  - **Lane** ADM · **Agent** senior-fe (ADM-C) · **Wave** W1
  - **Owns** `engine/packages/cms/src/admin/order-builder/**`
  - **Read** COMMERCE.md §5, §7, PAYMENTS.md §5, the 23.1 order-builder brief
  - _Requirements: 9.1, 11.5, 14.6, 14.7_
  - [ ] 24.5.a Build an order or a quote: items (a unique item is reserved through `reserve()` the moment it is added), the customer, the destination
  - [ ] 24.5.b Staff discounts within the role's limit, with every figure priced by the server
  - [ ] 24.5.c Send it as a payment link or a quote PDF — from a phone at 390 px
  - [ ] 24.5.d **Check:** staff build an order or a quote for a WhatsApp, phone or showroom sale — pick items (a unique item is reserved through `reserve()` the moment it is added), the customer and the destination, apply a staff discount within the role's limit — with every figure **priced by the server**, and send it as a payment link or a quote PDF; it works on a phone (390 px), because most of these sales start in a WhatsApp chat.

---

## Phase 25 — Payment adapters 👤 · Integrations · needs 19 · ~3.5d

**Goal:** the remaining payment providers behind the `PaymentGateway` contract.
**Done when:** the Stripe (Singapore seller) and PayPal adapters — and Xendit or DOKU if chosen — pass the contract suite on recorded sandbox fixtures.
**Waves:** W1 — 25.1, 25.2, 25.3

- [ ] **25.1 👤 Stripe adapter (Singapore seller)** · needs: 19.2 · 👤 sandbox keys (D3)
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/payments/src/adapters/stripe/**`
  - **Read** PAYMENTS.md §2–4
  - _Requirements: 11.1, 11.5, 11.6, 11.7_
  - [ ] 25.1.a 👤 Stripe Singapore **sandbox** account and keys, into Infisical (D3)
  - [ ] 25.1.b The Payment Element (cards, Apple/Google Pay, PayNow; iDEAL/SEPA where enabled) with 3DS; authorise-then-capture for unique items
  - [ ] 25.1.c Checkout Sessions declared with `minSessionTtl` of 30 minutes (Stripe's floor) and never cut below it — not offered where the lock's ceiling or the hold leaves less; IDR charging for the Singapore seller's Indonesian deliveries (D29), converted both ways at the adapter (Stripe counts IDR in hundredths), a figure that is no whole rupiah coming back `InexactMoney`, never rounded
  - [ ] 25.1.d Webhooks keyed by Stripe's event id, refunds, Invoicing / Payment Links — through the contract suite
  - [ ] 25.1.e **Check:** the Payment Element (cards, Apple/Google Pay, PayNow; iDEAL/SEPA where enabled) with 3DS, authorise-then-capture for unique items (capture only while the reservation is live), Checkout Sessions never cut below Stripe's 30-minute floor (`minSessionTtl`, and not offered where it no longer fits), IDR charging for the Singapore seller's Indonesian deliveries (D29) with the adapter's unit conversion both ways and an inexact figure flagged, webhooks keyed by Stripe's event id, refunds, and Invoicing/Payment Links for inquire → pay pass the contract suite.

- [ ] **25.2 PayPal adapter** · needs: 19.2
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/payments/src/adapters/paypal/**`
  - _Requirements: 11.1, 11.7_
  - [ ] 25.2.a Orders v2 approve and capture
  - [ ] 25.2.b Webhooks and refunds
  - [ ] 25.2.c Never offered for IDR; `minSessionTtl` declared per method; the contract suite
  - [ ] 25.2.d **Check:** Orders v2 approve/capture, webhooks and refunds pass the contract suite; PayPal is never offered for IDR.

- [ ] **25.3 Xendit or DOKU adapter — only if chosen (D3)** · needs: 19.2 · 👤 the owner's choice (D3)
  - **Lane** PAY · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/payments/src/adapters/{xendit,doku}/**`
  - _Requirements: 11.7_
  - [ ] 25.3.a 👤 The owner's choice (D3) — or close this task as "not chosen", with the date
  - [ ] 25.3.b The chosen adapter and its recorded sandbox fixtures, declaring `minSessionTtl` per method and converting units at its boundary (C7's header)
  - [ ] 25.3.c The contract suite
  - [ ] 25.3.d **Check:** the chosen adapter passes the contract suite, or this task is closed as "not chosen" with the date.

---

## Phase 26 — Couriers and the fulfilment router 👤 · Integrations · needs 15, 20 · ~3d

**Goal:** domestic and export shipping, and the router that sends each line to where it is made or held.
**Done when:** a Denpasar order gets live Biteship rates and tracking; a Netherlands order ships from Bali stock by DHL Express with a duties estimate; the router sends each line to own stock or local made-to-order (print-on-demand abroad is not part of the launch, D23).
**Waves:** W1 — 26.1, 26.2, 26.3

- [ ] **26.1 👤 Biteship** · needs: 20.2 · 👤 sandbox key
  - **Lane** LOG · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/shipping/src/adapters/biteship/**`, `engine/packages/http/src/webhooks/shipping/**`
  - _Requirements: 10.2, 12.1, 12.7_
  - [ ] 26.1.a 👤 The Biteship sandbox key, into Infisical
  - [ ] 26.1.b Address → area resolution; rates with ETA, same-day included
  - [ ] 26.1.c Order creation with the insurance flag; tracking webhooks feeding notifications
  - [ ] 26.1.d **Check:** address → area resolution, rates with ETA (incl. same-day), order creation, insurance flag and tracking webhooks work in sandbox and feed notifications.

- [ ] **26.2 👤 DHL Express** · needs: 20.2 · 👤 account
  - **Lane** LOG · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/shipping/src/adapters/dhl-express/**`
  - _Requirements: 12.1, 12.2, 12.6_
  - [ ] 26.2.a 👤 A DHL Express account with test-environment access
  - [ ] 26.2.b Rates, declared value and commercial-invoice data
  - [ ] 26.2.c Tracking; originals above the threshold still route to "quote required"
  - [ ] 26.2.d **Check:** rates, declared value, commercial-invoice data and tracking work in the test environment; originals above the threshold still route to "quote required".

- [ ] **26.3 The fulfilment router — own stock and local made-to-order** · needs: 9.2, 15.4, 19.1
  - **Lane** LOG · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/fulfilment/src/{routing,adapters/{own-stock,local-mto}}/**`
  - **Read** COMMERCE.md §8, COMPLIANCE.md §5
  - _Requirements: 12.4, 12.5, 12.7_
  - [ ] 26.3.a The router: a **pure** function over `RouteFulfilmentInput` (variant, quantity, destination) and a `RouteFulfilmentContext` the caller loads first — stock per location, locations to try first (the showroom for Bali), local-production and POD eligibility (C7 `RouteFulfilment`) — own stock → local made-to-order → POD near the buyer (only while `fulfilment.pod` is on) → not offered
  - [ ] 26.3.b The local made-to-order adapter: a production task for the Bali print partner, with a presigned print file from `print-files/`
  - [ ] 26.3.c Tests: an Indonesian destination never routes overseas; switching `fulfilment.pod` on needs no router change
  - [ ] 26.3.d **Check:** each line routes own stock → local made-to-order (a production task for the Bali print partner, with its presigned print file from `print-files/`) → **POD near the buyer only while `fulfilment.pod` is on** (off at launch, D23) → not offered; the router does no I/O of its own — every fact it needs arrives in its loaded context — so it is unit-tested as a pure function; a test proves Indonesian destinations never route overseas and that switching `fulfilment.pod` on needs no router change. The Prodigi and Gelato adapters are post-launch (v2.18).

---

## Phase 27 — Sister sync, WhatsApp and the integrations gate 👤 · Integrations · needs 25, 26 · ~3d

**Goal:** the gallery's works reaching the shop, WhatsApp notifications, and the gate over the Integrations stage.
**Done when:** every adapter passes the contract suite on recorded sandbox fixtures; a Denpasar order gets live Biteship rates and tracking; a Netherlands order ships from Bali stock by DHL Express with a duties estimate (print-on-demand abroad is not part of the launch, D23); publishing a work in the gallery updates its shop copy within a minute and the shop's "own the original" reads "sold" after the gallery sells it.
**Waves:** W1 — 27.1, 27.2 · W2 — 27.3

- [ ] **27.1 Sister sync** · needs: 1.2.g, 8.2
  - **Lane** SIS · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/sister/**`, `engine/packages/http/src/sister/**`
  - **Read** BRANDS.md §5
  - _Requirements: 3.8, 3.11, 15.1, 15.2, 15.3, 15.4, 15.5, 16.6, 8.3_
  - [ ] 27.1.a The gallery's signed read-only archive API at `/api/x/sister/…` — published works only, `overrideAccess: false`, a field `select` — and a test that drafts, `physical` and acquisition fields never leave
  - [ ] 27.1.b `work.*` webhooks, sent from the outbox, and the shop's `prints.*` webhook back — both signed with the pair's shared secret, and every call to the sister addressed at `sisterBaseUrl()` (the host's `SISTER_BASE_URL`, else the committed staging origin; C1, DEPLOYMENT.md §8)
  - [ ] 27.1.c The shop's idempotent provenance-copy importer (synced fields read-only); the shop sends what it makes from a work back as that work's whole `PrintsFeed`, which the gallery's idempotent importer uses to replace its copy whole, so a withdrawn product simply drops out; a nightly reconcile each way; each side applies each part of a work only when it is newer than its copy — the work's fields by a snapshot's `updatedAt`, its original's listing by that listing's `asOf` (alone or inside a snapshot), the feed by its `asOf` — acknowledging and dropping anything older, and a tombstone or an unpublishing moves every part; an FX refresh stamps a new `asOf` on every listing whose derived price it moved
  - [ ] 27.1.d Both cross-links: the gallery item page linking to the exact products, and — from its copy of the shop's feed, never a live read of the shop's database — "Prints of this map"; the shop's "own the original" in the visitor's market currency, export status respected. Every price on either link travels per market as the selling brand shows it, and every image is the C9 ladder at the owning brand's absolute URLs, never copied or re-derived.
  - [ ] 27.1.e A two-database test: a sale in the gallery flips the shop's block to sold within a minute
  - [ ] 27.1.f **Check:** the gallery's signed read-only archive API at `/api/x/sister/…` — reading **published works only**, with `overrideAccess: false` and a field `select`, so drafts, `physical` and acquisition fields never leave (a test asserts it) — and `work.*` webhooks sent from the outbox feed the shop's idempotent provenance-copy importer (synced fields read-only); the shop's `prints.*` webhook feeds the gallery's copy back the same way, so "Prints of this map" renders from it, never a live read; both cross-links resolve, the gallery item page links to the exact products made from its work (Req 16.6), and a two-database test proves a sale in the gallery flips the shop's "own the original" to sold within a minute — that a delayed "available" arriving after "sold" leaves it sold, and that a snapshot with newer fields but an older `original` than the copy's updates the fields alone. Every price either link shows is **per market, as the selling brand shows it** (never USD beside an IDR page) and **respects export status** — tested for an Indonesian destination and for a `domestic-only` original seen from abroad; every image renders at the owning brand's absolute URL from the C9 ladder, never copied into the other brand's bucket.

- [ ] **27.2 👤 WhatsApp notifications** · needs: 20.3 · 👤 provider (D14 — needed before this wave; otherwise close as email-only with the date)
  - **Lane** NTF · **Agent** senior-integrator · **Wave** W1
  - **Owns** `engine/packages/mail/src/whatsapp/**`
  - _Requirements: 13.5, 18.5_
  - [ ] 27.2.a WhatsApp template copy in EN and ID from the lexicon, within Meta's length and button limits, submitted for approval (👤 the business account)
  - [ ] 27.2.b **Check:** opted-in buyers receive order and shipping updates through the chosen provider's templates, the sender is pluggable, and opt-in is recorded as a consent.

- [ ] **27.3 Integrations gate** · needs: phase 25, phase 26, 27.1, 27.2
  - **Lane** QA · **Agent** qa · **Wave** W2
  - **Owns** `docs/gates/integrations.md`
  - **Read** the **Done when** of phases 25–27
  - _Requirements: 11.1, 11.6, 11.7, 12.1–12.7, 15.1–15.5, 16.6_
  - [ ] 27.3.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 27.3.b Drive every clause of the **Done when** of phases 25–27 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/integrations.md`
  - [ ] 27.3.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 27.3.d **Check:** every clause of the **Done when** of phases 25–27 is evidenced in `docs/gates/integrations.md`, with no failure left open.

---

## Phase 28 — Accounts, consent and data-subject operations · Accounts · needs 17, 22 · ~3d

**Goal:** collector sign-in and the legacy claim flow on the gallery, retailer accounts on the shop (shoppers buy as guests, D31), both account areas, consent, and the data-subject operations.
**Done when:** a gallery collector signs up and a legacy customer claims their account; a shop visitor checks out as a guest and finds no shopper sign-up; a retailer applies from the Partnership page, is approved by staff and signs in to the retailer area; the consent banner records each choice and the beacon runs cookieless without consent; an erasure request removes a customer's personal data while their orders stay reproducible.
**Waves:** W1 — 28.1, 28.3, 28.4 · W2 — 28.2, 28.5

- [ ] **28.1 Customer authentication and the legacy claim flow** · needs: 9.4
  - **Lane** WEB (+ SCH consult) · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/http/src/auth/**`
  - **Read** ARCHITECTURE.md §12, MIGRATION.md §5, NOW! READER-IDENTITY.md
  - _Requirements: 13.1, 16.4, 19.5_
  - [ ] 28.1.a The custom auth strategy on `customers` under its own cookie — a staff session in the same browser survives (test)
  - [ ] 28.1.b Register, verify, sign in, reset, lockout, rate limits — on the gallery for collectors; on the shop **for approved retailers only**, with no shopper registration route at all (D31). A set-password link (approval's, a reset's, a claim) is a single-use random nonce that the auth service mints when NTF asks for one as it sends the email, keeping only its hash and expiry on the customer until it is used (C13 `PASSWORD_LINK`). Every other emailed link — the application's status link included — is derived (C6 `links`), stored nowhere.
  - [ ] 28.1.c Cart merge on sign-in; the claim flow for the gallery's migrated accounts (random, unusable password)
  - [ ] 28.1.d Tests: wrong password, unknown user (the same answer), lockout, a customer on an admin route
  - [ ] 28.1.e **Check:** customer sessions are issued by a **custom auth strategy on `customers` under their own cookie** — a member of staff signed in to `/admin` stays signed in after signing in as a customer in the same browser (test); register, verify, sign in, reset, lockout and rate limits work for customers only — collectors on the gallery, approved retailers on the shop, and the shop exposes no shopper sign-up; carts merge on sign-in; a migrated account (random, unusable password) can claim itself by email link; tests cover wrong password, unknown user (same answer as wrong password), lockout and a customer attempting an admin route.

- [ ] **28.2 The gallery's account area and the shop's retailer area** · needs: 28.1
  - **Lane** UXG + UXE · **Agent** senior-uiux (one per app) · **Wave** W2
  - **Owns** `engine/apps/*/src/surfaces/account/**` + routes
  - _Requirements: 13.2, 18.6_
  - [ ] 28.2.a The gallery: overview, orders with documents, wishlist, want-lists (each with its own stop button — no separate unsubscribe landing page: every alert leads to the one want-list page, C10 `wantList`), addresses, profile, consents, export and deletion requests. The shop's retailer area: overview, orders and quotes with documents, the retail terms (data set by D32), addresses, profile, consents, export and deletion requests
  - [ ] 28.2.b The gallery's conversations: my offers (with the counter's countdown), holds, price requests, viewings (reschedule, cancel, `.ics`), consignments with their timeline — each answered by the session and the record's id (C6 `OfferAccess`, `AppointmentAccess`), a viewing rescheduled through the `appointment` form that names it (C10 `form`'s `appointment`), and its `.ics` served by session: no token in the page or in any URL on it but a pay link's or a quote's own address
  - [ ] 28.2.c Empty states that invite rather than blank
  - [ ] 28.2.d **Check:** the gallery's account and the shop's retailer area each hold what 28.2.a lists; in the gallery, overview, orders with documents, wishlist (the gallery's viewing pull list), want-lists (each stopped from the one want-list page, never a separate landing page), addresses, profile and consents, and export/deletion requests work; the gallery's account also holds **my offers** (with the counter's countdown), holds, price requests, viewings (reschedule, cancel, `.ics`) and consignments with their status timeline, all by session — a test finds no offer, appointment or lookup token in the account's HTML; empty states invite rather than blank (NOW! DESIGN-SYSTEM §4).

- [ ] **28.3 Consent banner, records and the cookieless beacon mode** · needs: 9.4, 22.1, 22.2
  - **Lane** SEO · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/analytics/src/consent/**`
  - **Read** ANALYTICS.md §1, COMPLIANCE.md §7, KOI DESIGN-SYSTEM.md ("the consent banner is fixed")
  - _Requirements: 17.5, 17.6, 18.5_
  - [ ] 28.3.a The fixed, CLS-safe banner
  - [ ] 28.3.b Consent records: purpose, timestamp, policy version
  - [ ] 28.3.c The beacon cookieless until consent; GA4 and Meta loaded from the runtime ids in `ShellVM` only after marketing consent; an e2e for rejection
  - [ ] 28.3.d **Check:** the banner is fixed (CLS-safe), records purpose + timestamp + policy version, keeps the beacon cookieless until consent, loads GA4 and Meta only from the **runtime** ids in `ShellVM` after marketing consent, and an e2e proves rejecting consent loads no marketing tag.

- [ ] **28.4 Data-subject operations** · needs: 9.4, 17.1
  - **Lane** DOM + WEB · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/domain/src/privacy/**`, `engine/packages/http/src/privacy/**`
  - **Read** COMPLIANCE.md §7, MIGRATION.md §5
  - _Requirements: 13.2, 18.6_
  - [ ] 28.4.a Export (JSON) and correction
  - [ ] 28.4.b Erasure: personal fields removed or pseudonymised everywhere, while orders, invoices and tax records keep what the law requires and still reproduce their totals
  - [ ] 28.4.c The record-of-processing export per brand; never-claimed migrated accounts purged on counsel's schedule
  - [ ] 28.4.d An operations log that never holds the personal data itself
  - [ ] 28.4.e **Check:** a verified customer (or staff on their behalf) can **export** their data as JSON, **correct** it, and **erase** it — personal fields removed or pseudonymised everywhere, while orders, invoices and tax records keep what the retention law requires and still reproduce their totals; a record-of-processing export exists per brand; migrated customers who never claim their account are purged on the schedule counsel sets; every operation is logged without the personal data itself.

- [ ] **28.5 The Partnership page and retailer accounts** · needs: 28.1, 22.4
  - **Lane** UXE + DOM (+ SCH for the `retailerStatus` field, in the wave migration) · **Agent** senior-uiux, senior-be · **Wave** W2
  - **Owns** `engine/apps/emporium/src/surfaces/partnership/**` + its routes, `engine/packages/domain/src/retailers/**`
  - **Read** `docs/design/input/claude-design-2026-09/Old East Indies/Partnership.dc.html` and `project-notes.md` (the client's decision of 11 Sept 2026), EXPERIENCE-SHOP.md §9, COMPLIANCE.md §7
  - _Requirements: 7.8, 13.1, 13.2_
  - [ ] 28.5.a The Partnership page: what a retail partner gets (the terms D32 sets), reached from the partnership highlight in the home hero and from **Partnership** in the header; its last section is the call to action that opens sign-up or sign-in, inline or as a dialog
  - [ ] 28.5.b The retailer application — business name, tax number (NPWP), address, type of shop, contact, consent — saved as a customer with `retailerStatus: applied`; staff approve or decline it in the admin, and approval emails a set-password link
  - [ ] 28.5.c An approved retailer signs in (28.1) and sees the retail terms as data — the trade price tier and minimum order (D32) — and orders through a quote (the order builder, 24.5); a declined or pending applicant sees their status, never trade prices
  - [ ] 28.5.d **Check:** from the home hero and from the header, a visitor reaches the Partnership page, applies at its last section, is approved by staff in the admin, sets a password from the email and signs in to the retailer area with the trade terms; a pending or declined applicant never sees a trade price; a shopper has no sign-up route and checks out as a guest.

---

## Phase 29 — Alerts, newsletter, retention and the accounts gate · Accounts · needs 16, 20, 28 · ~3d

**Goal:** want-list alerts, the newsletter, the shop's retention features, and the gate over the Accounts stage.
**Done when:** a guest's saved search emails them when a match is published; a confirmed subscriber receives the next generated digest; a consented abandoned bag sends one email and a non-consented one sends none; an erasure request removes a customer's personal data while their orders stay reproducible.
**Waves:** W1 — 29.1, 29.2 · W2 — 29.3 · W3 — 29.4

- [ ] **29.1 Want-lists: subscribe, confirm, match and alert** · needs: 16.3, 20.3
  - **Lane** DOM · **Agent** senior-be · **Wave** W1
  - **Owns** `engine/packages/domain/src/want-lists/**`, `engine/packages/http/src/commerce/want-lists/**`
  - **Read** COMMERCE.md §7, COMPLIANCE.md §7, ARCHITECTURE.md §11
  - _Requirements: 13.3, 5.6_
  - [ ] 29.1.a `wantList.subscribe`: an account's list starts at once (`retention.wantList`); an address's is stored `pending` and answers the same — a link is on its way — whoever asks and whatever it already watches, within `WANT_LIST_EMAIL_LIMIT` and at most `WANT_LIST_PENDING_PER_ADDRESS` pending per address (past it, nothing stored, the same receipt); the confirmation is sent from the outbox after commit, its link's token derived as it is sent (C6 `links`), never carried by the row
  - [ ] 29.1.b `wantList.confirm` (POST, by `WANT_LIST_ACCESS`'s cookie only) starts a `pending` list; `wantList.unsubscribe` erases a list whole — address, query and consent — by the account, the page's cookie, or RFC 8058's one-click token on C13 `ONE_CLICK_UNSUBSCRIBE`'s terms (the URL's token alone, the body `List-Unsubscribe=One-Click` alone, no cookie or session read, `200` with an empty body, the token stripped from the log); a daily sweep purges a `pending` list never confirmed within `WANT_LIST_PENDING_DAYS` (7)
  - [ ] 29.1.c Matching on publish, from an outbox event run by the queue; delivery within 15 minutes or in a daily digest, as the subscriber chose; "another example arrived" for sold items
  - [ ] 29.1.d Budgets compared in the want-list's own market currency
  - [ ] 29.1.e **Check:** an address's `wantList.subscribe` stores a `pending` list and emails a double opt-in link from the outbox, admitting nothing about what it already watches; the want-list page's POST confirms it or, by the same access cookie or an emailed RFC 8058 token, stops it — erasing the list whole; a `pending` list never confirmed is purged after 7 days (test); publishing a work or product emits an outbox event that the queue matches against saved queries, notifying **within 15 minutes** or in a daily digest as the subscriber chose (a test measures publish → email in Mailpit), including "another example arrived" for sold items; budgets compare in the want-list's own market currency; subscribing past `WANT_LIST_EMAIL_LIMIT` answers the same receipt without sending another email, and past `WANT_LIST_PENDING_PER_ADDRESS` stores nothing (tests); a cross-site post carrying the visitor's access cookie and a `?token=` erases nothing (test).

- [ ] **29.2 Newsletter: double opt-in and the generated digest** · needs: 9.4, 20.3
  - **Lane** NTF · **Agent** medior · **Wave** W1
  - **Owns** `engine/packages/mail/src/newsletter/**`
  - _Requirements: 13.4_
  - [ ] 29.2.a Double opt-in (KOI), its confirm and stop links derived (C6 `links`, purpose `newsletter`) and the stop on C13 `ONE_CLICK_UNSUBSCRIBE`'s terms
  - [ ] 29.2.b The digest generated from inventory published since the last issue, archived as HTML pages
  - [ ] 29.2.c Sending through the D28 newsletter sender, with list-unsubscribe
  - [ ] 29.2.d **Check:** double opt-in works (KOI), the gallery digest is generated from inventory published since the last issue, issues are archived as HTML pages, sends go through the newsletter sender chosen in D28 (never the transactional SMTP's daily quota), and every send carries list-unsubscribe.

- [ ] **29.3 Shop retention: welcome offer, reviews, back in stock, abandoned bag, gift-card purchase** · needs: 20.1, 29.2
  - **Lane** DOM + UXE + NTF · **Agent** senior-be, medior · **Wave** W2
  - **Owns** `engine/packages/domain/src/{reviews,retention}/**`, `engine/apps/emporium/src/surfaces/{reviews,gift-card}/**`
  - _Requirements: 13.6, 13.7, 8.7_
  - [ ] 29.3.a A welcome code on a confirmed newsletter signup (no account — shoppers buy as guests, D31)
  - [ ] 29.3.b Verified-buyer reviews with photos, under moderation
  - [ ] 29.3.c Back-in-stock alerts; abandoned-bag email only with consent (tested both ways)
  - [ ] 29.3.d Gift cards bought and redeemed
  - [ ] 29.3.e **Check:** a confirmed newsletter signup issues a welcome code, verified buyers (by their order, no account) can review with photos under moderation, restock alerts fire, abandoned-bag email goes only to consented buyers (test both ways), and gift cards can be bought and redeemed.

- [ ] **29.4 Accounts gate** · needs: phase 28, 29.1–29.3
  - **Lane** QA · **Agent** qa · **Wave** W3
  - **Owns** `docs/gates/accounts.md`
  - **Read** the **Done when** of phases 28 and 29
  - _Requirements: 13.1–13.7, 18.6_
  - [ ] 29.4.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 29.4.b Drive every clause of the **Done when** of phases 28 and 29 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/accounts.md`
  - [ ] 29.4.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 29.4.d **Check:** every clause of the **Done when** of phases 28 and 29 is evidenced in `docs/gates/accounts.md`, with no failure left open.

---

## Phase 30 — Shop: loaders, home and collections, the product page and the configurator · Shop · needs 16, 21, 22 · ~4.5d

**Goal:** the shop's browsing half on real data, built to its briefs.
**Done when:** on a phone, inside the Instagram in-app browser, the shop's home, menus, collections, places and eras, gifts and search run on real data; a product page shows its variants; the configurator builds the largest giclée the seed scan allows (≈ 37 cm on the long edge at 240 ppi, D26) with a teak frame and mount, seen to scale.
**Waves:** W1 — 30.1, 30.2, 30.3, 30.4

- [ ] **30.1 Shop loaders** · needs: phase 10, 15.3, 16.3, 21.1
  - **Lane** WEB · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/loaders/src/{design,collection,product-type,ig,showroom,gift-card,business-quote}.ts` (shop-specific; the shared loaders are 33.1's, and a change one of them needs for the shop is routed to 33.1's agent, not made here)
  - **Read** DESIGN-SYSTEM.md §2–3, ARCHITECTURE.md §9, §12
  - _Requirements: 1.2, 3.11, 7.5, 8.3, 19.12_
  - [ ] 30.1.a The Payload source for the shop-specific loaders, through the 11.3 read helper
  - [ ] 30.1.b `DesignVM` and variant pricing for the current destination (rupiah only for Indonesia)
  - [ ] 30.1.c `IgVM` from the CMS-curated posts, `LocationVM` with showroom stock, `GiftCardVM`
  - [ ] 30.1.d The same cache and streaming rules, and tests, as 33.1
  - [ ] 30.1.e **Check:** every shop surface loads real, published-only, projected data through the 11.3 read helper, including `DesignVM`, the variant-pricing VMs for the current destination (rupiah only for Indonesia), `IgVM` from the CMS-curated posts (an Instagram API feed is v2), `LocationVM`/showroom stock and `GiftCardVM`; the same cache and streaming rules as 33.1 hold; a loader test proves `VariantsPurchaseVM.actions.quote` is `null` for every viewer but a signed-in approved partner where `accounts.retailers` is on (D36).

- [ ] **30.2 Home, menus, collections, places & eras, gifts, search and filters** · needs: 22.4
  - **Lane** UXE · **Agent** senior-uiux (UXE-A) · **Wave** W1
  - **Owns** `engine/apps/emporium/src/surfaces/{home,browse,search,collection}/**` + routes
  - **Read** EXPERIENCE-SHOP.md §2–3
  - _Requirements: 7.4, 5.3_
  - [ ] 30.2.a The Shop mega-menu and home bands
  - [ ] 30.2.b Collections, places & eras, and gifts by price, recipient and occasion
  - [ ] 30.2.c The filter sheet and sort; tiles showing the destination's valid "From" price; empty bands omitted
  - [ ] 30.2.d The designed 404, 410 and 500
  - [ ] 30.2.e **Check:** the Shop mega-menu, collections, places & eras, gifts by price/recipient/occasion, the filter sheet and sorting work on real data; tiles show the "From" price valid for the destination; empty bands (reviews, Instagram photos) are omitted, never shown empty; 404, 410 and 500 are the designed pages.

- [ ] **30.3 The product page** · needs: 22.4
  - **Lane** UXE · **Agent** senior-uiux (UXE-B) · **Wave** W1
  - **Owns** `engine/apps/emporium/src/surfaces/item/**` + route
  - **Read** EXPERIENCE-SHOP.md §4
  - _Requirements: 7.1, 7.5, 7.6, 15.3, 18.7_
  - [ ] 30.3.a Images and the title block (Archive No., Reproduction label, badge, live price)
  - [ ] 30.3.b The delivery promise from the holiday calendar, a shipping estimate for the saved district, the stated COD position
  - [ ] 30.3.c The sticky buy bar with WhatsApp merged in (prefilled from the lexicon), the trust row, story, specs and "more with this image"
  - [ ] 30.3.d The original's status (market currency, export status respected, the separate-account note); the in-showroom mode from a showroom QR
  - [ ] 30.3.e **Check:** images, the title block (Archive No., Reproduction label, badge, live price), the delivery promise (reading the holiday calendar) with a shipping estimate for the saved district and the stated COD position, the sticky buy bar with WhatsApp merged in and prefilled from the lexicon, trust row, story, the original's status (price in the visitor's market currency, export status respected, the separate-account note), specs and "more with this image" render from real data; a page opened from a showroom QR switches to the in-showroom mode.

- [ ] **30.4 The configurator** · needs: 9.2, 17.2
  - **Lane** WEB (30.4.a) + UXE (30.4.b) · **Agent** senior-fe, senior-uiux (UXE-B) · **Wave** W1
  - **Owns** `engine/packages/ui/src/configurator/**` (30.4.a), `engine/apps/emporium/src/surfaces/configurator/**` (30.4.b; the item page imports it)
  - **Read** EXPERIENCE-SHOP.md §5, COMMERCE.md §3
  - _Requirements: 4.4, 7.2, 7.3, 19.1, 19.2_
  - [ ] 30.4.a headless configurator state machine, constraint evaluation, URL codec, GET-form fallback (unit-tested)
  - [ ] 30.4.b configurator UI and layered preview (scan, mount, frame, shadow; three views; pinned on phones)
  - [ ] 30.4.c **Check:** the options are server-rendered radio groups in a GET form that works without JavaScript and hydrates progressively; constraints from the product type disable impossible combinations with a reason; the price updates instantly from the destination's price table shipped with the page (display only — the bag re-prices on the server and shows any difference); the preview (pre-sized AVIF, 9-slice frames, pre-composited room plates, SVG scale) loads on intent and renders flat/on a wall/to scale in under 100 ms **measured on the reference device**; the configuration round-trips through the URL; swatches are named with ≥ 24 px targets and a text summary.

---

## Phase 31 — Shop: stories, the bag and checkout, order tracking · Shop · needs 21, 22 · ~3.5d

**Goal:** the shop's buying half on real data, built to its briefs.
**Done when:** the shop's design pages, stories, For Business, `/ig`, showroom and gift-card pages render on real data; a bag checks out in the sandbox in IDR only — by QRIS, or by VA following the payment-pending page; a guest tracks the order and a showroom pickup is confirmed.
**Waves:** W1 — 31.1, 31.2 · W2 — 31.3

- [ ] **31.1 Design pages, stories, the quote page, `/ig`, showroom, gift cards** · needs: 21.1, 22.4
  - **Lane** UXE · **Agent** senior-uiux (UXE-C) · **Wave** W1
  - **Owns** `engine/apps/emporium/src/surfaces/{design,story,page,form,quote,ig,showroom,gift-card}/**` + routes
  - **Read** EXPERIENCE-SHOP.md §6, §8–9
  - _Requirements: 7.7, 7.8_
  - [ ] 31.1.a Design pages listing every product made from one design
  - [ ] 31.1.b Stories with shop-the-story rails and `shoppableImage` hotspots
  - [ ] 31.1.c The **quote page** (lines, validity, PDF, accept → payment link) that an approved partner's brief becomes (28.5's Partnership page, D31/D36 — never a separate "For Business" surface) or that a configured product starts ("Turn this into a quote" → the C10 `quote` form with the product and its variant, shown to a signed-in partner only)
  - [ ] 31.1.d `/ig` from the CMS-curated posts; the showroom page ("In the showroom now", hours, map); gift cards (choose, schedule for a recipient, check a balance)
  - [ ] 31.1.e **Check:** a design page lists every product from one design; stories carry shop-the-story rails and `shoppableImage` hotspots; an approved partner's brief becomes a **quote page** (lines, validity, PDF, accept → payment link), which a configured product can also start ("Turn this into a quote"); `/ig` shows the posts staff curate in the CMS, each linked to the products it shows (no Instagram API at launch); the showroom page shows "In the showroom now" stock with hours and map; gift cards can be chosen, scheduled for a recipient, and checked for balance.

- [ ] **31.2 Bag drawer, checkout, payment-pending and order pages** · needs: 19.1, 21.1, 22.4
  - **Lane** UXE · **Agent** senior-fe (UXE-D) · **Wave** W1
  - **Owns** `engine/apps/emporium/src/surfaces/{cart,checkout,order,pay}/**` + routes
  - **Read** EXPERIENCE-SHOP.md §7, COMMERCE.md §5, PAYMENTS.md §3, DESIGN-SYSTEM.md §2, §12
  - _Requirements: 7.9, 7.11, 10.1, 10.2, 10.3, 10.8, 12.3, 18.7, 19.11_
  - [ ] 31.2.a The bag drawer (free-shipping bar, upsells, voucher field) and every bag edge case with a fixture and a designed state, including re-pricing to IDR with a notice
  - [ ] 31.2.b The Indonesian checkout: WhatsApp first (+62), one full-name field, searchable address pickers with an optional pin; the "I'm visiting Bali" path; gift options
  - [ ] 31.2.c Routed methods only; the payment-pending page (VA copy, per-bank steps, a countdown matching the session's real expiry, the cap warning, auto-switch to paid, QRIS save-to-gallery and e-wallet deep links, retry keeping the bag)
  - [ ] 31.2.d The in-app-browser hint; the `Pay` page; the export flow with market currency and duties
  - [ ] 31.2.e **Check:** the drawer shows the free-shipping bar, upsells and voucher field, and **every bag edge case** in EXPERIENCE-SHOP.md §7 has a fixture and a designed state — including the bag re-pricing to IDR with a visible notice when ship-to moves to Indonesia; the Indonesian flow asks WhatsApp first (normalised to +62), uses one full-name field and searchable address pickers with an optional pin; the "I'm visiting Bali" path works (deliver before a date, pickup, send home); gift options (recipient address, note preview, prices hidden, target date); payment shows only routed methods; the **payment-pending page** (VA copy, per-bank steps, countdown matching the session's real expiry, cap warning, auto-switch to paid; QRIS save-to-gallery and e-wallet deep links; retry keeps the bag) is complete; an in-app browser gets "open in your browser" where a payment cannot complete; the `Pay` page serves staff-sent links; the export flow shows market currency and duties.

- [ ] **31.3 Guest order tracking, pickup confirmation and the want-list page** · needs: 20.3, 31.2
  - **Lane** UXE · **Agent** senior-fe · **Wave** W2
  - **Owns** `engine/apps/emporium/src/surfaces/{order-lookup,want-list}/**` + routes (the gallery's own lookup and want-list pages are 34.3's; both follow the one 22.3 brief)
  - **Read** EXPERIENCE-SHOP.md §7, §10, DESIGN-SYSTEM.md §2
  - _Requirements: 7.10_
  - [ ] 31.3.a Lookup by order number plus email or WhatsApp number — rate-limited, the same answer for a wrong pair and an unknown order
  - [ ] 31.3.b The courier timeline, and the tracking link in every WhatsApp update
  - [ ] 31.3.c Pickup orders: a code or QR, the "ready" notice, hours, map and who may collect
  - [ ] 31.3.d The want-list page (C10 `wantList`, module `retention.emailWantList`): the subscribe form for what its URL names — always an email address here, no shopper account — the list an email's link opened (confirm or stop), and the last post's result, all resolved at request time, none of it streamed (D39)
  - [ ] 31.3.e **Check:** a guest finds an order by order number plus email or WhatsApp number (rate-limited, answering the same for a wrong pair and an unknown order) and sees the courier timeline; every WhatsApp update carries the tracking link; a pickup order shows a pickup code or QR, the "ready" notice, hours, map and who may collect; the want-list page saves, confirms or stops what its URL and access cookie name, every state resolved without JavaScript.

---

## Phase 32 — Shop: polish, buyers and the shop gate 👤 · Shop · needs 30, 31 · ~3.5d

**Goal:** the shop end to end, run by real buyers, and the gate over the Shop stage.
**Done when:** the 1.1.c shop journeys pass on a phone **inside the Instagram in-app browser** — a visitor opens a collection, configures the largest giclée the seed scan allows (≈ 37 cm on the long edge at 240 ppi, D26) with a teak frame and mount, sees it to scale, adds gift wrap and a voucher, pays by QRIS (or VA, following the payment-pending page) in the sandbox in IDR only, and tracks the order as a guest; a tourist switches ship-to to the Netherlands and sees euro prices and a duties estimate; a showroom QR opens the in-showroom mode; budgets pass; axe is clean; real buyers have run the journeys; the design gate passes.
**Waves:** W1 — 32.1 · W2 — 32.2 · W3 — 32.3

- [ ] **32.1 Shop polish and end-to-end** · needs: 30.2–30.4, phase 31
  - **Lane** QA + UXE lead · **Agent** qa, senior-uiux · **Wave** W1
  - **Owns** `tests/e2e/emporium/**`
  - _Requirements: 19.1, 19.2, 19.11_
  - [ ] 32.1.a e2e for every 6.1.c shop journey on a production build — desktop, phone, and the Instagram, WhatsApp and TikTok in-app browsers
  - [ ] 32.1.b impeccable findings fixed
  - [ ] 32.1.c Budgets and axe green; the reference-device check on Telkomsel 4G in Bali recorded
  - [ ] 32.1.d **Check:** every 6.1.c shop journey passes e2e on a production build (desktop, phone, and the Instagram, WhatsApp and TikTok in-app browsers); impeccable findings are fixed; budgets and axe pass; the reference-device check on Telkomsel 4G in Bali is recorded.

- [ ] **32.2 👤 Usability runs with real buyers** · needs: 32.1
  - **Lane** QA + UXE · **Agent** qa, senior-uiux · **Wave** W2
  - **Owns** `docs/design/research/shop-usability/**`
  - _Requirements: 19.10_
  - [ ] 32.2.a 👤 Recruit five buyers — tourists, an expat, a gift buyer, a local; at least two sessions in Indonesian, at least three from the Instagram in-app browser
  - [ ] 32.2.b Run the journeys on staging, recording task times and success
  - [ ] 32.2.c Fix every blocker, or file it as a task, before the gate
  - [ ] 32.2.d **Check:** five buyers (tourists, an expat, a gift buyer, a local; at least two in Indonesian; at least three from the Instagram in-app browser) have run the journeys on staging with task times and success recorded, and every blocker is fixed or filed before the gate.

- [ ] **32.3 Shop gate — with the design gate** · needs: phase 30, phase 31, 32.1, 32.2
  - **Lane** QA + UXE · **Agent** qa, senior-uiux · **Wave** W3
  - **Owns** `docs/gates/shop.md`
  - **Read** the **Done when** of phases 30–32, DESIGN-SYSTEM.md §13
  - _Requirements: 7.1–7.12, 19.10_
  - [ ] 32.3.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 32.3.b Drive every clause of the **Done when** of phases 30–32 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/shop.md`
  - [ ] 32.3.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 32.3.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 32.3.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 32.3.f **Check:** every clause of the **Done when** of phases 30–32 is evidenced in `docs/gates/shop.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

---

## Phase 33 — Gallery: loaders, browse, the item page and editorial · Gallery · needs 16, 21, 22 · ~5d

**Goal:** the gallery's browsing half on real data, built to its briefs.
**Done when:** on a phone a visitor lands on a place page, filters Java maps under USD 2,000 and zooms an item's verso, on real data; a changed slug 301s to the item; makers, places, sources, curations, catalogues, exhibitions and stories render.
**Waves:** W1 — 33.1, 33.2, 33.3, 33.4

- [ ] **33.1 Gallery loaders** · needs: phase 10, 15.3, 16.3, 21.1
  - **Lane** WEB · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/loaders/src/{home,browse,search,item,maker,place,source,exhibition,location,curation,story,page,form,cart,checkout,order,pay,quote,order-lookup,newsletter-archive}.ts` (Payload source)
  - **Read** DESIGN-SYSTEM.md §2–3, §7, ARCHITECTURE.md §9, §12
  - _Requirements: 1.2, 3.11, 6.3, 6.4, 6.10, 6.11, 19.4, 19.12_
  - [ ] 33.1.a The Payload source for every gallery surface, through the 11.3 read helper
  - [ ] 33.1.b `loadItem` by public id, returning `redirectTo` on a slug mismatch; the viewer-relative purchase states, *enquiry-only* included
  - [ ] 33.1.c Content under `'use cache'` + `cacheTag`; availability, the ship-to market and the cart inside `<Suspense>`, streaming into reserved placeholders
  - [ ] 33.1.d Tests: never stale-available from cache, no purchase control before availability (with a CLS assertion), no draft or private field in any response
  - [ ] 33.1.e **Check:** every gallery surface loads real, **published-only, projected** data into its VM through the 11.3 read helper (`overrideAccess: false`, `_status: 'published'`, `select`), including the viewer-relative purchase states and *enquiry-only*; `loadItem` resolves `/product/{id}-{slug}` by public id and returns `redirectTo` when the slug differs; content is `'use cache'` + `cacheTag`; availability, the ship-to market and the cart are read inside `<Suspense>` and **stream into a reserved placeholder** — tests prove a sold item is never served as available from cache (its tags expire immediately), no purchase control renders before availability resolves (with a CLS assertion), and a draft or a private field never reaches a response; the purchase panel's `reserve` and `proforma` actions link to the `hold` and `quote` form pages (C10), and a guest institution's `quote` page renders where `accounts.retailers` is off.

- [ ] **33.2 Home, browse and search** · needs: 22.4
  - **Lane** UXG · **Agent** senior-uiux (UXG-A) · **Wave** W1
  - **Owns** `engine/apps/gallery/src/surfaces/{home,browse,search,not-found}/**` + their route folders
  - **Read** EXPERIENCE-GALLERY.md §3–4, §10; the 22.3 surface briefs
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_
  - [ ] 33.2.a Home bands from the homepage global
  - [ ] 33.2.b Browse: available by default with the sold toggle; the facet bottom sheet on phones (chips, live count, number inputs, sticky apply/clear); sort; named facet URLs
  - [ ] 33.2.c Search without JavaScript; the zero-results page ("not all 9,500 works are online — ask us", a prefilled enquiry, historical-name suggestions, Indonesian queries, a want-list link to the want-list page, C10 `wantList`)
  - [ ] 33.2.d The designed 404, 410 and 500
  - [ ] 33.2.e **Check:** home bands follow the homepage global; browse defaults to available with the sold toggle, the full facet set in a bottom sheet on phones (applied-filter chips, live count on apply, number inputs beside sliders, sticky apply/clear), working sort, named facet URLs; search works without JavaScript; **zero results never dead-end** ("not all 9,500 works are online — ask us" with a prefilled enquiry, historical-name suggestions, Indonesian queries, a link to the want-list page); 404, 410 and 500 are the designed pages.

- [ ] **33.3 The item page** · needs: 16.1, 22.4
  - **Lane** UXG · **Agent** senior-uiux (UXG-B) · **Wave** W1
  - **Owns** `engine/apps/gallery/src/surfaces/item/**` (not `item/purchase/**`, 34.1's) + the item route folder `app/(site)/[locale]/item/[idSlug]/**`
  - **Read** EXPERIENCE-GALLERY.md §5–6, §8, DESIGN-SYSTEM.md §2
  - _Requirements: 4.5, 4.6, 6.1, 6.8, 6.10_
  - [ ] 33.3.a The item route: the id from its segment (`null` → `notFound()`), the address asked for from the proxy's headers, then `loadItem({ locale, publicId, asked })`; `permanentRedirect()` — a 308 — on its `redirectTo`, `notFound()` on null, whose designed body needs JavaScript (DESIGN-SYSTEM.md §2); the purchase panel awaited in the page body, so its forms work without JavaScript; the status spec's item cases move from the spike's fixtures to real items (HAR's file: proposed in the report, added at merge)
  - [ ] 33.3.b The title block with the designed hook-title fallback; media with the viewer on intent; the static scale view; the primary image as LCP
  - [ ] 33.3.c The record: collation (and the book variant for volumes), condition linked to the scale, references, provenance, stock number
  - [ ] 33.3.d Context (essay, maker, locator map, related) and utilities (wishlist/alert, share, print, factsheet PDF, sister prints, the consign block)
  - [ ] 33.3.e **Check:** the item route calls `permanentRedirect()` (a 308, its `Location` encoded once and carrying the old link's query) on a `redirectTo` and `notFound()` on null; with JavaScript off, the purchase panel's forms post; an editor's save of the work in the admin shows on the item page by the second request after it, and on every one after (the first may be served stale while `'max'` regenerates) — a regeneration that read the row before its commit would keep the old text (invalidation after the commit, ARCHITECTURE.md §9); the title block (with the designed hook-title fallback), media with the viewer on intent, the static scale view, the record (collation — and the book variant for volumes — condition linked to the scale, references, provenance, stock number), context (essay, maker, locator map, related) and utilities (wishlist/alert, share, print, factsheet PDF, sister prints, consign block) render from real data; the primary image is the LCP.

- [ ] **33.4 Makers, places, sources, curations, catalogues, exhibitions and stories** · needs: 22.4
  - **Lane** UXG · **Agent** senior-uiux (UXG-C) · **Wave** W1
  - **Owns** `engine/apps/gallery/src/surfaces/{maker,place,source,collection,catalogue,exhibition,story,newsletter-archive}/**` + routes
  - **Read** EXPERIENCE-GALLERY.md §7
  - _Requirements: 6.5, 13.4, 15.3_
  - [ ] 33.4.a Maker and place pages (modern and historical names) with available and sold works
  - [ ] 33.4.b Source pages, and web-native catalogue pages with live availability
  - [ ] 33.4.c Exhibition pages and the newsletter archive
  - [ ] 33.4.d Stories with the scholarly blocks and the "originals in this story" / "prints from this story" rails
  - [ ] 33.4.e **Check:** each page renders real data with available and sold works, the place page shows modern and historical names, **web-native catalogue pages** show live availability (the printable PDF is v2, backlog v2.2), exhibitions list fairs and viewings, stories use the scholarly blocks (`zoomFigure` opening the viewer at a region, `compare`, sidenotes citing sources) and carry "originals in this story" and "prints from this story" rails, and past newsletters are archived as pages.

---

## Phase 34 — Gallery: the purchase panel, forms and checkout · Gallery · needs 33 · ~3.5d

**Goal:** every purchase state and the conversations a gallery lives on.
**Done when:** on the item page a visitor requests the price, reserves, makes an offer or buys in the sandbox and gets the confirmation; the trust pages, consignment, viewings and proformas work; checkout, payment and order pages run end to end.
**Waves:** W1 — 34.1, 34.2, 34.3

- [ ] **34.1 Purchase panel and flows** · needs: 11.4, 21.1, 33.3
  - **Lane** UXG · **Agent** senior-uiux (UXG-B) · **Wave** W1
  - **Owns** `engine/apps/gallery/src/surfaces/item/purchase/**`
  - **Read** COMMERCE.md §7, EXPERIENCE-GALLERY.md §5, §8
  - _Requirements: 6.2, 6.3, 6.4, 6.7, 6.11, 8.2, 9.3, 9.6, 16.8_
  - [ ] 34.1.a design the purchase-state matrix (tier × status × viewer relation × export status × ship-to × signed in) before building it
  - [ ] 34.1.b build every state; e2e over the fixture set
  - [ ] 34.1.c **Check:** every combination in the purchase-state matrix renders its designed state from the 11.4 fixtures; request price answers in place; a **make-an-offer** flow states plainly that offers are non-binding (D22) and shows the offer's status in the panel; an enquiry-only original (no known location) offers Enquire and Book a viewing, never Buy; sold pages put "own a print of this map" in the primary position; WhatsApp is prefilled (from the lexicon) with stock number and title; a `domestic-only` item seen from abroad reads "Available for delivery within Indonesia · View it in Jakarta"; each flow reaches its API and shows its confirmation.

- [ ] **34.2 Trust pages, forms, consignment, viewings and proformas** · needs: 21.1, 33.4
  - **Lane** UXG · **Agent** senior-uiux (UXG-C) · **Wave** W1
  - **Owns** `engine/apps/gallery/src/surfaces/{page,form,quote,location}/**` + routes
  - **Read** EXPERIENCE-GALLERY.md §9, COMPLIANCE.md §6, COMMERCE.md §7
  - _Requirements: 6.6, 6.9, 18.4_
  - [ ] 34.2.a Page templates serving the trust pages from the CMS
  - [ ] 34.2.b Consignment: the phone camera, HEIC, per-file progress with retry, the "what happens next" timeline
  - [ ] 34.2.c Viewing booking: time zones, `.ics` (attached to the confirmation; a signed-in booker's also served by session), the reminder (WhatsApp once D14 is chosen, email until then), rescheduling (a signed-in booker's through the `appointment` form naming the viewing), the wishlist as a pull list; the location page
  - [ ] 34.2.d The framing quote; a cart → multi-item proforma from its checkout's payment step ("Proforma instead", C6 `quote.proforma`) onto the `Quote` surface (PO field, PDF, "pay this proforma"); the `hold` form ("Reserve") and the `quote` form ("Proforma for institutions", an item even on request, its copy promising a proforma that staff issue within the reply time, never a PDF at once) from the purchase panel
  - [ ] 34.2.f 👤 The owner decides how an anonymous checkout's proforma may hold a unique line: a cap per contact and per IP, or staff approval before its `invoice` hold starts (COMMERCE.md §7; ARC recommends staff approval — a cap is cheap to evade, and an institution's proforma already passes through staff); a proforma of non-unique lines stays instant
  - [ ] 34.2.e **Check:** page templates serve guarantee, authentication, grades, certificate, shipping & insurance, framing & conservation, institutions, visit and FAQ from the CMS; consignment uses the phone camera, accepts HEIC, shows per-file progress with retry and a "what happens next" timeline; viewing booking shows the location's time zone, sends an `.ics` (attached to its confirmation, never a URL with a token), reminds on WhatsApp, can be rescheduled and attaches the wishlist as a pull list; the framing quote has its flow; a cart becomes a multi-item proforma at its checkout's payment step, onto the `Quote` surface with a PO field, PDF and "pay this proforma"; "Reserve" and "Proforma for institutions" each open their own form page (C10 `hold`, `quote`) that works without JavaScript and comes back refused, sent back or received.

- [ ] **34.3 Cart, checkout, payment, order and want-list pages** · needs: 19.1, 21.1, 22.4
  - **Lane** UXG · **Agent** senior-fe (UXG-D) · **Wave** W1
  - **Owns** `engine/apps/gallery/src/surfaces/{cart,checkout,order,pay,order-lookup,want-list}/**` + routes
  - **Read** COMMERCE.md §5, §7, PAYMENTS.md §2–5, DESIGN-SYSTEM.md §2
  - _Requirements: 9.3, 10.1, 10.5, 10.7, 11.5, 18.3_
  - [ ] 34.3.a Cart and checkout rendering the steps the VM contains and every `SessionResult` kind
  - [ ] 34.3.b The lock countdown surviving a 3-D Secure redirect; its expiry mid-payment as a designed state; "someone else was first" with alternatives and a link to the want-list page
  - [ ] 34.3.c Bank transfer for a high-value item (how long it is held, the SWIFT instructions, what happens at expiry); the `Pay` page for staff-sent links
  - [ ] 34.3.d Guest order lookup; confirmation and order pages with the seller identity and documents
  - [ ] 34.3.e The want-list page (C10 `wantList`, module `retention.emailWantList`): the subscribe form for what its URL names, the list an email's link opened (confirm or stop), and the last post's result — all resolved at request time, none of it streamed, so it works without JavaScript (D39)
  - [ ] 34.3.f **Check:** checkout renders the steps its VM contains and every `SessionResult` kind (embedded, redirect, instructions, QR, manual); the lock countdown survives a 3-D Secure redirect, and its expiry mid-payment is a designed state; "someone else was first" offers alternatives and a link to the want-list page; a bank transfer for a high-value item shows how long it is held, the SWIFT instructions and what happens at expiry; the `Pay` page serves staff-sent links; guests can look an order up; confirmation and order pages show the seller identity and documents; the want-list page saves, confirms or stops what its URL and access cookie name, every state resolved without JavaScript.

---

## Phase 35 — Gallery: polish, buyers and the gallery gate 👤 · Gallery · needs 34 · ~3.5d

**Goal:** the gallery end to end, run by real buyers, and the gate over the Gallery stage.
**Done when:** the 1.1.c gallery journeys pass on a phone — a visitor lands on a place page, filters Java maps under USD 2,000, zooms an item's verso, requests the price or reserves or buys it in the sandbox and gets the confirmation; an institution turns a cart into a proforma; a sold item shows its available alternative and "own a print of this map" and takes an alert — budgets pass on home, browse and item; axe is clean; real buyers have run the journeys; the design gate passes.
**Waves:** W1 — 35.1 · W2 — 35.2 · W3 — 35.3

- [ ] **35.1 Gallery polish and end-to-end** · needs: 33.2–33.4, phase 34
  - **Lane** QA + UXG lead · **Agent** qa, senior-uiux · **Wave** W1
  - **Owns** `tests/e2e/gallery/**`
  - _Requirements: 19.1, 19.2, 19.11_
  - [ ] 35.1.a e2e for every 6.1.c gallery journey on a production build — desktop, phone and the WhatsApp in-app browser
  - [ ] 35.1.b impeccable `audit` and `polish`, and the fixes
  - [ ] 35.1.c LHCI budgets and axe green; the reference-device check on 4G recorded
  - [ ] 35.1.d **Check:** every 6.1.c gallery journey passes e2e on a production build (desktop, phone, and the WhatsApp in-app browser); impeccable `audit` and `polish` findings are fixed; LHCI budgets and axe pass; the reference-device check on 4G is recorded.

- [ ] **35.2 👤 Usability runs with real buyers** · needs: 35.1
  - **Lane** QA + UXG · **Agent** qa, senior-uiux · **Wave** W2
  - **Owns** `docs/design/research/gallery-usability/**`
  - _Requirements: 19.10_
  - [ ] 35.2.a 👤 Recruit five buyers — collectors, a designer, a diaspora buyer; at least one session in Indonesian
  - [ ] 35.2.b Run the journeys on staging, recording task times and success
  - [ ] 35.2.c Fix every blocker, or file it as a task, before the gate
  - [ ] 35.2.d **Check:** five buyers (collectors, a designer, a diaspora buyer; at least one in Indonesian) have run the journeys on staging with task times and success recorded, and every blocker is fixed or filed before the gate.

- [ ] **35.3 Gallery gate — with the design gate** · needs: phase 33, phase 34, 35.1, 35.2
  - **Lane** QA + UXG · **Agent** qa, senior-uiux · **Wave** W3
  - **Owns** `docs/gates/gallery.md`
  - **Read** the **Done when** of phases 33–35, DESIGN-SYSTEM.md §13
  - _Requirements: 6.1–6.12, 19.10_
  - [ ] 35.3.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 35.3.b Drive every clause of the **Done when** of phases 33–35 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/gallery.md`
  - [ ] 35.3.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 35.3.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 35.3.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 35.3.f **Check:** every clause of the **Done when** of phases 33–35 is evidenced in `docs/gates/gallery.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

---

## Phase 36 — Mapping, the loader, the item register and redirects 👤 · Migration · needs 4, 7, 10, 15 · ~2.5d

**Goal:** the curator's mapping, the idempotent loader with the owner's item register, the shop's product import, and the legacy redirects.
**Done when:** the curator has signed the maker clusters and the category → facet mapping; a local import loads every item as a draft with its images tiled off-box and the register applied (an original with no row is enquiry-only); the shop's product list imports; legacy rules redirect through the legacy handler.
**Waves:** W1 — 36.1, 36.2 · W2 — 36.3, 36.4

- [ ] **36.1 👤 Makers de-duplication and the category → facet mapping** · needs: 7.2, 8.1
  - **Lane** MIG · **Agent** medior (MIG-B) · **Wave** W1
  - **Owns** `engine/packages/migrate/src/{makers,taxonomy}/**`, `indies-gallery/content/legacy/mapping/**`
  - _Requirements: 16.3_
  - [ ] 36.1.a Maker strings clustered into makers with aliases (never auto-merged below 0.9)
  - [ ] 36.1.b `categories.json`: every legacy category id mapped to a facet selection
  - [ ] 36.1.c 👤 The curator reviews and signs both (about an hour)
  - [ ] 36.1.d **Check:** maker strings cluster into makers with aliases (never auto-merged below 0.9), `categories.json` maps every legacy category id to a facet selection, and the curator has reviewed and signed both (👤, ~1 hour).

- [ ] **36.2 Old East Indies mapping and product import** · needs: 7.3, 9.2
  - **Lane** MIG · **Agent** medior (MIG-B) · **Wave** W1
  - **Owns** `engine/packages/migrate/src/sources/csv-products/**`, `old-east-indies/content/legacy/**`
  - **Read** MIGRATION.md §10
  - _Requirements: 16.6_
  - [ ] 36.2.a mapping + CSV importer + redirects
  - [ ] 36.2.b **Check:** every Squarespace path from Search Console and the Wayback CDX index maps to a product or collection; the old gallery's "Buy Reproduction" target (one home page for every button) redirects like any other URL, since the new item pages link to exact products themselves (27.1); and the owner's product list imports through `csv-products`.

- [ ] **36.3 The loader and the item register** · needs: 9.4, phase 10, 15.1, 15.2, 36.1
  - **Lane** MIG · **Agent** senior-integrator (MIG-B) · **Wave** W2
  - **Owns** `engine/packages/migrate/src/{load,register}/**`
  - **Read** MIGRATION.md §4–5, §9, COMPLIANCE.md §1, CONTENT-MODEL.md §1, §6
  - _Requirements: 16.1, 16.4, 16.8, 19.2_
  - [ ] 36.3.a 👤 the owner's item register — location and export status per stock number (D24)
  - [ ] 36.3.b register importer with a mismatch report (unknown stock numbers, conflicting rows)
  - [ ] 36.3.c the batch loader and the off-box tiling run — the loader collects its cache tags on Payload's `req.context` and flushes them once per committed batch (`@engine/cache`), never per row
  - [ ] 36.3.d **Check:** works and products upsert idempotently by legacy id in batches of 500 with a dry-run diff, as drafts, with `publicId = legacy id` and stock numbers preserved; **the item register** sets each original's stock location and export status by stock number — an original with no row keeps both blank and publishes enquiry-only, and the report lists them; images are tiled **off-box** by `pnpm media:tile` (15.2.b) straight to the bucket, each with the **deterministic alt-text baseline** built from its record (CONTENT-MODEL.md §6) so the publish guard can pass; customers are created with a random, unusable password for the claim flow; subscribers keep recorded consent; legacy orders import read-only; wishlists become saved items or want-lists.

- [ ] **36.4 Redirects and the legacy handler** · needs: 4.1.f, 9.3, 36.1
  - **Lane** MIG + WEB · **Agent** senior-be · **Wave** W2
  - **Owns** `engine/packages/migrate/src/redirects/**`, `engine/packages/http/src/legacy/**`
  - **Read** MIGRATION.md §6, ARCHITECTURE.md §11
  - _Requirements: 6.10, 16.5_
  - [ ] 36.4.a Rules for categories and query parameters → facet URLs, static pages and `/storage/products/*.jpg`
  - [ ] 36.4.b The rules in the `redirects` collection, answered by the legacy handler at `/api/x/legacy/…` under `'use cache'` + `cacheTag`, matched on the raw path exactly as asked for, with a `Location` only from a root-relative row (`^/(?![/\\])`) — a request such as `/category/%2F%2Fevil.com` is a 404 unless a row names it (MIGRATION.md §6)
  - [ ] 36.4.c 404 for an unknown legacy path, 410 for a removed item; product URLs need no rule (33.3)
  - [ ] 36.4.d **Check:** product URLs need no rule — the item route resolves them by public id and answers a changed slug with one 308 (33.3); categories and query parameters map to facet URLs, static pages and `/storage/products/*.jpg` redirect; rules live in the `redirects` collection and are answered by the legacy handler at `/api/x/legacy/…` under `'use cache'` + `cacheTag` (the proxy only rewrites to it and never touches the database); an unknown legacy path answers 404, a removed item 410.

---

## Phase 37 — Verification, the staging rehearsal and the migration gate 👤 · Migration · needs 5, 36 · ~2d

**Goal:** the verification report, the URL gate, the rehearsal on staging, and the gate over the Migration stage.
**Done when:** a rehearsal import on staging loads every item with images tiled and no unexplained discrepancy; every original has a location and export status from the register or publishes enquiry-only; every legacy URL, counted, resolves with 200 or one permanent redirect (the legacy handler's 301, the item route's 308) to a 200; the curator has signed the mapping; a delta import is proven on a second run.
**Waves:** W1 — 37.1 · W2 — 37.2 · W3 — 37.3

- [ ] **37.1 Verification report and the URL gate** · needs: 36.3, 36.4
  - **Lane** MIG + QA · **Agent** qa · **Wave** W1
  - **Owns** `engine/packages/migrate/src/report/**`, `tests/migration/**`
  - _Requirements: 16.5_
  - [ ] 37.1.a The report: counts per legacy category vs new facets, items without images, parse failures, price parity
  - [ ] 37.1.b The URL gate: every legacy URL from the export and the URL inventory requested **against the new site on staging** — 200, or one permanent redirect to a 200: the legacy handler's 301 or the item route's 308, after at most one of Next's own 308s that only drops a trailing `/` or collapses a `//` (MIGRATION.md §6)
  - [ ] 37.1.c Zero failures before the gate
  - [ ] 37.1.d **Check:** the report shows counts per legacy category vs new facets, items without images, parse failures and price parity, and requesting **every** legacy URL against the new site on staging returns 200 or a single permanent redirect (301 or 308, after at most one normalising 308) to 200, with zero failures.

- [ ] **37.2 👤 Rehearsal on staging and the delta import** · needs: 5.1, 37.1 · 👤 the Helios go-ahead for the staging import
  - **Lane** MIG + HAR · **Agent** senior-integrator, devops · **Wave** W2
  - _Requirements: 16.7_
  - [ ] 37.2.a 👤 The owner's go-ahead for the staging import on Helios
  - [ ] 37.2.b A full rehearsal import on staging, and the report reviewed with the owner
  - [ ] 37.2.c A second run proving the delta import by `updated_at`
  - [ ] 37.2.d **Check:** a full rehearsal import runs on staging, the report is reviewed, and a delta import by `updated_at` is proven on a second run.

- [ ] **37.3 Migration gate** · needs: phase 7, phase 36, 37.1, 37.2
  - **Lane** QA · **Agent** qa · **Wave** W3
  - **Owns** `docs/gates/migration.md`
  - **Read** the **Done when** of phases 7, 36 and 37
  - _Requirements: 16.1–16.8_
  - [ ] 37.3.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 37.3.b Drive every clause of the **Done when** of phases 7, 36 and 37 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/migration.md`
  - [ ] 37.3.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 37.3.d **Check:** every clause of the **Done when** of phases 7, 36 and 37 is evidenced in `docs/gates/migration.md`, with no failure left open.

---

## Phase 38 — Editors, the timed tests and the admin gate 👤 · Admin · needs 24, 30, 33 · ~2d

**Goal:** the homepage and navigation editors, the timed tests with real staff, and the gate over the Admin stage.
**Done when:** — measured with real people — a cataloguer enters twenty works at the agreed median time with images, unaided; a shop manager turns one work into a twelve-variant giclée product with mockups in under five minutes; an accepted offer reaches the buyer as a working payment link; every custom view was opened and has the Payload sidebar.
**Waves:** W1 — 38.1 · W2 — 38.2 · W3 — 38.3

- [ ] **38.1 Homepage and navigation editors with preview** · needs: 9.3, 30.2, 33.2
  - **Lane** ADM · **Agent** senior-fe (ADM-B) · **Wave** W1
  - **Owns** `engine/packages/cms/src/admin/homepage-editor/**`
  - _Requirements: 2.3_
  - [ ] 38.1.a Band reordering and item pinning in the homepage editor
  - [ ] 38.1.b A side-by-side preview of the real page
  - [ ] 38.1.c The navigation editor, with the same preview
  - [ ] 38.1.d **Check:** reordering a band or pinning an item in the editor changes the home page after save, with a side-by-side preview of the real page.

- [ ] **38.2 👤 Timed tests with real users, and fixes** · needs: 23.3–23.5, phase 24, 38.1
  - **Lane** QA + ADM · **Agent** qa · **Wave** W2
  - _Requirements: 14.2, 14.5_
  - [ ] 38.2.a 👤 The owner's cataloguer and shop manager (named in 23.1.a) sit the timed session
  - [ ] 38.2.b Timed runs: twenty works from a drawer with images; one work → a twelve-variant giclée product with mockups; an accepted offer → a working payment link
  - [ ] 38.2.c Fix every blocker, or file it as a task
  - [ ] 38.2.d **Check:** the owner's cataloguer and shop manager complete the phase's tasks with the times recorded; every blocker found is fixed or filed as a task.

- [ ] **38.3 Admin gate — with the design gate** · needs: phase 23, phase 24, 38.1, 38.2
  - **Lane** QA + ADM · **Agent** qa, senior-uiux · **Wave** W3
  - **Owns** `docs/gates/admin.md`
  - **Read** the **Done when** of phases 23, 24 and 38, DESIGN-SYSTEM.md §13
  - _Requirements: 14.1–14.8, 19.10_
  - [ ] 38.3.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 38.3.b Drive every clause of the **Done when** of phases 23, 24 and 38 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/admin.md`
  - [ ] 38.3.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 38.3.d The design gate (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian, against the approved comp — zero P0/P1 left
  - [ ] 38.3.e 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 38.3.f **Check:** every clause of the **Done when** of phases 23, 24 and 38 is evidenced in `docs/gates/admin.md`, the design gate reports zero P0/P1, and the owner has signed off the screenshot set.

---

## Phase 39 — Metadata, JSON-LD, sitemaps and feeds 👤 · SEO and analytics · needs 30, 33 · ~2.5d

**Goal:** discoverability for both storefronts.
**Done when:** Rich Results passes for an item, a sold item, a design and a location; sitemaps validate and include sold items; the Merchant and Meta feeds validate.
**Waves:** W1 — 39.1, 39.2, 39.3 · W2 — 39.4

- [ ] **39.1 Metadata, canonicals, hreflang, OG images** · needs: 30.1, 33.1
  - **Lane** SEO (+ apps for templates) · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/seo/src/{metadata,og}/**`
  - **Read** EXPERIENCE-GALLERY.md §11, ARCHITECTURE.md §11
  - _Requirements: 17.1, 18.1_
  - [ ] 39.1.a Title and description templates per surface, the brand name from config
  - [ ] 39.1.b Canonicals and reciprocal `hreflang` (the default locale unprefixed, `/id` prefixed)
  - [ ] 39.1.c OG images per item and design, generated at request time and cached — the sheet on its mat, centred so WhatsApp's square crop never cuts it
  - [ ] 39.1.d **Check:** every surface has its templated title, description, canonical and reciprocal `hreflang` (default unprefixed + `/id`), and OG images are generated per item and design at request time with caching — **the sheet on its mat, centred so WhatsApp's square crop never cuts it**, with the stock number and title.

- [ ] **39.2 JSON-LD** · needs: 30.1, 33.1
  - **Lane** SEO · **Agent** medior · **Wave** W1
  - **Owns** `engine/packages/seo/src/jsonld/**`
  - _Requirements: 17.2_
  - [ ] 39.2.a Gallery: `Product` + `VisualArtwork` with `InStock` / `Reserved` / `SoldOut`, and no price for price-on-request
  - [ ] 39.2.b Shop: `Product` + `Offer`; `ArtGallery` / `Store` per location; `BreadcrumbList`, `FAQPage`, `Organization`
  - [ ] 39.2.c Schema-shape tests
  - [ ] 39.2.d **Check:** builders emit `Product` + `VisualArtwork` (gallery) with `InStock`/`Reserved`/`SoldOut` and no price for POR, `Product` + `Offer` (shop), `ArtGallery`/`Store` per location, `BreadcrumbList`, `FAQPage` from faq blocks and `Organization`, with schema-shape tests.

- [ ] **39.3 Sitemaps** · needs: 30.1, 33.1
  - **Lane** SEO · **Agent** medior · **Wave** W1
  - **Owns** `engine/packages/seo/src/sitemaps/**`, `engine/packages/http/src/sitemap/**`
  - _Requirements: 17.3_
  - [ ] 39.3.a Per-locale sitemaps split by type, sold items included, and an image sitemap
  - [ ] 39.3.b Regeneration on publish (by tag) and nightly
  - [ ] 39.3.c Validation in CI
  - [ ] 39.3.d **Check:** per-locale sitemaps split by type include sold items and an image sitemap, regenerate on publish and nightly, and validate.

- [ ] **39.4 👤 Google Merchant and Meta catalogue feeds** · needs: 39.2 · 👤 Merchant Center and Meta Commerce Manager access for each brand
  - **Lane** SEO · **Agent** medior · **Wave** W2
  - **Owns** `engine/packages/seo/src/feeds/**`, `engine/packages/http/src/feeds/**`
  - _Requirements: 17.4_
  - [ ] 39.4.a 👤 Merchant Center and Meta Commerce Manager access for each brand
  - [ ] 39.4.b The Google Merchant feed for both brands — honest availability, the right currency per market, a rupiah-only feed for Indonesia, enquiry-only originals left out
  - [ ] 39.4.c The Meta catalogue feed for the shop (Instagram tags, the WhatsApp catalogue), validated in the test catalogues
  - [ ] 39.4.d **Check:** both feeds validate (Merchant Center, Meta Commerce Manager test catalogues) with honest availability and the right currency per market — the Indonesian feed in rupiah only — with enquiry-only originals left out; the Meta feed can drive Instagram tags and the WhatsApp catalogue.

---

## Phase 40 — Analytics, dashboards and the SEO gate · SEO and analytics · needs 23, 28, 39 · ~2.5d

**Goal:** the event pipeline, consent-gated tags, the admin dashboards, and the gate over the SEO and analytics stage.
**Done when:** Rich Results passes for an item, a sold item, a design and a location; sitemaps validate and include sold items; the Merchant feed validates; a purchase funnel and a lead funnel from real staging sessions are visible in the dashboard; rejecting consent stops every non-essential tag.
**Waves:** W1 — 40.1 · W2 — 40.2, 40.3 · W3 — 40.4

- [ ] **40.1 Beacon, events table, rollups and instrumentation** · needs: 18.2, 28.3
  - **Lane** SEO (+ SCH lead for 40.1.a, + apps) · **Agent** senior-fe · **Wave** W1
  - **Owns** `engine/packages/analytics/src/{beacon,store,rollups}/**`, `engine/packages/http/src/collect/**`, `engine/packages/cms/src/db/analytics.ts` (40.1.a, SCH lead)
  - **Read** ANALYTICS.md, KOI docs/ANALYTICS.md
  - _Requirements: 17.5_
  - [ ] 40.1.a (SCH lead) the DDL in `db/analytics.ts`: the monthly-partitioned `analytics_events`, `ensure_partition(ts)` and `analytics_rollups`, in the wave migration
  - [ ] 40.1.b beacon, store, rollups and the instrumentation of both apps
  - [ ] 40.1.c **Check:** the batched beacon at `/api/x/collect` writes to partitioned `analytics_events` (partition ensured before insert), bots are filtered, rollups run before retention drops, domain events reach the store **only from the outbox dispatcher** (never from a request handler), and every event in C11 is emitted by both apps (a test checks names against the contract).

- [ ] **40.2 GA4 and Meta, consent-gated** · needs: 28.3, 40.1
  - **Lane** SEO · **Agent** medior · **Wave** W2
  - **Owns** `engine/packages/analytics/src/adapters/**`
  - _Requirements: 17.6_
  - [ ] 40.2.a The ANALYTICS.md §2 mapping, firing only after marketing consent
  - [ ] 40.2.b Ids from runtime brand config through `ShellVM`; purchase values in the charge currency with the order id as `transaction_id`
  - [ ] 40.2.c The analytics origins its tags need, declared in brand config for 41.1.a's CSP builder — never a CSP of its own
  - [ ] 40.2.d **Check:** the mapping in ANALYTICS.md §2 fires only after marketing consent, with the ids read from runtime brand config through `ShellVM` (no `NEXT_PUBLIC_*`); purchase values are in the charge currency with the order id as `transaction_id`; and 41.1.a's CSP allows only the configured analytics origins for them.

- [ ] **40.3 Admin dashboards** · needs: 23.2, 40.1
  - **Lane** ADM + SEO · **Agent** senior-fe · **Wave** W2
  - **Owns** `engine/packages/cms/src/admin/analytics/**`, `engine/packages/analytics/src/queries/**`
  - _Requirements: 17.7_
  - [ ] 40.3.a Queries: funnels, leads with response times, unmet demand (zero results + want-lists kept), the sold archive, payments, merchandise, field Web Vitals
  - [ ] 40.3.b Admin views per brand, inside Payload's navigation
  - [ ] 40.3.c Opened and seen with real staging sessions
  - [ ] 40.3.d **Check:** funnels, leads with response times, unmet demand (zero results + want-lists), the sold archive, payments, merchandise metrics and field Web Vitals render per brand — **opened and seen with real session data**, not only queried.

- [ ] **40.4 SEO and analytics gate** · needs: phase 39, 40.1–40.3
  - **Lane** QA · **Agent** qa · **Wave** W3
  - **Owns** `docs/gates/seo-and-analytics.md`
  - **Read** the **Done when** of phases 39 and 40
  - _Requirements: 17.1–17.7_
  - [ ] 40.4.a The full gate on merged `main`: `pnpm verify`, e2e for `indies-gallery`, `old-east-indies` and both `test` configs on a production build, Lighthouse for the stage's surfaces
  - [ ] 40.4.b Drive every clause of the **Done when** of phases 39 and 40 on a production build (on staging where it says so), with evidence per clause — a test name, a command output or a screenshot path — in `docs/gates/seo-and-analytics.md`
  - [ ] 40.4.c File every failure as a subtask of the task that owns it, and re-run the clause after the fix
  - [ ] 40.4.d **Check:** every clause of the **Done when** of phases 39 and 40 is evidenced in `docs/gates/seo-and-analytics.md`, with no failure left open.

---

## Phase 41 — Security hardening and production provisioning 👤 · Launch · needs 5, 21, 27 · ~1.5d

**Goal:** the engine-wide half of launch readiness.
**Done when:** the CSP, headers, rate limits and scanning are in place with tests and the OWASP checklist is complete; both production targets are provisioned with the owner's go-ahead, nightly dumps run, a timed restore drill is recorded and the alerts fire in a test.
**Waves:** W1 — 41.1, 41.2

- [ ] **41.1 Security hardening** · needs: phase 21, phase 27
  - **Lane** HAR + WEB · **Agent** senior-be, devops · **Wave** W1
  - **Owns** `engine/packages/http/src/security/**`
  - _Requirements: 19.5, 19.6_
  - [ ] 41.1.a The one CSP builder: per request from brand config (its payment and analytics origins, and the sister's from `sisterBaseUrl()` — the host's `SISTER_BASE_URL`, else the committed staging origin, C1), called by the proxy (3.1), which sets it on the answer and copies it onto the request (C13 `PROXY_REQUEST_HEADERS`), with a fresh nonce per request (`'nonce-…' 'strict-dynamic'`: 4.1.e found hashes cannot hold, since Next's inline scripts carry each request's RSC payload — ARCHITECTURE.md §13), and the `style-src` line decided (React renders `style` attributes, which a nonce cannot cover); security headers with tests
  - [ ] 41.1.b Rate limits (auth, forms, offers, checkout, order lookup); webhook replay protection; admin lockout
  - [ ] 41.1.c Dependency and secret scanning in CI; the OWASP Top 10 checklist
  - [ ] 41.1.d **Check:** the CSP is **built per request** from brand config by the one builder (payment-provider, analytics and sister origins only; adding a provider needs a restart, not a rebuild), the request carrying the same header the answer does, security headers ship with tests, rate limits cover auth/forms/offers/checkout/order lookup, webhook replay protection and admin lockout are tested, dependency and secret scanning run in CI, and an OWASP Top 10 checklist is complete; card data never reaches our servers.

- [ ] **41.2 👤 Production provisioning, backups, restore drill, monitoring** · needs: 5.1 · 👤 the Helios go-ahead for each target
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - _Requirements: 19.7, 19.8, 19.9_
  - [ ] 41.2.a the shop's production target
  - [ ] 41.2.b the gallery's production target — provisioned early and kept dark for 42.7
  - [ ] 41.2.c backups, the restore drill and monitoring for both — the 5xx rate sets apart, as its own series, a `500` whose path is under `^/(brand-assets|api/x)/` and contains `%` (DEPLOYMENT.md §7: Next's own answer to a path it cannot decode, ARCHITECTURE.md §13), ticketed past a rate and never paging; measured through CloudPanel's nginx, which may answer a malformed escape with its own 400 first
  - [ ] 41.2.d **Check:** both production targets are provisioned with the owner's go-ahead, nightly dumps and storage replication run, a timed restore drill of one brand is recorded, and alerts (p95, 5xx, disk 80%, restart loop, job lag, outbox lag, webhook signature failures) fire in a test, while a planted `500` on an undecodable `/brand-assets/` path lands in its own series and pages no one, and a real `500` elsewhere still pages.

---

## Phase 42 — Old East Indies: readiness, the gallery's dark import and launch 👤 · Launch · needs 29, 32, 37, 38, 40, 41 · ~4d

**Goal:** the shop fast, accessible, compliant, documented, photographed and well written — then live, with the gallery's archive imported dark behind it.
**Done when:** the shop's budgets pass on the reference devices; its accessibility audit has no open blocker; its compliance check passes with counsel's texts loaded; its staff are trained; its photography and copy meet their gates; the gallery's production archive is imported dark and feeds the shop's sister sync; `oldeastindies.com` serves the new shop and 72 hours of monitoring are reviewed.
**Waves:** W1 — 42.1, 42.2, 42.3, 42.4, 42.5, 42.6, 42.7 · W2 — 42.8 · closes **M3**

The shop launches first (D7). Every readiness task was split in two: the shop's half is
here, the gallery's half is in phase 43, so the shop never waits for the gallery's
photography or copy.

- [ ] **42.1 Performance pass on the reference devices — the shop** · needs: phase 32
  - **Lane** QA + WEB · **Agent** senior-fe · **Wave** W1
  - _Requirements: 19.1, 19.11_
  - [ ] 42.1.a The shop: lab and field budgets on home, browse, item, design and checkout on the reference devices — including a run on Telkomsel 4G in Bali and inside the Instagram and WhatsApp in-app browsers — with the per-route JS report attached, image sizes matching rendered sizes and `Save-Data` honoured
  - [ ] 42.1.b **Check:** field and lab budgets pass on home, browse, item, design and checkout for the brand on the named reference devices (DESIGN-SYSTEM.md §7), including a run on Telkomsel 4G in Bali and inside the Instagram and WhatsApp in-app browsers; the per-route JS report is attached; image sizes match rendered sizes; `Save-Data` is honoured.

- [ ] **42.2 Accessibility audit — the shop** · needs: phase 32
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W1
  - _Requirements: 19.2, 19.11_
  - [ ] 42.2.a The shop: axe plus manual keyboard, NVDA and VoiceOver, 200% zoom through its checkout, focus-not-obscured and dragging alternatives, and the in-app browsers — no open blocker
  - [ ] 42.2.b **Check:** a WCAG 2.2 AA audit of the brand — axe plus manual keyboard, NVDA/VoiceOver, 200% zoom through its checkout, focus-not-obscured and dragging alternatives, and the in-app browsers — has no open blocker.

- [ ] **42.3 👤 Compliance implementation check — the shop** · needs: phase 21, phase 29, phase 32 · 👤 counsel's texts
  - **Lane** QA + ARC · **Agent** qa · **Wave** W1
  - **Read** COMPLIANCE.md §7, §10
  - _Requirements: 8.2, 8.3, 18.3–18.7_
  - [ ] 42.3.a The shop: e2e proves the IDR-only rule and the payment caps; the seller's identity shows in the footer and on documents; counsel's bilingual legal pages are loaded; consent records, the processing-record export and data export/erasure (28.4) work
  - [ ] 42.3.b 👤 counsel's bilingual legal pages per seller; the breach-response runbook (who decides, who notifies the authority and the people affected, within what time — UU PDP) with the owner's named contacts; the data-protection officer decision
  - [ ] 42.3.c **Check:** for the brand, e2e proves the IDR-only rule, export-status gating and payment caps; seller identity shows in the footer and documents; bilingual legal pages from counsel are loaded; consent records, the processing-record export and data export/erasure work (28.4); and the breach-response runbook exists with named contacts.

- [ ] **42.4 👤 Manuals and training — the shop** · needs: phase 38
  - **Lane** DOC · **Agent** medior · **Wave** W1
  - **Owns** `manual/**`
  - _Requirements: 14.1–14.7_
  - [ ] 42.4.a 👤 The shop's guide (`manual/`), with screenshots, and a training session with the shop's staff, their questions folded back in
  - [ ] 42.4.b **Check:** `manual/user-guide.md` and `manual/cms-guide.md` (cataloguing, merch wizard, order builder, orders, offers, holds, refunds, returns, data-subject requests) exist with screenshots for the brand, and a training session has been held with its staff and their questions folded back in.

- [ ] **42.5 👤 Photography coverage gate — the shop** · needs: 6.2, phase 32
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W1
  - _Requirements: 6.12, 7.12_
  - [ ] 42.5.a 👤 The shop: every launch product with flat, in-room and detail images shot to the capture standards; synthetic mockups labelled until replaced
  - [ ] 42.5.b **Check:** every shop launch product has flat, in-room and detail images shot to the capture standards — synthetic mockups labelled until replaced.

- [ ] **42.6 👤 Full copy review in both locales — the shop** · needs: 6.3, phase 29, phase 32
  - **Lane** QA + UXG/UXE · **Agent** senior-uiux (with the native Indonesian writer) · **Wave** W1
  - _Requirements: 18.8_
  - [ ] 42.6.a 👤 The shop: every page, email, WhatsApp template and document read on staging in English and Indonesian against the lexicon and voice, with the native writer; every correction merged
  - [ ] 42.6.b **Check:** every page, email, WhatsApp template and document of the brand has been read on staging in English and Indonesian against the lexicon and voice, and every correction is merged.

- [ ] **42.7 👤 The gallery's dark production import** · needs: 27.1, 37.3, 41.2.b · 👤 the Helios go-ahead (D25)
  - **Lane** MIG + HAR · **Agent** senior-integrator, devops · **Wave** W1
  - **Read** MIGRATION.md §8 (step 0), PLAN.md (launch order), DEPLOYMENT.md §2
  - _Requirements: 15.1, 15.3, 16.7_
  - [ ] 42.7.a 👤 The owner's go-ahead for the production import on Helios (D25)
  - [ ] 42.7.b Import into the gallery's production database with no DNS — the storefront answers only on an internal hostname behind access control
  - [ ] 42.7.c The archive API serving the shop's sister sync; the shop's production target configured against it
  - [ ] 42.7.d **Check:** the gallery's **production** target is imported with no DNS and no public traffic — its storefront answers only on an internal hostname behind access control — while its archive API serves the shop's sister sync (published works only, per-market original prices); the shop's production target is configured to sync from it and its staging shows real originals from it; and the later public cutover (43.8) is only a delta import and a DNS switch on this same database.

- [ ] **42.8 👤 Old East Indies launch** · needs: 7.3, phase 27, phase 29, phase 32, 36.2, phase 38, phase 40, 41.1, 41.2.a, 41.2.c, 42.1–42.7
  - **Lane** HAR + QA + MIG · **Agent** devops, qa · **Wave** W2
  - _Requirements: 7.1–7.12, 15.3, 16.6_
  - [ ] 42.8.a 👤 The owner's go-ahead for the production deploy, and the live Midtrans and Biteship credentials in Infisical
  - [ ] 42.8.b 150–300 products published; the sister sync reading the gallery's dark production archive
  - [ ] 42.8.c 👤 The owner points `oldeastindies.com` at the new shop (their DNS); every legacy redirect live; Search Console verified
  - [ ] 42.8.d Smoke tests green; 72 hours of monitoring reviewed
  - [ ] 42.8.e **Check:** `oldeastindies.com` serves production with live Midtrans and Biteship, 150–300 products published, the sister sync reading the gallery's dark production archive, every legacy redirect live, Search Console verified, smoke tests green, and 72 hours of monitoring reviewed.

---

## Phase 43 — Indies Gallery: readiness, the content sprint and cutover 👤 · Launch · needs 35, 42 · ~4d

**Goal:** the gallery through the same readiness checks, its top items rewritten, then cut over onto the database imported dark in phase 38.
**Done when:** the gallery's budgets, accessibility audit, compliance check, training, photography and copy pass; the top 500 items have verified hook titles and alt text; `antiquemapsindonesia.com` serves the new gallery with the delta import and redirect verification at 100% and the 48-hour rollback written down — with nothing done to the old site by us.
**Waves:** W1 — 43.1, 43.2, 43.3, 43.4, 43.5, 43.6, 43.7 · W2 — 43.8 · closes **M4**

- [ ] **43.1 Performance pass on the reference devices — the gallery** · needs: phase 35
  - **Lane** QA + WEB · **Agent** senior-fe · **Wave** W1
  - _Requirements: 19.1, 19.11_
  - [ ] 43.1.a The gallery: the same on home, browse, item (the viewer loading on intent) and checkout, on the reference devices and 4G, with its per-route JS report
  - [ ] 43.1.b **Check:** field and lab budgets pass on home, browse, item, design and checkout for the brand on the named reference devices (DESIGN-SYSTEM.md §7), including a run on Telkomsel 4G in Bali and inside the Instagram and WhatsApp in-app browsers; the per-route JS report is attached; image sizes match rendered sizes; `Save-Data` is honoured.

- [ ] **43.2 Accessibility audit — the gallery** · needs: phase 35
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W1
  - _Requirements: 19.2, 19.11_
  - [ ] 43.2.a The gallery: the same audit, including the viewer's keyboard map and the purchase panel's states — no open blocker
  - [ ] 43.2.b **Check:** a WCAG 2.2 AA audit of the brand — axe plus manual keyboard, NVDA/VoiceOver, 200% zoom through its checkout, focus-not-obscured and dragging alternatives, and the in-app browsers — has no open blocker.

- [ ] **43.3 👤 Compliance implementation check — the gallery** · needs: phase 21, phase 29, phase 35, 42.3
  - **Lane** QA + ARC · **Agent** qa · **Wave** W1
  - **Read** COMPLIANCE.md §7, §10
  - _Requirements: 8.2, 8.3, 18.3–18.7_
  - [ ] 43.3.a The gallery: the same checks, plus export-status gating (a `domestic-only` original seen from abroad) and enquiry-only originals
  - [ ] 43.3.b **Check:** for the brand, e2e proves the IDR-only rule, export-status gating and payment caps; seller identity shows in the footer and documents; bilingual legal pages from counsel are loaded; consent records, the processing-record export and data export/erasure work (28.4); and the breach-response runbook exists with named contacts.

- [ ] **43.4 👤 Manuals and training — the gallery** · needs: phase 38
  - **Lane** DOC · **Agent** medior · **Wave** W1
  - **Owns** `manual/**`
  - _Requirements: 14.1–14.7_
  - [ ] 43.4.a 👤 The gallery's guide and a training session with the gallery's staff, their questions folded back in
  - [ ] 43.4.b **Check:** `manual/user-guide.md` and `manual/cms-guide.md` (cataloguing, merch wizard, order builder, orders, offers, holds, refunds, returns, data-subject requests) exist with screenshots for the brand, and a training session has been held with its staff and their questions folded back in.

- [ ] **43.5 👤 Photography coverage gate — the gallery** · needs: 6.2, phase 35
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W1
  - _Requirements: 6.12, 7.12_
  - [ ] 43.5.a 👤 The gallery: the top 200 items with at least a recto, a verso and one detail image shot to the capture standards
  - [ ] 43.5.b **Check:** the gallery's top 200 items have at least a recto, a verso and one detail image shot to the capture standards.

- [ ] **43.6 👤 Full copy review in both locales — the gallery** · needs: 6.3, phase 29, phase 35
  - **Lane** QA + UXG/UXE · **Agent** senior-uiux (with the native Indonesian writer) · **Wave** W1
  - _Requirements: 18.8_
  - [ ] 43.6.a 👤 The gallery: the same read, with the native writer; every correction merged
  - [ ] 43.6.b **Check:** every page, email, WhatsApp template and document of the brand has been read on staging in English and Indonesian against the lexicon and voice, and every correction is merged.

- [ ] **43.7 👤 Content sprint: hook titles and alt text for the top 500** · needs: 23.3, 23.5, 36.3
  - **Lane** MIG + ADM · **Agent** medior (with the owner's cataloguer) · **Wave** W1
  - **Owns** content only (through the admin) · `indies-gallery/content/legacy/sprint/**` (the tracking sheet)
  - **Read** EXPERIENCE-GALLERY.md §5 (hook titles), CONTENT-MODEL.md §6 (alt guidance)
  - _Requirements: 6.1, 19.2_
  - [ ] 43.7.a Pick the top 500 migrated items (most viewed or most valuable) and start the tracking sheet
  - [ ] 43.7.b Draft hook titles and alt text (AI drafts allowed, flagged as unverified)
  - [ ] 43.7.c 👤 The owner's cataloguer verifies each one in the admin
  - [ ] 43.7.d **Check:** the 500 most-viewed or most valuable migrated items have a human-written hook title and improved alt text (AI drafts allowed, every one verified), before the gallery's cutover.

- [ ] **43.8 👤 Indies Gallery cutover** · needs: phase 35, 37.2, 42.7, 42.8, 43.1–43.7
  - **Lane** MIG + HAR + QA · **Agent** senior-integrator, devops, qa · **Wave** W2
  - **Read** MIGRATION.md §8
  - _Requirements: 6.10, 16.5, 16.7_
  - [ ] 43.8.a T–14: the rehearsal signed off (37.2)
  - [ ] 43.8.b 👤 T–2: the owner lowers the DNS TTL to 300 s and asks their staff to stop editing the old admin from T — their action; we never log in to or change the old site
  - [ ] 43.8.c T: the owner hands over a final export; the delta import runs into the dark production database; publication and redirect verification reach 100%
  - [ ] 43.8.d 👤 T: the owner points `antiquemapsindonesia.com` (and the `indiesgallery.com` alias) at the new site; sitemaps submitted; Search Console and analytics annotated
  - [ ] 43.8.e The 48-hour rollback written down: the owner points DNS back at the old site, which was never touched; orders taken in that window exported for manual handling
  - [ ] 43.8.f **Check:** the gallery serves production on its own domain, the delta import and redirect verification are at 100%, sitemaps are submitted, and the 48-hour rollback is written down — with nothing done to the old site by us.

---

## Phase 44 — The launch gate and the 30-day iteration 👤 · Launch · needs 43 · ~1.5d

**Goal:** the gate over the Launch stage on the live sites, then the first month of design iteration.
**Done when:** both brands are live on their production domains, budgets pass in CI, the restore drill is recorded, redirect verification is 100%, photography and copy meet their gates, the design gate passes on the live sites, and someone new can catalogue a work and fulfil an order using only the CMS guide; the design KPIs have been reviewed at T+14 and T+30 and their fixes shipped.
**Waves:** W1 — 44.1 · W2 — 44.2 · closes **M5**

- [ ] **44.1 Launch gate — with the design gate** · needs: phase 41, 42.1–42.6, 42.8, 43.1–43.6, 43.8
  - **Lane** QA + UXG/UXE · **Agent** qa, senior-uiux · **Wave** W1
  - **Owns** `docs/gates/launch.md`
  - **Read** the **Done when** of phases 41–44, DESIGN-SYSTEM.md §13
  - _Requirements: 19.1–19.12_
  - [ ] 44.1.a The full gate on merged `main` and on both production sites
  - [ ] 44.1.b Every clause of the **Done when** of phases 41–44 evidenced on the **live** sites in `docs/gates/launch.md`
  - [ ] 44.1.c The design gate on the live sites (DESIGN-SYSTEM.md §13): impeccable `critique` and `audit` on real-device screenshots at 360, 390, 768 and 1440 px, in English and Indonesian — zero P0/P1 left
  - [ ] 44.1.d 👤 The owner signs off the screenshot set; recorded in `docs/design/DECISIONS.md`
  - [ ] 44.1.e **Check:** every clause of the **Done when** of phases 41–44 is evidenced in `docs/gates/launch.md`, and the design gate passes on the **live** sites with the owner's sign-off.

- [ ] **44.2 30-day design iteration** · needs: 44.1
  - **Lane** UXG + UXE + SEO · **Agent** senior-uiux · **Wave** W2
  - **Owns** `docs/design/iteration/**` (findings) — fixes are dispatched as new tasks in their lanes
  - _Requirements: 17.7, 19.10_
  - [ ] 44.2.a T+14: an impeccable `critique` session with the owner on the design KPIs — configurator completion, product page → WhatsApp, zoom engagement, filter use, zero-result rate, VA expiry rate, lead response times
  - [ ] 44.2.b T+30: the second session
  - [ ] 44.2.c The fixes dispatched as tasks in their lanes, and shipped
  - [ ] 44.2.d **Check:** design KPIs — configurator completion, product page → WhatsApp, zoom engagement, filter use, zero-result rate, VA expiry rate, lead response times — have been reviewed at T+14 and T+30 in impeccable `critique` sessions with the owner, and the fixes they produced have shipped.

---
## Backlog — v2 (after launch; not counted in the progress table)

Sequenced after launch; each becomes one or more phases, numbered after the last, when scheduled. Owners and
agents are assigned then.

- [ ] v2.1 Binding offers with a saved payment method (Stripe), deposits for reservations, instalments — _Requirements: 9.6, 9.7_
- [ ] v2.2 Catalogues as printable PDFs, generated from the web-native catalogue pages that ship at launch — _Requirements: 6.5_
- [ ] v2.3 In-room and AR views for originals and prints (the static scale view ships at launch) — _Requirements: 4.5, 7.2_
- [ ] v2.4 Map-based browse and the Archipelago Explorer with a time slider — _Requirements: 5.1_
- [ ] v2.5 Dutch and Chinese locales — _Requirements: 3.4, 18.1_
- [ ] v2.6 My Collection registry and shareable sets — _Requirements: 13.2_
- [ ] v2.7 Trade portal (shop) and designer programme (gallery) with price tiers, quotes and project boards — _Requirements: 7.8_
- [ ] v2.8 Old East Indies Singapore seller with duties-paid export and wallets — _Requirements: 2.7, 11.7_
- [ ] v2.9 The full "Print from the Archive" range and the gallery-wall builder — _Requirements: 7.7_
- [ ] v2.10 Personalised old maps of Indonesian towns — _Requirements: 7.2_
- [ ] v2.11 Loyalty and referrals; showroom visits earning points — _Requirements: 13.7_
- [ ] v2.12 A showroom till on the same stock (QRIS) — _Requirements: 9.1_
- [ ] v2.13 Marketplace sync through an omnichannel hub (Jubelio/Ginee), merchandise only — _Requirements: 3.1_
- [ ] v2.14 Georeferenced then/now overlays (Allmaps, IIIF) — _Requirements: 4.2_
- [ ] v2.15 The Parry cartobibliography online — _Requirements: 3.5_
- [ ] v2.16 A verifiable QR certificate of authenticity — _Requirements: 10.5_
- [ ] v2.17 Image licensing for institutions and publishers — _Requirements: 4.3_
- [ ] v2.18 Print-on-demand abroad: Prodigi and Gelato adapters behind the 26.3 router, switched on with `fulfilment.pod` (D23) — _Requirements: 12.4, 12.5_

---

## Dependency diagram

```mermaid
flowchart TD
    N0["1–5 Foundation → M0"]
    N1["6 Design"]:::owner
    N2["7 Migration"]:::owner
    N3["8–10 Catalogue"]
    N4["11 Design systems"]
    N5["12–14 Design"]:::owner
    N6["15–16 Media and search"]
    N7["17–21 Commerce → M2"]:::money
    N8["22 Design systems → M1"]
    N9["23–24 Admin"]
    N10["25–27 Integrations"]
    N11["28–29 Accounts"]
    N12["30–32 Shop"]
    N13["33–35 Gallery"]
    N14["36–37 Migration"]:::owner
    N15["38 Admin"]
    N16["39–40 SEO and analytics"]
    N17["41–44 Launch → M3 → M4 → M5"]:::launch
    N0 --> N1
    N0 --> N2
    N0 --> N3
    N0 --> N4
    N1 --> N5
    N3 --> N6
    N4 --> N6
    N3 --> N7
    N4 --> N8
    N5 --> N8
    N5 --> N9
    N6 --> N9
    N7 --> N9
    N7 --> N10
    N6 --> N10
    N7 --> N11
    N8 --> N11
    N6 --> N11
    N6 --> N12
    N7 --> N12
    N8 --> N12
    N6 --> N13
    N7 --> N13
    N8 --> N13
    N2 --> N14
    N6 --> N14
    N9 --> N15
    N12 --> N15
    N13 --> N15
    N12 --> N16
    N13 --> N16
    N9 --> N16
    N11 --> N16
    N10 --> N17
    N14 --> N17
    N15 --> N17
    N16 --> N17
    classDef owner fill:#d1ecf1
    classDef money fill:#f8d7da
    classDef launch fill:#d4edda
```

One box per run of phases in a stage; an arrow means the later box needs the earlier one (the running order has the exact phase needs). Blue is owner-paced (Design, Migration); red is the money-safety path that gates both storefronts' checkouts; green is launch.

---

## Log

Newest first. One line per finished task (`✅ id — what it proved`), per closed phase, and per event that changed the plan. Entries before the replan use the old ids.

- 2026-09-30 — ✅ 4.3 (87e19eb) — contracts C2, C10 and C13 at v1.3 with changelog entries (4.3.f's `Loaders.item({ locale, publicId, asked })` the one breaking-in-shape change, no consumer); every Found item of 4.1 answered in its doc; senior-fe and senior-be signed off with should-fix (`reviews/4.3-senior-{fe,be}.md`) and the fix round (04ce164, c653a63) answered all their findings; `pnpm verify` green on the merge (857 tests). **4.8 dispatched** (reads ARCHITECTURE §15, now on `main`).
- 2026-09-30 — 4.3's fix round (04ce164) answered all 39 findings of both sign-offs (27 of senior-be's, 12+ of senior-fe's, table in its report); its 56 task-text edits applied here: new **4.8** (SCH, 4·W2 — `@engine/cms/instance` and `@engine/cache`, invalidation after commit), 4.6 gains d–f (the placeholder's move, C2's shell fields, `/api/x/revalidate`) and needs 4.8; new **5.3** (PLT: `PROXY_USER_AGENT`, the not-found's 404, `publicSearch` on the item rewrite, a loopback `HOSTNAME` refused after URL-normalising) and **5.4** (HAR: the v1.3 gates — mount specifiers, the transitive Payload fence, no prefetch, one segment config, the e2e folder); 8.2, 9.1, 11.3, 18.2 need 4.8; 22.4 needs 5.3; the 308 wording in 36–37; nonces in 41.1.a; the 5xx carve-out in 41.2. The purchase panel is now awaited in the page body (buying works without JavaScript); Helios binds `HOSTNAME=localhost` with `--dns-result-order=ipv4first`, one fork-mode process behind nginx. The decision on requirement 1.3 renumbered **D44** (D41–D43 were taken by phase 7). Not yet owned: retiring the spike's routes, `engine/apps/gallery/src/item/canonical.ts` and the `pending` purchase fixture once the item route calls the loader (→ 33.3, UX to decide the fixture).
- 2026-09-30 — ✅ 4.5 (8f63ade), ✅ 4.7 (7141961) — merged to `main`, `pnpm verify` green on each merge (849 tests; `check:brands` now a verify step), CI run 36691521654 green at 8f63ade with the e2e smoke asserting live brand-asset headers on five production servers. 4.5: placeholder `logo.svg`, `favicon.ico`, `og.png`, `apple-touch-icon.png`, `site.webmanifest` per brand (own colour each), EN/ID shell copy (and `nl` for `test`), `checkCopy()` empty for every brand; on production builds all four app/brand pairs show the logo, serve each root file with its type, and show Indonesian copy on the Indonesian page, at 390 and 1280 px (16 screens; the repo smoke 40/40). At its merge the orchestrator changed `i18n/test/locales-messages.test.ts`, which asserted empty copy folders, to assert the default for a key the brand's copy lacks. 4.7: `check:client-safe` refuses bare Node built-ins and fails closed on an `import()` it cannot resolve; `check:brands` validates each committed config against its app's real `supports.ts`, and `brand:create` uses them; the root script and verify step added at merge (4.4 owned the root `package.json` this wave). Follow-ups (HAR): `check:brands` as a named step in CI's static job (replacing its "TODO 3.1" step); longer timeouts for route-parity's, client-safe's whole-repo and brand-create's CLI tests, which time out on a loaded workstation; the shared `test` logo reads "Test Storefront".
- 2026-09-30 — ✅ 4.4 (d2c5786) — the release script and CI run the real apps: CI green on `main` (run 36685866936) after a Lighthouse fix (1f50aab: `preset: mobile` is not a Lighthouse 12.6 value; the budgets had never asserted — Lighthouse 12.6 dropped `budgetsPath` — now lhci assertions; simulated throttling, as DESIGN-SYSTEM §7 says, since `devtools` measured the runner's CPU: TBT 209–236 ms vs 118–189 ms; the placeholder shell already uses ~160 of the 200 ms TBT budget). `production` pushed with the owner's go-ahead: `deploy/production-20260930T075511Z-d2c5786` published and verified (checksum OK, both subdirs with brand config and `server.js`). Helios boots it only once 5.1 provisions `uig`/`uoei` — senior-be (4.3 review #8): bind behind nginx, not a public `0.0.0.0`, one process in fork mode. The **Hermes trial is paused** by the owner (Hermes failed on a config bug before starting 4.5): 4.5 → junior, 4.7 → medior, dispatched from the same briefs. senior-be signed 4.3 off with should-fix (`reviews/4.3-senior-be.md`).
- 2026-09-30 — 4.3 reported done on `feat/p4-arc` (9055b3c; `pnpm verify` green, 818 tests): C2 and C13 at v1.3 (additive — `ShellVM.assets.touchIcon`/`.manifest`; C13's `PROXY_USER_AGENT`, `PROXY_NOT_FOUND_STATUS`, `publicSearch`, `UNBUILT_HANDLER`, `BRAND_ROOT_ASSETS`), C10 wording amended; 27 decisions recorded — http → `@engine/cms` only through a new `@engine/cms/instance` (ARCHITECTURE §15), `@engine/cache` as a leaf for `invalidate(tags)`, the proxy's own not-founds rewritten with 404 to a page that renders the designed surface (measured: works without JavaScript), the query carried as `x-public-search`, `FORM_RESULT` stays a cookie, no storefront prefetch, a live purchase-deciding availability read, `bootCheck()` refusing a loopback `HOSTNAME`, the pm2 entry in DEPLOYMENT §3. It proposes 37 board edits and new tasks **4.8** (SCH, the cms instance), **5.3** (PLT, the proxy's v1.3 answers) and **5.4** (HAR, v1.3 gates) — held until the sign-offs (senior-fe, senior-be, dispatched). For the owner: requirement 1.3's "any file under `engine/`" narrowed to source files (Markdown is documentation).
- 2026-09-30 — 4.4 merged to `main` (018790a; branch 397b58c), `pnpm verify` green on the merge (811 tests, every gate); `main` pushed to GitHub (118cfed..018790a). 4.4.a–d, g ticked: `assemble-artifact.sh` copies sharp from the pnpm store and puts the brand at `<release>/brand/site/`; `e2e.yml` starts five production servers from the release tree (`start-server.sh`, secrets and a `ci:` link ring generated per run) and runs `.github/e2e/smoke.spec.ts` × 8 projects plus `status.spec.ts` — 53 passed, 2 gated skips in a local stand-in of the job in `node:22.13.0`; Lighthouse audits real routes (9 runs, all 200, LCP 1.6–2.4 s, CLS 0); a named Client-safe gate step; `next-env.d.ts` ignored; `HOSTNAME=0.0.0.0` pinned (127.0.0.1 hangs; taking the rewrite origin from Next's URL does not help — Next renames loopback itself). The release job ran locally end to end: a 68 MB tarball whose two subdirs each boot (`/`, `/id`, `/admin/login` 200). 4.4.f waits on CI green and the `production` push. Follow-ups: `bootCheck()` refusing a loopback `HOSTNAME` (PLT, via 4.3), the pm2 entry `<current>/engine/apps/<app>/server.js` in DEPLOYMENT §3 (→ 4.3), route parity's "no app yet" skip should now fail (HAR), `E2E_EXPECT_UA_FIX`/`E2E_EXPECT_CSP` when 4.3.b/41.1.a land, health in both smokes (4.6.b).
- 2026-09-30 — ✅ 4.1, 4.2 (f82f315) — qa drove both Checks on merged `main` (evidence on 4.1.g and 4.2.c): two apps from one engine, each brand and `test` in EN and ID, one build two brands, `/admin` on two databases, the Cache Components spike confirmed and recorded in ARCHITECTURE §9, brand assets hardened, the client-safe gate over the apps. 4.1.g's health and release clauses live on in 4.6.c and 4.4.f. qa's findings: F1 a loopback `HOSTNAME` hangs every page (→ 4.4.g, before 5.1), F2 bare Node built-ins pass the client-safe gate (→ new **4.7**, HAR tooling, with 4.4.e moved there to keep 4.4 at six subtasks); low — a stale or replayed Server Action answers 500 (spike only, deleted in 33), a replaced asset keeps its old `?v=` until restart (served `max-age=300`, so never wrongly immutable), one unreproduced 30 s timeout in `status.spec.ts` (watch in 4.4.b's CI). **4·W2 dispatched.**
- 2026-09-30 — the owner gave the go-ahead to proceed with Helios: the `production` push of 4.4.f (the release Helios's poller deploys) may go once 4.4's tarball and CI are green. 5.1's provisioning stays the owner's to run (5.1.b).
- 2026-09-30 — 4.1 merged to `main` (f82f315: 8b78826 + the fix round d1daa3e); `pnpm verify` green on the merge — 811 tests, client-safe ok over the apps, route parity 41 routes, no generated drift. The fix round answered both reviews: `src/item/canonical.ts` out of the spike with `e2e/status.spec.ts` (13 pass; the CSP and no-User-Agent cases gated until 41.1.a and 4.3.b, each shown failing today); the spike behind `SPIKE_ROUTES`/`SPIKE_CONTROLS`, refused by `boot.ts` on any host not judged local, results pruned; client-hint headers only under `/admin`; a post result consumed only on a document load; `/robots.txt` `Disallow: /`; brand assets re-checked on the real path, read once from a descriptor, capped at 5 MB; the health log keeps its cause. Not fixed, routed: the result id in the URL and a stale slug's query (Next drops a rewritten request's query → 4.3.b), 4.6's queue items, the shared shell code (→ 11.3/22), `%FF` slugs (C10, 4.3.d). qa dispatched on `main`.
- 2026-09-30 — 4.1 reviewed: senior-fe and senior-be both **sign off with should-fix** (`.claude/specs/indies-platform/reviews/4.1-senior-{fe,be}.md`). senior-fe confirms the Cache Components model — `instant = false` + `htmlLimitedBots` is the only way 16.3.6 answers correct statuses, and streaming survives (first flush 36 ms with every form, the panel at 1.5 s) — at a cost to record in §9 (no prerendered shell, every prefetch a full render). senior-be found no traversal, leak or auth bypass. Fix round back to 4.1: the status checks as a Playwright spec and the canonical rule out of `spike/`; the spike's routes gated off in production (300 anonymous posts were kept forever); `Critical-CH` scoped to `/admin` (Chromium loaded every first visit twice); a prefetch no longer eating a post result; `/robots.txt` answering `Disallow: /` before staging goes public; brand-asset rules re-checked on the real path (a link inside the folder served a hidden file); the health log keeping its cause. To ARC (4.3.a–d): senior-be's case for http → `@engine/cms` and its conditions, the prefetch convention, the Suspense rule for first-flush forms, availability's `cacheLife`, the JS-off NotFound (Next's own behaviour). To 4.6.a: lag reported not gating, every queue, single-flight. 5.1.a installs the jobs crontab only after 4.6.
- 2026-09-30 — 4.1 reported **partial** on `feat/p4-web` (8b78826; `pnpm verify` green, 731 tests; client-safe over the apps ok). 4.1.a, c, d, e, f ticked. **Spike verdict: Cache Components confirmed**, with three settings the plan did not foresee — `instant = false` on the `(site)` locale layout, `htmlLimitedBots: /.*/`, and the brand read awaiting `connection()` — and **per-request nonces** for the CSP (hash + `strict-dynamic` broke hydration: the flight script's hash varies per request). `permanentRedirect()` answers 308, not 301. Both apps serve their brand and `test` in EN and ID at 390/1280 px, one gallery build two mastheads, `/admin` signed in against ig and oei with IG's credentials refused on OEI; 34 of 41 C13 mounts re-export a 404 placeholder until their lanes build them. Blocked outside its paths → new tasks: **4.3** (ARC: how `@engine/http` reaches Payload, C2 ShellVM touch icon and manifest, C13 missing `User-Agent`, placeholder-mount policy, doc sync of 4.1's eleven Found items), **4.4** (HAR: `assemble-artifact.sh` — its brand path and `sharp` copy are both wrong for the real standalone output; e2e and Lighthouse starting real servers; `next-env.d.ts`; real `supports` in `check:brands`), **4.5** (BRD: placeholder assets and shell copy — none committed), **4.6** (WEB, W3: health and jobs wired to Payload, proven with the wiring applied and reverted). 4.1.g's health clause → 4.6.c, its release clause and `production` push → 4.4.f. Reviews dispatched: senior-fe, senior-be.
- 2026-09-30 — 7.3.d merged to `main` (4a3168a, branch a2f08ba); format, lint, typecheck, file-size, brand-literals, tasks-lint and the 50 migrate tests green on the merge. Two requests, both to web.archive.org (`id_` playback of the 2024-06-24 and 2024-08-08 `/sitemap.xml`, byte-identical, 370 URLs, no children); redirects now followed by hand so every hop stays on the archive (tested). Inventory **673 paths** — by source cdx 303 · cdx|sitemap 8 · sitemap 362; by kind product 503 (225 SIRCLO + 278 Squarespace), category 125, page 11, blog 10, asset 3, system 21; MIGRATION.md §10's example path now inventoried. Supersedes the earlier "only 4 Squarespace products" finding; the SIRCLO era has no sitemap, so CDX stays its only source. Two archived Squarespace products are missing from the 2024 sitemap (one answered 404). Follow-up for 36.x: Squarespace slugs carry a `-framed` variant suffix. 7.3 stays open on OA11 alone.
- 2026-09-30 — 7.3 merged to `main` (d2a3d05, branch cffb561); the gate green on the merge (the real-stack schema-hash test timed out once at 22 s under the 7.1 agent's Docker load and passed alone in 13.5 s — a timeout to raise, HAR). 7.3.c ticked: 311 distinct paths from 1,561 Wayback captures (product 229, category 38, page 10, blog 10, asset 3, system 21), five CDX query variants agree (0 missing), every request to web.archive.org only, raw responses in `LEGACY_DATA_DIR`; the Search Console importer passes 9 tests on synthetic exports. Found: the domain ran **two** platforms before Linktree — a SIRCLO store (2020-09 → 2021-12, `/products/<slug>`, 225 paths) and Squarespace (2022-11 → 2024-09, only 4 product paths archived) — so OA11 is the main source for the Squarespace era, not a supplement (MIGRATION.md §10 to say so). 7.3.a and the Check wait on OA11; 7.3.d (the archived sitemaps) added, waiting on the owner's OK. Follow-ups: wire `legacy-urls` into `@engine/migrate` once 7.1 lands (vitest `include` must cover `src/**/*.test.mjs`); legacy prefixes `/products/`, `/our-collection/`, `/lookbook/`, `/framed-art-works`, `/mounted-art-prints` for the redirect map (36.x).
- 2026-09-30 — **phase 7 opened** (needs phase 2 ✅; open phases 4 and 7) — 7·W1 dispatched: 7.1 (senior-integrator, lane MIG-A, `feat/p7-mig-a`) and 7.3 (medior, lane MIG-B, `feat/p7-mig-b`). OA9 (the export) and OA11 (Search Console) are not in hand: the owner answered D41 (the public read may run, gently) and D42 (a mock dump until the export arrives). Added 7.1.e (the `@engine/migrate` scaffold, which no task owned) and 7.1.f (the mock dump), and 7.3.c (the CDX half now, the GSC importer ready). 7.1.a and 7.3.a stay open on the owner.
- 2026-09-30 — 4.2 merged to `main` (ae719b7, branch d8e8829); `pnpm verify` green on the merge (`check:client-safe` now a step). 4.2.a, b, d, e ticked: the walker moved to `engine/tooling/client-safe/` and refuses zod, the server entries of `@engine/config`, `node:*`, Payload and `@engine/cms`, naming the chain; planted direct, relative, workspace and dynamic-import violations fail then pass; `LOCAL_PRODUCTION_BUILD=1` on the lighthouse job; `"types": []` in the template and `["node"]` in config, cms, http, i18n — typecheck green on Windows and in `node:22.13.0`. 4.2.c waits for the apps (4.1). Found: node 22.13.0's bundled corepack fails npm's signature check (`npm i -g corepack@latest` first) — for 5.1/DEPLOYMENT. Follow-ups: a named `Client-safe gate` step in `ci.yml`'s static job (HAR); a bundle-level check for third-party deps that bundle zod or Node built-ins (after 22); consider refusing `@engine/config/link-keys` in client code.
- 2026-09-30 — **phase 4 opened** — 4·W1 dispatched: 4.1 (senior-fe, lane WEB, `feat/p4-web`) and 4.2 (medior, lane HAR, `feat/p4-har`); tasks-lint green for the wave, no shared **Owns**. The release clause of 4.1.g (a push to `production`, which Helios's poller reads) is held for the owner's OK after the merge; the agent proves the artifact locally with `assemble-artifact.sh`. Reviewer: senior-fe for 4.1.
- 2026-09-30 — ✅ **phase 3** — the config spine and the Payload boot. Each brand's config loads and a broken one is refused naming the field (3.1, qa: 16 planted breakages); `bootCheck()` refuses a missing secret, a malformed link-key ring, a sandbox key in production and a loopback production build without the opt-in (3.1, 3.4); `/admin` signed in against the ig and oei databases through a production build made with no database, and `schema-hash` is equal across all four (3.2, qa); contracts at v1.2 (3.4); the generators, migrate hook and route parity see the CMS (3.5). CI green at 58bf19f (run 36656199326), the four databases migrated on Linux and the real-database tests run there. The `/admin`-in-both-apps and `/api/health` clauses of 3.2 moved to 4.1.g. Follow-ups carried: 4.2.e (no ancestor `@types` on a workstation), 4.2.d (Lighthouse opt-in), the login rate limit (41.1, senior-db N8 and qa), a first-admin CLI or seed before a deployed database is reachable (SCH), DOM to confirm `idempotency_keys.response` nullable (17.1/18.2). The owner to check GitHub billing: run 36587076650 never started. **Phase 4 can open**; phase 6 and 7 wait on it and on OA9.
- 2026-09-30 — ✅ 3.2, 3.4, 3.5 (58bf19f) — merged at baff54b, the `URL` type fix at 58bf19f; see the phase line above.
- 2026-09-30 — 3·W2 merged (baff54b: 3.2 f26bb0b, 3.4 ce4370c, 3.5 c14070e) and pushed to GitHub with the owner's OK. qa drove every Check on `main`: 3.2, 3.4 and 3.5.d pass. CI run 36638663926: e2e green (four migrated databases, real-database tests), Static checks **red** on `@engine/ui` typecheck — `URL` has no type on Linux through `config/src/schema/primitives.ts` (lib ES2023, no Node types; a hoisted `@types/node` hides it on Windows) → back to ARC. The run before it (3200c7a) never started: GitHub reported the account's billing (payments failed or spending limit) — the owner to check. qa found: concurrent failed logins for one user sometimes answer 400 instead of 401 (Payload rewrites `sessions` delete-then-insert) — for 41.1's login rate limit.
- 2026-09-30 — 3.4 fix round (ce4370c) answered both sign-offs: a production build is judged local at a loopback `SITE_URL` only with `LOCAL_PRODUCTION_BUILD=1`; link keys base64url only, with a documented command; redaction of `/` in URL passwords, quoted and JSON pairs; `hasSurface()` gates `/account`; `SISTER_BASE_URL` per host (the committed origin is the sister's staging site); old item links with an odd slug reach the 301 by id; the versioned brand-asset URL (`?v=` sha256-8) and C1's asset-type allowlist; client-safe walker follows dynamic imports and browser conditions; CONVENTIONS §6 on preformatted prices and no routes/schema/zod in Client Components; storage wording per senior-db. Its task-text edits applied (2.2.d, 3.5.c, 4.1.a/b/e/f, 5.1.a, 9.3.b/d, 27.1.b, 36.4.b, 41.1.a); new **3.5.g** (HAR), new tasks **4.2** (the client-safe gate) and **22.7** (the configurator's selection in the URL and prices as text; phase 22 now needs 3). Requirement ids corrected on the new tasks: 4.2 → 19.1, 22.7 → 7.2, 19.1.
- 2026-09-30 — 3.2 reviewed by senior-db: **blocked** on B1 — the last-admin guard counts unlocked, so two concurrent demotions or one bulk delete left zero admins (repro on real Postgres). Should-fix: the first-user race can still make two admins; the composite primary key on `idempotency_keys` — not the stack — breaks the dev push on a second boot (→ a unique constraint, and a rule against composite keys on engine tables); `response` nullable per `LOCK_ORDER`; drafts collections need `readVersions`/`readDrafts` staff-only. Confirmed: migrations as a non-superuser, the lock race, snapshot = migration = config, `schema-hash` equal; engine tables in `public`. Back to SCH with 3.2.g; the initial migration is regenerated, not stacked (it has not shipped). Storage-contract wording → ARC. Review: `.claude/specs/indies-platform/reviews/3.2-senior-db.md`.
- 2026-09-30 — 3.4.g (db73ffe) settled 3.2's six doc conflicts: engine tables live in `public` under plain names (Payload's `migrate:fresh` drops only `public`; C5 → v1.2); every frozen slug a stub from Foundation, each in its own `collections/<slug>/` folder (new **3.2.g** for SCH); the dev loop — `db:fresh` migrates, a schema author pushes once on an empty database (`--no-migrate`); boot migrations need `NODE_ENV=production` too; one shared `payload-types.ts`; GraphQL off. Its task-text edits applied here (2.2.g, 3.2.d–f, 3.5.c, 4.1.a, 10.3.c/e, and the `engine.` prefix dropped from 9.2–40.1). Both 3.4 sign-offs (senior-be, senior-fe) are **sign off with should-fix** (`.claude/specs/indies-platform/reviews/3.4-senior-{be,fe}.md`); the fix round is with ARC — among them a production build on a loopback `SITE_URL` needing an explicit opt-in before 5.1, and old `/product/{id}-{slug}` links with non-canonical slugs still reaching the 301 by id.
- 2026-09-30 — 3.2 reported done on `feat/p3-sch` (549544b): the brand-independent Payload config (39 collections and 6 globals, stubs included, identical under every `BRAND`), users with seven roles, lockout and a race-safe first admin, `publishedOrStaff`/`staffOnly`, the initial migration with `unaccent`/`pg_trgm` and one engine table (`idempotency_keys`), migrations under `pg_advisory_lock` only with `RUN_MIGRATIONS=1`, `schema-hash` equal across the four databases; `/admin` signed in against two databases through a throwaway Next 16.3.6 production build (the two-apps and `/api/health` clauses move to 4.1.g). 3.2.a–e ticked. Its merge is blocked by a HAR test that asserted no collections exist → new task **3.5** (HAR, 3·W3, branched from `feat/p3-sch`, merged with it), which also wires the real generators into `check:generated` and the migrate hook into `db:fresh`. The doc contradictions it found → 3.4.g. Review: senior-db.
- 2026-09-30 — ✅ 3.3 (63ad811) — `brand:create` scaffolds a brand that passes `validateBrandConfig()` (an IDR market, ladder and buffer; validated before writing); `worktree:env` writes a random dev `LINK_TOKEN_KEYS` ring and never overwrites one; `.env.example` documents the ring, `LOADERS_SOURCE`, the environment rule and per-seller provider secrets; `tasks-lint` parses 🔄/⛔/✂️ suffixes (a ✂️ task stops counting; a need on a cut task is flagged); `pnpm verify` now runs every gate (CI runs them as separate steps, unaffected). The 🔄 markers go back on 3.2 and 3.4. Follow-ups: `createBrand` and `check:brands` take each app's real `supports` after 4.1.c; `wave.mjs` could enforce "every earlier wave merged".
- 2026-09-30 — ✅ 3.1 (ff71f66) — the platform spine: `loadBrandConfig()`, `validateBrandConfigs()` over every C1 rule (the rupiah rule now binds every seller reaching Indonesia), `bootCheck()` (environment read from `SITE_URL` against the brand's domains; the `LINK_TOKEN_KEYS` ring; sandbox vs live; per-seller secrets), the per-part CMS-globals seam, `@engine/i18n` (formatters pinned to `CURRENCY_EXPONENT`, plurals per locale), the rewrites-only proxy (module-off surfaces and internal paths → `/<locale>/not-found`, both CSP request headers dropped), and draft configs for all three brand folders; 360 tests, every gate green, qa drove the Check. qa's low findings (a patterned link key, two redaction gaps, loopback `SITE_URL`, the ungated `account` surface) → 3.4.f. **3·W2 dispatched:** 3.2 (SCH), 3.3 (HAR), 3.4 (ARC).
- 2026-09-30 — 3.1 reviewed: senior-be and senior-fe both **sign off with should-fix** (`.claude/specs/indies-platform/reviews/3.1-senior-{be,fe}.md`). In-scope fixes back to PLT before merge: the rupiah rule skipped `*` sellers, one bad key voided every CMS override, `javascript:` social links, a client's report-only CSP header setting the page nonce, module-off surfaces still served, the not-found target (Next's unbranded 404 under two root layouts → `/<locale>/not-found`), Indonesian plurals, and seven nits. Contract items to ARC as new task **3.4** (3·W2): a zod-free constants leaf (i18n pulls 31.9 KB gzip of zod into client bundles today), per-seller shipping providers, https-only URLs, encoded segments, icon rewrites, legacy static pages, and four doc lines.
- 2026-09-30 — 3.1 reported done on `feat/p3-plt` (e5d2db7; 337 tests, `pnpm verify` green): 3.1.a–d ticked, 3.1.e waits on merged `main`. New task **3.3** (HAR, 3·W2) from its follow-ups: `brand:create` scaffolds a config C1's rupiah rule refuses (F3), no dev `LINK_TOKEN_KEYS` ring, so a workstation fails `bootCheck()` (F5), and `tasks-lint` rejects the board's own `— 🔄` marker (found by the orchestrator; 3.1's line carries no 🔄 until 3.3.d lands, its **Now** row stands). Other follow-ups held for their lanes: `check:brands` in verify after 4.1.c (F4), docs on the environment rule and per-seller shipping secrets (ARC, F6), bootCheck and the proxy wired in 4.1 (F7), `parseLinkTokenKeys()` reused by 18.2.g (F8), provider secret names checked in 25/26 (F9), a zod-free currency/locale entry for client bundles (F10), the globals reader (F11). Found: BRANDS §4 has `fulfilment.pod` on for OEI, D23 says not at launch — the config follows D23.
- 2026-09-29 — **phase 3 opened** — 3·W1 dispatched: 3.1 (senior-be, lane PLT). 3.2 (SCH) follows in W2 once 3.1 merges. Owner items for 3.1 run on defaults: draft sellers (D1–D3), English unprefixed (D18). Phase 7 could also open (needs 2) but waits on OA9, the export of the old catalogue.
- 2026-09-29 — ✅ **phase 2** — local stack and db scripts (2.1), every gate failing on a planted violation (2.2, with 2.2.k/l), CI green on `main` and the release workflow proven on `production` (2.3), contracts v1.1 signed off (2.4). Open for the owner: 34.2.f (an anonymous proforma's hold on a unique line — ARC recommends staff approval) and the want-list suppression list after a stop (counsel, 2.4 review be F9). Follow-ups: an emailed counter-offer or viewing link has no landing page for a guest who is not signed in (ARC — a one-hop link like `ORDER_ACCESS`, before 21.1 and 28.2 dispatch); the Dependabot alerts under `@lhci/cli` (revisit at phase 4, when Lighthouse runs against real apps). Phase 3 can open.
- 2026-09-29 — ✅ 2.4 (e2e10ae) — contracts v1.1: the senior-fe should-fix rows 3–17 and D39's email want lists (2.4.a/b), the docs synced (2.4.c), and two sign-off fix passes (2.4.e/f): every emailed link derived by HMAC and never stored (`links.ts`, a pinned encoding with test vectors, a key ring with retirement and revocation, a window per purpose, lapses final), the password link a single-use nonce; `idempotency_keys` keyed by `(operation, key)` and kept 7 days; `minSessionTtl` and a 15-second attempt lease; a total `BuyerOrderStatus`; `FORM_DECODING` settled; hold and quote forms; no token in any page (type tests); one CSP owner (41.1.a). The task-text edits (2.4c/2.4e files, 100 pairs and 3 new subtasks: 18.2.g, 21.1.f, 34.2.f) applied here.
- 2026-09-29 — 2.2.l merged (follow-up to 2.2, from the 2.4.d senior-be review) — a committed test walks every C2 fixture and its streamed parts: 195 distinct Money values are safe integers of minor units and every converted estimate among 80 PriceSets is a whole major unit; planted €959.50, float, negative, unsafe and unknown-currency values fail with their path. ESLint boundary 3 ignores `view-models/test/**` only. C5 has no rule that a sole-currency price is IDR, so none is asserted.
- 2026-09-29 — ✅ 2.3 (2c4ecd9) — `main` and a new `production` branch pushed to GitHub with the owner's OK, as web-gaiada (hansel-gaiada has no write access). CI went green on the fifth run; the first four each failed a step that passes on Windows: the config and http smoke tests had no Node types on Linux (`@types/node` declared on those two packages only; every package probed with `"types": []`); brand-create's rollback fixture imported zod from the OS temp dir, which resolved only through a stray node_modules in the user folder; and the e2e job now asserts both extensions per database. 2.2.k (schema-hash test databases unique per run) merged — the one flaky test both reviewers hit. GitHub reports 5 Dependabot alerts on dev-only packages (`extract-zip`, `tmp`, `uuid`).
- 2026-09-29 — 2.3 merged (2.3.a–c) — `ci.yml` (change detection, static, unit), `e2e.yml` (a Postgres 18 service, the four databases made by the real `db:fresh` and compared by `schema-hash --all`), Lighthouse, `release.yml` (artifact and publish on `production`), `.gaiadeploy.yml` from DEPLOYMENT §3; actionlint clean. The db tooling gained a direct transport (`PGHOST`) so CI runs the same scripts as a laptop, which also fixed a CRLF bug in database listing. Build, Playwright, Lighthouse and the artifact skip with a notice until phase 4, so the tarball clause of 2.3.d moved to 4.1.g. 2.3.d waits on a push to `main` and to `production` (owner's OK).
- 2026-09-29 — 2.4.c merged — 14 docs and design.md synced to contracts v1.1, D39 and the 1.2 fix reports; the 37 task-text edits it proposed (`.claude/specs/indies-platform/reviews/2.4c-tasks-edits.md`) applied to this board, among them 29.1 now owning the want-list operations, 31.3 and 34.3 each rendering the want-list page, and the `buyerOrderStatus()` test on 19.1. Found: C6 `EnquiryTopic` still has `'wholesale'` (a D36 leftover) — back to ARC before the 2.4.d sign-off.
- 2026-09-29 — ✅ 2.2 (13a56d8) — every gate built and failing on its planted violation (file size, brand literals, schema hash against real Postgres, route parity, config drift on a fixture generator, overlapping **Owns**); `tasks:lint` parses all 160 tasks and 712 subtasks; `brand:create` scaffolds a brand that passes the C1 schema; the contract smoke tests moved into their packages (177 tests). Gates with no input yet say so and pass: route mounts until phase 4, the generators until 3.2 wires them, brand domains until 3.1 writes the configs. tasks-lint found two **Owns** defects, fixed on the board: 1.1/1.2 now say root vs per-package `package.json`; 30.4.b's configurator moves to `surfaces/configurator/**`, out of 30.3's `surfaces/item/**`.
- 2026-09-29 — ✅ 2.1 (463bd91) — `docker-compose.dev.yml` (postgres:18 with `unaccent`/`pg_trgm` in template1, Mailpit, MinIO with the four buckets), `db:fresh`/`db:drop`/`db:list` isolating each worktree's suffix, `.env.example` for DEPLOYMENT §8. The CI clause of 2.1.d moved to 2.3.d. Found: `minio/minio` no longer allows anonymous pulls, so the stack uses `bitnamilegacy/minio` (a frozen image, owner to decide); Postgres 18 mounts its volume at `/var/lib/postgresql`.
- 2026-09-29 — ✅ **phase 1** — qa on a fresh clone of `main`: `pnpm install && pnpm verify` green (11 packages, 10 tests, also with `types: []`); all 123 contract files `@contract` with an owner, CONTRACTS.md lists C1–C13, sign-offs on file for every contract (senior-be, senior-fe, senior-db — the missing senior-fe review of ARC-D ran and its two blockers were fixed, e16d73b: every write is a POST form; `CheckoutView` returns its own state); `pnpm worktree` gives distinct branch, PORT and DB_SUFFIX. Follow-ups: new task 2.4 (contract v1.1), 2.2.j (smoke tests into the gate), 4.1.e (JS-off posts). Phase 2 opened.
- 2026-09-29 — ✅ 1.2 (again, 4f105b7) — 1.2.l's D31 Partnership and retailer contracts (and D33–D40) merged from ARC-P and ARC-D after senior-be and senior-fe reviews; `pnpm verify` green on main (11 packages). Reviews: `.claude/specs/indies-platform/reviews/1.2l-*.md`. Follow-ups carried: D39's want-list contract (minor version, with its task); doc sync for "For Business"/wholesale remnants (TASKS 22.3.d, 31.1, COMMERCE §3, CONTENT-MODEL, PLAN, C6 `EnquiryTopic`), ANALYTICS §2 (`item.unsaved`), COMPLIANCE §7 (365-day application retention — counsel to confirm); C6 `api.ts` "read once" wording (ARC-D); `engine/apps/*/PRODUCT.md` brand names vs the brand-literal lint (4.1.d); the JS-off proof added to 4.1.e.
- 2026-09-28 — **Correction:** 1.2 was closed at b0fa092 with 1.2.l (D31 Partnership and retailer contracts) ticked by mistake — the orchestrator took the new 1.2.l for the old Check. 1.2 and phase 1 are reopened; 1.2.l is dispatched to ARC-P and ARC-D; 1.2.m (the Check) follows their reviews.
- 2026-09-28 — ✅ 1.3 — `pnpm worktree`/`worktree:env` give each agent its own branch, `PORT` and `DB_SUFFIX` (10 tests); the impeccable skill and agents copied from Kingdom of Indonesia; ESLint ignores `.claude/` (1.3.d). The `db:fresh`/`dev` clause of its Check moved to 2.1. Found: PARALLEL-TRACKS §3.1, CONVENTIONS §9 and DISPATCH disagree on the branch name and suffix form — the helper uses `feat/p<phase>-<lane>` and `p<phase>_<lane>`; ARC to settle.
- 2026-09-28 — ✅ 1.2 — contracts C1–C13 frozen (b0fa092): ARC-P and ARC-D, signed off by senior-be, senior-fe and senior-db (reviews and follow-ups in `.claude/specs/indies-platform/reviews/`); `pnpm verify` green on main, 11 packages. Follow-ups for later lanes are listed in the four fix/review reports (PLT `validateBrandConfigs()` rules, SCH DDL in `@engine/domain/storage`, DOM concurrency tests, doc updates). 1·W2 opened: 1.3.
- 2026-09-28 — 1.2 merged to main (b316e25): C1–C13 from ARC-P and ARC-D after senior-be, senior-fe and senior-db reviews and two fix passes each; lockfile regenerated; `pnpm verify` green (11 packages). Open: senior-db's step-0 guard/margin notes on `applyPaymentEvent()` (ARC-D), then 1.2.l. Owner to confirm the default `commerce.ttl.checkoutLockMaxHours` = 3.
- 2026-09-28 — **The owner's first design draft received** (a Claude Design export, `docs/design/input/claude-design-2026-09/`) with the client's decisions of 11 Sept 2026. Confirmed with the owner: D30 (the gallery keeps online sales), D31 (shop accounts for retailers only — new task 28.5, contract item 1.2.l), D9's shape (one shared base, distinct accents — phases 12–14 reworded). Kingdoms of Indonesia, a third site for the same client, is out of this platform's scope.
- 2026-09-28 — **Replanned: 14 phases → 44.** The old phases held ~50 subtasks each (Commerce 89) and ran across a global W1–W26 wave calendar in which one wave mixed up to five phases. Now each phase is ≤ 8 tasks and ≤ 3 waves, waves are local to their phase (`N·Wk`), a phase opens on its needs with at most three open, and stages group the phases and keep the old gates. The six launch-readiness tasks were split into the shop's half and the gallery's half, and the shop's legacy import (old 11.7) into discovery and import. No subtask or Check was dropped. Old → new:

<details><summary>Old id → new id</summary>

| Old | New |
| --- | --- |
| 0.1 | 1.1 |
| 0.2 | 2.1 |
| 0.3 | 2.2 |
| 0.4 | 2.3 |
| 0.5 | 1.2 |
| 0.6 | 3.1 |
| 0.7 | 3.2 |
| 0.8 | 4.1 |
| 0.9 | 5.1 |
| 0.10 | 1.3 |
| 0.11 | 5.2 |
| 1.1 | 6.1 |
| 1.2 | 6.2 |
| 1.3 | 6.3 |
| 1.4 | 12.1 |
| 1.5 | 12.2 |
| 1.6 | 12.3 |
| 1.7 | 13.1 |
| 1.8 | 13.2 |
| 1.9 | 14.1 |
| 1.10 | 13.3 |
| 1.11 | 14.2 |
| 2.1 | 8.1 |
| 2.2 | 8.2 |
| 2.3 | 9.1 |
| 2.4 | 9.2 |
| 2.5 | 9.3 |
| 2.6 | 9.4 |
| 2.7 | 8.3 |
| 2.8 | 10.1 |
| 2.9 | 10.2 |
| 2.10 | 10.3 |
| 2.11 | 10.4 |
| 3.1 | 11.1 |
| 3.2 | 11.2 |
| 3.3 | 22.1 |
| 3.4 | 22.2 |
| 3.5 | 22.4 |
| 3.6 | 11.3 |
| 3.7 | 22.5 |
| 3.8 | 11.4 |
| 3.9 | 22.3 |
| 3.10 | 22.6 |
| 4.1 | 15.1 |
| 4.2 | 15.2 |
| 4.3 | 15.3 |
| 4.4 | 15.4 |
| 4.5 | 16.1 |
| 4.6 | 16.2 |
| 4.7 | 16.3 |
| 4.8 | 16.4 |
| 5.1 | 17.1 |
| 5.2 | 17.2 |
| 5.3 | 17.3 |
| 5.4 | 18.1 |
| 5.5 | 18.3 |
| 5.6 | 17.4 |
| 5.7 | 20.1 |
| 5.8 | 19.1 |
| 5.9 | 19.2 |
| 5.10 | 19.3 |
| 5.11 | 20.2 |
| 5.12 | 21.1 |
| 5.13 | 20.3 |
| 5.15 | 20.4 |
| 5.16 | 20.5 |
| 5.17 | 18.2 |
| 5.18 | 19.4 |
| 5.14 | 21.2 |
| 6.1 | 33.1 |
| 6.2 | 33.2 |
| 6.3 | 33.3 |
| 6.4 | 34.1 |
| 6.5 | 33.4 |
| 6.6 | 34.2 |
| 6.7 | 34.3 |
| 6.8 | 35.1 |
| 6.9 | 35.2 |
| 6.10 | 35.3 |
| 7.1 | 30.1 |
| 7.2 | 30.2 |
| 7.3 | 30.3 |
| 7.4 | 30.4 |
| 7.5 | 31.1 |
| 7.6 | 31.2 |
| 7.7 | 32.1 |
| 7.8 | 31.3 |
| 7.9 | 32.2 |
| 7.10 | 32.3 |
| 8.0 | 23.1 |
| 8.1 | 23.2 |
| 8.2 | 23.3 |
| 8.3 | 23.4 |
| 8.4 | 23.5 |
| 8.5 | 24.1 |
| 8.6 | 24.2 |
| 8.7 | 24.3 |
| 8.8 | 24.4 |
| 8.9 | 38.1 |
| 8.10 | 38.2 |
| 8.11 | 23.6 |
| 8.13 | 24.5 |
| 8.12 | 38.3 |
| 9.1 | 25.1 |
| 9.2 | 25.2 |
| 9.3 | 25.3 |
| 9.4 | 26.1 |
| 9.5 | 26.2 |
| 9.6 | 26.3 |
| 9.7 | 27.1 |
| 9.8 | 27.2 |
| 9.9 | 27.3 |
| 10.1 | 28.1 |
| 10.2 | 28.2 |
| 10.3 | 29.1 |
| 10.4 | 29.2 |
| 10.5 | 29.3 |
| 10.6 | 28.3 |
| 10.8 | 28.4 |
| 10.7 | 29.4 |
| 11.1 | 7.1 |
| 11.2 | 7.2 |
| 11.3 | 36.1 |
| 11.4 | 36.3 |
| 11.5 | 36.4 |
| 11.6 | 37.1 |
| 11.7 | 7.3 + 36.2 |
| 11.8 | 37.2 |
| 11.9 | 37.3 |
| 11.10 | 43.7 |
| 11.11 | 42.7 |
| 12.1 | 39.1 |
| 12.2 | 39.2 |
| 12.3 | 39.3 |
| 12.4 | 39.4 |
| 12.5 | 40.1 |
| 12.6 | 40.2 |
| 12.7 | 40.3 |
| 12.8 | 40.4 |
| 13.1 | 42.1 + 43.1 |
| 13.2 | 42.2 + 43.2 |
| 13.3 | 41.1 |
| 13.4 | 42.3 + 43.3 |
| 13.5 | 41.2 |
| 13.6 | 42.4 + 43.4 |
| 13.7 | 42.8 |
| 13.8 | 43.8 |
| 13.9 | 42.5 + 43.5 |
| 13.10 | 42.6 + 43.6 |
| 13.11 | 44.1 |
| 13.12 | 44.2 |

Subtask letters are unchanged, except in the split tasks: old 13.4.c → 42.3.b, old 11.7.b/c → 36.2.a/b, and in each other split the half's subtask is `.a` and its Check `.b`. The backlog's 14.x became v2.x.

</details>

- 2026-09-28 — ✅ 0.1 — workspace, strict TS, ESLint boundaries and `pnpm verify` green on Windows + Linux; `main` pushed to `gaiadabali/antique-map` as `web-gaiada` (OA1).
- 2026-09-28 — senior-db review of ARC-D (C5–C8): **sign-off with fixes**, 3 blockers (multi-target deadlock order, isolation pinned to READ COMMITTED, applyPaymentEvent row locking) — recorded in `.claude/specs/indies-platform/reviews/0.5-arc-d-senior-db.md`, to route to ARC-D. ARC-P relaunch and senior-be review stopped on the weekly Opus limit (resets 2026-09-30 08:00 WITA).
- 2026-09-25 — `TASKS.md` created at the repo root as the progress board, from the reviewed spec: every task broken into subtasks ending in a **Check**, the dispatch plan W1–W26, the owner's decisions moved here from PLAN.md, the progress table generated by `scripts/progress.mjs`. The current live sites are out of scope: nothing in this plan touches them.
