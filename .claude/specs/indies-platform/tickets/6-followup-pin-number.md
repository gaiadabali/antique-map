# Ticket 6-followup — the typed-pin (0, 0) race and the order-number separator

**Lane:** sonnet (Opus reviews before merge) · **Branch:** `fix/6-pin-and-number` (cut from `main`, checked out) · **Report:** `docs/reports/workers/6-followup-pin-number.md`
**Board:** nothing to report (phase 6 is closed; these are follow-ups found by its staging gate, `docs/gates/shop-payment.md` §Staging result).

## 1. The typed pin
`engine/apps/web/src/sites/shop/checkout/pin-picker.tsx:215-219` — `typeLatLng` does `Number(lat)`, `Number(lng)` and picks when both are finite. `Number('')` is `0`, so while one field is still empty the form holds a pin near (0, 0); a buyer who presses Continue in that moment is refused "We deliver within Indonesia only" (seen on staging, 2026-10-06).
**Fix:** a value counts only when its trimmed text is non-empty and parses to a finite number (one small pure helper, e.g. `parseCoordinate(text): number | null`). Until **both** parse, there is no pin: clear any previously picked pin from typing, so the form's existing "no pin" state applies (find how the checkout form disables Continue or answers a missing pin — reuse that, do not invent a new state). Also reject a pasted Maps link the same way if it goes through the same path.
**Tests:** unit-test the helper (`''`, `'  '`, `'-'`, `'abc'`, `'-8.6705'`, `'115.2126'`, `'1e400'`); a component or e2e test: typing only the latitude leaves no pin (Continue disabled, or the form's own no-pin answer), and typing both picks the pin.

## 2. The order number's thousands separator
The order number shows as "Order 100,001" (page) and "Your order 100,001" (email subject). The lexicon's interpolation formats numeric params with grouping. An order number is an identifier, never a quantity.
**Fix:** wherever an order number is interpolated (`order.title`, `email.subject`, `email.body`, `tracking.title`, `tracking.whatsappMessage`, and any other — `grep -rn "{number}" engine/apps/web/src/sites/shop`), pass it as a plain string (`String(order.number)`), not a number. Do not change the interpolation helper's number formatting (prices rely on it).
**Tests:** a unit test per surface that "Order 100001" renders with no separator in both `en` and `id`. Then fix the specs that matched the separator: `tests/e2e/shop/payment.spec.ts` (`orderHeading` uses `toLocaleString`) and `tests/e2e/shop/gate.spec.ts` (`/Order ([\d,]+)/`) — match the plain number.

## Owned paths
`engine/apps/web/src/sites/shop/{checkout,payment,tracking}/**`, `engine/apps/web/src/server/shop/{checkout,payment,tracking}/**`, `tests/e2e/shop/{payment,gate}.spec.ts`, the report. Nothing else.

## Verify (paste output)
`pnpm --filter @engine/web typecheck`, `pnpm vitest run engine/apps/web/src/sites/shop engine/apps/web/src/server/shop`, `pnpm verify`, `pnpm build`. Then on a production build on your port: `GATE_DB=local E2E_PORT=<port> pnpm exec playwright test --project=shop-e2e --workers=1 tests/e2e/shop/payment.spec.ts tests/e2e/shop/gate.spec.ts` (the local fee table comes from payment.spec's setup). Commit after each part, explicit paths. Do not run `git merge`.
