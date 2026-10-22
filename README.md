# Indies Platform — two websites, one CMS

The websites and admin for one owner's two businesses, run from **one app and one database**:

| Site | Shows / sells | Domain | Held |
| ---- | ------------- | ------ | ---- |
| **Indies Gallery** | the owner's antique maps, prints and photographs — a catalogue with deep zoom; interested people and sellers reach the owner on WhatsApp or email. Nothing is sold online and no price is shown | `antiquemapsindonesia.com` | Singapore |
| **Old East Indies** | the owner's merchandise — a real online store. Guest checkout, Midtrans, and the nearest of 100+ Bali stores delivers by Gojek/Grab, with simple status tracking | `oldeastindies.com` | Bali stores |

The **hostname picks the site**. One **Payload CMS** at `/admin` is the system of record for both: catalogue, stock
per store, orders, partners, leads and analytics. An **AI chat** helps visitors and hands them to the owner; a CMS
tool drafts listings from photographs.

|              |                                                                                   |
| ------------ | --------------------------------------------------------------------------------- |
| **Stack**    | Next.js 16.3 (App Router, Cache Components) · React 19 · TypeScript strict · CSS Modules |
| **CMS**      | Payload 3.90, embedded in the same process at `/admin` — roles `owner`, `editor`, `store` |
| **Database** | PostgreSQL 18 — one database                                                      |
| **Media**    | S3-compatible object storage (RustFS) · sharp derivatives · static zoom tiles       |
| **Payments** | Midtrans (QRIS, bank transfer, cards)                                              |
| **AI**       | Claude API — visitor chat and the CMS drafting tool                                |
| **Hosting**  | Helios (CloudPanel · pm2 · Node 22) via the pull-based GDA deploy pipeline          |
| **Locales**  | English + Indonesian                                                                |

## Where to start

| Document | For |
| -------- | --- |
| [docs/PLAN.md](docs/PLAN.md) | **The spine** — what we are building, the settled decisions (DR-1…15), the 11 phases |
| [TASKS.md](TASKS.md) | The progress board: phases → tasks → subtasks, each task ending in a Check; the owner's open decisions |
| [AGENTS.md](AGENTS.md) | Rules every agent follows; read before touching anything |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Lanes, file ownership, migrations, dispatch and the report format |
| [docs/CARRY-OVER.md](docs/CARRY-OVER.md) | What the code written under the earlier plan keeps, simplifies and deletes |
| [.claude/specs/indies-platform/requirements.md](.claude/specs/indies-platform/requirements.md) | The numbered requirements every task traces to |
| [.claude/specs/indies-platform/design.md](.claude/specs/indies-platform/design.md) | The design summary agents read first |

### Reference

| Document | For |
| -------- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Topology, stack, layout, rendering and caching, media, search |
| [docs/CONTENT-MODEL.md](docs/CONTENT-MODEL.md) | Collections, fields, access — the glossary |
| [docs/COMMERCE.md](docs/COMMERCE.md) | The shop: cart, checkout, payment, stock per store, nearest store, statuses, tracking |
| [docs/AI.md](docs/AI.md) | The chat, the drafting tool, their guardrails and evaluation |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model and the checklist per area |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Personal data, retention, legal pages |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | First-party events and the dashboard |
| [docs/EXPERIENCE-GALLERY.md](docs/EXPERIENCE-GALLERY.md), [docs/EXPERIENCE-SHOP.md](docs/EXPERIENCE-SHOP.md) | What each site does, page by page |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | The shared base and each site's accents |
| [docs/CONTENT-OPERATIONS.md](docs/CONTENT-OPERATIONS.md) | How the owner's team runs the admin |
| [docs/DATA.md](docs/DATA.md) | Seeding, the spreadsheet import, redirects |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Hosting and backups; code conventions |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Background market research (from the earlier plan) |
| [docs/archive/2026-10-replan/](docs/archive/2026-10-replan/) | The superseded 44-phase plan and its docs — history only |

## Run it

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d    # Postgres 18, Mailpit, MinIO
cp .env.example engine/apps/web/.env.local        # or `pnpm worktree:env` in a worktree
pnpm db:fresh                                     # a migrated database, indies_<DB_SUFFIX>
pnpm --filter @engine/web dev                     # gallery.localhost:3000 and shop.localhost:3000
pnpm verify                                       # the full gate
```

An existing database takes new migrations with `pnpm --filter @engine/cms migrate` (with the app's
`DATABASE_URL`). After a migration, a regenerated `importMap.js` or a `next build` in the same folder,
restart the dev server; if Turbopack still reports a module "instantiated because it was required",
delete `engine/apps/web/.next/dev` and start it again.

### Data

| Command | Fills |
| ------- | ----- |
| `pnpm data:seed --layer vocabulary --publish` | places, tags, grades, makers, the shop's categories, site settings |
| `pnpm data:seed --layer shop --publish` | the mock shop: stores, products, stock |
| `LEGACY_DATA_DIR=<dir> pnpm data:seed --layer shop-catalogue --publish` | the owner's 156 real designs (Animals 21, Bali 46, Botanicals 27, Landscapes 33, Maps 16, Travel posters 13) with pictures and stock; retires the mock products. `<dir>` holds `old-east-indies/designs` and `old-east-indies/instagram`, never committed ([docs/DATA.md](docs/DATA.md) §2) |
| `pnpm --filter @engine/cms media:derivatives` | the web sizes of newly uploaded pictures (a seed run outside the app leaves them pending) |
| `pnpm data:seed-pages [--publish]` | the shop's home, partnership and stores pages as CMS blocks, in both languages, exactly as the site draws them; seeded once, never over an edited page |

A seed run outside the app posts its cache invalidations to `REVALIDATE_ORIGIN` (default
`http://127.0.0.1:<PORT>`); a dev server on another port keeps its cached listings until it restarts.

## The shop in the CMS

Everything Old East Indies shows is edited in `/admin`:

| Admin | What it holds |
| ----- | ------------- |
| **Shop — products › Products** | in tabs — Product, Images, Price and variants, Search engines; address, category and status in the sidebar |
| **Shop — products › Categories** | the shop's collections: name, short description, cover picture, order, search-engine text, draft/published. A product belongs to one |
| **Stores and stock › Stores** | in tabs — Store, Location, Contact and hours, Photographs; "takes orders" and "listed" in the sidebar |
| **Content › Pages** (site Shop) | a page built from **sections** (blocks): add, drag, remove, each word per language. The address `home` is the home, `partnership` the partnership page, `stores` the stores page; any other address is a page at `/{address}` |

**Sections a shop page can use:** home hero, collections rail, products rail (optionally one category),
numbered steps, story with prints, bridge to the gallery · page hero, band of facts, offer with terms,
partnership enquiry form, partner sign-in · text, picture and text, questions and answers, call to
action, stores directory. Links are picked, not typed — a shop page, a section on the page (`#apply`),
or a web address — and follow the visitor's language.

Until a built-in page (home, partnership, stores) is published in the CMS, the site draws its built-in
sections with the lexicon's words, so unpublishing one never leaves a hole. A change to a published page
or category reaches the site without a deploy (`pages:shop` and `catalogue:shop` cache tags).

**Search engines and sharing.** Every public page has a title, description, canonical, `hreflang` and
Open Graph / Twitter tags. Its sharing picture is the page's own — a product's photograph, a category's
cover (else its newest product's), a page's **Social sharing picture** (Pages › Search engines) — and
otherwise the site's card, `public/shop/og.png` (1200 × 630). The bag, checkout and order pages are
`noindex`.

Code: blocks `engine/packages/cms/src/collections/pages/blocks/` · loader and projection
`engine/apps/web/src/server/shop/pages/` · renderers and built-in sections
`engine/apps/web/src/sites/shop/blocks/` · seed `engine/apps/web/src/server/shop/pages/seed/`.

The commands change as the repo is reshaped; `docs/CONVENTIONS.md` holds the current ones.
