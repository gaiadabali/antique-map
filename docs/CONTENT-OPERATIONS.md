# Content operations

> **Plan v2 (DR-17, answered Q1–Q2 of 2026-10-22).** Each site gets **its own admin**: `oldeastindies.com/admin`
> for the shop (owner, editor, store staff) and `antiquemapsindonesia.com/admin` for the gallery (owner,
> editors), each with its own login. Until phase 26 both still run in today's one admin, on the shop's host.

How the owner's team runs **Old East Indies** from `/admin`, day to day, after the rebuild of phase 27
([`old-east-indies-cms.md`](../old-east-indies-cms.md)). Each recipe is one everyday job, step by step, with the
words exactly as the screen shows them in English. **Indonesian:** every screen also speaks Indonesian — open
**Bahasa Indonesia / English** at the foot of the menu (your account page, **Language**), choose _Bahasa Indonesia_;
English stays the default for new accounts (K3). The gallery's own recipes (antiques, makers, leads at the
gallery) are in §9; they have not changed.

Collections and fields are [CONTENT-MODEL.md](CONTENT-MODEL.md); roles and access [SECURITY.md](SECURITY.md); the
AI drafting tool [AI.md](AI.md). The timed targets (§10) are the plan's §6, measured in
[`docs/gates/shop-admin.md`](gates/shop-admin.md).

## 1. Principles

- **One job, one screen.** A product's photos, variants and stock are on the product; an order's every step is on
  the order; a store's stock is one table.
- **What the admin shows is what the site shows.** Pages, the header, the footer, the announcement, the product
  page's fixed lines and the emails' openings all live here; nothing on the shop is hidden in code. Pages have a
  live preview at phone and desktop width.
- **Saving is cheap; publishing is the claim.** A draft saves with almost nothing; publishing checks what a visitor
  needs. Every change keeps its version history (**Versions** on the record).
- **Store staff work on a phone**, one-handed, at 390 px.

## 2. Who can do what

| Job                                                             | `owner`       | `editor`      | `store`                                               |
| --------------------------------------------------------------- | ------------- | ------------- | ----------------------------------------------------- |
| Products, categories — add, edit, publish                       | ●             | ●             | read only                                             |
| Stock by store — read and enter counts                          | ● every store | ● every store | ● **own store only**                                  |
| Pages, Header, Footer, Media                                    | ●             | ●             | —                                                     |
| Orders — see, move forward, driver photo                        | ● every store | ● every store | ● **own store only**; may hand one back with a reason |
| Orders — reassign, cancel, step back, quote a delivery, replace | ●             | ●             | —                                                     |
| Import from a spreadsheet                                       | ●             | —             | —                                                     |
| Stores, Staff, Discount codes, Site settings, Leads, Partners   | ●             | —             | —                                                     |
| Technical records (redirects, notification and payment logs)    | ●             | —             | —                                                     |

A store user belongs to one store and sees no other store's orders, stock or buyers — the rule is in the
records' access, not only the menu. An editor's **Staff** entry lists only their own account (to change their
password or language).

## 3. Getting in and finding your way

### 3.1 Sign in

1. Open `oldeastindies.com/admin` (staging: `old-east-indies.gaiada.com/admin`). The Old East Indies logo is above
   the form.
2. Type your **Email** and **Password** → **Login**. Ten wrong tries in fifteen minutes from one place are refused
   for a while; a forgotten password is reset by the owner (§8.2).

The owner and editors land on the **Dashboard**; a store user lands straight on **Orders** — their store's.

### 3.2 Read the dashboard · owner, editor

The top cards are **Today**: **Orders to act on** (Need action, Being packed, Waiting for a driver, On the way —
each number opens that tab), **Stock and catalogue** (Low stock, Products in draft, Pages in draft) and **Leads
and sales** (New leads, Sales, last 7 days). Below them, one card per menu entry, each with a **+** to create one
straight away. The same numbers are in the menu under **Today** (`/admin/today`).

### 3.3 The menu

**Today**, then **Content** (Pages, Header, Footer, Media), **Orders** (Orders, Leads inbox, Partners), **Catalogue**
(Products, Categories, Discount codes), **Stores** (Stores, Stock by store, Import from a spreadsheet),
**Settings** (Site settings, Staff, Chat sessions); **Technical records** (owner only) and **Indies Gallery —
antiques** are folded — open them with their title. At the foot: **Bahasa Indonesia / English**. An editor's menu
holds Today, Content, Orders, Products and Categories, Stores and Stock by store, and Staff (their own account); a
store user sees **Orders** and **Stock by store** only. On a phone the menu opens with the ☰ button.

## 4. Recipes — the catalogue

### 4.1 Add a product · owner, editor · **target ≤ 2:30** (six photos, two variants, stock at three stores)

1. **Catalogue › Products → Create New**. One screen, top to bottom.
2. **Name** (it also becomes the photos' alt text), **SKU** (unique), **Category** (type a few letters, pick it),
   **Description**.
3. **Photos:** drop several files on **Drop photos here**, or **Choose photos** and select them all at once. Drag a
   photo (or use **Move earlier** / **Move later**) to reorder: the first is the **Cover**. Each photo's **Alt text
   (what it shows)** is filled from the name — make it say what this photo shows ("Batik tote, back view"); it saves
   when you leave the box. Subject, role and provenance are set for you.
4. **Price (Rp):** type `185000` or `185.000`.
5. **Variants** (optional): **Option** (e.g. _Colour_), **Values, separated by commas** (_Indigo, Black_); **Add an
   option** for a second one (_Size: A4, A3_) → **Make variants**. Each combination becomes a row with its SKU made
   from the product's (editable) and a price that is the product's unless you type one. **Add a variant by hand**
   for an odd one.
6. **Save Draft.** Then **Stock per store**: type a store's name or code in **Find a store**, type what is on the
   shelf in each variant's box — it saves when you leave the box (**Saved**). Repeat for each store.
7. The **Status** control at the top: **Published** puts it on the site (it needs a name, category, price and a
   photo); **Back to draft** takes it off. Later edits to a published product: **Publish changes**.

**Duplicate** (top of the product) copies it as a new draft for a similar product; **View on the site** opens it.
**Search engines** stays folded unless you want a different title or description for Google.

### 4.2 Find and change many products · owner, editor

**Products** shows each product's photo, price, total stock and status. **Show:** All · Drafts · Out of stock, and
**Category**. Tick products to publish, unpublish or **Move** them to another category together.

### 4.3 Categories · owner, editor

**Catalogue › Categories**: **Create New** → **Label**, **Description**, **Cover picture** → **Publish changes**.
Order them on the site by dragging rows in the list (the ⋮⋮ handle) — no numbers to type. A category's own page
lists its products.

### 4.4 A discount code · owner

**Catalogue › Discount codes → Create New**: **Code** (what buyers type), **Kind** (Percent off the items or Rupiah
off the items), **Value**, and if you want them, **Starts**, **Ends**, **Minimum spend (Rp)**, **Uses allowed**,
**Once per buyer** → **Active** → **Save**. The welcome code shown to new buyers is chosen in Site settings (§7.1).

### 4.5 Stock by store · store staff (own store), owner, editor · **target ≤ 0:20 for one count**

1. **Stores › Stock by store**. A store user sees only their store's column.
2. **Find a product by name or SKU** — type part of the name or of the SKU (e.g. `MP.085`); the list narrows as
   you type.
3. Tap the product's box under the store, type **what is on the shelf** — units packed for an online order but not
   yet collected included — and press **Enter** (or move to the next box). It saves at once: **Saved**, or **Saved;
   2 held for orders** when open orders hold some. Never adjust stock for an online order: the system does.
4. **Show: Low stock (at or below 2)** lists only what is running out (the number is the low-stock threshold, §7.1).
   The owner pages through stores with **Later stores →**.

### 4.6 Import from a spreadsheet · owner · **target: a 500-row stock sheet with three errors fixed and applied in under 10 minutes**

1. **Stores › Import from a spreadsheet**. **What the file holds:** Stock counts, Products or Stores. The screen
   lists the columns row 1 must hold, spelled exactly (DATA.md §3).
2. **Excel or CSV file** — an Excel workbook (`.xlsx`, the first sheet) or a CSV UTF-8 file, at most 10 MB →
   **Preview**. "Preview: nothing is saved yet": New · Changed · Unchanged · Rejected · Held, the **rows that cannot
   be used** first, each with its reason ("Row 14, Price: 'Rp 1,5jt' is not a number"), then the rows that change
   something, old and new value.
3. Fix the file and **Choose another file**, or **Apply** the valid rows (rejected and held rows are skipped).
   New products arrive as drafts (publish them in the editor, §4.1). The same file twice changes nothing.

## 5. Recipes — content

### 5.1 A page with sections, a video and a PDF, previewed and published · owner, editor · **target ≤ 1:00 to change the home's hero picture and title**

1. **Content › Pages** → open the page (**Home**, **Partnership**, **Stores**, or any other) or **Create New**
   (**Title**, then the **Web address** in the sidebar, e.g. `delivery`).
2. The preview opens beside the form (the eye button shows or hides it). Choose **Phone · 390** or **Desktop ·
   1280** above it. It shows the site's own page as last saved: **Save Draft** redraws it; visitors still see the
   published page.
3. **Sections:** each row is a section, folded — open one with its arrow. **Add Section** offers only the
   sections this page can hold (the home's hero and rails on the home, the partnership's on the partnership page,
   the general ones everywhere): Text, Picture and text, Questions and answers, Call to action, **Video**, **PDF
   link** and more. Drag the ⋮⋮ handle to reorder; **⋯** to duplicate or remove.
   - _Home hero:_ open **Hero — home** → **Title**, **Lede**, the buttons; **Picture** → **Choose from existing**
     (or **Create New** to upload one).
   - _Video:_ **Add Section → Video** → choose an MP4 or WebM from Media (§5.5), a poster picture if you like.
   - _PDF link:_ **Add Section → PDF link** → choose the PDF from Media; the link reads as the PDF's title.
   - _Products rail:_ **Products** — hand-picked (pick and drag them), the newest, or from a category.
4. Words are per language: switch **Locale: English** to **Bahasa Indonesia (id)** at the top right and type the
   Indonesian.
5. **Save Draft** and look at the preview at both widths → **Publish changes**. The site shows it within a minute.

### 5.2 Add an item to the header menu · owner, editor · **target ≤ 0:30**

**Content › Header** → under the menu, **Add Link** → **Label** (e.g. _Privacy_) → **Goes to**: A page, a
category, a product or a web address → pick it → **Save**. Drag rows to reorder. Type the Indonesian label with
**Locale** set to Bahasa Indonesia.

### 5.3 A dated announcement · owner, editor · **target ≤ 0:45**

**Content › Header** → **Announcement**: tick **Show the announcement** → **Text** (e.g. _Weekend sale: 20% off
framed prints_) → **Link (optional)** → **From** (empty means from now) and **Until** (it disappears by itself
then) → **Save**. It shows above the header on every shop page, in each language that has its text.

### 5.4 Footer links · owner, editor · **target ≤ 0:30 for a column or a link**

**Content › Footer** → **Footer columns** → **Add Column** (its **Label**, e.g. _Help_) and in it **Add Link**
(**Label**, **Goes to**) → **Legal links** (**Add Legal page**) (the Privacy, Terms and Delivery pages) → **Bottom line and gallery
link**: **Line at the very bottom** (e.g. _© Old East Indies_) and **Link to Indies Gallery: label** → **Save**.
The contact block (WhatsApp, email, phone, hours) comes from Site settings (§7.1). The logo, light and dark, is
under **Logo** — empty uses the built-in one.

### 5.5 Upload media · owner, editor

**Content › Media → Create New** → choose the file: an image (JPEG, PNG, WebP, AVIF), a video (MP4, WebM) or a PDF
(at most 20 MB) → for an image its **Alt text**, for a video or a PDF its **Title** (and a video's
**Description**, what happens in it) → **Save**. The list's **Type** column says image, video or PDF; the record is
named by its alt text or title. A video or a PDF reaches the public only when a published page places it.
Product photos are best added on the product itself (§4.1).

## 6. Recipes — orders

### 6.1 Handle an order · store staff, owner, editor · **target ≤ 0:45 from the inbox to Delivered**

1. **Orders** opens on **Needs action**; the tabs are Needs action · Processing · Waiting for driver · On the way ·
   Delivered · Cancelled / expired, each with its count. **Search orders** by buyer, order number or phone.
2. Open the order: the buyer, the items, the total, **Deliver to** with **Open the pin in Google Maps**, the store,
   the **Timeline**, **WhatsApp the buyer** and **WhatsApp the store** (a message ready to send).
3. **Next step** shows one large button, named after what happened:

   | Button                     | The order goes       | When                                                   |
   | -------------------------- | -------------------- | ------------------------------------------------------ |
   | **Start packing**          | paid → processing    | the items are found and being packed                   |
   | **Packed — book a driver** | → waiting for driver | the driver is booked in Gojek or Grab, by the pin      |
   | **Add driver details**     | (stays)              | **Photo for the driver**: the driver's card or a photo |
   | **Driver collected it**    | → on the way         | only once the driver's photo is in                     |
   | **Mark delivered**         | → delivered          | the driver has handed it over                          |

   The buyer's tracking page and email follow each step. **Packing slip** prints one for the box (optional).

4. Something wrong? Store staff: **Can’t send this** → **Why?** → **Hand back** — the owner and editors get it back
   to reassign. Owner, editor: under **More**, **Step back to “…”** for a step taken by mistake, or **Cancel order**
   → **Reason** → **Confirm cancellation** (the stock returns to the store and the buyer is emailed).

A delivery inside the distance bands is priced at checkout. **Beyond the last band** the order waits in **Needs
action**, marked as needing a delivery price: the owner or an editor checks the courier's fare and, on the order,
**Send the delivery price** → **Delivery fee (Rp)** (0 for free) → **Send price**; the buyer gets a "your price is
ready" email and pays. Unpriced in time, it is cancelled and its stock returned.

### 6.2 Reassign an order · owner, editor · **target ≤ 0:30**

On the order: **Reassign** → **Send from another store** lists stores that **Hold every item** first, nearest the
buyer's pin first, with their distance → pick one → **Why move it?** (e.g. _Store closed today_) → **Confirm
reassignment**. The stock moves in one step; the new store's staff are emailed; the buyer's fee does not change.

### 6.3 Replace a damaged item · owner, editor · **target under 2 minutes**

On the delivered order: **Replace damaged item** → **How many** of each line → **What was damaged (one line)**
("Frame cracked, photo on WhatsApp") → **Confirm replacement**. A new Rp 0 order, flagged replacement, goes to the same store (which gets no
email: tell them). If that store no longer holds the item, nothing is made: restock it or reassign (§6.2).

### 6.4 A store user's day · store staff, on a phone

Sign in (§3.1) → **Orders** opens on your store's **Needs action** → open each new order → **Start packing**, then
**Packed — book a driver** once it is packed and the driver booked → **Photo for the driver** → **Add driver
details** → **Driver collected it** → **Mark delivered**. Between orders, after a delivery or a recount: **Stock by
store** (☰ menu) → find the product → type what is on the shelf → **Enter**. That is all a store user's menu holds.

## 7. Recipes — settings, stores and staff

### 7.1 Site settings · owner · **target under 1 minute per change**

**Settings › Site settings → Old East Indies**, in groups:

- **Contact and social:** WhatsApp, Email, Phone, Hours, Reply promise; **Social links** with the **Platform**
  chosen from a list. They feed the footer's contact block.
- **Checkout and delivery:** Checkout enabled; **Distance bands** — one row per band, **Up to km** and **Fee (IDR)**,
  rising; the last band is how far the shop delivers (beyond it, a staff quote, §6.1); **Free delivery over
  (IDR)**, which the product page's delivery line quotes; **Welcome discount code**, picked from Discount codes;
  Order expiry minutes.
- **Notifications and email:** **Store alerts** and **Lead notify emails** (who gets the alerts); under **Emails**,
  for each email (Order received, Paid, Being packed, … Store: new paid order) its **Subject** and **Opening
  paragraph**, per language. The order details and tracking link are added by the system.
- **Product page:** the lines every product page shows (the two signals, the delivery line with `{freeOver}`, the
  finishes question and answer).
- **Stock:** **Low stock at** — the count at or below which a product shows as low (default 2).
- **Chat and AI:** the chat on or off, its daily budget.

**Save** — live on the site within a minute. Numbers are checked in international form (`+62…`).

### 7.2 Add a store, with its place on the map · owner · **target under 3 minutes**

**Stores › Stores → Create New**: **Store code**, **Name**, **Area**, **Address** → **Find the location**: type the
address or paste a Google Maps link in **Address or Maps link** → **Search** → pick the right place from **Places
found — pick one** (or nudge the pin with **Move the pin**, and **Check on Google Maps**) → WhatsApp, opening hours →
**Takes orders** (needs the address and pin) and **Listed on the shop** → **Save**. A store that stops: untick
**Takes orders** — never delete one with stock or orders.

### 7.3 Add a staff member · owner · **target ≤ 1:00 added and signed in**

**Settings › Staff → Add a staff member** (or, on a store's page, **Add staff for this store**, which arrives with
the store chosen). **What they do:** Store staff (already chosen) · Editor · Owner → **Store**: type part of its
name, code or area in **Find the store** until one is left (it is chosen), or pick it in the list → **Name**,
**Email**, a **Password** of at least 12 characters you choose → **Add**. Tell them the email and password; they
sign in (§3.1) and can change the password on their account page. There is no invitation email.

### 7.4 Reset a password, switch an account off · owner

**Settings › Staff** → open the person. Forgotten password: **Change Password** → type a new one → **Save**, and
tell them. Someone who leaves: untick **Account switched on** → **Save** — they are signed out at once and cannot
sign in; their name stays on what they changed.

## 8. Leads and partners · owner

**Orders › Leads inbox** opens on **New**: each lead's kind, source and age. Open one → **Reply on WhatsApp** or
**Reply by email** (a draft in the lead's language) → set the status. From a partnership lead, **Create partner**
fills a partner from it (**Orders › Partners**). Partners never sign in.

## 9. The gallery (unchanged until its own admin, phase 25)

Antiques, makers, places, terms and masters are under **Indies Gallery — antiques** (folded), with the **Catalogue
wall**. Add an antique: **Antiques → Create New** → photos (the first is the recto) → **Draft from photographs**
when drafting is on → check every **AI suggestion** → stock number, dimensions, condition, location, asking price
(owner only, never public) → **Availability** → **Publish changes**. Mark one sold: open it → **Availability** →
Sold → **Publish changes** (a sold antique stays published).

## 10. The timed targets (the plan's §6)

Run at a person's pace on a production build until the owner's people can run them (OA9); results in
[`docs/gates/shop-admin.md`](gates/shop-admin.md).

| Task                                                            | Recipe   | Target |
| --------------------------------------------------------------- | -------- | ------ |
| Add a product, 6 photos, 2 variants, stock at 3 stores, publish | 4.1      | ≤ 2:30 |
| Update one product's count at one store                         | 4.5      | ≤ 0:20 |
| Change the home hero's picture and title, with the preview      | 5.1      | ≤ 1:00 |
| Add a menu item / footer link                                   | 5.2, 5.4 | ≤ 0:30 |
| Put up a dated promotion announcement                           | 5.3      | ≤ 0:45 |
| Take an order to Delivered (store user)                         | 6.1      | ≤ 0:45 |
| Move an order to another store, with a reason                   | 6.2      | ≤ 0:30 |
| Add a store user (added and signed in)                          | 7.3      | ≤ 1:00 |

**Pass with people:** every participant completes every task unaided, with no wrong record left behind, and the
median time is within the target.

## Open

- **Real people's run (OA9)** — the targets are measured at a person's pace, not yet with the owner's team.
- **Driver-image retention** — default: deleted 30 days after delivery or cancellation (COMPLIANCE.md §1). Counsel.
