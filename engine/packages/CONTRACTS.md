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
| C1 | Brand config schema, module registry, catalogue and listing vocabularies | `@engine/config/schema` | `config/src/schema.ts`, `config/src/schema/**` | PLT (loader, `validateBrandConfigs()`, `bootCheck()`), BRD (brand folders) | every lane | v1.1 |
| C2 | Surfaces and view models, loader signatures, typed fixtures | `@engine/view-models`, `@engine/view-models/fixtures` | `view-models/src/**` (except `blocks*.ts`) | WEB (`@engine/loaders`; state fixtures, TASKS.md 11.4) | WEB, UXG, UXE, SEO, DOM, NTF | v1.1 |
| C3 | Token contract and the brand-overridable subset | `@engine/ui/tokens/contract` | `ui/src/tokens/contract.ts` | UXG, UXE (app defaults), WEB (token pipeline, TASKS.md 11.2) | UXG, UXE, BRD, ADM | v1.1 |
| C4 | Content blocks: the frozen list and prop shapes | `@engine/view-models` | `view-models/src/blocks.ts`, `blocks-check.ts` | SCH (Payload blocks), UXG and UXE (renderers) | SCH, UXG, UXE, WEB | v1.1 |
| C5 | Money: `Money`, `PriceSet`, rounding points, the pricing step | `@engine/domain/money` | `domain/src/money/contract.ts`, `domain/src/contracts/{pricing,price-sources}.ts`; shared by C5–C8: `domain/src/contracts/{scalars,type-assertions,storage}.ts` (`@engine/domain/storage`) | DOM | DOM, PAY, WEB, apps, C2 | v1.1 |
| C6 | Commerce API: requests, responses, problems | `@engine/domain/api`; values at `@engine/domain/retailers`, `@engine/domain/want-lists` | `domain/src/contracts/{api,cart,checkout,paying,orders,leads,services,after-sale,retailers,want-lists,requests,results}.ts` | DOM (handlers in `http/src/commerce/**`) | apps, WEB, C2, C13 | v1.1 |
| C7 | Provider interfaces and normalised events | `@engine/payments/contract`, `@engine/shipping/contract`, `@engine/fulfilment/contract` | `{payments,shipping,fulfilment}/src/contract.ts`, `domain/src/contracts/payment-vocabulary.ts` | PAY, LOG | PAY, LOG, DOM | v1.1 |
| C8 | State machines, `reserve()`, `applyPaymentEvent()`, domain events | `@engine/domain/machines/*`, `@engine/domain/reservations`, `@engine/domain/transactions`, `@engine/domain/events` | `domain/src/*/machine.ts`, `domain/src/reservations/contract.ts`, `domain/src/contracts/{machine-types,reservation-types,transactions,domain-events,apply-payment-event}.ts` | DOM | DOM, PAY, ADM, NTF, WEB, C2 | v1.1 |
| C9 | Media artefacts: derivatives, IIIF, masters, print files | `@engine/media/contract` | `media/src/contract.ts` | MED | MED, WEB, UXG, UXE, MIG, SIS, LOG, C11 | v1.1 |
| C10 | Route map, `href()` and its inverse | `@engine/config/routes` | `config/src/routes.ts`, `config/src/routes/**` | PLT (the proxy), WEB | PLT, WEB, UXG, UXE, SEO, NTF, MIG | v1.1 |
| C11 | Analytics events: names and props | `@engine/analytics/events` | `analytics/src/events.ts`, `analytics/src/events/**` | SEO | every surface, DOM (the outbox) | v1.1 |
| C12 | Sister archive API: work snapshot, the prints feed, webhooks both ways | `@engine/sister/contract` | `sister/src/contract.ts`, `sister/src/contract/**` | SIS | SIS, SCH, apps | v1.1 |
| C13 | HTTP handler manifest and the proxy matcher | `@engine/http/manifest` | `http/src/manifest.ts`, `http/src/manifest/**` | WEB and the handler lanes (DOM, PAY, LOG, MED, SRC, SIS, SEO) | WEB, UXG, UXE, HAR (route parity) | v1.1 |

Paths are under `engine/packages/`. The dependency order is fixed: `config` is the leaf
and imports no engine package; `domain` builds on it; the view models, the manifest and
the provider contracts import the domain's types. Nothing depends back on an app.

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
  never redeclare them. A rule that needs the app or the whole config goes into
  `validateBrandConfigs()`'s list in the schema's header. Who may hold an account, and where
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
  reads an order's C6 `BuyerOrderStatus`, never a payment's state, and a page never holds a
  lookup token. Only an approved partner signs in, so only its view model carries
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
  alone; an estimate is whole major units, and `formatMoney` fixes the fraction digits itself. A
  machine table changes only together with its tests, and nothing outside the domain writes a
  status or a reservation.
- **C9.** Keys are content-addressed and versioned. A pipeline change raises
  `DERIVATIVE_VERSION` and never overwrites a key. `masterKey()` is what C12 snapshots
  reference.
- **C10.** Segments are public URLs, and the default locale stays unprefixed. `href()` and
  `parsePublicPath()` stay inverses, so one state has one URL; a legacy prefix never shadows
  a live root segment. A surface or form kind a module switches on needs a segment only while
  its module is on, and `href()` refuses one without. No page URL carries a credential: an
  order opens with the session or the order-access cookie (C13 `ORDER_ACCESS`), never with its
  number alone, and a `sensitive` page is answered with `Referrer-Policy: no-referrer`.
- **C11.** Add events; never rename one (ANALYTICS.md). A beacon prop comes from the page's own
  view model; what only the server knows — the session, the anonymous id, the market —
  `/api/x/collect` stamps. What the business counts — revenue, leads, the want lists kept — is
  counted from the domain's events, never the beacon.
- **C12.** A snapshot or a feed carries published fields only. `physical`, costs and consignors
  never leave the origin brand. Prices travel per market, as the selling brand shows them, and
  every URL is absolute.
- **C13.** Every app mounts every route. A new route needs a mount file in both apps
  (route parity); a new C6 operation needs an address in `COMMERCE_OPERATIONS`, and an auth
  or forms operation its row in `AUTH_OPERATIONS` or `FORM_OPERATIONS`, with the module
  without which it answers 404. A write a cookie can authenticate is refused from another
  origin (`sameOrigin`); a lookupToken or a payment's scope never rides in a URL — only a
  page's own capability (a pay-link or quote token) and a one-hop email link do, and each
  one-hop link moves its token into a cookie. An HTML form post answers 303 to its page and
  its outcome waits under `FORM_RESULT`, whose cookie holds an opaque id and never personal
  data; every form post is read by `FORM_DECODING`, and an amount is never guessed at. RFC 8058's
  one-click unsubscribe is the one POST that carries its token in its URL. Auth answers every
  email alike. A provider webhook route names the seller whose secret
  verifies it. The proxy rewrites, and sets only `PROXY_REQUEST_HEADERS` and C10's
  `sensitive` answer headers.

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
