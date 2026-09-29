# Running lanes in parallel

This plan is built to be executed by several agents at once — often several on
one phase. This document is the governance that makes that safe: who owns which
files, which contracts are frozen before anyone builds against them, how work is
dispatched and reported, and the rules that stop two lanes quietly undoing each
other.

It inherits KOI's PARALLEL-TRACKS.md and NOW!'s PROGRESS.md rules. Every rule
below was written after a collision that actually happened on one of them.

---

## 1. Lanes and what they own

A **lane** is a file-disjoint stream of work with one owner at a time. Tasks in
`TASKS.md` name their lane; an agent working a task may edit **only** its lane's
paths.

| Lane | Owns | Typical agent |
| ---- | ---- | ------------- |
| **ARC** architecture | `docs/**` planning docs, `.claude/specs/**` (orchestrator), contract files marked `@contract` | architect (never implements) |
| **HAR** harness | `package.json` · `pnpm-workspace.yaml` · `tsconfig.base.json` · `eslint.config.mjs` · `.prettierrc.json` · `vitest.workspace.ts` · `playwright.config.ts` · `lighthouserc*.json` · `docker-compose.dev.yml` · `.env.example` · `.gaiadeploy.yml` · `.github/**` · `engine/tooling/**` · `scripts/**` · each app's `next.config.ts`, `tsconfig.json`, `package.json` | devops |
| **PLT** platform spine | `engine/packages/config/**` · `engine/packages/i18n/**` · `engine/packages/http/src/proxy/**` (locale, route-map and redirect resolution each app's `src/proxy.ts` re-exports) | senior-be |
| **SCH** schema & CMS | `engine/packages/cms/src/{payload.config.ts,collections,globals,fields,blocks,hooks,access,validators,migrations,seed,registries,db}/**` — the registries (collections, jobs, admin views, plugins) and **all engine-table DDL** (engine tables — in `public`, beside Payload's, under plain names — partial indexes, FTS config, declared through the Postgres adapter's `afterSchemaInit` so migrations carry them) | senior-db + senior-be |
| **ADM** admin tooling | `engine/packages/cms/src/admin/**` (custom views, admin components, admin CSS) | senior-fe / senior-uiux |
| **DOM** commerce domain | `engine/packages/domain/**` — pricing, `reserve()`, **`applyPaymentEvent()`**, every state machine (order, payment, reservation, availability, offer), the outbox writer · `engine/packages/http/src/commerce/**` | senior-be |
| **PAY** payments | `engine/packages/payments/**` (stateless adapters: sessions, signature checks, `retrieve()`, event-id derivation) · `engine/packages/http/src/webhooks/payments/**` (the thin handler: parse → retrieve → `domain.applyPaymentEvent()`) | senior-integrator |
| **LOG** logistics | `engine/packages/shipping/**` · `engine/packages/fulfilment/**` · `engine/packages/http/src/webhooks/fulfilment/**` | senior-integrator / medior |
| **MED** media | `engine/packages/media/**` · `engine/packages/http/src/media/**` | senior-be |
| **SRC** search | `engine/packages/search/**` · `engine/packages/http/src/search/**` | senior-db |
| **WEB** storefront core | `engine/packages/{view-models,loaders,ui}/**` · `engine/packages/http/src/{index.ts,health,cron,forms,legacy,brand-assets,auth,privacy}/**` (the manifest itself, C13, is ARC's) · every app's `src/app/api/x/**` and `src/app/(payload)/**` mount files and `src/proxy.ts` (one-line re-exports plus a **literal** `matcher`, parity-checked against C13) | senior-fe |
| **UXG** gallery app | `engine/apps/gallery/**` — except the files WEB and HAR own above | senior-uiux + medior |
| **UXE** emporium app | `engine/apps/emporium/**` — except the files WEB and HAR own above | senior-uiux + medior |
| **NTF** notifications & documents | `engine/packages/mail/**` (email + WhatsApp templates, senders) · `engine/packages/documents/**` (PDF confirmation, proforma, certificate of authenticity, commercial invoice, packing slip) | medior |
| **SIS** sister sync | `engine/packages/sister/**` · `engine/packages/http/src/sister/**` | senior-integrator |
| **MIG** migration | `engine/packages/migrate/**` · `indies-gallery/content/legacy/**` | senior-integrator + medior |
| **SEO** SEO & analytics | `engine/packages/seo/**` · `engine/packages/analytics/**` · `engine/packages/http/src/{collect,feeds,sitemap}/**` | medior / senior-fe |
| **BRD** brand config | `indies-gallery/site/**` · `old-east-indies/site/**` · `test/site/**` · brand `content/seed/**` | medior (with owner input) |
| **QA** quality gate | `tests/e2e/**` · `tests/contract/**` · `tests/load/**` (except lane folders below) · `docs/gates/**` (each phase gate's evidence file) | qa |
| **DOC** manuals | `manual/**` | junior / medior |

No globs over config files, deliberately (KOI): `*.config.ts` would match
`payload.config.ts`, which is SCH's, and miss `eslint.config.mjs`. Every config
file in the repo has exactly one owner.

`next.config.ts` is HAR's, but `withPayload()` wraps it, so SCH has a plausible
reason to reach for it. **SCH asks; it does not edit.**

### A directory can hold several agents' work — ownership follows the subdirectory

The Shop and Gallery stages put three or four agents inside one app at once. Ownership is by
**subdirectory**, declared in the task before the agent starts:

```
engine/apps/gallery/
  src/styles/  src/components/  src/app/(site)/[locale]/layout.tsx  ← app lead (phase 22); later: ask the lead
  src/surfaces/{home,browse,search}/        + their route folders   ← browse agent
  src/surfaces/{item,maker,place}/          + their route folders   ← item agent
  src/surfaces/{story,collection,catalogue,page,form}/ + routes     ← editorial agent
  src/surfaces/{cart,checkout,order,account}/ + routes              ← commerce-UI agent
```

A shared component discovered mid-phase goes into the surface folder first and
is promoted into `src/components/` by the app lead afterwards. Two agents
editing `src/components/button.tsx` in one wave is the collision this prevents.

Likewise `engine/packages/cms/src/`: `collections/**` is SCH's, `admin/**` is
ADM's. Tests follow their code: unit tests live in each package's `test/` and
belong to that package's lane; a lane may add e2e specs under
`tests/e2e/<lane>/**`, which it owns. The rest of `tests/**` is QA's.

### Registries — how a lane adds a collection, a job, an admin view or a plugin without editing SCH's files

Payload wants one config with every job, admin view and plugin in it. Each
package exports its own list from a barrel it owns — `@engine/media/jobs`,
`@engine/sister/jobs`, `@engine/cms/admin/views` (ADM) — and SCH's
`registries/{jobs,views,plugins}.ts` imports each barrel once. A lane adds an
entry to **its own barrel**; only a package's *first* job or view needs a line in
the registry, which SCH adds on request. A registry entry names its owner lane in
a comment, and a duplicate slug fails the config-validation test.

**Collections are in the config before anyone builds them.** Every slug
CONTENT-MODEL.md freezes is registered from the Foundation stage as a **stub** —
hidden in the admin, readable by admins only, writable by nobody: a table with an
id and timestamps — because collections point at each other across tasks that run
in parallel, and a `relationTo` naming a collection the config lacks fails at boot.
Each frozen slug has its own folder, `collections/<slug>/`, whose `index.ts`
exports its config — the stub until the task that owns the slug fills it in — and
`registries/collections.ts` imports every one of them, so it never changes when a
collection is built: a task edits its own folder, which is what its **Owns**
name, and never the registry. A new slug is a CONTENT-MODEL.md change first.

Engine tables that are not Payload collections (`payment_events`,
`domain_events`, `idempotency_keys`, `fx_rates`, `search_documents`,
`document_sequences`, `inventory_movements`, `analytics_events`,
`sister_sync_log`) and indexes Payload cannot express (the reservation partial
unique index, FTS and trigram indexes) are **SCH's DDL**, declared in `db/`
through the adapter's `afterSchemaInit` so they land in the wave's one migration.
They live in `public`, the adapter's schema, beside Payload's tables and under
exactly those plain names — never an `engine` schema, which Payload's
`migrate:fresh` would leave standing and a push would not see — and the seam
refuses an engine table whose name a Payload table already has
(`db/engine-tables.ts`). Each area's tables are one `db/` file its task owns
(`db/inventory.ts`, `db/payments.ts` …); the seam imports each, and, as for a
registry, only an area's first file needs a line there, which SCH adds on request.
The lane that uses a table specifies it in its task; SCH writes it.

## 2. Files nobody owns, and how they change

- **`pnpm-lock.yaml`** — any lane may change it, but only as a side effect of
  `pnpm add` / `pnpm install`, **never by hand**. Conflicts are resolved by
  re-running the install on the merged `package.json`s. A hand-merged lockfile
  resolves clean in git and installs a tree nobody has tested.
- **`pnpm-workspace.yaml` is not boring.** It carries `allowBuilds` (native build
  approvals for `sharp`, `esbuild`, `@tailwindcss/oxide`…), which pnpm 11 reads
  from there. A lane adding a dependency with a postinstall script hits a hard
  stop until HAR approves it. That is an approval to ask for, not a broken
  install to debug.
- **Generated files are edited by nobody**: `payload-types.ts`,
  `src/app/(payload)/admin/importMap.js`, `next-env.d.ts`. They are regenerated;
  a hand edit appears to work until the next build. CI regenerates the types and
  both apps' import maps and **fails on any diff** (`pnpm check:generated`) — a
  custom admin component missing from `importMap.js` renders as nothing, with no
  error, which is exactly the KOI class of defect.

## 3. Standing rules

1. **One worktree per agent.** Never two agents in one checkout — dispatch with
   `isolation: "worktree"`. Each worktree has its own branch
   (`feat/p<phase>-<lane>-<task>`), its own local databases
   (`pnpm db:fresh --brand <slug> --suffix <lane>`) and its own `PORT`.
2. **Schema is authored in parallel; migrations are generated single-threaded.**
   Several SCH agents may write collection files at once when their files are
   disjoint. An agent that changes no schema never pushes: `pnpm db:fresh`
   migrates its database with the committed set, and its dev server boots on
   that. A **schema author** sees its work on **its own suffixed database only**,
   through Payload's dev push (`PAYLOAD_DEV_PUSH=1`, never in a production build),
   which pushes the whole schema, engine tables and their indexes included.
   drizzle-kit 0.31.7 cannot introspect a composite primary key — `42P02`, and
   Payload does not start on a database that holds one (senior-db, 3.2 S1) — so no
   table declares one: a key of several columns is a unique constraint over NOT NULL
   columns, and the engine-table seam refuses anything else. Should a push still
   fail on a database that has tables, push onto an empty one — `pnpm db:fresh
   --brand <slug> --suffix <lane> --no-migrate` — and seed afresh. What only a
   migration carries — a trigger, raw SQL — is missing from a pushed database, so
   its test runs on a migrated one. The agent **never commits a generated
   migration**. After the wave merges, the **SCH
   lead** runs `migrate:create` once, in a clean worktree, producing the wave's
   single migration — then `generate:types` (the one
   `engine/packages/cms/payload-types.ts`, which both apps and every package read),
   then the schema-hash check across every brand database, the synthetic brand's
   two included. KOI lost time to a dev server generating a migration that carried
   another session's schema; this is the fix. A non-SCH lane needing a field asks
   SCH through the orchestrator; it never adds one itself. Migrations are additive
   first (DEPLOYMENT.md §4).
3. **Claim exactly one task.** Never start a task whose dependencies are not
   done. If a task needs a file another in-flight task owns, stop, mark it
   `blocked` in the report, and say why — do not edit it.
4. **The gate owner reports; the file owner fixes.** A harness gate failing on
   another lane's file is reported to that lane. A lane whose change breaks a
   test tells the test's owner rather than rewriting the test. A gate quietly
   loosened and a file quietly rewritten to satisfy it are the same failure.
5. **Agents in a parallel wave do not edit `TASKS.md`.** Concurrent writes
   collide. They report (§5); the orchestrator ticks each evidenced subtask in
   the main checkout's copy, runs `node scripts/progress.mjs`, and closes a task
   once its **Check** passes on merged `main` (the rule is in `TASKS.md`).
   A solo agent outside a wave may tick its own task.
6. **Architecture changes go in the docs, not in code first.** A finding that
   invalidates a decision stops the task: mark it `blocked`, write the finding,
   route it to ARC.
7. **No task is done until its "Done when" is verifiably met** — with evidence:
   a test name, a command output, a screenshot of the opened screen. "It
   compiles" is not acceptance.
8. **Verify on your own production build and your own port.** A dev server
   someone started hours ago serves its old route table; "that page 404s" is
   more often a stale server than missing code (KOI). Check what answers the
   port before reporting a missing route.
9. **A rule binds the person who wrote it, too.** If a decision needs an action
   in another lane, route it; do not make the exception yourself. (KOI's rule
   was broken within a day — by its author.)

## 4. The contracts to freeze before any parallel work

Half a day of agreement in phase 1; weeks of rework avoided. Each is **one module**
(it may span files, re-exported from one entry point), marked `@contract` at the
top of each file, owned by ARC. Changing one after freeze is a versioned change
announced to every lane that consumes it.

| # | Contract | File | Consumed by |
| - | -------- | ---- | ----------- |
| C1 | **Brand config schema** + module flags | `engine/packages/config/src/schema.ts` | everyone |
| C2 | **Surfaces & view models** + typed fixtures | `engine/packages/view-models/src/**` | WEB, UXG, UXE (apps build against fixtures, **never the database**) |
| C3 | **Token contract** — the CSS custom properties every app defines, and the subset a brand may override | `engine/packages/ui/src/tokens/contract.ts` | UXG, UXE, BRD, ADM |
| C4 | **Content blocks** — the frozen list and prop shapes | `engine/packages/view-models/src/blocks.ts` | SCH writes Payload definitions, each app writes renderers; the map is exhaustive (a missing renderer is a compile error) |
| C5 | **Money** — `Money`, `PriceSet`, rounding rules | `engine/packages/domain/src/money/contract.ts` | DOM, PAY, WEB, apps |
| C6 | **Commerce API** — cart, checkout, offer, hold, enquiry request/response shapes | `engine/packages/domain/src/contracts/api.ts` | DOM implements, apps call |
| C7 | **Provider interfaces** — `PaymentGateway` (incl. `sessionTtl`, `retrieve()`, the `providerEventId` rule), `ShippingProvider`, `FulfilmentProvider`, normalised webhook events | `engine/packages/{payments,shipping,fulfilment}/src/contract.ts` | PAY, LOG, DOM |
| C8 | **State machines** — order, payment, reservation (with the `reserve()` service signature), availability (derived), offer: states + transitions table | `engine/packages/domain/src/*/machine.ts` · `engine/packages/domain/src/reservations/contract.ts` | DOM, PAY, ADM, NTF, WEB |
| C9 | **Media artefacts** — derivative names/sizes, IIIF paths, master access | `engine/packages/media/src/contract.ts` | MED, WEB, apps, MIG |
| C10 | **Route map** — surface → path segment per locale, facet vocabularies, legacy prefixes, `href()` | `engine/packages/config/src/routes.ts` | PLT, WEB, apps, SEO, MIG (redirects) |
| C11 | **Analytics events** — names and props | `engine/packages/analytics/src/events.ts` | every surface |
| C12 | **Sister archive API** — the work snapshot, per-market prices and the prints feed both ways (origin → outlet and back), webhooks and the nightly reconcile | `engine/packages/sister/src/contract.ts`, `sister/src/contract/**` | SIS, SCH, apps |
| C13 | **HTTP handler manifest** — every `/api/x/*` route an app must mount, and the proxy `matcher` each app must declare | `engine/packages/http/src/manifest.ts` | WEB, both apps (parity test) |

**C2 is the one that actually decouples the lanes.** Apps render view models
from fixtures while the schema is still being written; when SCH lands, one
loader per surface maps Payload documents onto the same view models and no
app component changes (KOI DESIGN-SYSTEM.md §3, proven on a whole site).

## 5. Dispatch and report

The orchestrator (the main session) runs the plan as **phases**, and each phase
as **waves**. A phase opens when every phase its heading needs is done, with at
most three open at once (§6). Its waves — W1, W2, at most W3 — are local to it
and run in order: every task in a wave has its dependencies done and owns paths
no other task in that wave owns, and a task never shares a wave with a task it
depends on. There is no wave calendar across phases; outside its phase a wave is
written `17·W2`. Before dispatching a wave the orchestrator runs
`pnpm tasks:lint --phase <n> --wave <k>` (TASKS.md 2.2.f), which fails on a
duplicate id, a dependency that is not done, a phase opened before its needs, or
two tasks in the wave whose **Owns** paths overlap.

Each agent receives: the task id, its lane and owned paths, the docs to read
(always `design.md`, `CONVENTIONS.md`, this file, plus the task's references),
its subtasks and its **Check**. Each agent returns **one report**:

```
Task:        33.3 The item page
Status:      done | blocked | partial
Subtasks:    ✅ 33.3.a — evidence (test name / command / screenshot path)
             ❌ 33.3.c — what is missing and why
Check:       ✅ clause 1 — evidence
             ❌ clause 2 — what is missing and why
Files:       every path changed
Contracts:   none changed | C2 needs <field> (routed to ARC)
Found:       anything that contradicts a doc, with the doc and section
Follow-ups:  work discovered, not done, proposed as new subtasks
```

The orchestrator then ticks the evidenced subtasks in `TASKS.md`, merges each
branch in a clean worktree, runs the full gate (`pnpm verify`, both brands' e2e,
the `test` brand), dispatches **QA** to drive the task's **Check** and the
phase's "Done when" end to end in a browser, and only then closes the task
(`✅ date sha`).

## 6. The actual risk of many lanes

It is not merge conflicts — the paths do not overlap. It is that **review cannot
keep up**, and unreviewed work is where the 300-line rule, the accessibility
floor and the money rules quietly stop being observed (KOI). So:

- Every wave has a named reviewer per lane family: senior-be reviews DOM/PAY/LOG,
  senior-fe reviews WEB and both apps, senior-uiux reviews the apps and ADM for
  craft, senior-db reviews every migration.
- If review capacity is one person, run **three lanes, not six**, and one or two
  phases open rather than three. The plan's waves are ceilings, not quotas.
- QA's gate is per wave and per phase, not per project. A defect found a phase later costs
  the phase it was found in.

## 7. Gates that need a human

Some tasks cannot be finished by an agent, and the plan says so rather than
letting them block silently. They are marked **👤 owner** in `TASKS.md`:

- booking the photographer and the pilot shoot, the native Indonesian copywriter,
  the Indonesian designers for the cultural review, and the buyers for the
  prototype test and usability runs (the Design, Gallery and Shop stages),
- picking the shared base and each brand's accents (phase 13), and signing off the
  screenshot set at every design gate (the Design, Design systems, Gallery, Shop,
  Admin and Launch stages),
- being observed at work for the admin's contextual inquiry (23.1),
- the curator's category → facet mapping review (36.1),
- the **item register** — stock location and export status for every original,
  which the old site does not hold (36.3; MIGRATION.md §4), and the go-ahead
  for the gallery's dark production import before the shop launches (42.7),
- legal entity, tax registration, gateway merchant accounts and sandbox keys
  (the Commerce and Integrations stages),
- domains, DNS and Helios writes (phases 5, 41–43) — **Helios changes need the
  owner's explicit go-ahead every time** (KOI memory),
- the timed cataloguing test with a real cataloguer (38.2),
- the breach-response contacts and the data-protection officer decision
  (42.3).
