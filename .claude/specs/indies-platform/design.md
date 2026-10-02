# Design summary — the Indies Platform

The summary agents read first (after `AGENTS.md` and `docs/PLAN.md`). Detail lives in `docs/`; this is the map.

## What it is

One Next.js 16 app with Payload 3.90 embedded and one Postgres database, serving two sites chosen by hostname:
the **gallery** (antiques; catalogue and enquiry; no price, no cart) and the **shop** (merchandise; guest checkout
with Midtrans; stock per store; the nearest store delivers). One owner. One admin at `/admin` for roles `owner`,
`editor`, `store`. The AI chat guides and hands off to WhatsApp or email; a CMS tool drafts listings.

## Shape

```text
engine/apps/web/src/
  proxy.ts                 Host → site (env allow-list); unknown host → 404; headers and CSP
  app/(payload)/           admin and Payload REST — answered on ADMIN_HOST only
  app/(gallery)/gallery/…  gallery routes     app/(shop)/shop/…  shop routes
  app/api/x/…              webhooks, cron, chat, leads, collect, geocode, legacy, sitemap/robots
  sites/{gallery,shop}/    each site's components, tokens and lexicon (en + id)
  shared/  view-models/    components both sites use; view models + fixtures
  server/                  loaders and actions: Local API, overrideAccess:false, published only, select — `server-only`
engine/packages/           cms (collections, access, the shop's writes, jobs, imports) · config (SITES) · http · media · i18n · cache · migrate
```

## The decisions that matter

| Topic | Rule |
| --- | --- |
| Sites | Hostname → site; records carry `site`; unknown host never builds a URL |
| Money | Integer rupiah, server-priced, rounded once; the gallery shows no price |
| Stock | Per store; one atomic `UPDATE … WHERE quantity >= n` at order creation; released on expiry, failure, cancel |
| Nearest store | Haversine from the buyer's pin over active stores holding every line; none → refuse before payment |
| Payment | Midtrans Snap; webhook verified, idempotent, applied in one transaction; simulator off in production |
| Fulfilment | `pending_payment → paid → processing → waiting_driver → on_the_way → delivered` (+ cancelled, expired); history rows; driver image; tracking by unguessable link |
| Access | `owner` all; `editor` catalogue, content, orders; `store` own store only; leads, partners, settings, asking price owner-only |
| Public reads | Published only, projected, `overrideAccess:false` |
| AI | Read-only tools with no antique price in their projection; untrusted text; consent before a lead; caps and a kill switch; adversarial set in CI |
| Rendering | Cache Components; `instant = false`; the build touches no database; availability that decides a purchase is never cached |
| Analytics | First-party, cookieless, in the admin dashboard; no GA, no Meta Pixel |
| Locales | en (unprefixed) + id; *Anda*; British spelling; copy in keyed files |
| Design | The design team's system (Cormorant Garamond + Inter); a palette per site in its own token file; UI only from tokens and shared components; no dark mode; phone first |

## Reading order for a task

1. `AGENTS.md` → this file → your task in `TASKS.md` and its **Read** list.
2. For data: `docs/CONTENT-MODEL.md`. For the shop: `docs/COMMERCE.md`. For the chat: `docs/AI.md`. For safety: `docs/SECURITY.md`.
3. For screens: the site's `docs/EXPERIENCE-*.md` and `docs/DESIGN-SYSTEM.md`.

## What the earlier plan built that we keep

See `docs/CARRY-OVER.md`: the Payload boot with migrations under an advisory lock, users with the last-owner guard,
the catalogue vocabulary (makers, a gazetteer with historical names, terms), media and masters, the pure proxy,
health, cron and revalidate routes, i18n formatters, cache invalidation after commit, the legacy crawler and
normalisers (1,823 normalised records), and the Cache Components spike's findings.
