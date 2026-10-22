# 8·W1 — qa drive of 8.1.e and 8.3.e

**Verdict: PASS with lows** for wave 1, on `main` at 4d145cb; production builds of the gallery app
(`indies-gallery`, :4342, `indies_gallery_p8_qa`, bucket `ig-media`) and the emporium app (`test`,
the outlet, :4343, `test_p8_qa_emporium`, key `test-masters-outlet`). Both databases migrated
`initial` + `wave_a`. `pnpm verify` exit 0 (1773 tests). Evidence (screenshots at 1280 and 390 px,
drive logs) was kept in the orchestrator's session scratchpad `qa-8w1/`.

Every clause of 8.1.e and 8.3.e held, with the review fixes (8.1 S1–S3, N1, N3; 8.3 findings 1–4)
and 8.3.h. See the TASKS.md Log line for 8.1/8.3 for the clause-by-clause summary.

## D1 — should-fix (pre-existing; gates phase 8's Done when) → TASKS.md 8.6

In a production build, when the **first request that initialises Payload is an `/admin` page**,
every REST `ValidationError` afterwards loses its `data`: the admin shows only "The following
field is invalid: X" and no plain reason at the field — every collection, staff included, both
apps.

Repro: fresh `next start` → `GET /admin` → `POST /api/makers` with born 1650, died 1600 →
`{"errors":[{"message":"The following field is invalid: Died > Year"}]}`. Restart and hit
`/api/health` (or any REST route) first → the same POST returns
`data.errors[0].message: "The year of death comes before the year of birth."`. Outside Next,
Payload's REST handler returns `data` too.

qa's lead (unconfirmed): the cached Payload instance is created by the admin's server-render
bundle, so the REST bundle's `formatErrors` `instanceof ValidationError` check fails against an
error class from the other bundle's copy of `payload`. Not confirmed on a pre-wave-1 commit.

## Lows

- **L1 (8.1 terms → 10.1.f):** a grade's localised `definition` is required to publish in every
  locale — a translator publishing only the Indonesian label is refused, unlike makers/places.
- **L2 (registries → 10.1.g):** a hidden stub's admin URL (`/admin/globals/brand-settings`,
  `/admin/collections/works`) renders a blank 200 page, not a not-found.
- **L3 (8.3/15.4 → 23.4.e):** no admin UI performs the presigned master upload; `brand` is a
  required free-text field though the hook fills it.
- **L4 (CI → 10.3.f):** the db suites time out (Postgres connect, ECONNRESET) when run in
  parallel locally; each passes alone.
- **L5 (8.3, cosmetic → 10.1.f):** the master size refusal uses decimal units ("6.4 GB … at most
  5.4 GB" for 6 GiB / 5 GiB); Payload truncates the field-error tooltip.

Axe on the admin (informative): Payload's own label, button-name and colour-contrast violations.
