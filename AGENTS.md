# Agents — read this first

You are working on the **Indies Platform**: one engine serving two sister
storefronts, **Indies Gallery** (`engine/apps/gallery`, one-of-one antique maps,
prints and photographs) and **Old East Indies** (`engine/apps/emporium`,
merchandise from the same archive). Brands are configuration, data and assets
in `indies-gallery/`, `old-east-indies/` and `test/` — never code.

## Before you touch anything

1. Read `.claude/specs/indies-platform/design.md`, then your task in
   `TASKS.md` (the progress board at the repo root), then every doc in the task's
   **Read** list.
2. Read `docs/PARALLEL-TRACKS.md` §1–§5 and `docs/CONVENTIONS.md`. You may edit
   **only** the paths your task **Owns**.
3. Work in **your own git worktree**, with your own database suffix and port.
   Never `git add -A`; commit explicit paths in one step.

## Rules that fail CI or lose money

- **No brand literal under `engine/`** — no slug, name or domain of a real brand
  in packages or apps. A difference between brands is a config field or a module
  flag.
- **Money is integer minor units, priced on the server.** Never trust a price
  from a request. Never round twice.
- **Only `reserve()` writes a reservation.** A one-of-one item sells once.
- **App components never import Payload** — they render view models from
  `@engine/view-models`, built against fixtures.
- **No file over 300 lines.** Split by responsibility.
- **Only the SCH lead generates migrations**, once per wave, in a clean worktree.
  Never commit a migration your dev server generated.
- **Never hand-edit generated files** (`payload-types.ts`, `importMap.js`,
  `next-env.d.ts`) or `pnpm-lock.yaml`.
- **The build never touches a database.** The apps use **Cache Components**
  (CONVENTIONS.md §12). The one route segment config is `export const instant =
  false` on the `(site)/[locale]` layout — never `dynamic` or `revalidate`
  (`force-dynamic` does not exist here) — and each app's `next.config.ts` sets
  `htmlLimitedBots: /.*/`, so every page renders in full per request and a 404 or a
  redirect keeps its status. The brand is read after `connection()`, and an engine
  `GET` route handler reads its request first, or the build runs it. What the first
  flush must carry — a form, its current value, a post's result, the canonical
  check — is read in the page body; only slow or live reads (availability, a live
  price, cart totals) stream inside `<Suspense>`, and a streamed part holds no form.
  Cached reads are `'use cache'` + `cacheTag` + `cacheLife`, invalidated through
  `invalidate(tags)`; the availability that decides a purchase is read live, never
  cached. Storefront links never prefetch: `<a>` or `<Link prefetch={false}>`.
- **Public reads are published-only and projected.** Loaders and the sister API
  call Payload with `overrideAccess: false`, filter `_status: 'published'` and
  `select` only the fields the view model needs. The Local API's default
  (`overrideAccess: true`) would leak drafts, acquisition costs and consignors.
- **Engine routes live under `/api/x/`** (webhooks, cron, legacy redirects,
  sister API, beacon); Payload owns `/api/*` otherwise. An app's `api/x/**`
  files are one-line re-exports, and its `proxy.ts` declares its `matcher`
  literally.

## This is not the Next.js or Payload you remember

Next.js is pinned at **16.3.x** (the `middleware` convention is now `proxy`) and
Payload at **3.90.x**. Before writing framework code, read the installed docs in
`node_modules/next/dist/docs/` and Payload's docs for 3.90 — heed deprecation
notices. Do not use APIs marked for removal in Payload 4.

## Done means evidenced

Your task is done when every subtask is done and its **Check** is met **and you
have opened the thing** — the screen, signed in, on a production build, on your
own port, on a phone viewport. Return the report format in
`docs/PARALLEL-TRACKS.md` §5, with evidence per subtask. **Do not edit
`TASKS.md`**; the orchestrator ticks it from your report.

## Never touch the current live sites

The new sites are new builds. Nobody on this project logs in to, fixes, changes,
freezes or switches off the existing `antiquemapsindonesia.com` or
`oldeastindies.com` setups. What we use from them is a copy: an export the owner
hands over, or — only with the owner's OK — a read-only, rate-limited read of
their public pages.

## Never, without the owner's explicit go-ahead

Writes to Helios or any server, DNS changes, production deploys, payment or
courier production credentials, and anything marked 👤 in `TASKS.md`. Secrets
never go into the repo, a build argument, a log or a chat.
