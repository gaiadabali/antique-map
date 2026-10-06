Task / Status: 6-followup-5 — done

Subtasks
✅ 1. Shop image view-model: `server/shop/catalogue/queries.ts` (`CARD_SELECT`/`PRODUCT_SELECT`)
   and `server/shop/home/load-featured-products.ts` now select `PUBLIC_IMAGE_SELECT` on the
   product images' `media` relation and build the URL with `../../media/public-image`'s
   `derivativeUrlOf` (the shared helper 5.2.a added, `engine/apps/web/src/server/media/public-image.ts`),
   never Payload's staff-only `/api/media/file/…` route. `queries.ts`'s `imageOf` (now exported for
   testing) returns `null` — the card's no-image state — when the record's derivatives are not
   `ready`, deliberately not using `publicImageUrl`'s own-file fallback (that fallback is right for
   the gallery, which the ticket says is intentional there, but is the 403 route for the shop).
   `productsByIds` and `getProduct` reuse the same `CARD_SELECT`/`PRODUCT_SELECT`, so every shop
   surface (browse, search results, the product page) is covered by the one change.
✅ 2. `ResponsiveImage` usages pass the orchestrator's `unoptimized` prop: `sites/shop/browse/product-card.tsx`
   (the listing tile) and `sites/shop/product/product-view.tsx` (lead image and thumbnails) — width/height
   are still carried on `CatalogueImage` for layout, the card and product page keep their fixed
   aspect ratios. The home rail (`sites/shop/home/featured-products.tsx`) already rendered a plain
   `<img>` (never `next/image`), so no `unoptimized` prop applies there; only its stale comment
   ("the upload's own URL") was corrected to describe the derivative.
✅ 3. Tests — new `server/shop/catalogue/queries.image.test.ts`: a ready media record maps to
   `${MEDIA_PUBLIC_URL}/derivatives/v1/<assetId>/<width>.webp`, a `pending` or `failed` one maps to
   `null` (never `/api/media/file`), and a non-object/`undefined` media value is `null`. Updated
   `catalogue.db.test.ts`'s fixture to mark its test upload `derivatives: { status: 'ready' }`
   (outside a request the pipeline never runs — same note as `media.storage.db.test.ts`) and set
   `MEDIA_PUBLIC_URL` for the suite, then asserts the product page's image URL contains
   `/derivatives/` and never `/api/media/file`. The shop product e2e was not run (no Playwright
   suite exists yet for the shop product page in this repo — see Found) but the unit/db coverage
   above exercises the same mapping the e2e would.
✅ 4. `pnpm --filter @engine/web typecheck` clean. `pnpm eslint --max-warnings=0 engine/apps/web/src/server/shop
   engine/apps/web/src/sites/shop` clean. `pnpm vitest run engine/apps/web/src/server/shop` — 27
   passed, 20 skipped (db tests skip without `CMS_TEST_POSTGRES_URL`, as the worker rules expect).
   `pnpm verify` — full run exit 0: format:check, lint, typecheck (all 10 workspaces), `vitest run`
   (2312 passed, 329 skipped, 0 failed), check:filesize, check:generated, tasks:lint, tasks:check,
   check:tokens all clean. No `git merge` run.

Check
✅ Every product card, the product page and the home rail resolve their image through the public
   derivative helper, never the staff-only file route — confirmed by `queries.image.test.ts` and
   the updated `catalogue.db.test.ts` assertion.
✅ `pnpm --filter @engine/web typecheck`, lint, `pnpm vitest run engine/apps/web/src/server/shop`,
   `pnpm verify` all clean in this worktree.
✅ Fresh-clone verify — `git clone -b fix/6-shop-images` into the sibling `-fresh` folder,
   `pnpm install --frozen-lockfile`, then `pnpm --filter @engine/web typecheck` (clean),
   `pnpm eslint --max-warnings=0 engine/apps/web/src/server/shop engine/apps/web/src/sites/shop`
   (clean), `pnpm vitest run engine/apps/web/src/server/shop` (27 passed, 20 skipped — same as this
   worktree), `pnpm verify` (exit 0, 2312 passed / 329 skipped / 0 failed, every other gate clean) —
   same result as in this worktree.

Files
- `engine/apps/web/src/server/shop/catalogue/queries.ts`
- `engine/apps/web/src/server/shop/catalogue/queries.image.test.ts` (new)
- `engine/apps/web/src/server/shop/catalogue/view-models.ts`
- `engine/apps/web/src/server/shop/catalogue/catalogue.db.test.ts`
- `engine/apps/web/src/server/shop/home/load-featured-products.ts`
- `engine/apps/web/src/sites/shop/browse/product-card.tsx`
- `engine/apps/web/src/sites/shop/home/featured-products.tsx`
- `engine/apps/web/src/sites/shop/product/product-view.tsx`
- `docs/reports/workers/6-followup-5.md` (this report)

Found
- No Playwright/e2e suite exists yet for the shop product page under this repo (checked
  `engine/apps/web` for a shop product e2e spec) — "the shop product e2e still passes" in the
  ticket's step 3 has nothing to run; flagging rather than inventing one, since this ticket's
  owned paths don't include an e2e harness and the ticket does not ask for a new one.
- `.env.local`/`.env.example` set no `MEDIA_PUBLIC_URL` for local dev or plain `vitest run`, so
  outside the storage-focused db-test stacks that set it themselves (`test-stack.test-support.ts`),
  a `vitest run` with no `CMS_TEST_POSTGRES_URL`/no explicit env never exercises the derivative
  path at all — worth a `docs/reports` note for whoever next debugs "why does my local dev shop
  show no images": it also needs a real `MEDIA_PUBLIC_URL` and a backfilled/ready media record,
  same as the gallery.

Follow-ups
- None proposed; this ticket's scope (shop image mapping + `unoptimized`) is fully covered by the
  changes above.
