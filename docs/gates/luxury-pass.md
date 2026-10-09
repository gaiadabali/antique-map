# Gate — phase 12, the shop's luxury pass

The user asked (2026-10-09) for the Old East Indies hero to feel luxury and premium, then for every page to follow
it. The language and its four shared pieces are recorded in `DESIGN.md` §The luxury pass.

## Releases

| Release                                | Commit   | What                                                    | Result                       |
| -------------------------------------- | -------- | ------------------------------------------------------- | ---------------------------- |
| `production-20261009T113943Z-fb7ef553` | fb7ef553 | 12.1 the home's hero                                    | healthy, try 1; smoke passed |
| `production-20261009T133403Z-aa7469b1` | aa7469b1 | 12.2–12.7 every shop page, the shared header and footer | healthy, try 1; smoke passed |

No migration in either (`git diff --name-only fb7ef553 aa7469b1 -- engine/packages/cms/src/migrations` is empty).

## Every page on staging (`aa7469b1`), 390 and 1280 px

Full-page screenshots, axe on the whole page, sideways scroll, broken images and console errors, per page and
width (the checker is a Playwright script over `@axe-core/playwright`, run from the workstation):

| Page                                    | Address                                                      | Status          | axe  | Sideways | Broken images |
| --------------------------------------- | ------------------------------------------------------------ | --------------- | ---- | -------- | ------------- |
| Home                                    | `/`, `/id`                                                   | 200             | none | no       | 0             |
| Browse                                  | `/shop`, `/id/belanja`                                       | 200             | none | no       | 0             |
| Collection                              | `/collections/bali`                                          | 200             | none | no       | 0             |
| Search                                  | `/search?q=bali`, `?q=zzzzqx` (none found)                   | 200             | none | no       | 0             |
| Product                                 | `/product/balinese-dancer-photograph-c-1927`, `/id/produk/…` | 200             | none | no       | 0             |
| Partnership                             | `/partnership`, `/id/kemitraan`                              | 200             | none | no       | 0             |
| Bag (empty)                             | `/bag`                                                       | 200             | none | no       | 0             |
| Find my order                           | `/track`                                                     | 200             | none | no       | 0             |
| Not found                               | `/no-such-page`                                              | 404 (by design) | none | no       | 0             |
| Gallery home (shared header and footer) | `indies-gallery.gaiada.com/`                                 | 200             | none | no       | 0             |

The partnership page loads the Turnstile widget, so a "network idle" wait never settles there; the page itself
answers 200 in 0.24 s and renders whole (axe clean at both widths). The not-found page's one console line is the
browser reporting its own 404.

- **Partnership form** (staging, nothing created): an empty Send is refused with "Please tell us your name.",
  "Please give a WhatsApp number or an email address." and "Please write a message of up to 2,000 characters."
  — the server action answers; a successful send is covered by `form-view.test.tsx` and `submit.test.ts`.
- **Phone menu** (390 px, staging): opens as a dialog and closes.

## The purchase path on the production build of `aa7469b1` (local, the owner's 156 designs)

- **Bag to order**, at 390 and 1280: two products added, the bag, checkout, the filled form and the submit land on
  `/order/<token>` ("We're confirming your delivery price"); axe clean and no page error at every step.
- **Pay to paid**: `tests/e2e/shop/payment.spec.ts` against that build — **6 passed**: the pending order's pay
  button (axe clean at 1280 and 390), pay then simulator Settle shows paid with the tracking link, Pending keeps the
  pay-by text, a wrong token is a 404, an expired order's "Put these back in my bag" refills the bag.

## Gates on merged `main`

`pnpm verify`'s steps: prettier, eslint, typecheck, `check:filesize`, `check:generated`, `tasks:lint`,
`tasks:check`, `check:tokens` pass; vitest 313 files and 2,697 tests pass. One file fails to load,
`engine/packages/cms/src/admin/leads/inbox.db.test.ts` (`Unknown file extension ".css"` for `react-image-crop`'s
stylesheet) — the same on `fb7ef553`, before this phase: not a phase-12 change, logged as a follow-up.

## Reviewed and fixed before merge

- The price set in the display serif on the product page, the bag and checkout totals and the order page —
  Karla only (DESIGN-SYSTEM.md §2).
- Add to bag's busy state lost: the shared `Button` writes its own `aria-busy`; the picker now uses `loading`.
- The bag's line total landing in the wrong grid column on a desktop (a base rule outranked the media query).
- Checkout's form moved before the summary in the source with CSS `order` on a phone — reading order no longer
  matched the screen; the summary is first again, the desktop columns set by the grid.
- A card with no picture repeated its name inside the window.

## Follow-ups (not blocking)

- `Pagination` has rounded corners and a filled current page; browse overrides it locally — a square, quiet variant
  belongs in `shared/ui/pagination`. On a phone the pager wraps to three rows.
- `partnership.signal*` and `product.signal*` repeat the same two facts; one shared lexicon key would do.
- The header's Collections and Stores links and the footer's About, Delivery, FAQ, Contact, Privacy and Terms point
  at pages not built yet (404).
- On a phone the floating chat button can sit over the product's options; the bag's line total sits below Remove.
- The style guide's two sample images (`/gallery/placeholder.svg`) do not load on the shop host.
