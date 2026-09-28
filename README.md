# Indies Platform — one engine, two sister storefronts

The website, shop and CMS for two sister companies that sell the same archive
to two different markets:

| Brand | Sells | Folder | Storefront app |
| ----- | ----- | ------ | -------------- |
| **Indies Gallery** | original antique maps, prints, photographs and books of the Indonesian archipelago and Southeast Asia, 15th–20th century — one-of-one items for collectors and institutions | [`indies-gallery/`](indies-gallery/) | `engine/apps/gallery` |
| **Old East Indies** | merchandise made from that archive — giclée prints, posters, cards, notebooks, homeware and gifts, for tourists, expats and gift buyers | [`old-east-indies/`](old-east-indies/) | `engine/apps/emporium` |

**Same engine, same CMS, different databases, different payment gateways,
different looks.** A brand is configuration, data and assets — never code
([docs/BRANDS.md](docs/BRANDS.md)). The pattern is NOW!'s "one engine, many
cities", applied to commerce; the build discipline is Kingdom of Indonesia's.

|              |                                                                                   |
| ------------ | --------------------------------------------------------------------------------- |
| **Stack**    | Next.js 16.3 (App Router, Cache Components) · React 19 · TypeScript strict · Tailwind v4 |
| **CMS**      | Payload 3.90, embedded in the same process at `/admin` — one brand-independent config, one process per brand |
| **Database** | PostgreSQL 18 — one database per brand, one migration set for all                |
| **Media**    | S3-compatible object storage (Cloudflare R2) · sharp derivatives · IIIF deep zoom |
| **Search**   | Postgres full-text + trigram + a historical gazetteer — no external engine       |
| **Hosting**  | Helios (CloudPanel · pm2 · Node 22) via the pull-based GDA deploy pipeline        |
| **Locales**  | English + Indonesian (Dutch-ready)                                                |

## Documentation

| Document | For |
| -------- | --- |
| [docs/PLAN.md](docs/PLAN.md) | The build plan — phases, milestones, what ships when, open decisions |
| [docs/PARALLEL-TRACKS.md](docs/PARALLEL-TRACKS.md) | Lanes, file ownership, frozen contracts, rules for running agents in parallel |
| [TASKS.md](TASKS.md) | **The progress board and the task list** — a progress table rebuilt from its checkboxes (`node scripts/progress.mjs`), the stages and the running order of 44 small phases (each with its own waves), the owner's decisions, then phases → tasks → subtasks, each task ending in a Check |
| [.claude/specs/indies-platform/requirements.md](.claude/specs/indies-platform/requirements.md) | Numbered requirements every task traces to |
| [.claude/specs/indies-platform/design.md](.claude/specs/indies-platform/design.md) | The design summary the implementation agents read first |
| [.claude/specs/indies-platform/DISPATCH.md](.claude/specs/indies-platform/DISPATCH.md) | The orchestrator's per-wave checklist and the prompt each agent receives |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack decisions, topology, repo layout, media, search |
| [docs/BRANDS.md](docs/BRANDS.md) | What differs between the brands, the config spine, module flags |
| [docs/CONTENT-MODEL.md](docs/CONTENT-MODEL.md) | Collections, fields, relationships — the glossary |
| [docs/CONTENT-OPERATIONS.md](docs/CONTENT-OPERATIONS.md) | How staff fill both sites — and why the admin is half the product |
| [docs/COMMERCE.md](docs/COMMERCE.md) | Money, pricing, cart, checkout, holds, offers, orders, tax, shipping |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | The gateway seam, providers per brand, webhooks, reconciliation |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Indonesian / Singapore legal, tax, export, privacy checklist |
| [docs/EXPERIENCE-GALLERY.md](docs/EXPERIENCE-GALLERY.md) | Indies Gallery — IA, pages, interactions |
| [docs/EXPERIENCE-SHOP.md](docs/EXPERIENCE-SHOP.md) | Old East Indies — IA, pages, interactions |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Surfaces, view models, token contract, blocks, budgets |
| [docs/RESEARCH.md](docs/RESEARCH.md) | The benchmark research behind the UX decisions, with sources |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Moving Indies Gallery's existing store, URLs and customers |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | Event taxonomy, consent, commerce funnels |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environments, releases, migrations, backups |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Code standards, the two brand rules, file-size rule, git worktrees |

## Quick start _(after the Foundation stage, phases 1–5, lands)_

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # Postgres 18 · Mailpit · MinIO (local S3)
cp .env.example .env.local                        # PORT, DATABASE_URL_*, PAYLOAD_SECRET, S3_*
pnpm db:fresh --brand indies-gallery              # create + migrate + seed ig_dev
pnpm db:fresh --brand old-east-indies             # create + migrate + seed oei_dev
pnpm dev --brand indies-gallery                   # site on :PORT, CMS on :PORT/admin
pnpm dev --brand old-east-indies
# verify on a production build, never only on dev: pnpm build && pnpm start
```

### Checks

```bash
pnpm verify          # file size · brand literals · generated files · lint · types · unit · schema hash
pnpm test:e2e        # Playwright per brand (and both test configs), desktop + mobile
pnpm lhci            # Lighthouse budgets from docs/DESIGN-SYSTEM.md §7
pnpm tasks:lint      # the task list: ids, dependencies, wave ownership (before every wave)
node scripts/progress.mjs   # rebuild the progress table in TASKS.md from its checkboxes
```

## Ground rules

1. **A brand is config, data and assets — never code.** No brand literal under
   `engine/`; CI fails on one. A synthetic third brand (`test/`) runs every build.
2. **One migration set, identical schemas.** Every brand database is migrated by
   the same files and compared by hash in CI.
3. **Money is integers, priced on the server.** The browser sends ids and
   quantities, never prices.
4. **A one-of-one item can be sold once.** The checkout lock is a database
   guarantee — a partial unique index that also covers sold items — tested under
   concurrency, not an application convention. A payment is applied in one
   transaction with its dedupe record, so a crash can neither lose nor double it.
5. **No file over 300 lines.** Split by responsibility.
6. **The admin is half the product.** Cataloguing 9,500 originals and turning
   archive works into merchandise are the screens that decide whether either
   site fills up.
7. **Open the thing.** A green board is not a working screen.
8. **The current live sites are never touched.** These are new builds: nothing
   here logs in to, fixes, changes or switches off the existing sites. Their
   content arrives as an export the owner hands over; at launch the owner points
   each domain at its new site.
9. **Progress lives in [TASKS.md](TASKS.md).** Every task ends in a Check; the
   orchestrator ticks subtasks as they are proven and reruns
   `node scripts/progress.mjs`.
