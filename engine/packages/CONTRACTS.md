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
| C1 | Brand config schema, module registry, catalogue and listing vocabularies | `@engine/config/schema` | `config/src/schema.ts`, `config/src/schema/**` | PLT (loader, `validateBrandConfigs()`, `bootCheck()`), BRD (brand folders) | every lane | v1.0 |
| C2 | Surfaces and view models, loader signatures, typed fixtures | `@engine/view-models`, `@engine/view-models/fixtures` | `view-models/src/**` (except `blocks*.ts`) | WEB (`@engine/loaders`; state fixtures, TASKS.md 11.4) | WEB, UXG, UXE, SEO, DOM, NTF | v1.0 |
| C3 | Token contract and the brand-overridable subset | `@engine/ui/tokens/contract` | `ui/src/tokens/contract.ts` | UXG, UXE (app defaults), WEB (token pipeline, TASKS.md 11.2) | UXG, UXE, BRD, ADM | v1.0 |
| C4 | Content blocks: the frozen list and prop shapes | `@engine/view-models` | `view-models/src/blocks.ts`, `blocks-check.ts` | SCH (Payload blocks), UXG and UXE (renderers) | SCH, UXG, UXE, WEB | v1.0 |
| C5 | Money: `Money`, `PriceSet`, rounding points, the pricing step | `@engine/domain/money` | `domain/src/money/contract.ts`, `domain/src/contracts/{pricing,scalars,type-assertions}.ts` | DOM | DOM, PAY, WEB, apps, C2 | v1.0 |
| C6 | Commerce API: requests, responses, problems | `@engine/domain/api` | `domain/src/contracts/{api,cart,checkout,leads,services,after-sale,requests,results}.ts` | DOM (handlers in `http/src/commerce/**`) | apps, WEB, C2, C13 | v1.0 |
| C7 | Provider interfaces and normalised events | `@engine/payments/contract`, `@engine/shipping/contract`, `@engine/fulfilment/contract` | `{payments,shipping,fulfilment}/src/contract.ts`, `domain/src/contracts/payment-vocabulary.ts` | PAY, LOG | PAY, LOG, DOM | v1.0 |
| C8 | State machines, `reserve()`, `applyPaymentEvent()`, domain events | `@engine/domain/machines/*`, `@engine/domain/reservations`, `@engine/domain/events` | `domain/src/*/machine.ts`, `domain/src/reservations/contract.ts`, `domain/src/contracts/{machine-types,domain-events,apply-payment-event}.ts` | DOM | DOM, PAY, ADM, NTF, WEB, C2 | v1.0 |
| C9 | Media artefacts: derivatives, IIIF, masters, print files | `@engine/media/contract` | `media/src/contract.ts` | MED | MED, WEB, UXG, UXE, MIG, SIS, LOG | v1.0 |
| C10 | Route map, `href()` and its inverse | `@engine/config/routes` | `config/src/routes.ts`, `config/src/routes/**` | PLT (the proxy), WEB | PLT, WEB, UXG, UXE, SEO, NTF, MIG | v1.0 |
| C11 | Analytics events: names and props | `@engine/analytics/events` | `analytics/src/events.ts` | SEO | every surface, DOM (the outbox) | v1.0 |
| C12 | Sister archive API: work snapshot and webhook events | `@engine/sister/contract` | `sister/src/contract.ts` | SIS | SIS, SCH, apps | v1.0 |
| C13 | HTTP handler manifest and the proxy matcher | `@engine/http/manifest` | `http/src/manifest.ts` | WEB and the handler lanes (DOM, PAY, LOG, MED, SRC, SIS, SEO) | WEB, UXG, UXE, HAR (route parity) | v1.0 |

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
  (D31, D36), `retention.wishlist` and `retention.deviceWishlist` (D35), each app's `supports`
  saying which it can render. Only an owner-role user overrides the trade tiers (D33).
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
  a tick box posts `'true'` (`commerce-check.ts`). Only an approved partner signs in, so only
  its view model carries trade terms or a reorder, and the Partnership page holds no term or
  price in any state (`retailer-check.ts`, D31–D36).
- **C3.** A new token needs a value in both apps (`AppTokens` is total) and its contrast
  pairings. The contract is a floor: an app's own tokens are named `--app-…`, and the shared
  primitives read contract tokens only. The overridable subset lives in C1 and grows only
  through ARC.
- **C4.** A new block needs a Payload block (SCH) and a renderer in both apps, in one
  change.
- **C5–C8.** The money rules of CONVENTIONS.md §3 hold. A machine table changes only
  together with its tests, and nothing outside the domain writes a status or a reservation.
- **C9.** Keys are content-addressed and versioned. A pipeline change raises
  `DERIVATIVE_VERSION` and never overwrites a key. `masterKey()` is what C12 snapshots
  reference.
- **C10.** Segments are public URLs, and the default locale stays unprefixed. `href()` and
  `parsePublicPath()` stay inverses, so one state has one URL; a legacy prefix never shadows
  a live root segment. A surface or form kind a module switches on needs a segment only while
  its module is on, and `href()` refuses one without. No page URL carries a credential: an
  order opens with the session or the order-access cookie (C13 `ORDER_ACCESS`), never with its
  number alone, and a `sensitive` page is answered with `Referrer-Policy: no-referrer`.
- **C11.** Add events; never rename one (ANALYTICS.md).
- **C12.** A snapshot carries published fields only. `physical`, costs and consignors
  never leave the origin brand.
- **C13.** Every app mounts every route. A new route needs a mount file in both apps
  (route parity); a new C6 operation needs an address in `COMMERCE_OPERATIONS`, and an auth
  or forms operation its row in `AUTH_OPERATIONS` or `FORM_OPERATIONS`, with the module
  without which it answers 404. A write a cookie can authenticate is refused from another
  origin (`sameOrigin`); a lookupToken or a payment's scope never rides in a URL — only a
  page's own capability (a pay-link or quote token) and a one-hop email link do, and each
  one-hop link moves its token into a cookie. An HTML form post answers 303 to its page and
  its outcome waits under `FORM_RESULT`, whose cookie holds an opaque id and never personal
  data. Auth answers every email alike. A provider webhook route names the seller whose secret
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
