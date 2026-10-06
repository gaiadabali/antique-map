# Ticket 6qa-r2 — Finish the 6qa redo (continuation on Sonnet)

**Lane:** sonnet (Opus reviews before merge) · **Branch:** `w/6qa` (already checked out; work in place)
**Spec:** `tickets/6qa-r1.md` (the rejected points), then `tickets/6qa.md`. Read both in full.

## Where it stands
Run `am-6qa-s2` seeded the shop layer with `pnpm --filter @engine/cms run seed --layer shop` (output in `seed-out*.txt`; check that it finished, and re-run it if not). It collected the real pricing test names (77/77 pass) and was about to run the orders db tests three times when it hit the seat's session limit. **It committed nothing.**

Main now carries the `shop-e2e` Playwright project (`d74b551`); **`git merge main` first** and do not edit `playwright.config.ts` yourself. Every point of `6qa-r1.md` is still open: rewrite `tests/e2e/shop/product.spec.ts` against the real markup with unconditional assertions; run it on a production build with `--project shop-e2e`; take screenshots; correct the 6.2.d and 6.3.d mappings to real names and lines; report the planted-bug result exactly; write `docs/reports/workers/6qa.md`. Commit after each step. Delete `seed-out*.txt` before the last commit. Never tick a Check.
