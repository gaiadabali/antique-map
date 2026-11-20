# Gate — the shop's admin with a person (27.7)

QA seat, run on 2026-11-16 in the main checkout (`plan-v2/phase-a`, HEAD `9d9d30e5` with phases 21–27 uncommitted),
on a **production build** (`pnpm build`) served on port 4861 against the database `indies_p27_cms` (Docker
Postgres; MinIO and Mailpit from the dev stack), with CI's server settings (`e2e.yml`: `MIDTRANS_MODE=simulate`,
Turnstile's test keys, `CRON_SECRET`, Mailpit SMTP). Screens are in [`shop-admin/`](shop-admin/).

> **Status: evidence gathered; the orchestrator ticks the Check.** Every §6 target of
> [`old-east-indies-cms.md`](../../old-east-indies-cms.md) is met **at a person's pace — a modelled first-timer,
> not real people**. The run with two or three of the owner's people (OA9, 27.7.b 👤) has **not** happened and is
> the owner's to arrange. Axe is clean on every admin screen phase 27 touches, at 390 and 1280 px, with Payload's
> own widgets excused only as the 27.x specs already excuse them. `pnpm verify`, `pnpm test:db` and the full e2e
> results are below. **Not claimable from here: "CI green"** — nothing is committed or pushed.

## 1. The §6 targets, timed at a person's pace

**Method (not real people).** Each task is driven through the admin UI only, following its recipe in
[`CONTENT-OPERATIONS.md`](../CONTENT-OPERATIONS.md), at the first-timer pace of
`tests/e2e/admin-usability/human/pace.ts`: 6 s to hear the task, 2.5 s to read a step and find its control before
each click (1.5 s per tap on a phone), 2 s to glance at each new page (at most 5 s waiting for it to settle),
four characters a second typing, 6 s per file dialog; every pause varied ±35 % from a seed. The clock runs from
the task's start to the saved state, the server's own time included; screenshots are left out of it. The specs:
`tests/e2e/admin/shop-admin-timed.spec.ts` (+ `shop-admin-timed-hero.ts`), `site-navigation-timed.spec.ts`,
`staff-timed.spec.ts`. Times from the last full e2e run on the final build (2026-11-16; the run before it
gave the same within ±2 s), kept in [`shop-admin/timings.txt`](shop-admin/timings.txt).

| §6 task                                                         | Recipe   | Width      | Target | Measured                                                       | Clicks · keys | Verdict        |
| --------------------------------------------------------------- | -------- | ---------- | ------ | -------------------------------------------------------------- | ------------- | -------------- |
| Add a product, 6 photos, 2 variants, stock at 3 stores, publish | 4.1      | 1280       | 2:30   | **1:35.9**                                                     | 23 · 117      | pass           |
| Update one product's count at one store (store user)            | 4.5      | 390        | 0:20   | **0:16.5**                                                     | 4 · 11        | pass           |
| Change the home hero's picture and title, with the preview      | 5.1      | 1280       | 1:00   | **0:43.5**                                                     | 8 · 30        | pass           |
| Add a menu item                                                 | 5.2      | 1280       | 0:30   | **0:26.6**                                                     | 6 · 7         | pass           |
| Put up a dated promotion announcement                           | 5.3      | 1280       | 0:45   | **0:36.5**                                                     | 5 · 61        | pass           |
| Take an order to Delivered (store user, with the driver photo)  | 6.1      | 390        | 0:45   | **0:32.4**                                                     | 7 · 0         | pass           |
| Move an order to another store, with a reason                   | 6.2      | 390        | 0:30   | **0:23.0**                                                     | 4 · 18        | pass           |
| Add a store user (owner) and sign in as them (their phone)      | 7.3, 3.1 | 1280 + 390 | 1:00   | **0:57.1** (the run before: 39.1 owner + 19.8 new user = 58.9) | 10 · 80       | pass, narrowly |

What each run does and checks, beyond the clock:

- **Product:** six photos chosen at once, named as a phone exports them (`photo-1.jpg` … `photo-6.jpg`, the same
  names every run); two variants from the builder; counts at three stores; Published. Checked in the database:
  `_status = published` and six `stock_levels` rows. The product is removed afterwards.
- **Count:** the store user's own column only; the stored quantity follows the count. Put back afterwards.
- **Hero:** Pages → search "Home" → the hero unfolded (if folded) → new title → a picture chosen from the media
  library → **Save Draft** → the new title read **inside the Live Preview frame** → **Publish changes**; done when
  the published page holds the title. The home is put back.
- **Menu item / announcement:** saved, then seen on the shop's header at 390 and 1280; the navigation is put back.
- **Order:** Start packing → Packed — book a driver → the driver's photo (MinIO) → Driver collected it → Mark
  delivered, each move checked in the database; another store's order stays out of reach (`orders-door.spec.ts`).
- **Reassign:** to the fixture store that holds every item, with a reason; checked in the database.
- **Store user:** the owner types the store's **code** into the new store finder (as many characters as leave one
  store, here `AMD-001`), name, email, a 12+ character password, **Add**; the new person signs in on a phone and
  lands on their orders. The account is removed afterwards.

**The store user's target was missed before this task** (62.9 s, 27.6.d): the add-staff form's store was a
native list of 123 stores whose names all begin "Seed store, …" (real stores will share "Old East Indies …"), and
the browser's type-ahead matches only the start of a name. 27.7 replaced it with a **store finder**
(`engine/packages/cms/src/admin/staff/store-picker.jsx`): a box that narrows the list as the owner types any part
of a store's name, code or area, choosing the store when one is left; and an **Add staff for this store** button
in each store's sidebar, which opens the form with the store already chosen (`?store=<id>`). The fixture keeps
the seed's hard names: 57.1 s and 58.9 s with them. The margin is small; the store button is the quicker path when the owner
starts from the store.

## 2. Axe on every admin screen, 390 and 1280 px

`tests/e2e/admin/shop-admin-gate.spec.ts` opens each screen as its role, at both widths, and runs axe on the
whole page. Nodes of Payload's own widgets are excused **only by the pattern `admin-home-menu.spec.ts` (27.6)
already uses** (F6 of `foundation.md`: react-select, the popup buttons, the document tabs and controls, the array
drag handle, the date picker, the group heading, the upload widget's file details, the select-all box) and counted
per screen in `test-results/shop-admin-axe.json` (kept as [`shop-admin/axe-excused.json`](shop-admin/axe-excused.json)); its old excuse for the Live Preview frame is **dropped**, since
27.7 titles the frame. Every other node fails the test. All passed:

| Screen (role)                               | Shots                                         |
| ------------------------------------------- | --------------------------------------------- |
| Sign-in (nobody)                            | `login-{390,1280}.png`                        |
| Dashboard (owner)                           | `dashboard-owner-{390,1280}.png`              |
| Dashboard → their Orders (store user)       | `dashboard-store-{390,1280}.png`              |
| Sidebar (owner, editor, store user)         | `sidebar-{owner,editor,store}-{390,1280}.png` |
| Product editor, product list                | `product-editor-*`, `products-list-*`         |
| Orders door (inbox)                         | `orders-door-{390,1280}.png`                  |
| Stock by store (owner; store user's column) | `stock-matrix-*`, `stock-matrix-store-*`      |
| Import from a spreadsheet                   | `import-{390,1280}.png`                       |
| A page with its Live Preview open           | `page-live-preview-{390,1280}.png`            |
| Header, Footer                              | `header-*`, `footer-*`                        |
| Media list                                  | `media-list-{390,1280}.png`                   |
| Staff list, Add a staff member              | `staff-list-*`, `staff-add-*`                 |
| Site settings                               | `site-settings-{390,1280}.png`                |
| Stores list                                 | `stores-list-{390,1280}.png`                  |

The task specs of 27.2–27.6 (`product-editor`, `orders-door`, `stores-stock`, `admin-home-menu`,
`media-files`) ran in the same e2e run with their own axe checks (the order page, reassign sheet, packing slip,
the store location field, the discount, image and page editors) and passed. The timed runs' own screens are
`timed-*.png`; the site as the admin left it, `site-*.png`, `home-*`, `partnership-*`, `stores-*`, `privacy-*`,
`product-*` (both languages, both widths).

**Payload markup 27.7 put right rather than excuse** (`engine/packages/cms/src/admin/a11y/mends.jsx`, a client
effect rendered with the sidebar, in the admin's language): the Live Preview `<iframe>` gets a title (axe
`frame-title`); the Media list's thumbnails, whose alt text repeated the file name beside it, become decorative
(`image-redundant-alt`); a chosen picture's icon-only edit and remove buttons get names (`button-name`); a sections
field's `h3` under the page's `h1` is announced at level 2 (`heading-order`); a list's sort buttons get their
column's words in place of "[object Object]" (defect 3).

## 3. Defects fixed in 27.7

| #   | Defect                                                                                                              | Fix                                                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | A video's or PDF's edit header showed its ID (`useAsTitle: 'alt'`)                                                  | A derived, hidden, localized `label` (alt text for an image, the title for a video or PDF, else the file name), set on every save, used as the title; migration `20261116_061814_media_label` (column + backfill)                                                                                                                                                           | `label.test.ts`; gate spec "a file's header" (`media-file-header-1280.png`); up/down/up on `indies_p27_cms` |
| 2   | The Live Preview frame had no title                                                                                 | Named by the client mend (§2)                                                                                                                                                                                                                                                                                                                                               | gate spec asserts the title; axe without the frame excuse                                                   |
| 3   | The staff list's sort buttons read "Sort by [object Object]"                                                        | Payload 3.90's `SortColumn` puts a `{ en, id }` column label into the button's name raw (every list with bilingual columns, not only Staff). The client mend (§2) puts the column's own heading words in its place. (Label functions would also fix it, but the CMS's `labels.test.ts` holds every label to a plain `{ en, id }` pair, so the field config stays as it is.) | gate spec: no `[object Object]` on the Staff list, "Sort by Role Ascending"                                 |
| 4   | Six photos with names already in the library (`photo-1.jpg` …) failed "Value must be unique" when uploaded together | Payload's free-name pick races across the editor's three parallel uploads; a unique-name refusal is now retried after a short jittered pause (`photos-client.jsx`)                                                                                                                                                                                                          | the timed product run uploads the same six names every run                                                  |
| 5   | The product's "See the original" offered "Add new [object Object]"                                                  | `allowCreate: false` (an antique is picked, never made from a product)                                                                                                                                                                                                                                                                                                      | product editor axe                                                                                          |

## 4. Checks

| Check                                                                                                       | Result                                                         |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm verify` (format, lint, typecheck, unit tests, file size, `check:generated`, tasks lint/check, tokens) | **green** — 362 files, 3003 tests passed, 7 skipped            |
| `CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm test:db`                   | **green** — 88 files, 415 tests passed, 25 skipped             |
| Full e2e (`playwright test`, 227 tests) on the final production build                                       | **205 passed, 20 skipped, 2 failed** — neither phase 27's (§5) |
| Back-to-back e2e runs against one server, no sign-in 429                                                    | **yes** — §5                                                   |
| Migration `20261116_061814_media_label` up → down → up on `indies_p27_cms`                                  | clean; 574 locale rows labelled, none empty                    |

## 5. The e2e suite

Run with `E2E_PORT=4861 DB_SUFFIX=p27_cms E2E_OBJECT_STORAGE=1 GATE_DB=local`, three workers, and the server above;
on this Windows laptop the test runner's Node does not resolve `*.localhost` (CI maps them in `/etc/hosts`), so
the runner — never the server — was given a resolver hook mapping them to loopback (outside the repo).

**Result on the final build: 205 passed, 20 skipped (the staging-only and opt-in cases), 2 failed:**

- `a11y/phase-4.spec.ts` "the partnership page leads to an apply form" — **data, not phase 27**: this database's
  partnership page was made on 2026-10-21 with its enquiry form at `#enquire` (the column's default) while the
  page's buttons and the seed use `#apply` (§6). A fresh seed gives `apply`.
- `a11y/chat.spec.ts` (gallery) "chat: keyboard walk" — **flaky, not phase 27**: Turnstile's widget frames were
  still mounting at 390 px; it passed in the run before and alone straight after (1 passed).

The first run of the day also failed smoke/status (the resolver, above), `payment.spec.ts` and the gallery
contact/leads specs (the server lacked CI's `MIDTRANS_MODE=simulate` and Turnstile test keys) and
`gallery/pages.spec.ts` (the seed scripts lacked `REVALIDATE_ORIGIN`): environment, all green once set as CI
sets them. Specs fixed
for phase 27 in this task: `shop/gate.spec.ts` (K2 — the staff-quote journey and the abandoned orders pin past
the last distance band, Jakarta; the in-band price is `checkout-delivery.spec.ts`'s; the "confirmed by our team"
line is now the delivery line's promise; products that add in one click include an in-stock preselected variant),
`shop/site-navigation.spec.ts` (sets the Indonesian bottom line it reads), `shop/stock-freshness.spec.ts` (it read
the developer's own database from the root `.env.local`; now the worktree's, as every other spec),
`admin/staff-timed.spec.ts` (the store finder). New: `shop-admin-timed.spec.ts`, `shop-admin-gate.spec.ts`.

**Sign-in rate limit (10 per address per 15 min, in memory).** The suite already signed each account in once per
run; two runs back to back still spent eight sign-ins and the third tripped it. `tests/e2e/support/sessions.ts` now
keeps the tokens in `.cache/e2e/sessions-<port>.json` (git-ignored, outside `test-results/`, which Playwright
empties) and the global setup reuses each one while `GET /api/users/me` accepts it, signing in only those the
server refuses (a restart's new `PAYLOAD_SECRET`, a switched-off account). A form sign-in a spec makes is saved
too. Nothing in the server changes; the limiter is untouched. Evidence: after one restart, nine runs against the
same server inside an hour (the gate spec, two full suites, the reruns, and the `admin` project twice back to
back, 11 passed each) — the sessions file's checksum unchanged across the last two, no 429 anywhere; before, the
third run tripped the limit.

## 6. For the owner

- **The real-people run (OA9, 27.7.b 👤):** two or three of the team, one from a store, each given only the recipe
  (`CONTENT-OPERATIONS.md`), on staging, their own phone for the store tasks. These times are a model's.
- **Delivery bands to set** (Site settings → Old East Indies → Checkout and delivery → Distance bands): since K2 a
  pin inside the bands is priced at checkout; beyond the last one the order waits for a staff quote.
- **Emails' wording:** each email's subject and opening paragraph, per language — "Order received" first — under
  Notifications and email.
- **Store names and codes:** the store finder matches name, code and area; real codes make it quickest.
- **PDF links:** served with `Content-Security-Policy: sandbox`; that Chrome's built-in PDF viewer shows a sandboxed
  PDF inline was not verified here (a download is the fallback).
- **The partnership page in `indies_p27_cms`** has its enquiry form at `#enquire`, while the page's own buttons and
  the seed use `#apply` (the column's default is `enquire`): its "Apply" links do not scroll to the form in that
  database. Re-seed the page or set the form's anchor to `apply` (Pages → Partnership → the enquiry section).
