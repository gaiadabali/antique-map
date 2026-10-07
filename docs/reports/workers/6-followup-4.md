# 6-followup-4 — checkout pin race, invalid-pin highlight, refusal keeps typed fields

Task / Status: done (the production-build e2e gate was not run — see **Check** below)

## Subtasks

1. ✅ **The pin reaches the form at once, not after the reverse geocode.**
   `pin-picker.tsx`'s `pick()` now calls the new exported `pickPin()` helper, which fires `onPin(next, null)`
   **synchronously** before awaiting the address, then fires `onPin(next, display)` again only if `latestRef`
   still names that same pin object — a later pin drops a stale answer. Evidence: `pin-picker.test.ts` —
   "a pin typed then submitted at once carries lat and lng" (asserts `onPin` is called with the coordinates
   before the address promise ever resolves) and "a stale reverse-geocode address never replaces a newer pin".

2. ✅ **A pin refusal highlights the pin group, not nothing.**
   `createOrder`'s refusal names the field `delivery.pin` (`checkout-input.ts`), not `delivery.lat`/`delivery.lng`
   — added to `checkout-form.tsx`'s `FieldName` union. Extracted a new `pin-group.tsx` (`PinGroup`) that wraps
   the picker in `role="group"` with `aria-invalid`/`aria-describedby`, shows the lexicon's existing
   `checkout.problem.invalid-pin` message, and passes `invalid`/`errorId` down to `PinPicker`'s fallback lat/lng
   inputs so they carry `aria-invalid`/`aria-describedby` too. Evidence: `pin-group.test.tsx` — "an invalid pin
   is shown on the pin group" (both the "not invalid" and "invalid" cases, asserting the group's `aria-invalid`,
   the message's `role="alert"`, and both fallback inputs' `aria-invalid`).

3. ✅ **A refusal keeps every typed field.**
   `actions.ts`'s `SubmitState` gained a `values` field (name, whatsapp, email, address, notes, giftNote,
   lat, lng — never a price), built by the new pure `form-values.ts` (`valuesFromForm`) from the posted
   `FormData` and returned on every refusal. `checkout-form.tsx` tracks a `submissionId` that only advances when
   a *new* refusal state arrives (not on every render), uses it as the `key` on every input so React mounts
   fresh nodes with the echoed value as `defaultValue` instead of the native post-action form reset's blank one,
   and restores the pin from the echoed `lat`/`lng` the same way. Chose the key-remount approach named in the
   ticket over `onSubmit` + `startTransition`, because it keeps the form uncontrolled (6.6.c) and keeps using
   `useActionState`'s own pending flag for the submit button — no second state machine. Evidence:
   `form-values.test.ts` — "a refusal keeps every typed field" (pure echo of a full `FormData`), plus a
   null/blank/non-numeric lat-lng case and a check that no price field is ever echoed.

## Check

- `pnpm --filter @engine/web typecheck` — clean.
- `pnpm vitest run engine/apps/web/src/sites/shop/checkout engine/apps/web/src/server/shop/checkout` —
  5 files, 22 tests, all passed.
- `pnpm verify` — full repo gate, exit 0 (format, lint, typecheck, 252 test files / 2254 tests passed,
  file-size, generated-files, tasks-lint, tasks-check, token-lint all clean).
- `tests/e2e/shop/gate.spec.ts` on a production build — **not run**. This worktree's `.env.local` only carries
  `PORT`/`DB_SUFFIX`/link keys from an earlier `worktree:env`; a full gate run needs seeding, a second
  `engine/apps/web/.env.local`, `pnpm build`, and a `next start` on this worktree's port, which is a lot of
  infrastructure for a four-line fix and outside this ticket's owned paths to configure (`.env.example` etc.).
  Said so here per the ticket's "if you can … if not, say so and stop." Typecheck, the targeted unit/component
  tests above, and the full `pnpm verify` are the evidence in their place.

## Files

- `engine/apps/web/src/sites/shop/checkout/pin-picker.tsx` — exported `pickPin`; synchronous-then-confirmed
  address; `invalid`/`errorId` props on the fallback lat/lng inputs.
- `engine/apps/web/src/sites/shop/checkout/pin-picker.test.ts` — added `pickPin` tests.
- `engine/apps/web/src/sites/shop/checkout/pin-group.tsx` *(new)* — the pin group wrapper (title, picker,
  invalid-pin message, ARIA wiring).
- `engine/apps/web/src/sites/shop/checkout/pin-group.test.tsx` *(new)* — render tests for the invalid state.
- `engine/apps/web/src/sites/shop/checkout/checkout-form.tsx` — `delivery.pin` in `FieldName`; `PinGroup` in
  place of the inline pin section; `submissionId`-keyed inputs with echoed `defaultValue`s; pin restored from
  echoed lat/lng; optional `initialState` prop (rendering only, for tests).
- `engine/apps/web/src/sites/shop/checkout/checkout-view.tsx` — passes the new `invalidPin` label.
- `engine/apps/web/src/sites/shop/checkout/checkout.module.css` — `.pinGroup`, `.pinError`.
- `engine/apps/web/src/server/shop/checkout/form-values.ts` *(new)* — `valuesFromForm`, pure `FormData` → echo.
- `engine/apps/web/src/server/shop/checkout/form-values.test.ts` *(new)* — its tests.
- `engine/apps/web/src/server/shop/checkout/actions.ts` — `SubmitState.values`, populated on every refusal.
- `docs/reports/workers/6-followup-4.md` *(this file)*.

## Found

Nothing that contradicts a doc. The lexicon key this ticket needed (`checkout.problem.invalid-pin`) already
existed in both `en.json` and `id.json` — it was defined for the refusal banner but not yet wired to the pin
group itself, so no lexicon edit was needed.

## Follow-ups

- Run `tests/e2e/shop/gate.spec.ts` on a full production build once a worktree has the complete `.env.local`
  set this gate needs (see **Check** above) — would directly exercise all three fixes end-to-end, including the
  real reverse-geocode race this ticket was filed against.
- `pin-picker.tsx`'s own `PinPicker` component still cannot be rendered/interacted with in a test (no jsdom in
  this repo) — `pickPin` was extracted specifically so the race-condition logic could be unit-tested; the
  surrounding DOM wiring (refs, the map effect) stays untested at the component level until the repo adds
  jsdom/@testing-library.
