# Content operations

How the client's team runs both sites from the one admin at `/admin`, day to day. It lives on one host,
`ADMIN_HOST` — the shop's (Q1: `oldeastindies.com`; `old-east-indies.gaiada.com` on staging); on the
gallery's host `/admin` and Payload's REST answer 404. **This is the usability bar:** each recipe below has a target
time, and a timed test in phase 10 checks them with people who have never seen the admin. If a daily job takes
forty clicks, the sites never fill up. Collections and fields are [CONTENT-MODEL.md](CONTENT-MODEL.md); the AI
drafting tool's rules are [AI.md](AI.md); roles and access are [SECURITY.md](SECURITY.md).

## 1. Principles

- **Payload's built-ins first** — list views, filters, drafts, versions, uploads, locales. A custom view only where a
  built-in fails a target here (the store staff order panel, the importer).
- **Plain words on every screen**, in English and Indonesian — each user picks the admin language (G15, DR-12):
  "Web address", not "slug"; "What it shows", not "places"; "Antiques", not "works".
- **Saving is cheap; publishing is the claim.** A draft saves with almost nothing; publishing checks what a
  visitor needs (a title, a primary image, a status). A required field that blocks saving teaches people to type
  junk.
- **Correcting is as cheap as creating.** Every record keeps its version history; undo is "Restore this version".
- **Nothing goes public by a machine's authority.** AI suggestions stay marked until a person accepts them; imports
  create new records as drafts and change existing ones only on a person's previewed Apply (§3.5).
- **Store staff work on a phone**, one-handed, at 390 px, on 4G. Their screens are designed for that first.

## 2. Who can do what

| Job | `owner` | `editor` | `store` |
| --- | --- | --- | --- |
| Antiques — add, edit, publish, mark on hold or sold | ● | ● | — |
| Antiques — the internal asking price | ● (only the owner sees it) | — | — |
| Products — add, edit, price, publish | ● | ● | read only |
| Stock levels — read and enter counts | ● every store | ● every store | ● **own store only** |
| Makers, places, terms, media | ● | ● | read media only |
| Pages, home bands, redirects | ● | ● | — |
| Import spreadsheets | ● | antiques and products only | — |
| Orders — see, move forward, add the driver image | ● every store | ● every store | ● **own store only**; may hand one back with a reason |
| Orders — reassign, cancel, move a status back, create a replacement | ● | ● | — |
| Leads, partners, chat transcripts, payment events | ● | — | — |
| Stores, users, discounts, site settings (the delivery fees among them) | ● | — | — |
| Analytics dashboard | ● | — | — |
| AI listing drafts | ● | ● | — |

A `store` user belongs to one store (`users.store`) and sees no other store's orders, stock or buyers; of the
catalogue it reads only products and media.

## 3. Recipes — the catalogue

### 3.1 Add an antique, with photos and the AI draft · owner, editor · **target: under 5 minutes**

1. **Antiques → New.** Drop the photos (from the computer or the phone's camera). The first is the **recto**; give
   the others a role from a short list — verso, detail, raking light, transmitted light, framed.
2. **Draft from photos.** The tool fills a suggested original-title transcription, maker, place, date, technique
   and a first description in English and Indonesian. Each suggested field is marked **AI suggestion**.
3. **Check every suggestion against the object.** Accept, edit or clear each one. Publishing stays blocked while any
   suggestion is unaccepted.
4. **Stock number** (required, unique — a reused number warns at once). **Dimensions** accept how people write them
   (`45 x 38 cm`, `450 × 380 mm`) and show the reading before saving. **Condition grade** from a picker that shows
   each grade's definition, plus notes. **Location:** Singapore or Jakarta. **Asking price** (owner only, never
   public).
5. Status **Available** → **Preview** → **Publish**.

**Save and add another** keeps the maker, source work, date range, type and location, and clears the rest — for a
drawer of related sheets. Makers and places are created inline, with "Valentyn — did you mean Valentijn?".
*Without the AI draft* the target is **under 8 minutes**.

### 3.2 Mark an antique on hold or sold · owner, editor · **target: under 30 seconds**

Open it (search by stock number) → **Status** → On hold / Sold → **Save**. It changes on the site within a minute. A
sold antique stays published as "Sold" — never unpublish it.

### 3.3 Add a product with stock per store · owner, editor · **target: under 3 minutes** (no variants, stock at three stores); **under 5 minutes** with up to six variants

1. **Products → New.** Photos first (in a room or in use, then flat, details, packaging); **Draft from photos**
   suggests the name and description in both languages, marked as in 3.1.
2. **SKU** (unique), **category**, **price in rupiah** (type `185000` or `185.000`; it shows as Rp 185.000), and
   the **original at Indies Gallery** if it is made from one (`relatedWork`, searched by stock number).
3. **Variants** (optional): add an option — Size: A4, A3 — and the admin makes one row per combination, each with
   its SKU suffix and price. Delete any combination that is not stocked.
4. **Stock tab:** a table of stores × variants. Filter stores by area, type each count on the shelf (§3.4), Tab
   moves right. A product with no stock anywhere shows "Sold out" on the site.
5. **Preview** → **Publish.**

### 3.4 Update stock at a store · store staff (own store), owner, editor · **target: under 30 seconds per product**

**Stock** → search by name or SKU → tap the count → type **what is on the shelf**, units packed for an online order
but not yet collected by a driver included → **Save**. The system stores `quantity` as that count less the units
the store's orders in `pending_payment`, `paid`, `processing` or `waiting_driver` hold, so a recount never re-sells
a held unit; a count below them stores 0 and flags those orders for reassignment (COMMERCE.md §4). Each change is
recorded with who, when, and the count before and after. Staff never adjust stock for an online order.

### 3.5 Import a spreadsheet · owner (editor for antiques and products) · **target: a 500-row stock sheet with three errors fixed and applied in under 10 minutes**

1. **Import → choose the kind:** Antiques (matched by stock number) · Products (by SKU) · Stores (by store code) ·
   Stock (store code × SKU → the count on the shelf, stored as §3.4 says).
2. **Download the template** if needed — every column explained in English and Indonesian.
3. **Upload** the `.xlsx` or `.csv`. The **preview** writes nothing and shows: new · updated · unchanged · rejected
   · held — each row with its column and reason ("Row 14, Price: 'Rp 1,5jt' is not a number"), and the old and new
   value of every change.
4. Fix and upload again, or **apply the valid rows** and download the rejected and held rows to fix later.
5. **Apply.** Only now is anything written. New antiques and products arrive as **drafts**, and **Publish these
   records** publishes those that pass their checks; a change to an existing record applies to it as it stands, so
   a published price changes on the site at once. A result report is kept with the import (DATA.md §3–§4).

The import is **idempotent** (DR-11): the same sheet twice changes nothing the second time.

### 3.6 Edit a page or the home page · owner, editor · **target: change a home band in under 2 minutes**

**Pages** → the page (or **Home**) → add, reorder or edit blocks → **Preview** at phone width → **Publish**.

## 4. Recipes — people

### 4.1 Handle a lead · owner · **target: from "New" to replied in under 1 minute**

1. **Leads** opens on **New**, newest first, each with its kind (`ask`, `sell`, `partnership`, `contact`, `chat`),
   site, source (the page, the item, the chat), age, and the attached item's thumbnail and stock number. A gallery
   lead older than the reply promise (the same working day, Singapore time — G9) is flagged.
2. Open it: the message, the contact, or the chat summary with a link to its transcript.
3. **Reply on WhatsApp** opens WhatsApp with the lead's number and a greeting in the lead's language; **Reply by
   email** opens a draft. Set **In progress**.
4. When it ends, **Close** with a one-line outcome ("Sold M.0500 by phone", "Not buying", "Partner created").

The owner gets an email for each new lead.

### 4.2 Handle a partner · owner · **target: under 3 minutes**

From a `partnership` lead, **Create partner** (the business and contact carry over), or **Partners → New**: business
name, kind (hotel, villa, café, shop, company), area and address, contact person, WhatsApp, email, **terms** (agreed
case by case — S5), **products carried**, notes, active or ended. The lead links to the partner. Partners never sign
in (DR-8); all contact is WhatsApp or email.

## 5. Recipes — orders

### 5.1 Process an order · store staff · **target: each step in two taps and under 10 seconds; a first-timer completes the flow unaided**

The store user's admin opens on **their store's orders**, grouped: *To accept* · *Being prepared* · *Waiting for
driver* · *On the way* · *Delivered today*. A new paid order also arrives as an email with a link to it. The order
screen shows the items with photos, variants and quantities; the gift note; the buyer's name and WhatsApp; the
address, the driver notes, and **Open in Maps** (the pin) and **Copy address**; and **one large button for the next
step**:

| Tap | Status | When |
| --- | --- | --- |
| **Accept** | `paid` → `processing` | the items are found and being packed |
| **Driver booked** | `processing` → `waiting_driver` | the driver is booked in the Gojek or Grab app, using the pin |
| **Add driver details** | — | take a photo or pick the screenshot of the driver's card (name, photo, plate) |
| **Picked up — on the way** | `waiting_driver` → `on_the_way` | enabled only once the driver image is attached |
| **Delivered** | `on_the_way` → `delivered` | the driver has handed it over |

Each tap opens a small confirm sheet naming the next status; each change is recorded with who and when, and the
buyer's tracking page updates. A step taken by mistake: **Undo** for ten seconds, then only the owner or an editor
moves a status back. **Can't send this** (an item missing or damaged, the store closing) asks a reason and hands the
order back to the owner and editors for reassignment.

### 5.2 Reassign an order · owner, editor · **target: under 1 minute**

Order → **Reassign** → active stores sorted by distance from the pin, each marked "has every item" or "missing
{item}" → pick one → reason → **Confirm**. In one step the stock goes back to the first store and comes off the new
one; the buyer's fee is unchanged; the history records it; the first store's staff no longer see the order and the
new store's staff are emailed. The buyer simply sees the new store's name.

### 5.3 Cancel an order · owner, editor · **target: under 1 minute**

Order → **Cancel** → reason → **Confirm**. The stock returns to the store and the buyer is emailed. The site has no
refunds flow (DR-5): any money owed is settled in the Midtrans dashboard and noted on the order.

### 5.4 Watch the day · owner

The admin home shows: new leads; paid orders not accepted within 30 minutes of the store opening; orders waiting
for a driver for over 30 minutes; products sold out everywhere; drafts with unaccepted AI suggestions; and the
first-party analytics summary (DR-13, [ANALYTICS.md](ANALYTICS.md)).

### 5.5 Replace a damaged item · owner, editor · **target: under 2 minutes**

Handled off the site (S12): the buyer sends a photo of the damage on WhatsApp, and the photo stays in that chat.
Open the original order → **Replace damaged item** → tick the damaged lines and quantities → a one-line note ("Frame
cracked, photo on WhatsApp") → **Confirm**. This creates a new order flagged **replacement**, linked to the
original, with a total of Rp 0 (no fee, no payment), at the original's store; the stock comes off that store at
once, and if it no longer has the item, pick another store as in §5.2. The order then appears in that store's
*Being prepared* list and runs through the same steps as any other (§5.1); the buyer is emailed its tracking link.
Nothing is refunded (COMMERCE.md §12).

## 6. Recipes — settings and stores

### 6.1 Edit site settings · owner · **target: under 1 minute per change**

**Settings → Gallery** or **Shop** (`site-settings`, one per site): WhatsApp number, email, phone, the reply-hours
line, opening hours, the shop's **delivery fees** (§6.3), the chat on or off, an announcement line. **Save** — live
on the site within a minute. Numbers are checked in international form (`+62…`, `+65…`). The welcome code is a
**Discounts** record (code, value, minimum, dates).

### 6.2 Add, change or close a store · owner · **target: under 3 minutes**

**Stores → New**: code, name, address, **pin on the map**, WhatsApp, hours, active. An inactive store gets no orders
and is hidden from the site. **Users → New** → role `store` → the store, for each member of its staff.

### 6.3 Update the delivery fees · owner · **target: every band in under 2 minutes**

The shop's delivery fee is a small table the owner keeps from the local courier price (Q3). **Settings → Shop →
Delivery fees**: one row per band — up to {km} → Rp {fee} — and the **free-delivery threshold** under it. When the
Gojek or Grab price changes, check the courier's fare for a trip of each band's distance from a typical store, type
the new fees → **Save**. Bands must rise in distance and fee; the last band is the delivery reach, so lengthening
it widens the area the shop delivers to. New quotes use the table within a minute; an order already placed keeps
the fee it was quoted (COMMERCE.md §5).

## 7. The timed test (phase 10)

Run on staging with seed data, by people who have never used the admin — the client's real staff where possible —
each given **only the recipe** from the staff manual, in the language they choose; store tasks on their own phone.
Time runs from the prompt to the done state.

| # | Task | Recipe | Target |
| --- | --- | --- | --- |
| T1 | Add an antique from six photos with the AI draft, check it and publish | 3.1 | < 5 min |
| T2 | Mark an antique sold | 3.2 | < 30 s |
| T3 | Add a product with no variants, stock at three stores, publish | 3.3 | < 3 min |
| T4 | Add a product with six variants | 3.3 | < 5 min |
| T5 | Update a store's count for one product (store user, phone) | 3.4 | < 30 s |
| T6 | Import a 500-row stock sheet with three planted errors; fix and apply | 3.5 | < 10 min |
| T7 | Answer a new lead on WhatsApp and set it in progress | 4.1 | < 1 min |
| T8 | Take an order from *To accept* to *Delivered*, attaching a driver image (store user, phone) | 5.1 | ≤ 2 taps and < 10 s per step |
| T9 | Reassign an order to the next store that has every item | 5.2 | < 1 min |
| T10 | Change the shop's WhatsApp number | 6.1 | < 1 min |
| T11 | Update every delivery band after a courier price change | 6.3 | < 2 min |
| T12 | Replace a damaged item from its order | 5.5 | < 2 min |

**Pass:** every participant completes every task unaided, with no wrong record left behind, and the median time is
within the target. A failure is fixed and the task re-tested. The recipes, in English and Indonesian, become the
staff manual handed over in phase 11.

## Open

- **New-order notice for store staff** — default: an email to the store's users; WhatsApp alerts need a provider
  the plan does not include. Owner.
- **Lead statuses** — default: New → In progress → Closed with an outcome note; the field values are
  CONTENT-MODEL.md's.
- **Driver-image retention** — default: deleted 30 days after delivery or cancellation, when the tracking link
  stops working (COMPLIANCE.md §1). Counsel.
