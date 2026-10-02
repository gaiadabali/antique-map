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
docker compose -f docker-compose.dev.yml up -d   # Postgres 18, Mailpit, MinIO
cp .env.example .env.local
pnpm dev                                         # gallery.localhost:3000 and shop.localhost:3000
pnpm verify                                      # the full gate
```

The commands change as phases 1–2 reshape the repo; `docs/CONVENTIONS.md` holds the current ones.
