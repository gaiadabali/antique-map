# Conventions

**Purpose:** how code is written here, for the people and agents who maintain it without having written it. Most
rules were learned on earlier projects (KOI, NOW!) from a defect each would have prevented. The architecture they
serve is [ARCHITECTURE.md](ARCHITECTURE.md); how work is dispatched and reported is [WORKFLOW.md](WORKFLOW.md).

## 1. TypeScript

- **Strict**, as `tsconfig.base.json` sets it: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noImplicitReturns`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`. No `any`: take `unknown` and narrow.
- ESM only. Named exports, except where a framework requires a default (Next's pages and layouts, the Payload
  config).
- Payload generates the content types (`payload-types.ts`): import them, never re-declare a content shape by hand.
  Pages and components never see them; they take view models (§4).
- Types live beside their domain (`cms/src/commerce/order-status.ts`), not in one `types.ts` bin.

## 2. The 300-line rule

No source file exceeds **300 lines**: `*.ts`, `*.tsx`, `*.js`, `*.mjs` and `*.css` under `engine/` and
`scripts/`, checked by `pnpm check:filesize`. Generated files, migrations and fixtures are out of scope; docs keep
to the same limit by habit.

It is a design rule, not a formatting rule: a file nearing 300 lines is almost always doing two jobs. Split by
responsibility — a component that fetches, shapes and renders puts the shaping in a loader; a collection keeps its
fields in its file, its hooks in `hooks/` and its validators in `validators/` (pure, unit-tested); an order's
steps are one module per transition. Splitting `foo.ts` into `foo-1.ts` and `foo-2.ts` satisfies the check and
defeats it. Don't.

## 3. Naming and the domain's words

- Files and folders `kebab-case.ts`; components `PascalCase` exports from kebab-case files. Booleans read as
  assertions (`isSold`, `hasVariants`); handlers are `handleX`, the prop `onX`. No abbreviation a reader must
  decode: `cartographer`, not `carto`.
- **The domain's words, exactly** — [CONTENT-MODEL.md](CONTENT-MODEL.md) is the glossary. An antique is a `works`
  record (the admin says *Antiques*); a product is what the shop sells and a variant one form of it; a store is a
  physical shop; a lead is a person the owner should talk to; a partner is a reseller's record. Order statuses
  are COMMERCE.md §7's (`pending_payment` … `delivered`, `cancelled`, `expired`).
- The sites are `gallery` and `shop`; the roles `owner`, `editor`, `store`. New code never says "brand",
  "emporium", "seller", "reservation" or "offer": those belong to the archived plan.

## 4. Boundaries: pages, loaders, view models

- **Components render view models** (`src/view-models`), built and reviewed against fixtures with no database;
  they never import Payload, `@engine/cms` or `src/server/**`. A page or layout calls its loaders and passes the
  view models down.
- **Loaders are the only readers a page has** (`src/server/loaders`): the Local API with `overrideAccess: false`,
  `_status: 'published'`, the site's filter and a `select` of exactly the fields the view model shows. They return
  view models, cached by tag (ARCHITECTURE.md §6). A field marked *staff* in CONTENT-MODEL.md is never selected;
  `works.askingPrice` never leaves the owner's admin.
- **Every module in `src/server/` starts with `import 'server-only'`**, so a Client Component that reaches one
  fails the build; Vitest aliases it to an empty module. `@engine/cms` does not import it — the Payload CLI loads
  cms in plain Node, where `server-only` throws — and ESLint keeps cms out of client modules instead.
- **Server Components by default.** `'use client'` is a deliberate act, pushed as far down the tree as it goes;
  a client wrapper around a static subtree is a bug. Client-side by design: the viewer, the chat panel, the map
  pin, the facet sheet, the bag's quantity control, the language banner.
- **A Client Component gets what it renders**, never a whole document. Money, dates and dimensions arrive
  formatted by the server (the browser's ICU differs from Node's); links arrive built by `href()`; a listing's
  state comes from the page's server-side `searchParams`, never `useSearchParams()`, which sees the public URL.
- Each component answers one question. If its props need a comment to explain a combination, it is two.

## 5. Money

- Money is a **safe integer of minor units** (`Number.isSafeInteger`, asserted at every boundary); for rupiah the
  minor unit is one rupiah (`95000` is Rp 95.000; the IDR exponent is 0 in `@engine/config`, whatever ISO says).
  Never a float; a `bigint` column is read through a guard.
- **Priced on the server, every time.** A request carries ids and quantities; a price, total, fee or discount
  in it is never read as one (SECURITY.md P1–P2). The page may display a price the server sent; the server
  prices again.
- **Rounding happens once**, where COMMERCE.md §2 names it. Order lines snapshot name, variant, SKU, unit price
  and image, so an order reads correctly after its product changes.
- `formatMoney` pins the fraction digits to the currency's exponent. The gallery shows no price anywhere: no price
  in a work's view model, an event, structured data or an AI tool's result (DR-3).

## 6. Copy and languages

- **Keys in code, values in files.** Each site's interface strings are lexicon keys with neutral defaults, one
  module per area (`src/sites/<site>/lexicon/`); their values live in `en` and `id` files beside them. Marketing
  text (headings, page bodies, home bands) lives in the CMS. A component never holds a word.
- **Every key has both values**, with the same `{placeholders}`: `checkCopy()` runs in `pnpm test` and fails on
  a missing value, an unknown key or a placeholder mismatch.
- **No figure typed into copy**: prices, dates, counts, hours and numbers are placeholders filled from data or
  `site-settings`. A promise the data does not hold is not shown.
- British spelling; Indonesian in the *Anda* register, never *kamu*; sentence case; controls name their outcome
  ("Ask on WhatsApp", "Pay Rp 185.000"), never "Submit". Each site's voice is `docs/design/gallery/voice.md` and
  `docs/design/emporium/voice.md`; the shared rules are DESIGN-SYSTEM.md §11.
- The admin is bilingual too (G15): every collection, field, option and validation message carries an `en` and
  an `id` label.

## 7. Errors, messages and logs

- **Expected failures are values** (`{ ok: false, reason }`): a short line, a refused code, an out-of-area pin.
  Exceptions are for the unexpected, and a route turns them into a designed error with a reference id.
- **A message names the field and the fix** (requirement 10.1): "Add a WhatsApp number or an email so we can
  reply", not "Invalid input". A hook throws Payload's `ValidationError` with the field's path, so the admin
  marks the field.
- **A visitor never sees a stack trace**, an internal id or a framework's error page: every error state is
  designed (EXPERIENCE-GALLERY.md §9, EXPERIENCE-SHOP.md).
- **Logs are structured and carry no personal data**: no request bodies from checkout, leads, the chat or the
  webhook; phones, emails, addresses and tokens redacted by the logger (SECURITY.md §2.13).

## 8. Forms and validation

- **One zod schema per form or route body**, used by the server as the authority. The browser gets its
  constraints from that schema as HTML attributes (`required`, `maxlength`, `type`, `inputmode`, `pattern`): zod
  never ships to a client bundle.
- **A form works without JavaScript**: it posts, answers 303 to its page and shows the result in the page body,
  keeping every value on an error (ARCHITECTURE.md §7).
- Unknown fields are refused, not ignored; every string has a maximum length; phones normalise to E.164; a submit
  a double tap could repeat carries an idempotency key (SECURITY.md §2.7).

## 9. Comments

Explain **why**, never what. `// loop through lines` is noise. `// stock is taken at order creation, not at
payment — taking it later lets two buyers pay for the last unit` saves an afternoon. Every non-obvious decision in
pricing, stock, webhooks, access, cache invalidation and the AI's guards gets a sentence: those are the files where
a maintainer is least sure and a plausible wrong answer costs money.

## 10. Tests

| Kind | Covers | Runs |
| --- | --- | --- |
| Unit (Vitest) | money, totals, delivery fee, discounts, `assignStore`, the status machine, tokens, parsers and normalisers, import rows, the AI's output checks, redaction, copy completeness | every push |
| Integration (`*.db.test.ts`, Postgres 18) | the access matrix and store scoping, published-only reads, the decrement under 50 parallel orders, webhook idempotency, import idempotency, the migration's triggers | CI; a workstation with `CMS_TEST_POSTGRES_URL` |
| End to end (Playwright, production build, both hosts, 390 and 1280 px) | browse → item → ask; bag → checkout → simulator → paid → tracking; store staff's steps; each role's admin; 404, 308 and 301 statuses; forms with JavaScript off; axe | every pull request |
| AI evaluation | mocked on every pull request, the real model on change (AI.md §6) | as stated |
| Lighthouse | the budgets of DESIGN-SYSTEM.md §9 | every pull request |

- **Write the test for the criterion as stated.** If the criterion is "a buyer can pay by QRIS", a test that an
  order row exists passes while the QR code never renders.
- **A conditional skip is a test that switches itself off exactly when the environment drifts.** A missing
  sandbox key is a setup state and may skip; a present key that is refused is a defect and fails.
- **Open the thing.** Green gates can answer a different question: KOI shipped an admin with no stylesheet and a
  dashboard failing every request through a fully green board. Before calling a screen done, load it on a
  production build (`next build && next start`, `LOCAL_PRODUCTION_BUILD=1`, your own port), signed in, at 390 px,
  and look at it. `next dev` hides prerender and request-time failures that only a production build has.

## 11. Accessibility and performance

A feature is not done if it fails WCAG 2.2 AA, cannot be used by keyboard alone, ignores
`prefers-reduced-motion`, or pushes a page over its budget (DESIGN-SYSTEM.md §9–§10). Not a later pass: part of
"done", every time.

## 12. The build never touches a database

The artifact is built with no `DATABASE_URL` and no `PAYLOAD_SECRET`, and CI proves it by pointing `DATABASE_URL`
and `PGHOST` at a port that refuses every connection: an *unset* `DATABASE_URL` proves nothing, since `pg` falls
back to `PGHOST` and then `localhost:5432`, a workstation's own Postgres. What that asks of code:

- **One route segment config**: `export const instant = false` on each site's root `[locale]` layout, nothing else
  anywhere — no `dynamic`, `revalidate`, `fetchCache`, `prefetch`, `runtime` or `maxDuration`. ESLint holds it.
- **A `GET` handler reads its request first** (`void request.headers.get('host')`), or `next build` runs it, and
  loads Payload with `import()` only after that.
- `instrumentation.ts` is compiled for the Edge runtime too: Node-only code sits in a module it imports only when
  `process.env.NEXT_RUNTIME === 'nodejs'`. A module-level read of a runtime path carries
  `/*turbopackIgnore: true*/`, or Turbopack traces the whole repository into the standalone output.
- The rest of ARCHITECTURE.md §6 binds code as well: `htmlLimitedBots` stays, reads that decide a purchase are
  never cached, and storefront links never prefetch.

## 13. Schema, migrations and generated files

- **One migration set**, `engine/packages/cms/src/migrations`. **One person generates a wave's migration**, on a
  clean checkout of `main` after the wave merges (`pnpm --filter @engine/cms migrate:create`). Never commit a
  migration a dev server generated: KOI lost days to one that carried another session's schema.
- **A schema author** sees their work on their own suffixed database through Payload's dev push
  (`PAYLOAD_DEV_PUSH=1`), never on a shared one and never in a production build. What only a migration carries
  (extensions, triggers) is tested on a migrated database.
- **Additive first**: add, backfill, switch reads, and drop only in a later release, so a rollback still works.
- **A constraint that guards correctness is declared in the schema** through the Postgres adapter's hook, so a
  pushed database has it too. No table declares a composite primary key, which drizzle-kit cannot introspect: a key
  of several columns is a unique constraint.
- **Edited by nobody**: `payload-types.ts`, `importMap.js`, `next-env.d.ts`, the migrations' JSON snapshots, and
  `pnpm-lock.yaml`, which changes only through `pnpm add` or `pnpm install`. `check:generated` regenerates the
  first two and fails on a diff: a component missing from the import map renders as nothing, with no error.
- **A new dependency** is named in its pull request with why (SECURITY.md D4), pinned exactly (`savePrefix: ''`),
  and a native build is approved in `allowBuilds`.

## 14. Git and worktrees

- **One worktree per agent**, each on its own branch with its own database suffix (`pnpm db:fresh --suffix
  <lane>`) and its own `PORT`. Never trust whatever answers on port 3000.
- **Commit explicit paths in one step**: `git commit -- <paths>`. Never `git add -A`.
- Trunk-based off `main`, squash merge, Conventional Commits (`feat:`, `fix:`, `perf:`, `docs:`, `chore:`), and a
  message that says why. `production` is the deploy branch: nothing lands there but a merge from `main`.
- **Verify a merge in a clean worktree**, never in the tree it was built in.

## 15. `pnpm verify`, and what CI adds

`pnpm verify` = `format:check && lint && typecheck && test && check:filesize && check:generated && tasks:lint &&
tasks:check`.

| Step | What it holds |
| --- | --- |
| `format:check` | Prettier |
| `lint` | ESLint with typescript-eslint; the import boundaries (Payload and `@engine/cms` only in `src/server/**` and `(payload)`; packages never import the app; a `'use client'` module never reaches server-only code); the rendering rules (one segment config; no prefetching link, `next/form` or `router.prefetch()`) |
| `typecheck` | `tsc --noEmit` per package, with `next typegen` for the app |
| `test` | Vitest: unit tests, `checkCopy()`, the reserved `/api/` segment test, the mocked AI evaluation; the `*.db.test.ts` suite as well when `CMS_TEST_POSTGRES_URL` is set |
| `check:filesize` | §2 |
| `check:generated` | `payload-types.ts`, `importMap.js`, and the Payload config against the latest migration snapshot — a collection changed without its migration fails |
| `tasks:lint`, `tasks:check` | the board's shape and its generated progress table |

**CI adds** what needs a network or a database: the `*.db.test.ts` suite on Postgres 18; the sentinel build
(§12); the release smoke booting the tarball; Playwright on both hosts; Lighthouse; `pnpm audit --prod` (high
and critical fail, SECURITY.md D2); a secret scan on every push (SECURITY.md K3); GitHub's default CodeQL; the
frozen lockfile; the deploy-manifest check (DEPLOYMENT.md §3).

## 16. Documentation duties

When you change behaviour, update the doc that describes it **in the same pull request**:

| Change | Update |
| --- | --- |
| a collection, a field, an import column | CONTENT-MODEL.md (and DATA.md for import behaviour) |
| an order, stock, payment or delivery rule | COMMERCE.md |
| a page, an interaction or a state | EXPERIENCE-GALLERY.md or EXPERIENCE-SHOP.md |
| a token, a component or a budget | DESIGN-SYSTEM.md |
| the chat's or the drafting tool's rules | AI.md |
| a control, a limit, a secret | SECURITY.md |
| an analytics event (added, never renamed) | ANALYTICS.md |
| the stack, a route, the layout · hosts, releases, environment | ARCHITECTURE.md · DEPLOYMENT.md |
| a task's status | nothing: the orchestrator ticks TASKS.md from your report |

Documentation drift is how a tidy project becomes an untrustworthy one.
