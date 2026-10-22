# Ticket 6-followup-5 — Shop product photos from the public derivatives (staging shows empty boxes)

**Lane:** sonnet (Opus reviews before merge) · **Branch:** `fix/6-shop-images` (cut from `main` AFTER `fix/6-followup-2`, the orchestrator's ResponsiveImage `unoptimized` fix and antique-map-9d's `w/5.2media` have merged) · **Report:** `docs/reports/workers/6-followup-5.md`
**Read first:** `.claude/worker-rules.md` — **foreground only, never "wait"; commit after every step.**

## The bug (staging, found by the orchestrator)
`engine/apps/web/src/server/shop/catalogue/queries.ts` `imageOf()` (≈L97–107) passes Payload's `media.url` (`/api/media/file/…?prefix=uploads`). That address answers **403** to the public, and `next/image` then answers **400 "url parameter is not allowed"** (no images config) — every product card, the product page and the home rail show an empty box.

## The fix — use 5.2.a's shared public-image helper
`w/5.2media` (antique-map-9d) adds the derivative pipeline, a backfill command and **one shared public-image URL helper** used by the gallery's item, home and browse cards. **It is on main (`03d3650`): `engine/apps/web/src/server/media/public-image.ts` — `publicImageUrl(...)` and `PUBLIC_IMAGE_SELECT` (url, alt, width, height, assetId, derivatives.status). Select `PUBLIC_IMAGE_SELECT` on the product images' media relation and call `publicImageUrl`. Its not-ready fallback is the staff-only `/api/media/file/…` (403 to the public) — for the shop, when the record is not `ready`, use the card's clean **no-image state** instead, never that fallback.** **Call that helper** for shop product images — do not re-implement the URL building below; the steps describe the intent.

Read `engine/apps/web/src/server/gallery/item/images.ts`: it builds public URLs with `@engine/media/contract` (`derivativeKey`, `DERIVATIVE_WIDTHS`, the media record's asset id and readiness) under `MEDIA_PUBLIC_URL` (nginx `/_media/`).
1. Shop image view-model (`server/shop/catalogue/queries.ts` + `view-models.ts`, and `server/shop/home/load-featured-products.ts` if it builds its own): the image URL is the **public derivative** (a sized `src` plus a `srcset` from the ladder), **only when the media record's derivatives are ready**; otherwise **no image** (the card's no-image state), never the 403 `media.url`. Select only the media fields the derivative needs.
2. Render it with `ResponsiveImage`'s new `unoptimized` prop (the orchestrator's fix — check its exact name in `shared/ui/responsive-image`), since the ladder already sized it; keep `width`/`height` to avoid layout shift.
3. Tests: a unit test that a ready media record maps to `${MEDIA_PUBLIC_URL}/derivatives/…` and a not-ready one to no image (never `/api/media/file`); the shop product e2e still passes.
4. `pnpm --filter @engine/web typecheck`, lint, `pnpm vitest run engine/apps/web/src/server/shop`, `pnpm verify`. Do not run `git merge`.

## Owned paths
`engine/apps/web/src/server/shop/{catalogue,home}/**`, `engine/apps/web/src/sites/shop/{browse,product,home}/**` (only to pass `unoptimized`), the report.
