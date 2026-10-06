Task / Status: 6-followup-2 — done (continued from 6-followup-2-r1 after the first run hit its
seat limit; Part A was already committed as `1aaba38`)

Subtasks
✅ A.1 Order number shown in the `awaiting_quote` confirming state — committed in `1aaba38`
   (`sites/shop/payment/order-view.tsx`), screenshot
   `docs/gates/shop-payment/order-confirming-390.png`.
✅ A.2 "Items total" lexicon key before a fee is set — committed in `1aaba38`.
✅ A.3 `quoteReadyEmail` shows items / delivery fee / total as three lines, both languages, with a
   unit test — committed in `1aaba38`.
✅ B.1 `engine/apps/web/src/server/shop/catalogue/catalogue.ts`: every `'use cache'` scope
   (`categories`, `categoryId`, `cachedListing`, `cachedSearch`, `productEditorial`) now tags
   `catalogueTag('shop')` (as `CATALOGUE`) with `cacheLife('hours')`, mirroring the gallery's
   `b947e6f`. Availability stays outside every cached scope (`catalogue.cache.test.ts` still
   guards it). Commit `a7d7f7f`.
✅ B.2 `engine/packages/cms/src/hooks/product-invalidate.ts`: new `afterChange`/`afterDelete` hook
   pair, modelled on `work-invalidate.ts` — `changedPublishedState` (via `./published-state`) gates
   the call, `productListingTags()` returns `product:<id>` + `catalogue:shop`, and `invalidate()`
   is called with the hook's `context` so an out-of-request caller's `invalidationBatch()` collects
   the tags instead of calling `after()`. Wired onto `Products`' `hooks.afterChange`/`afterDelete`
   in `collections/products/index.ts`. Commit `a7d7f7f`.
✅ B.3 `engine/apps/web/src/server/shop/home/load-featured-products.ts`: the rail now also tags
   `catalogueTag('shop')` alongside each product's own `productTag`/`productPriceTag`, so a
   just-published product reaches the home rail without waiting on an unrelated invalidation.
   Commit `a7d7f7f`.
✅ B.4 Tests — `catalogue.cache.test.ts`: a new `describe` block asserts every cached function's
   body matches `cacheTags([CATALOGUE])` and that `CATALOGUE` is built from
   `catalogueTag('shop')` (source-level, same technique as the existing availability guard).
   `hooks/product-invalidate.test.ts` (new): mirrors `work-hooks.test.ts`'s invalidation
   `describe` — publish/edit/unpublish each expire `['product:123', 'catalogue:shop']`, a
   draft-over-draft expires nothing, a draft-over-published (the draft→draft trap) still expires,
   delete expires a published product and not a draft, and a call with no collector throws outside
   a request scope. Commit `a7d7f7f`; a prettier-formatting-only follow-up is `97cf5e5`.

Check
✅ `pnpm --filter @engine/web typecheck` — clean.
✅ `pnpm --filter @engine/cms typecheck` — clean.
✅ `pnpm vitest run engine/apps/web/src/server/shop engine/packages/cms/src/shop/notify engine/packages/cms/src/collections/products engine/packages/cms/src/hooks` —
   all green on a clean run (one timeout in the unrelated `hooks/request-temp-files.test.ts` under
   load, not reproducible in isolation — see Found).
✅ `pnpm verify` — full run exit 0: format:check, lint, typecheck (all 10 workspaces),
   `vitest run` (2253 passed, 319 skipped, 0 failed), check:filesize, check:generated, tasks:lint,
   tasks:check, check:tokens all clean.
✅ Fresh-clone verify — `git clone -b fix/6-followup-2` into the sibling `-fresh` folder,
   `pnpm install --frozen-lockfile`, a minimal `.env.local` (`CMS_TEST_POSTGRES_URL`,
   `S3_ENDPOINT`, both `127.0.0.1`), `pnpm --filter @engine/web typecheck` and
   `pnpm --filter @engine/cms typecheck` clean, the ticket's scoped `vitest run` (72 passed, 45
   skipped), then `pnpm verify` end to end: exit 0, 2253 passed / 319 skipped / 0 failed, every
   other gate (format, lint, typecheck, filesize, generated, tasks-lint, tasks-check, token-lint)
   clean — same result as in this worktree.
✅ Confirming-page screenshot at 390px — already captured for Part A
   (`docs/gates/shop-payment/order-confirming-390.png`, plus the two expired-order states); no
   further build/screenshot needed for Part B (no UI change).

Files
- `engine/apps/web/src/server/shop/catalogue/catalogue.ts`
- `engine/apps/web/src/server/shop/catalogue/catalogue.cache.test.ts`
- `engine/apps/web/src/server/shop/home/load-featured-products.ts`
- `engine/packages/cms/src/collections/products/index.ts`
- `engine/packages/cms/src/hooks/product-invalidate.ts` (new)
- `engine/packages/cms/src/hooks/product-invalidate.test.ts` (new)
- `docs/gates/shop-payment/order-confirming-390.png`, `order-expired-quoted-390.png`,
  `order-expired-unquoted-390.png` (Part A evidence, committed with Part B since they were
  uncommitted at hand-off)
- `.claude/specs/indies-platform/tickets/6-followup-2-r1.md` (the continuation ticket)
- this report

Found
- Two tests timed out exactly once each, both while a second heavy vitest/typecheck run was
  competing with them on the same machine: `hooks/request-temp-files.test.ts` (30 s) and
  `media/src/derivatives/index.test.ts`'s `strips EXIF GPS data` (5 s). Both passed cleanly when
  re-run alone, inside the full `pnpm verify` in this worktree, and inside the fresh-clone
  `pnpm verify`. Unrelated to this ticket's owned paths — flagging as load-sensitive timeouts, not
  a regression.

Follow-ups
- None beyond what's in the ticket.
