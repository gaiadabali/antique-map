# Indies Platform — two websites, two apps, one repo

The websites and admins for one owner's two businesses: **two apps, two Payload CMSs and two databases in one
repo**, sharing code through `engine/packages/*` ([docs/PLAN-V2.md](docs/PLAN-V2.md), DR-17). Until phase 26
lands, today's one app (`engine/apps/web`, one database, the site chosen by hostname) still serves both:

| Site | Shows / sells | Domain | Held |
| ---- | ------------- | ------ | ---- |
| **Indies Gallery** | the owner's antique maps, prints and photographs — a catalogue with deep zoom; interested people and sellers reach the owner on WhatsApp or email. Nothing is sold online and no price is shown | `antiquemapsindonesia.com` | Singapore |
| **Old East Indies** | the owner's merchandise — a real online store. Guest checkout, Midtrans, and the nearest of 100+ Bali stores delivers by Gojek/Grab, with simple status tracking | `oldeastindies.com` | Bali stores |

**Each app serves one site** (`engine/apps/shop`, `engine/apps/gallery`), with its own **Payload CMS** at its own
host's `/admin` as that site's system of record: the shop's products, stock per store, orders and partners; the
gallery's works, makers and places; each site's pages, leads and analytics. An **AI chat** helps visitors and hands them to the owner; a CMS
tool drafts listings from photographs.

|              |                                                                                   |
| ------------ | --------------------------------------------------------------------------------- |
| **Stack**    | Next.js 16.3 (App Router, Cache Components) · React 19 · TypeScript strict · CSS Modules |
| **CMS**      | Payload 3.90, embedded in each app at `/admin` — shop roles `owner`, `editor`, `store`; gallery `owner`, `editor` |
| **Database** | PostgreSQL 18 — one per app: `indies_shop`, `indies_gallery`                       |
| **Media**    | S3-compatible object storage (RustFS) · sharp derivatives · static zoom tiles       |
| **Payments** | Midtrans (QRIS, bank transfer, cards)                                              |
| **AI**       | Claude API — visitor chat and the CMS drafting tool                                |
| **Hosting**  | Helios (CloudPanel · pm2 · Node 22) via the pull-based GDA deploy pipeline          |
| **Locales**  | English + Indonesian                                                                |

## Run it

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d    # Postgres 18, Mailpit, MinIO
cp .env.example engine/apps/web/.env.local        # or `pnpm worktree:env` in a worktree
pnpm db:fresh                                     # a migrated database, indies_<DB_SUFFIX>
pnpm --filter @engine/web dev                     # gallery.localhost:3000 and shop.localhost:3000
pnpm verify                                       # the full gate
```

**Any port works.** `dev` and `start` bind the port the app builds its links and the admin's trusted
origin on: `PORT` from the shell, else from `engine/apps/web/.env.local`, else **3000**
(`engine/tooling/next-port`). Another port is `PORT=4000 pnpm --filter @engine/web dev` (PowerShell:
`$env:PORT=4000; pnpm --filter @engine/web dev`). The admin is at `http://shop.localhost:<port>/admin`.

An existing database takes new migrations with `pnpm --filter @engine/cms migrate` (with the app's
`DATABASE_URL`). After a migration, a regenerated `importMap.js` or a `next build` in the same folder,
restart the dev server; if Turbopack still reports a module "instantiated because it was required",
delete `engine/apps/web/.next/dev` and start it again.

### Data

| Command | Fills |
| ------- | ----- |
| `pnpm data:seed --layer vocabulary --publish` | places, tags, grades, makers, the shop's categories, site settings |
| `pnpm data:seed --layer shop --publish` | the mock shop: stores, products, stock |
| `LEGACY_DATA_DIR=<dir> pnpm data:seed --layer shop-catalogue --publish` | the owner's 156 real designs (Animals 21, Bali 46, Botanicals 27, Landscapes 33, Maps 16, Travel posters 13) plus the committed additions in `engine/packages/cms/src/seed/catalogue/data` (Antique prints: River Jurong, 1854), with pictures and stock; retires the mock products and staging's rehearsal (`REH-`) products. `<dir>` holds `old-east-indies/designs` and `old-east-indies/instagram`, never committed ([docs/DATA.md](docs/DATA.md) §2) |
| `pnpm --filter @engine/cms media:derivatives` | the web sizes of newly uploaded pictures (a seed run outside the app leaves them pending) |
| `pnpm data:seed-pages [--publish]` | the shop's home, partnership and stores pages as CMS blocks, in both languages, exactly as the site draws them; seeded once, never over an edited page |

**Without a shell on the server** (staging): sign in to `/admin` as the owner and open **Run seeds** in the sidebar. Its buttons run the same seeds inside the app — categories and tags, shop products (the committed additions, plus the owner's designs where `LEGACY_DATA_DIR` exists), the shop pages, the pictures' web sizes — one at a time, with the report on the screen. They are refused on production.

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
