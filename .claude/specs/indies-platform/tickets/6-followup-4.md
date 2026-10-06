# Ticket 6-followup-4 — Checkout: the pin is sent at once, a pin refusal shows on the pin, and a refusal keeps what the buyer typed

**Lane:** sonnet (Opus reviews before merge) · **Branch:** `fix/6-checkout-pin-and-reset` (cut from `main`, checked out) · **Report:** `docs/reports/workers/6-followup-4.md`
**Read first:** `.claude/worker-rules.md` — **foreground only, never "wait" or schedule a wakeup; commit after every step.** Board: nothing to report.

Found on staging by the orchestrator's 7.4 run (a real Google reverse-geocode there; locally, with no Maps key, it answers instantly, so none of this shows).

## 1. The pin reaches the form only after the reverse geocode
`engine/apps/web/src/sites/shop/checkout/pin-picker.tsx` `pick()` (≈L89–98) calls `onPin(next, display)` only after `await addressFor(next)`; the form's hidden `lat`/`lng` (`checkout-form.tsx` `onPin`, ≈L72–77) stay empty until then. A buyer who sets a pin and presses **Continue to payment** before the geocode answers posts empty `lat`/`lng` → `createOrder` refuses `invalid_details` on them.
**Fix:** in `pick()`, call `onPin(next, null)` **synchronously** first, then — when `withAddress` — `onPin(next, display)` once the address arrives, **only if the pin has not moved since** (keep the latest pin in a ref; drop a stale address).

## 2. A pin refusal highlights nothing
`lat`/`lng` are hidden, so `state.fields` naming them marks no visible field. Map `delivery.lat` / `delivery.lng` (whatever names `bad()` receives — check `FieldName`) to the pin group: show the invalid-pin message (the lexicon's invalid-pin copy) on the "Pin your delivery spot" group, with `aria-invalid` / `aria-describedby` on its inputs.

## 3. Any refusal wipes the form (React 19 form reset)
`<form action={submit}>` with `useActionState` resets the form after the action, so on **any** refusal (out of stock, invalid details, price changed, …) the buyer loses everything typed — the staging snapshot shows every field blank under "Please check the highlighted fields." **Keep their input:** have `submitOrderAction` echo the submitted field values (contact, address, notes, gift note, lat/lng — never a price) in its refusal state, and render them as each input's `defaultValue` with a `key` that changes per submission so React applies them; restore the pin from the echoed lat/lng. (Or submit through `onSubmit` + `startTransition` with `preventDefault` — whichever keeps the form uncontrolled and hydration-safe; say which and why.) Server action owner: `engine/apps/web/src/server/shop/checkout/actions.ts` — the echo only, no pricing change.

## Tests (by name)
- "a pin typed then submitted at once carries lat and lng" (component test: mock `addressFor` to resolve late; submit before it resolves; the FormData has both).
- "a stale reverse-geocode address never replaces a newer pin".
- "a refusal keeps every typed field" (component or e2e: a refused submit — e.g. invalid details — and the contact/address values are still in the inputs).
- "an invalid pin is shown on the pin group".
Then `pnpm --filter @engine/web typecheck`, `pnpm vitest run engine/apps/web/src/sites/shop/checkout engine/apps/web/src/server/shop/checkout`, `pnpm verify`. If you can, run `tests/e2e/shop/gate.spec.ts` on a production build (`GATE_DB=local`, see `docs/gates/shop-payment.md`); if the build or server can't start, say so and stop. Do not run `git merge`.

## Owned paths
`engine/apps/web/src/sites/shop/checkout/**`, `engine/apps/web/src/server/shop/checkout/**`, the shop lexicon (add keys, both languages), the report.
