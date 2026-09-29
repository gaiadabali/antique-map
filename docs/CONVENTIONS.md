# Conventions

This codebase will be maintained by people — and agents — who did not write it.
Optimise for the reader. Most rules here were inherited from Kingdom of Indonesia
(KOI) and NOW!, and each was written after a defect it would have prevented.

---

## 1. The two rules that make "one engine, two brands" true

### No brand literal in engine code

No file under `engine/` — packages **and** storefront apps — may contain a
brand's slug, name or domain as a literal:
`indies-gallery`, `old-east-indies`, `Indies Gallery`, `Old East Indies`,
`antiquemapsindonesia`, `oldeastindies`. Enforced by `pnpm lint:brand-literals`
in CI (the NOW! `lint:site-literals` pattern, ARCHITECTURE.md §2).

```ts
if (brand.slug === 'indies-gallery') { … }        // ✗ fails CI
if (hasModule(brand, 'purchase.offers')) { … }     // ✓ a capability, set in config (BRANDS.md §4)
if (product.inventoryModel === 'unique') { … }     // ✓ a property of the data
```

Module keys are a typed union generated from the config schema, so a misspelt
flag is a type error, not a feature silently switched off.

Every behavioural difference between the brands must be expressible as a
`brand.config.json` field, a module flag, or a property of the data. If it
cannot be, that is a design bug in the config schema, not a licence to branch.

Excluded from the scan, deliberately: `indies-gallery/**`, `old-east-indies/**`,
`test/**` (they *are* the brands), generated migrations, test fixtures that carry
real catalogue text, and `.env*` files, whose values are per-deployment data.

### The synthetic third brand runs every build

`test/` is a brand with every module its app supports switched on and a
fictional catalogue. A config names one storefront, so it has **two configs** —
`brand.gallery.json` and `brand.emporium.json`, chosen by `TEST_STOREFRONT` — and
CI runs the full e2e suite against each, on its own database. Anything implicitly
shaped like one real brand — a hard-coded currency, a route segment, a missing
module check — fails there long before it fails in production.

## 2. The 300-line rule

No source file exceeds **300 lines**. Enforced in CI (`pnpm check:filesize`) over
`*.ts`, `*.tsx`, `*.js`, `*.mjs` and `*.css` under `engine/` and `scripts/`.
Generated files (`payload-types.ts`, `importMap.js`, migrations), fixtures,
Markdown and JSON are out of scope.

It is a design rule, not a formatting rule. A file approaching 300 lines is
almost always doing two jobs. Split by _responsibility_:

- a component that fetches, transforms and renders → transform into `lib/` or a
  loader, keep the component rendering
- a Payload collection → fields in the collection file, hooks in `hooks/`,
  validation in `validators/` (pure, unit-tested)
- a checkout step → one module per state transition, the machine in its own file

Splitting a 400-line file into `foo-1.ts` and `foo-2.ts` satisfies the linter
and defeats the point. Don't.

## 3. Money is never a float

- `Money = { amount: number, currency: CurrencyCode }`, where `amount` is a
  **safe integer** of minor units — asserted with `Number.isSafeInteger` at every
  boundary (Postgres `bigint` columns are read through a guard, never as a
  string, never as a `BigInt` across the wire). Rp 1.25 billion is far inside
  the range. **The exponent is the engine's, not ISO 4217's** — read
  `CURRENCY_EXPONENT` from `@engine/config/schema`, never `@engine/domain/money`
  (which imports it and asserts against it, but never redeclares it), and never
  hard-code 100: IDR is 0 here though ISO lists two, USD/SGD/EUR/AUD/GBP are 2
  as ISO has them. A provider that counts in other units (IDR in hundredths)
  converts both ways in its own adapter — never in the domain, never twice.
  `formatMoney` (`@engine/i18n`) pins an amount's fraction digits to the
  exponent itself, never the runtime's ICU default, so the server's render and
  the browser's agree; a display **estimate** carries no fraction digits at all
  — it is a whole major unit, never charged, never summed (COMMERCE.md §3).
- **Prices are computed on the server, every time.** The browser sends product
  ids, variant ids and quantities — never a price, a total, a discount amount or
  a shipping cost (KOI `lib/commerce/pricing.ts` rule). A basket that arrives
  carrying its own prices buys nothing. The configurator may *display* a price
  looked up from a table the server sent for that destination; the bag re-prices
  on the server and shows any difference (COMMERCE.md §1).
- Order lines **snapshot** everything sold: title, chosen options with their
  labels as read, stock number, the reproduction label, an image by its C9
  asset id (never a URL a new derivative version would leave behind), unit
  price, tax and discount. An order must still read correctly after the
  product is edited or deleted.
- **Rounding happens only at the named rounding points** (COMMERCE.md §3) —
  market price point, line discount, order-discount allocation, tax per line,
  FX conversion, partial-refund allocation — each with its documented method
  (half-even, or largest-remainder so parts sum to the whole). A value rounded
  anywhere else, or rounded twice, is a reconciliation bug.

## 4. Naming

- Files and folders: `kebab-case.ts`. Components: `PascalCase` exports from
  kebab-case files.
- Booleans read as assertions: `isSold`, `hasVerso`, `canOffer`.
- Event handlers: `handleX` for the implementation, `onX` for the prop.
- No abbreviations a new reader must decode: `cartographer`, not `carto`;
  `reservation`, not `resv`.
- The domain's own words, consistently: a **work** is the object (the map, the
  print, the photograph); a **product** is what is sold; a **variant** is one
  purchasable form of a product; a **hold** is a reservation a human granted; a
  **checkout lock** is the one a checkout takes automatically. CONTENT-MODEL.md
  is the glossary.

## 5. TypeScript

Strict mode, no `any` (use `unknown` and narrow). Payload generates types —
import them, never re-declare a content shape by hand. **App components never
import Payload types**: they consume view models from `@engine/view-models`
(DESIGN-SYSTEM.md §3), so a surface can be built, tested and reviewed against a
fixture without a database. Only `@engine/loaders`, `@engine/cms` and the domain
packages touch Payload.

Domain types live beside their domain (`domain/pricing/types.ts`), not in one
`types.ts` bin.

## 6. Components

Server Components by default. `"use client"` is a deliberate act, pushed as far
down the tree as it will go — a client wrapper around a static subtree is a bug.
Only these are client-side by design: the deep-zoom viewer, the variant/frame
configurator, the cart drawer, facet panel interactions, the search box, the
consent banner, and preference toggles.

Props to a Client Component are serialised into the HTML: pass what it renders,
never a whole document or dictionary.

Every component answers one question. If its props need a comment to explain a
combination, it is two components.

## 7. Comments

Explain **why**, never what. `// loop through variants` is noise.
`// a unique item's checkout lock is taken before the payment intent — taking it
after lets two buyers pay for one map` is the comment that saves an afternoon.

Every non-obvious decision in pricing, tax, reservations, webhooks and the IIIF
pipeline gets a sentence. Those are the files where a future maintainer is least
confident and a silent wrong answer costs money.

## 8. Tests

| Kind             | Covers                                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | money & rounding, FX, tax, order state machine, reservation expiry, facet counts, gazetteer synonyms, date/dimension parsers, config validation, webhook parsing |
| Contract         | every `PaymentGateway`, `ShippingProvider` and `FulfilmentProvider` adapter against one shared contract suite + recorded sandbox fixtures                         |
| Concurrency      | two checkouts on one unique item → exactly one order; a sold item cannot be reserved again; webhook delivered twice → one payment; a crash after the dedupe insert → rollback, retry, applied once |
| Component        | interaction states, keyboard paths, reduced motion, the configurator's price/preview agreement                                                                  |
| E2E (Playwright) | per brand, desktop + mobile: browse → PDP → buy; offer → accept → pay; hold → expire; CMS publish → live; legacy URL → 301                                        |
| Visual           | each app's `/style-guide` (components, surfaces, states) at 360, 768 and 1440 px                                                                               |

The pure modules (money, tax, reservations, state machines, parsers) are
non-negotiably tested — they are where a plausible wrong answer costs a client
money or sells one map twice.

**A conditional skip is a test that disables itself precisely when the
environment drifts.** Absent sandbox credentials are a setup state and may skip;
credentials that are present and refused are a defect and must fail.

## 9. Git — one worktree per lane

Parallel agents **never share a checkout**. KOI lost a day to three sessions in
one working tree: a shared git index swept another session's half-staged work
into a commit, one `.next` was overwritten mid-e2e, and a stale dev server on
port 3000 answered for code that no longer existed.

- Every lane works in its own `git worktree` on its own `feat/<phase>-<lane>`
  branch (the Agent tool's `isolation: "worktree"` does this).
- Each worktree uses its **own local databases** (`pnpm db:fresh --suffix <lane>`)
  and its **own port** (`PORT` from `.env.local`). Never trust whatever is on
  3000.
- **Stage and commit in one step, with explicit paths**: `git commit -- <paths>`.
  Never `git add -A`.
- Trunk-based off `main`, squash merge, Conventional Commits (`feat:`, `fix:`,
  `perf:`, `docs:`, `chore:`). `production` is the deploy branch; nothing lands
  there except a merge from `main`.
- **Verify a merge in a clean worktree**, not in the tree it was built in.
- Commit messages say why. "fix cart" tells the next person nothing.

## 10. Accessibility and performance are acceptance criteria

A feature is not done if it is keyboard-inaccessible, fails WCAG 2.2 AA
contrast, ignores `prefers-reduced-motion`, or pushes a budget in
DESIGN-SYSTEM.md §7 over its limit. Not a later phase — part of "done", every
time.

## 11. Green gates can be answering a different question

KOI shipped three defects through a fully green board: an admin with no layout
stylesheet, a dashboard returning 500 on every request, and five admin views
with no navigation. Each survived build, typecheck, lint, hundreds of unit tests
and an e2e suite. **A missing stylesheet is not an error, and an unopened page
is not a failure.**

1. **Open the thing.** Before calling a screen done, load it — signed in, in a
   browser, on a phone viewport — and look at it. Not the status code. The screen.
2. **Write the test for the criterion as stated.** If the criterion is "a buyer
   can pay by QRIS", a test asserting "a payment intent row exists" passes while
   the QR code never renders.
3. **Verify against a production build** (`pnpm build && pnpm start` on your own
   port), never `next dev` — dev hides prerender and dynamic-usage failures that
   only exist in production (KOI memory: *build never touches the DB*).

## 12. The build never touches a database

The deploy artifact is built in CI with no `DATABASE_URL` and no
`PAYLOAD_SECRET`. Nothing prerenders from the CMS at build time. CI's e2e build
unsets both variables to catch regressions.

The apps run with **Cache Components** (ARCHITECTURE.md §9), which changes the
rules you may remember:

- **No route segment config** — no `export const dynamic`, `revalidate` or
  `fetchCache`; Cache Components rejects them at build. `force-dynamic` does not
  exist here.
- The `(site)` root layout awaits `connection()`, so nothing under it prerenders
  at build — that is what keeps the build away from the database.
- Anything that reads `cookies()`, `headers()`, `searchParams`, the ship-to
  market or live availability does it **inside a `<Suspense>` boundary**, so the
  cached shell streams first and the runtime part follows.
- Cacheable reads are functions marked `'use cache'` with `cacheTag(...)` and a
  `cacheLife` profile. Invalidation goes through one helper, `invalidate(tags)`,
  called from Payload `afterChange`/`afterDelete` hooks and domain events:
  editorial tags use `revalidateTag(tag, 'max')` (stale-while-revalidate);
  **availability and price tags expire immediately** (`{ expire: 0 }`), because a
  sold map must never be served as available from cache.
- If the Cache Components spike (TASKS.md 4.1) fails, the documented fallback in
  ARCHITECTURE.md §9 replaces this list — not a mixture of both.

## 13. Secrets

Never in the repo, never in a build argument, never pasted into chat or a log.
Local: `.env.local` (gitignored). Servers: Infisical → `shared/.env`. Payment and
courier keys are per brand and per environment; a sandbox key in production, or
the reverse, must fail the boot check loudly.

## 14. Documentation duties

When you change behaviour, update the doc that describes it **in the same PR**:

| Change                                  | Update                                               |
| --------------------------------------- | ---------------------------------------------------- |
| a collection or field                   | `docs/CONTENT-MODEL.md` + `manual/cms-guide.md`      |
| a checkout, pricing, tax or order rule  | `docs/COMMERCE.md`                                   |
| an interaction, page or motion          | `docs/EXPERIENCE-GALLERY.md` / `EXPERIENCE-SHOP.md`  |
| a token, block or surface contract      | `docs/DESIGN-SYSTEM.md`                              |
| a brand config field or module flag     | `docs/BRANDS.md`                                     |
| a stack or infrastructure decision      | `docs/ARCHITECTURE.md` or `docs/DEPLOYMENT.md`       |
| a new analytics event                   | `docs/ANALYTICS.md` — and never rename an existing one |
| a task's status                         | `TASKS.md` — the orchestrator ticks it and runs `node scripts/progress.mjs` |

Documentation drift is how a tidy project becomes an untrustworthy one.
