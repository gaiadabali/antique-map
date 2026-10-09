# Gate — the timed admin tests (10.4)

> **Orchestrator review, 2026-10-09.** (1) **Recipe 5 is not broken, and passes with a stumble:** the shop's Distance bands and Social links rows were *collapsed* (Payload keeps each user's collapsed rows), and a collapsed row shows only its header, so it looked empty. **Show All** opens them: bands 5 km Rp 10,000 / 15 km Rp 15,000 / 30 km Rp 20,000, editable; the shop's AI group and Free delivery over render on every load. (2) Fixed: **F1** and **F2** (the dashboard's Orders to act on and New leads open the panel and the inbox), **F3** ("Rentang jarak"), and a new **Order panel** link in the sidebar for owner, editor and store staff (`admin/orders/nav-link.jsx`) — the cause of recipe 4's "not unaided". (3) The gaps that are features, not fixes, are tasks **10.7** and **10.8** in TASKS.md.

**Task:** TASKS.md 10.4 · **Environment:** Helios staging (`old-east-indies.gaiada.com/admin`) · **Run:** 2026-10-09, twice (`run1`, `run2`) · **Status:** 10.4.a **not met** — the owner's people have not run it; this file holds the qa agent's proxy run only.

## Proxy run by the qa agent — not the owner's team (10.4.a still needs them)

The user asked us to test ourselves what would otherwise wait for the owner's people. A Playwright suite
(`tests/e2e/admin-usability/`) did each recipe the way a new staff member would, **through the admin UI only** (clicks
and typing, no REST shortcut for the recipe itself), at 1280 px, and again at 390 px for the store user's steps, with the
staging staff accounts (owner, and the DPS-004 store user). Nothing here replaces 10.4.a, and the **10.4.c Check
stays open**: it needs each real person's times, and a real store user doing the status steps without help.

**Read the times as a floor.** A script does not read, think or hunt: it types a field in milliseconds and a page
loads in about a second. Add roughly 3 s per click or page and 1 s per 4 characters typed for a person who has the
recipe in front of them, and far more for a first-timer who must find things (see the stumbles). The times below are
the machine's; the **findings** (what is missing, wrong or misleading) are the useful part, because they do not
depend on speed. Every recipe was run twice with the same outcome; run 1 and run 2 differ by under a second.

How to repeat it (credentials load from Helios into the process only, never printed or written):
`bash tests/e2e/admin-usability/pw.sh` from the repo root (the staging login is rate limited: a session is reused, a 429
is waited out; checkout is limited to 10 orders an hour per IP, and the suite places two per run). Per-recipe numbers
are appended to `docs/gates/admin-usability/results.ndjson`, what the run created to `created.ndjson`, screenshots
to `docs/gates/admin-usability/shots/`.

## Result per recipe

| #   | Recipe (CONTENT-OPERATIONS)                                | Target              | Machine time (run 1 / run 2)                  | Clicks · loads | Verdict                                                           |
| --- | ---------------------------------------------------------- | ------------------- | --------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| 1   | Add and publish a product, stock at 3 stores (3.3)         | < 3 min             | 11.6 s / 11.6 s (published after 5.3 s)       | 14 · 25        | **PASS**, with stumbles                                           |
| 2   | Import a stock spreadsheet (3.5)                           | < 10 min            | n/a                                           | n/a            | **FAIL** — there is no import screen                              |
| 3   | Work a lead: statuses and a note (4.1)                     | < 1 min             | 3.6 s / 3.5 s                                 | 5 · 6          | **PASS** for statuses and note; Reply buttons missing             |
| 4   | Store user: order to Delivered (5.1)                       | 2 taps, 10 s a step | 1280: 8.3 s / 9.2 s; 390: 8.9 s / 9.3 s       | 11 · 27        | **FAIL** — not unaided: the list does not lead to the buttons     |
| 5   | Edit the delivery fees (6.3)                               | < 2 min             | 9.6 s / 10.0 s to find that it cannot be done | 1 · 9          | **FAIL** — the band rows open empty                               |
| 5b  | What "delivery fee" means here: the owner prices one order | —                   | 1280: 2.9 s / 3.6 s; 390: 2.8 s / 3.8 s       | 3 · 11         | works, but only at an address nothing links to                    |
| 6   | Create a replacement order (5.5)                           | < 2 min             | 3.8 s / 4.5 s to find that it cannot be done  | 2 · 10         | **FAIL** — Replace damaged item does not exist (rehearsal.md R-2) |

Verdicts count what a person can do, not speed. Recipe 4 steps, per run: dashboard to the orders list 2.0 s (1 tap),
open the order 1.2 s (1 tap), then Processing 1.0 s, Waiting for driver 1.0 s, driver picture 1.1 to 1.5 s, On the way
1.0 s, Delivered 1.0 s, **two taps each** (the button, then Confirm; the picture takes a file choice and a button). So
once the store user is on the order's **panel** the steps meet "two taps, under 10 s" at both widths, and nothing was
wider than the 390 px screen on any screen the store user saw (overflow 0 px on every one). The recipe still fails
because they are not on the panel by themselves (stumble S1).

## Recipe by recipe: stumbles

**1. Product (PASS).** Dashboard card Products, Create New, SKU, name, description, category, an image through the
Create New drawer, price, Publish, then Stock, Create New, three times. The public page answered 200 at once and 404
at once after Unpublish.

- The new image needs **four required fields with no default**: Alt text, Subject, Role, Provenance (a Save with
  Provenance empty is refused with "This field is required"). For a staffer adding product photos this is the
  slowest part and the target's biggest risk; a product image could default Subject to Product and Provenance to
  Photograph.
- **Category** opens on the condition grades (VG+, VG, G+, G, Fair…) — the list mixes grade terms with the subjects.
  A new person picks the first one.
- **Slug** is marked required and empty on a new product; it fills in on save ("Made once from the name").
- The button on a new record says **Publish changes**; **Unpublish** is not by it but in the three-dot menu, then a
  confirm; the dropdown beside Publish offers only "Publish in English".
- A **duplicate SKU** is refused with "The following field is invalid: sku" — it does not say "already used".
- **Stock is a different screen**: three Create New forms (store, product, shelf count). On each, **Can still sell**
  is marked required but is greyed and filled in for you; the field to type is **Count on the shelf**, below it. No
  "stock at three stores" table on the product (as 3.3 step 4 says).
- The sidebar is **closed by default** at 1280 px; the dashboard cards are the way in. From a saved record there is
  no visible way to the next row.
- The first run of the day once left Publish greyed for over 90 s (an image still processing, or a slow save); both
  final runs published in 5 s. Worth a watch with real photos.

**2. Import (FAIL).** There is no Import entry in the sidebar, the dashboard, the Stock list or the Products list;
`/admin/import` (the address DATA.md 3 names, "the admin's Import screen") answers HTTP 200 with a **blank page, no
admin shell**. TASKS.md 3.7.a says "admin action and CLI"; only the CLI (`pnpm data:import`) exists. The
rejected-rows report the recipe asks us to record therefore could not be recorded. Owner: dev (build the screen, or
change the recipe and the staff manual to a developer task, and say so to the client).

**3. Lead (PASS with defects).** The dashboard's "New leads: 11" and the Leads card open the plain Payload list
(kind, site, status, source, date; no name or message), not the inbox at `/admin/leads` (cards with name, message and
age, filter by status, kind and site). **Nothing links to `/admin/leads`**: the `LeadsNavLink` after-nav component
did not render (0 links on the dashboard). The lead form is the long default form; Status is a dropdown on the right,
**Notes** a field further down. Moving New to Contacted to In progress to Closed took 3 saves and appended 3 history
rows each time. **Reply on WhatsApp / Reply by email do not exist** on the lead (CONTENT-OPERATIONS 4.1 step 3), so
"replied in under a minute" cannot be done as written; the statuses and the note can.

**4. Store user (FAIL on "unaided").** After sign-in the store user lands on the **dashboard** (not "their store's
orders, grouped" as 5.1 says), with "Orders to act on: 6" and the Orders card.

- **S1.** Both lead to `/admin/collections/orders`, Payload's plain table (columns: number, status, store, date),
  and the order link opens `/admin/collections/orders/<id>`: a very long form (about 5,500 px tall at 390 px) of read-only
  fields with **no next-step button**. The big-button panel exists only at `/admin/orders/<id>`, which no link on
  the dashboard, the list or the order points to. A first-timer cannot find it; the test had to type the address.
- **S2.** The panel's buttons say the next **status** ("Processing", "Waiting for driver", "On the way",
  "Delivered"), not the recipe's "Accept", "Driver booked", "Picked up — on the way". The recipe and the screen
  disagree; a manual written from the recipe will confuse.
- **S3.** On the panel at 390 px: items, address, Open in Maps, Message the buyer, the driver's details box and the
  big button all fit one screen; the file field is the browser's plain "Choose File" and **Add driver details** is
  a small button (about 26 px tall at 390 px) — small for a one-handed thumb. No Undo for ten seconds was seen
  (nothing in the panel offers it).
- Every step reached the tracking page ("Delivered" shown). Orders 100047, 100048 (run 1) and 100049, 100050 (run 2)
  went to Delivered this way; the delivered stock effect is as for any order.

**5. Delivery fees (FAIL).** In this build a courier fee is **entered by staff per order**, not stored in a table
(COMMERCE.md, decision 2026-10-06); 5b times that: dashboard, Orders to act on, the order, then the fee box and
**Send price**, 2.8 to 3.8 s and 3 clicks, **but only after typing the panel's address** — the order the list opens
has no price box (same cause as S1). What is left of "delivery fees" in Settings is **Settings → Site settings →
Old East Indies → Delivery**: Distance bands (up to km, fee) and Free delivery over (IDR). In the admin that group is
**broken**: the "Delivery" heading shows but the three Band rows open **empty** (no Up to km, no Fee), and the Free
delivery input was present on some page loads and absent on others (it was missing on all loads in both final runs).
The shop's Social links rows and AI group render empty too (the gallery's identical groups render fully); see the
screenshot `shots/r5-1-settings-delivery-1280.png`. So no band fee can be edited, and the delivery reach (the last band)
cannot be widened, by the owner. The DB holds three bands (5 km Rp 10,000; 15 km Rp 15,000; 30 km Rp 20,000) and a
free-delivery threshold of Rp 500,000; none was changed. The Indonesian label for Distance bands is "Gelombang jarak"
("wave" jarak): a mistranslation.

**6. Replacement order (FAIL).** The order panel and the order record show no Replace damaged item action;
`api/x/orders/` has only quote, driver-image, hand-back, move and reassign. Only the `channel: replacement` and
`replacementOf` fields exist (rehearsal.md finding R-2). The recipe cannot be done; no replacement order was made.

## Proposed cheap fixes (for the orchestrator; qa made none)

| #   | File and place                                                                                                    | Change                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | `engine/packages/cms/src/admin/widgets/dashboard.jsx`, `OrdersToActOnWidget` (`href="/admin/collections/orders"`) | `href="/admin/orders"`, so "Orders to act on" opens the panel list (grouped, with the order links the panel needs)                                                       |
| F2  | same file, `NewLeadsWidget` (`href="/admin/collections/leads"`)                                                   | `href="/admin/leads"`, so "New leads" opens the inbox                                                                                                                    |
| F3  | `engine/packages/cms/src/globals/site-settings/fields.ts` line 113, `label.id`                                    | "Gelombang jarak" to "Rentang jarak" (or "Pita jarak")                                                                                                                   |
| F4  | `engine/packages/cms/src/admin/orders/store-panel.jsx` and `lexicon`/`copy` for the big button                    | label the buttons as the recipe does ("Accept", "Driver booked", "Picked up — on the way") or change CONTENT-OPERATIONS 5.1's table to the status names — one of the two |
| F5  | CONTENT-OPERATIONS.md 3.5 / DATA.md 3, 4.1, 5.1, 5.5                                                              | until the screens exist, say so: no Import screen, no Reply buttons, store users reach the panel at `/admin/orders`, replacement not built                               |

## Follow-ups (not cheap)

1. **Build the Import screen** (3.7.a "admin action") or drop it from the staff manual. Blocks 11.1.a's "cleared
   through the admin" and recipe 2.
2. **Make `/admin/orders` the Orders entry for everyone** (sidebar, dashboard card, collection list view, order
   links): the panel is the product the store staff and the owner need; today it is hidden behind a typed address.
   Without it the 10.4.c Check cannot pass: "a store user completes the status steps without help".
3. **Fix the Site settings → Shop group render**: Delivery bands, Free delivery over, Social links rows and the AI
   group inside "Old East Indies" render empty or not at all; owner cannot edit the delivery reach or the bands.
   Investigate the array and row fields inside the `shop` group (the gallery group is fine).
4. **Link the leads inbox** (`LeadsNavLink` did not render) and add the **Reply on WhatsApp / by email** buttons.
5. **Replace damaged item** (COMMERCE.md 12): build it, or take it out of CONTENT-OPERATIONS 5.5 and the plan.
6. **Image intake defaults** (alt text, subject, role, provenance) and the **Category** list scope (grades appear
   in the product category); a clear "SKU already used" message; **Unpublish** next to Publish; a product
   **Stock tab** as 3.3 describes.
7. **Admin store dashboard** should open on the store's orders (5.1) and the **Add driver details** control should
   be a full-width 44 px button on a phone.

## What the proxy run created on staging (all REHEARSAL 10.4)

- **Products** (each published for seconds, then unpublished; all draft now; none shows on the shop): ids 237, 238,
  239, 241, 242, 243, 245, 246, 247, 248 (suite development runs) and **253** (`REH-10-4-run1-…`), **254**
  (`REH-10-4-run2-…`) from the two final runs; named "REHEARSAL 10.4 product …".
- **Stock rows** for those products at DPS-004, DPS-008 and Canggu 001, one unit each: 15 rows, ids 35791 to 35805
  (rows of unpublished REHEARSAL products; real stock was not touched). One image (media) per product run.
- **Orders** (buyer "REHEARSAL 10.4", pin on DPS-004, Rp 15,000 fee, paid in the simulator): **100037 to 100050**.
  100041 to 100050 are **Delivered**. **100037, 100038, 100039, 100040 are still Paid** (development runs where the
  store step stopped; they sit in DPS-004's queue; cancel or deliver them). Each order took one unit at DPS-004 of
  orchid-tree-1863 (100037 to 100040), hearts-of-jesus-1863 (100041 to 100044), mount-merapi-indonesia-1852 (100045,
  100046), mount-guntur-indonesia-1852 (100047, 100048), bathing-people-in-indonesia-1872 (100049, 100050): 14 units
  off real DPS-004 stock; the 10.3 rehearsal product sugar-apple-1863 is at 0 there.
- **Leads** 58 and 59 (the REHEARSAL 10.3 gallery leads): moved New to Contacted to In progress to Closed, each time,
  with a REHEARSAL 10.4 note; both are **Closed** now (history rows appended at every run).
- **Site settings**: nothing changed. (The free-delivery threshold test never found its input, so it never wrote.)
- The staging login was rate limited twice by the suite's own sign-ins (HTTP 429, retry after about 6 minutes), and
  checkout once (10 orders an hour per IP): both are limits to keep in mind when real staff test together on one
  office connection.

## Status of the Check

10.4.a (the owner's people) is **not done**. 10.4.b: stumbles recorded above, nothing fixed (the cheap fixes are
proposed, F1 to F5). 10.4.c: **not met**; the proxy run says the store status steps are quick once on the panel, but
a store user cannot reach it unaided today.
