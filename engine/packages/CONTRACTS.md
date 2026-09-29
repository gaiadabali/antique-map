# Contracts — the frozen interfaces and how they change

C1–C13 are the interfaces the lanes build against in parallel (PARALLEL-TRACKS.md §4).
They were frozen by TASKS.md 1.2. After that, a contract changes only through the process
below: it is versioned, ARC approves it, and every lane that consumes it is told before it
lands. Everything else in a package belongs to the lane that implements it. The contract
files belong to ARC, even inside a folder a task owns (TASKS.md legend).

A contract file says so in its first lines — `@contract C<n> — <part> · owner: ARC` — and
each contract is one module, re-exported from the entry named below.

## The register

| # | Contract | Entry | Files | Implemented by | Consumed by | Version |
| - | -------- | ----- | ----- | -------------- | ----------- | ------- |
| C1 | Brand config schema, module registry, catalogue and listing vocabularies | `@engine/config/schema`; zod-free locales and currencies at `@engine/config/constants` | `config/src/schema.ts`, `config/src/schema/**`, `config/src/constants/**` | PLT (loader, `validateBrandConfigs()`, `bootCheck()`), BRD (brand folders) | every lane | v1.2 |
| C2 | Surfaces and view models, loader signatures, typed fixtures | `@engine/view-models`, `@engine/view-models/fixtures` | `view-models/src/**` (except `blocks*.ts`) | WEB (`@engine/loaders`; state fixtures, TASKS.md 11.4) | WEB, UXG, UXE, SEO, DOM, NTF | v1.1 |
| C3 | Token contract and the brand-overridable subset | `@engine/ui/tokens/contract` | `ui/src/tokens/contract.ts` | UXG, UXE (app defaults), WEB (token pipeline, TASKS.md 11.2) | UXG, UXE, BRD, ADM | v1.1 |
| C4 | Content blocks: the frozen list and prop shapes | `@engine/view-models` | `view-models/src/blocks.ts`, `blocks-check.ts` | SCH (Payload blocks), UXG and UXE (renderers) | SCH, UXG, UXE, WEB | v1.1 |
| C5 | Money: `Money`, `PriceSet`, rounding points, the pricing step | `@engine/domain/money` | `domain/src/money/contract.ts`, `domain/src/contracts/{pricing,price-sources}.ts`; shared by C5–C8: `domain/src/contracts/{scalars,type-assertions,storage}.ts` (`@engine/domain/storage`) | DOM | DOM, PAY, WEB, apps, C2 | v1.1 |
| C6 | Commerce API: requests, responses, problems, capability links | `@engine/domain/api`; values at `@engine/domain/retailers`, `@engine/domain/want-lists`, `@engine/domain/links` | `domain/src/contracts/{api,cart,checkout,paying,orders,leads,links,services,after-sale,retailers,want-lists,requests,results}.ts` | DOM (handlers in `http/src/commerce/**`) | apps, WEB, C2, C13 | v1.1 |
| C7 | Provider interfaces and normalised events | `@engine/payments/contract`, `@engine/shipping/contract`, `@engine/fulfilment/contract` | `{payments,shipping,fulfilment}/src/contract.ts`, `payments/src/contract/**`, `domain/src/contracts/payment-vocabulary.ts` | PAY, LOG | PAY, LOG, DOM | v1.1 |
| C8 | State machines, `reserve()`, `applyPaymentEvent()`, domain events | `@engine/domain/machines/*`, `@engine/domain/reservations`, `@engine/domain/transactions`, `@engine/domain/events` | `domain/src/*/machine.ts`, `domain/src/reservations/contract.ts`, `domain/src/contracts/{machine-types,reservation-types,transactions,domain-events,apply-payment-event}.ts` | DOM | DOM, PAY, ADM, NTF, WEB, C2 | v1.1 |
| C9 | Media artefacts: derivatives, IIIF, masters, print files | `@engine/media/contract` | `media/src/contract.ts` | MED | MED, WEB, UXG, UXE, MIG, SIS, LOG, C11 | v1.1 |
| C10 | Route map, `href()` and its inverse | `@engine/config/routes` | `config/src/routes.ts`, `config/src/routes/**` | PLT (the proxy), WEB | PLT, WEB, UXG, UXE, SEO, NTF, MIG | v1.2 |
| C11 | Analytics events: names and props | `@engine/analytics/events` | `analytics/src/events.ts`, `analytics/src/events/**` | SEO | every surface, DOM (the outbox) | v1.1 |
| C12 | Sister archive API: work snapshot, the prints feed, webhooks both ways | `@engine/sister/contract` | `sister/src/contract.ts`, `sister/src/contract/**` | SIS | SIS, SCH, apps | v1.1 |
| C13 | HTTP handler manifest and the proxy matcher | `@engine/http/manifest` | `http/src/manifest.ts`, `http/src/manifest/**` | WEB and the handler lanes (DOM, PAY, LOG, MED, SRC, SIS, SEO) | WEB, UXG, UXE, HAR (route parity) | v1.2 |

Paths are under `engine/packages/`. The dependency order is fixed: `config` is the leaf
and imports no engine package; `domain` builds on it; the view models, the manifest and
the provider contracts import the domain's types. Nothing depends back on an app. Inside
`config`, `constants` is the leaf of the leaf: it imports nothing at all, so a browser bundle
can take the locale and currency lists without the schema library.

## What counts as a change, and what it breaks

A change is **breaking** for a lane if that lane's code must change for the workspace to
compile or to behave correctly. Otherwise it is **additive**. The version says which:
additive raises the minor number, breaking raises the major. Every changelog line names
the lanes it breaks.

Some examples. A new C1 field with a default, a new module key (off unless a brand turns
it on) and a new C11 event are additive. So is a new optional field in a C2 view model for
the apps that read it, but it breaks the loaders and fixtures that must fill it. A new C4
block breaks both apps, by design, because the renderer map is exhaustive. Renaming or
removing anything, narrowing a type, making an optional field required, or adding a union
member that consumers switch over is breaking. Changing a C10 segment changes a public URL,
so it is breaking and also needs a redirect.

## How a contract changes

1. **Propose, never patch.** A lane that needs a change reports it in its task report
   (`Contracts: C2 needs <field> because …`, PARALLEL-TRACKS.md §5). It never edits a
   contract file: it stops that part of the work, or builds against the contract as it is.
2. **ARC decides.** An architect weighs the proposal against the docs of record and
   answers approve, revise or refuse, in writing. ARC then makes the change: the types,
   their type-level tests, the fixtures (C2), and the doc of record in the same change
   (CONVENTIONS.md §14).
3. **Version it.** Raise the contract's version in the register above and add a changelog
   line below: the date, the contract and version, what changed, why, and which lanes it
   breaks.
4. **Announce it.** The orchestrator tells every lane in the contract's "Consumed by"
   column before that lane's next dispatch. A breaking change lands in the same wave as
   the fixes for every lane it breaks, or it waits. It never lands in the middle of a wave
   on a lane that is building against the old shape.
5. **Prove it on the merged result.** The workspace typecheck runs every contract's own
   proofs: `blocks-check.ts`, `commerce-check.ts`, `retailer-check.ts`, the totality checks
   in `loaders.ts`, `fixtures/index.ts` and `COMMERCE_OPERATIONS`, and the domain's
   assertions. Route parity (C13), the C10 round trip (`parsePublicPath` ∘ `href` =
   identity), `validateBrandConfigs()` (C1) and the brand-literal lint must also pass. A
   contract that compiles only in its own branch is not changed.

## Rules that bind particular contracts

- **C1.** A new field or module goes into BRANDS.md (§3 or §4) in the same change, and
  every committed brand config still validates. A module flag never changes the schema,
  only visibility and access (ARCHITECTURE.md §2). Provider ids, payment-method families and
  the catalogue, listing and accounts vocabularies (`OBJECT_TYPES`, `PRODUCT_KINDS`,
  `FACET_KEYS`, `SORT_KEYS`, `RETAILER_STATUSES`, `STAFF_ROLES`) are declared here once,
  because config is the leaf and validates them; C2, C7, C8, C11 and C12 import them and
  never redeclare them. What a browser bundle may need — `LOCALE_CODES` and
  `CURRENCY_EXPONENT` — is declared in the zod-free `@engine/config/constants`, which `schema/*`
  re-exports; client code imports that entry, and nothing it holds may reach zod
  (`i18n/test/client-safe.test.ts`). A seller ships with its own subset of the brand's couriers
  (`sellers[].shipping`), resolved in the parsed config, so its secrets are its own couriers'. A
  URL a config names is https, on a domain, with no credentials; a sister's is a bare origin. A
  rule that needs the app or the whole config goes into `validateBrandConfigs()`'s list in the
  schema's header. Who may hold an account, and where
  saved items live, is modules, never a brand: `accounts.buyers` and `accounts.retailers`
  (D31, D36), `retention.wishlist` and `retention.deviceWishlist` (D35), `retention.wantList` and
  `retention.emailWantList` (D39), each app's `supports` saying which it can render. Every want
  list is sent by email and made on the want-list page, so an account's (`retention.wantList`)
  builds on an address's (`retention.emailWantList`). Only an owner-role user overrides the trade
  tiers (D33).
- **C2.** Change the view model first, the fixture second and the loader third
  (DESIGN-SYSTEM.md §3). Money is C5's `Money`, a safe integer of minor units plus a
  currency code, and a price is C5's `PriceSet`: never a float, never a preformatted
  string. What a control posts back is an intent carrying ids, choices and the opaque
  `PricingToken`, never a figure (`commerce-check.ts`). A `Streamed` part never rejects —
  a failed read resolves to its designed fallback — and a cached read returns a
  `CachedPart`, never a streamed part. A new surface needs a C10 row, a loader and a
  fixture, or the build fails. Every form works without JavaScript: what a visitor must see —
  a form, above all — is never only a streamed part, and a post's outcome is a
  `FormResultVM` read back through C13's `FORM_RESULT`. A field is data named by its request
  path and labelled by code, never an English string; a hidden field is never asked for, and
  a tick box posts `'true'` (`commerce-check.ts`). What such a visitor must act on beyond a form
  — a post's outcome, the list an email's link opened — is resolved, never streamed. A buyer
  reads an order's C6 `BuyerOrderStatus`, never a payment's state. A page holds no token but a
  capability page's own address (C13: a pay link's, a quote's): no intent or poll carries a
  lookup token, a want list's, or — on the order page — a pay link's, and a signed-in page acts
  by its session (`_NoTokenInAPagePoll`, `_NoTokenInAPageStop`, `_NoPayLinkTokenInTheOrderPoll`,
  `_NoLookupTokenInThePayPoll`, `_NoTokenInTheAccountsOffers`, `_NoTokenInTheAccountsViewings`).
  A post the operation refuses comes back as `FormResultVM` `refused`, with its problem's
  sentence.
  Only an approved partner signs in, so only its view model carries
  trade terms or a reorder, and the Partnership page holds no term or price in any state
  (`retailer-check.ts`, D31–D36).
- **C3.** A new token needs a value in both apps (`AppTokens` is total) and its contrast
  pairings. The contract is a floor: an app's own tokens are named `--app-…`, and the shared
  primitives read contract tokens only. The overridable subset lives in C1 and grows only
  through ARC.
- **C4.** A new block needs a Payload block (SCH) and a renderer in both apps, in one
  change.
- **C5–C8.** The money rules of CONVENTIONS.md §3 hold. The exponent is the engine's
  (`CURRENCY_EXPONENT`, IDR 0), and a provider's other units are converted in its C7 adapter
  alone, never rounding — a figure that is no whole minor unit is `InexactMoney`, flagged, never
  paid; an estimate is whole major units, and `formatMoney` fixes the fraction digits itself. A
  machine table changes only together with its tests, and nothing outside the domain writes a
  status or a reservation. Every token an email or a page's address carries is a derived
  capability link (C6 `links`: an HMAC of the record's `ref` and `token_version`, fixed byte for
  byte with known answers), stored nowhere and never in an outbox row (C8 `IsPiiFree` refuses a
  credential's name) — a set-password link, single-use and hashed, alone excepted. Its keys are one
  ring per brand and environment, and a leaked one is revoked at once; a link to a page that shows
  personal data works for its purpose's window, and a lapse is final.
- **C9.** Keys are content-addressed and versioned. A pipeline change raises
  `DERIVATIVE_VERSION` and never overwrites a key. `masterKey()` is what C12 snapshots
  reference.
- **C10.** Segments are public URLs, and the default locale stays unprefixed. `href()` and
  `parsePublicPath()` stay inverses, so one state has one URL: a segment is read only in the
  spelling `href()` writes (`encodeURIComponent`), never another percent-encoding of it and
  never with a `/` inside, so a path element `href()` is given holds no `/`. An old site's URL is a
  legacy prefix or an exact legacy path, and neither shadows a live root segment; a page kept at
  its old address is live and listed in neither. A surface or form kind a module switches on
  needs a segment only while its module is on, and `href()` refuses one without; the account
  area is on while either account module is (`hasSurface()`), and keeps its segment regardless. No page URL carries a credential: an
  order opens with the session or the order-access cookie (C13 `ORDER_ACCESS`), never with its
  number alone, and a `sensitive` page is answered with `Referrer-Policy: no-referrer`. A page
  that takes a subject takes one (`wantList`: `watch` or `like`), so one subject has one URL, and
  every write a page offers has a form kind or a surface that posts it. A signed-in page names a
  record by its id, read by the session (`form`'s `appointment`), never by a token.
- **C11.** Add events; never rename one (ANALYTICS.md). A beacon prop comes from the page's own
  view model; what only the server knows — the session, the anonymous id, the market —
  `/api/x/collect` stamps. What the business counts — revenue, leads, the want lists kept — is
  counted from the domain's events, never the beacon.
- **C12.** A snapshot or a feed carries published fields only. `physical`, costs and consignors
  never leave the origin brand. Prices travel per market, as the selling brand shows them, and
  every URL is absolute. A copy only moves forward, part by part (a work's fields, its original's
  listing, the feed): what is no newer than it holds is acknowledged and dropped.
- **C13.** Every app mounts every route. A new route needs a mount file in both apps
  (route parity); a new C6 operation needs an address in `COMMERCE_OPERATIONS`, and an auth
  or forms operation its row in `AUTH_OPERATIONS` or `FORM_OPERATIONS`, with the module
  without which it answers 404. A write a cookie can authenticate is refused from another
  origin (`sameOrigin`); a lookupToken or a payment's scope never rides in a URL — only a
  page's own capability (a pay-link or quote token) and a one-hop email link do, and each
  one-hop link moves its token into a cookie. An HTML form post answers 303 to its page and
  its outcome waits under `FORM_RESULT`, whose cookie holds an opaque id and never personal
  data; every form post is read by `FORM_DECODING`, driven by its operation's schema, and an
  amount is never guessed at. RFC 8058's one-click unsubscribe is the one POST that carries its
  token in its URL, on `ONE_CLICK_UNSUBSCRIBE`'s terms: that token alone, no cookie read, 200.
  Auth answers every email alike. A provider webhook route names the seller whose secret
  verifies it. A file a browser asks for at the root — robots, sitemaps, `.well-known`, the
  favicon, the touch icons, the web manifest — is a `ROOT_REWRITES` row to an engine route,
  never the designed not-found page. The proxy rewrites, and sets only
  `PROXY_REQUEST_HEADERS`, C10's `sensitive` answer headers and the per-request
  `Content-Security-Policy`, which one builder makes (41.1.a) and the proxy copies onto the
  request too, where Next looks for a nonce. An account's offer or viewing is answered by its
  session, and its `.ics` served by session.

## Changelog

- **2026-09-28**: v1.0 of C1–C13 frozen by TASKS.md 1.2, after the senior-be and senior-fe
  reviews of both halves (`.claude/specs/indies-platform/reviews/1.2-*.md`) were applied.
  ARC-P froze C1–C4, C9, C10 and C13; ARC-D froze C5–C8, C11 and C12. Nothing breaks:
  nothing consumes them yet.
- **2026-09-28**: C1, C2, C10 and C13 gain the shop's Partnership surface and retailer
  accounts (TASKS.md 1.2.l, D31, D32) before the freeze closes, beside ARC-D's C5 trade tier,
  C6 `retailer.apply`, C8 retailer machine and C11 events: the `accounts.buyers` and
  `accounts.retailers` modules, `RETAILER_STATUSES` and `commerce.trade` (C1); the
  `partnership` surface and the `quotes` and `terms` account sections (C10); the `retailers`
  area, `retailer.apply`'s address and `APPLICATION_ACCESS` (C13); and `PartnershipVM`, the
  retailer's standing, trade terms, quotes and reorder, a quote's trade terms, hidden form
  fields, the header's account entry and the hero's highlight (C2). An order row now says
  whether it may offer a reorder (`OrderSummaryVM<null>` everywhere but an approved
  retailer's area). No lane consumes them yet.
- **2026-09-29**: both halves of 1.2.l take the owner's D33–D36 and the senior-fe and
  senior-be reviews (`reviews/1.2l-*.md`), and land together.
  - **C1:**
    - `RETAILER_STATUSES` gains `ended` (D34): an ended partnership is deactivated.
    - `STAFF_ROLES` is new.
    - `commerce.trade` moves to `schema/trade.ts`, with `maxDiscountBps` and `waiver`. Only an
      owner-role user overrides its tiers, every change audited (D33).
    - `retention.deviceWishlist` is new (D35). `retention.wishlist` is the account's, with
      `accounts.buyers`.
    - `services.wholesale` goes (D36: every business buyer applies as a partner).
    - `validateBrandConfigs()` gains its wishlist, trade-currency and segment rules.
  - **C10:**
    - the `wishlist` surface;
    - the `setPassword` and `reset` account sections;
    - no `wholesale` form;
    - a module's surfaces need a segment only while the module is on.
  - **C13:**
    - split into `manifest/{types,commerce,auth,forms}.ts`;
    - `AUTH_OPERATIONS`, with `register` only with `accounts.buyers`;
    - `APPLICATION_ACCESS` specified, and `PASSWORD_LINK`;
    - `FORM_RESULT`, the rule for posts without JavaScript;
    - `FORM_OPERATIONS` (`wishlist.set`) and `DEVICE_WISHLIST`;
    - `quote.reorder`'s address, and `customer` on `quotes`.
  - **C2:**
    - the Partnership page's forms are cached (`visitor`), and its streamed states are
      separate kinds (`received`, `applyFailed`, `signInFailed`, `applied`, `declined`,
      `retailer`), with one application for every business;
    - fields are a union (entry, tick box, hidden) with `group`, `inputMode`, `requiredWhen`
      and coded options;
    - `FormResultVM`, which `FormVM.result` now streams;
    - the account's `SetPasswordVM` and `ResetRequestVM`;
    - only an approved partner signs in;
    - the reorder is `{ fromOrder }`;
    - a partner's quote brief;
    - `QuoteTradeVM.minimumWaiver`;
    - `WishlistVM`, and the shell's saved-items entry.
  - **ARC-D:**
    - C5 `TradeMinimumWaiver` and fail-closed tier resolution;
    - C6 `quote.reorder`, and the `minimumWaived` → `minimumWaiver` rename on `QuoteTradeView`;
    - C6 one programme's shop types and application limits;
    - C8 `ended` with `change-tier`, and sign-in refusal;
    - C11 `item.unsaved` and `retailer.reapplied`.

  No lane consumes them yet.
- **2026-09-29**: the senior-fe review of ARC-D (`reviews/1.2-arc-d-senior-fe.md`, blockers 1–2),
  within v1.0 before Phase 1 closes. **C13:** every operation a page calls is a GET or a POST
  (`FormMethod`), so `shipTo.set`, `cart.updateLine`, `cart.removeLine`, `cart.removeCode`,
  `cart.setGiftOptions` and `appointment.change` are POSTs at their own sub-paths, answered 303
  under `FORM_RESULT` without JavaScript. **C6:** `CheckoutView` carries its own state
  (`contact.values`, `delivery.chosen`, `shipping.selectedOptionId` with `shippingOptions` →
  `shipping.options`, `payment`, `codes`) and is answered only to the checkout's owner. **C2:**
  `CheckoutVM.delivery.chosen` is C6's `ChosenDelivery`. No lane consumes them yet.
- **2026-09-29**: **v1.1 of C1–C13** (TASKS.md 2.4.a, 2.4.b): the should-fix rows 3–17 of the
  senior-fe review of the domain contracts (`reviews/1.2-arc-d-senior-fe.md`), and the owner's D39
  (the shop's want list, by email, no account). Every contract is now v1.1; C3, C4 and C9 change
  no shape. C2, C6, C11 and C12 remove or reshape fields, but no lane has built on them yet
  (phase 1 built none), so by the definition above nothing breaks and each is a minor version.
  The register now names every contract file.
  - **C1:**
    - `retention.emailWantList`, a want list held by an email address with no account (D39);
      `retention.wantList`, the account's, now needs it and `accounts.buyers`
      (`validateBrandConfigs()`), and the emporium's `supports` omit it;
    - `PurchaseBand`, what `item.viewed` reports instead of an amount;
    - `CURRENCY_EXPONENT` is the engine's: IDR 0, where ISO 4217 lists 2.
  - **C5:** a provider's other units are its adapter's to convert; an estimate is whole major units;
    `formatMoney` fixes the fraction digits and never takes ICU's (row 6).
  - **C6:**
    - `checkout.ts` splits into `checkout`, `paying` and `orders`;
    - `OrderedLineView` snapshots the product, variant, options and their labels, stock number,
      reproduction label and a C9 image ref in place of `imageUrl` (row 3);
    - `QuoteView.buyer` (row 4);
    - `PaymentOptionView.family`, `.presentation` and `.sessionTtl`, and
      `PaymentStarted.dailyCapWarning` (row 5);
    - `BuyerOrderStatus` on every buyer-facing order and on the poll, which loses its raw
      `payment`: no payment state, and so no dispute, reaches a buyer (row 10);
    - `FieldError` gains `limit` and `out-of-range`, and a rule across fields reports on a field
      the form has; the order lookup's form posts the request's own names (rows 9, 15);
    - an idempotency key is minted per render, never inside `'use cache'`, and bound to its caller
      (row 8); the offer's bid posts as major units (row 7); `CartLineView.maxQuantity` (row 17);
    - `wantList.subscribe`, `wantList.confirm` and `wantList.unsubscribe` (`want-lists.ts`): double
      opt-in, confirmed by a POST on the page the email links to, erased when stopped (D39);
    - `api.ts` says what C13's `FORM_RESULT` does: an answer is deleted once shown, never on first
      read.
  - **C7:** `MethodCapability.presentation`, the session kind C6 tells the buyer before they choose.
  - **C8:** `wantList.requested`, `.repeated`, `.started` and `.stopped`, with typed facts that name
    no one, and the `want-list` aggregate; `idempotency_keys` binds a key to its caller.
  - **C10:** the `wantList` surface (module `retention.emailWantList`), with `watch` or `like`.
  - **C11:**
    - split into the beacon, the domain's events and the GA4 and Meta mapping;
    - the page sends only what it knows: `item.viewed`'s band and status come from the purchase
      panel, `sister.clicked`'s work from the link, `payment.failed`'s class from the retry state;
    - `/api/x/collect` stamps the session, the anonymous id and the market (rows 11, 12);
    - leads and kept want lists are counted from the domain (row 12);
    - `item.zoomed.imageRole` is C9's, so analytics declares `@engine/media` as a type-only
      devDependency; `cart.added.value` is the cart's own line subtotal; a tag converts by the
      exponent (rows 6, 17).
  - **C12:** split into the snapshot, the listings both ways and the transport; per-market prices;
    images as C9's ladder at absolute URLs; how an original's listing becomes the sister link
    (row 13); the prints feed from the outlet back to the origin, by webhook and reconcile (row 14).
  - **C13:** `FORM_DECODING`, one decoder for every form post (rows 7, 8); the `want-lists` area,
    its three addresses and `WANT_LIST_ACCESS` (D39).
  - **C2:**
    - `OrderSummaryVM`, `OrderVM` and `CheckoutVM` read `BuyerOrderStatus`; `OrderVM.conversion`,
      only on a paid order's confirmation (rows 10, 12);
    - the order lookup's `form` is a `FormPostVM`, with an `invalid` result (row 9);
    - `PurchaseVM.analytics`, `SisterLinkVM.workUid`, a payment failure's method and C7 class
      (row 11); `QuoteVM.buyer` is C6's (row 4);
    - a conflict's alternatives resolve with it (row 16), and `PaymentPollVM` keeps a lookup token
      out of the page;
    - the want-list page: `WantListPageVM`, `WantListFormVM`, and `WantListVM`, moved from the
      account, with a stop intent in place of a GET link carrying a token and the frequencies of
      requirement 13.3; its loader and fixtures; every alert link leads there (D39).
  - **D36 leftovers, found by 2.4.c:** C6 `EnquiryTopic` loses `wholesale` — every business buyer
    applies as a partner, so no enquiry topic stands in for the programme (proved by
    `_NoBusinessTopic`), and CONTENT-MODEL.md §4 says the same. Where `accounts.retailers` is on,
    only an approved partner requests a quote: a guest's `quote.request` is `not-offered` there,
    and C2's "Turn this into a quote" is a signed-in partner's alone. C11's
    `retailerApplication.submitted` is the one application, and `whatsapp.clicked`'s `business`
    context is the Partnership page.

  Announced to every lane in each contract's "Consumed by" column; none consumes them yet.
- **2026-09-29**: **v1.1 sign-off fixes** (TASKS.md 2.4.e): the senior-be and senior-fe
  sign-offs of v1.1 (`reviews/2.4-senior-be.md`, `reviews/2.4-senior-fe.md`), both blockers and
  every should-fix, amended into v1.1 rather than bumped: v1.1 was not yet signed, and no lane
  consumes it.
  - **Capability links (senior-be B1).** The new `domain/src/contracts/links.ts` (C6). Every
    token an email or a page's address carries is derived: an HMAC of the record's `ref` and
    `token_version` under `LINK_TOKEN_KEYS`, stored nowhere. NTF derives each email's token as it
    sends it, so the outbox carries none; C8's `IsPiiFree` now refuses a credential's name
    (`_TokenRejected`). This settles the want list's token, `APPLICATION_ACCESS`, the
    newsletter's, the order-access link and C6's record tokens alike. `PASSWORD_LINK` stays a
    single-use nonce kept as a hash, because it sets a credential. The reasoning (derived rather
    than a token table) is in `links.ts`. `storage.ts` gives every such record `ref` and
    `token_version`.
  - **C2 (senior-fe B1):** `WantListVM.stop` excludes a token (`_NoTokenInAPageStop`).
  - **C6:**
    - `idempotency_keys` keys on `(operation, key)`, with the caller and the request's hash
      compared on a conflict; kept 7 days (`IDEMPOTENCY_KEY_RETENTION`), no token in a stored
      answer (be S1, S2).
    - A session is never cut below its method's floor, answering `window-too-short` (be S3).
    - A payment attempt has a lease (`PAYMENT_ATTEMPT_LEASE`), and a retry inside it waits (be S4).
    - `BuyerOrderStatus` is a total table, with `ShipmentOnItsWay`, `ShipmentAtPickup` and
      `ShipmentNotYetGone` partitioning `ShipmentStatus` (be S5, fe S2).
    - `WANT_LIST_PENDING_PER_ADDRESS` (be S8).
    - `quote.proforma` is the checkout's ("Proforma instead"), and stays open to any buyer
      (fe F1, be N6).
    - A signed-in buyer's contact is ignored (be N4).
  - **C7:**
    - `MethodCapability.minSessionTtl` (be S3).
    - Every `Money` across an adapter is in C5's units, and a figure that is no whole minor unit
      is `InexactMoney`, flagged by `applyPaymentEvent()` (be S6).
    - The providerEventId rules move to `payments/src/contract/event-ids.ts`, and state hashes
      read raw figures.
  - **C8:**
    - The order machine's fulfilment rows cover a digital gift card.
    - `DomainSweeps.idempotencyKeys` deletes keys past their retention (be S2).
  - **C10:**
    - `FORM_KINDS` gains `hold` (posting `hold.request`) and `quote` (posting `quote.request`;
      D36's audience), and forms take a `variant` (fe F1).
    - `wantList` takes one subject, and two answer `notFound` (fe S6).
    - The round-trip test covers both new kinds, a variant and two subjects, and pins the literal
      links C2's fixtures spell out (view-models may not import `href()`).
  - **C13:**
    - `ONE_CLICK_UNSUBSCRIBE` states the RFC 8058 exemption exactly (be S7, fe S5).
    - `FORM_DECODING` is schema-driven, with five ambiguities settled and the money grammar
      pinned (fe S3, be N1, fe N6).
    - The proxy's headers include the CSP (fe S8).
  - **C2:**
    - `FormResultVM` gains `refused`, though the Partnership page never refuses (fe S4).
    - The conversion comes from the loader after a poll, with Meta's `eventID` (fe S7).
    - A checkout's `intents.proforma` (fe F1).
    - Appointment slots are resolved, never streamed.
    - `OptionLabelVM.axis` may be `null` (fe N1).
    - Fixtures:
      - €960, not €959.50 (be S9);
      - a guest's quote link is `null`, with a partner's variant (be S10, fe S1);
      - the hold and quote pages replace `/enquire?…topic=hold` and `/trade` (fe F1);
      - every want-list result (fe N5).
  - **C11:** `quote.requested` among the lead records, and `wantList.started`'s vocabulary mapped
    (be N3, N2).
  - **C12:** a copy only moves forward, and an FX refresh stamps `asOf` (be S11); `http://` only
    in development (be N5, fe N2).
  - The v1.1 entry's "no C10 segment remained" was the route map's truth, not the fixtures'
    (be S10).
  - **The confirmation round (TASKS.md 2.4.f).** senior-be signed off with follow-ups, and
    senior-fe was blocked on B2 alone.
    - **C2 (senior-fe B2):** `PayVM.intents.poll` is scoped to its own link, and `PaymentPollVM`
      drops `pay-link` (`_NoLookupTokenInThePayPoll`, `_NoPayLinkTokenInTheOrderPoll`); the
      fixtures already complied. The all-VM probe for credential names now finds only a page's
      own capability, the pricing-token brand, Stripe's `clientSecret`, citation `ref`s and the
      consent policy's version.
    - **C6 `links` (senior-be F10):**
      - The token's grammar and the MAC input's bytes are pinned, with `LINK_TOKEN_VECTORS`.
      - `LINK_TOKEN_KEYS` entries carry a retirement day or `revoked`, in one ring per brand and
        environment.
      - The blast-radius sentence names every action a forged link can take.
      - `LINK_WINDOW_DAYS` bounds every purpose whose page shows personal data, enquiries and
        consignments included, from `links_anchor_at`, and a lapse is final;
        `LINK_TOKEN.orderDays` becomes `LINK_WINDOW_DAYS.order`.
    - **C6, C2, C10, C13 (senior-fe F6):** `offer.respond` and `appointment.change` take
      `OfferAccess` and `AppointmentAccess` — the session and the record's id, or an email's
      token. The account's offers and viewings act by session (`_NoTokenInTheAccountsOffers`,
      `_NoTokenInTheAccountsViewings`), a `form` names the viewing it reschedules by
      `appointment`, the account's `.ics` is served by session, and a guest's
      `AppointmentView.icsUrl` is `null`.
    - **C13 (senior-fe F7):** `PROXY_REQUEST_HEADERS` gains `contentSecurityPolicy`, the answer's
      CSP copied onto the request, where Next looks for a nonce; 41.1.a owns the CSP.
    - **C6, C13 (senior-be F13):** `quote.proforma`'s checkout id is bound to the cart cookie or
      the session; how an anonymous proforma may hold a unique line is the owner's open decision
      (COMMERCE.md §7).
    - **Also:**
      - The payment start's store and void are compare-and-set under the attempt's lock
        (be F11).
      - A sister copy keeps one watermark per part (be F12).
      - A `collected` pickup is not "ready for pickup" (fe N7).
      - The `proforma` action promises a proforma staff issue, never an instant PDF (fe N8).
      - `maxFields` refuses before decoding.
- **2026-09-30**: **v1.2 of C1, C10 and C13** (TASKS.md 3.4): the contract follow-ups of the 3.1
  reviews (`reviews/3.1-senior-{be,fe}.md`) and of 3.1's qa. Each change is additive, or narrows
  only what no committed config and no lane uses, so each is a minor version and nothing breaks:
  the synthetic brand's two configs gain the sister their `sister.links` now needs, in the same
  change. C2–C9, C11 and C12 stay at v1.1.
  - **C1:**
    - `@engine/config/constants`, a zod-free leaf: `LOCALE_CODES`, `LocaleCode`,
      `CURRENCY_EXPONENT`, `CurrencyCode` and `CURRENCY_CODES`, which `schema/*` re-exports and
      builds its enums on. `@engine/i18n` imports it, so `import { formatMoney } from
      '@engine/i18n'` bundles to 1.2 KB minified, 0.7 KB gzip, with no zod — it was 110 KB and
      31.5 KB (fe #1).
    - `sellers[].shipping`: the couriers a seller ships with — its own accounts, so its own
      secrets — each one of the brand's `shipping.providers`, and all of them when it names none.
      `brandConfigSchema` resolves it, so every parsed `SellerConfig` carries its list;
      `SellerConfigInput` is the form a file writes. The schema is now a zod pipe rather than an
      object, which no lane reads the shape of (be #2). The gallery's Singapore seller names its
      couriers — DHL Express, quote and collect, a draft value (D1) the owner confirms — so it
      boots without an Indonesian courier's secrets.
    - `identity.social` takes https URLs on a domain name, never `javascript:`, http or an
      address with credentials; `sisters[].baseUrl` is an https origin, with no path and no
      trailing `/` (be #4). `httpsUrlSchema` and `httpsOriginSchema` are the primitives.
    - `validateBrandConfigs()` gains three rules: `sister.links` needs a sister; every derived
      currency needs its `fx.bufferPct`, `"0"` for none; a seller's couriers are the brand's, none
      listed twice (be #9, #2).
  - **C10:**
    - A segment is read only in the spelling `href()` writes: one that does not survive
      decode-then-encode, or decodes to a `/`, is `notFound` (`/pr%6Fduct/1706`, fe #13).
    - `routes.legacyPaths`: an old site's exact paths — a static page that moved — rewritten to
      `/api/x/legacy/…` like a prefix. Neither shape shadows a live root segment, and a path under
      a prefix, or listed twice, is refused. MIGRATION.md §6 records the decision (the fe review's
      follow-up on legacy static pages).
    - The `account` surface is on while `accounts.buyers` or `accounts.retailers` is
      (`anyModule`, `hasSurface()`), and its segment stays required (qa). The proxy's module gate
      reads `module` alone, so the area stays open as in v1.1 until PLT adopts `hasSurface()`.
    - `parse.ts` splits into `query`, `segments` and `legacy`; `decodeSegments()`,
      `legacyTarget()` and `hasSurface()` are exported.
  - **C13:** `ROOT_REWRITES` gains `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png`
    → the brand's `apple-touch-icon.png`, and `/site.webmanifest` → its `site.webmanifest`, both
    under `/brand-assets/`, so neither reaches the designed not-found page and its loader (fe #12).
    A root file keeps an unversioned public URL, so the brand-assets route never serves one
    `immutable`.
  - **Also, in PLT's closed files (3.4.b, 3.4.f):** `bootCheck()` asks a seller for its own
    couriers' secrets only; a `LINK_TOKEN_KEYS` secret with eight bytes stepping by one constant,
    or a block repeated, is refused (qa); a production build at a loopback `SITE_URL` is judged
    local by decision, and its report says so, while `0.0.0.0` is loopback no longer (be #5, qa);
    `redactCredentials()` also hides a `password=` query parameter and a libpq `password=` pair
    (qa). The docs follow: BRANDS.md §3–4, PAYMENTS.md §8, DEPLOYMENT.md §8, MIGRATION.md §6 and
    CONVENTIONS.md §3, §6.

  Announced to every lane in each contract's "Consumed by" column. The follow-ups it hands other
  lanes are in 3.4's report: PLT's proxy reads `hasSurface()`; SCH's pages validator refuses a
  CMS slug that is a one-segment legacy path; BRD ships the touch icon and the manifest; WEB
  serves the root files unversioned.
