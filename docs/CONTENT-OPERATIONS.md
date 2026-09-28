# Content operations

**Staff fill both sites through the admin. We build the admin they fill them
with.** KOI's lesson applies twice over here: if the daily work takes forty
clicks per item, the site never fills up — and here there are two sites, one
with ~9,500 originals and one that must turn them into hundreds of products.

---

## 1. The volumes

| Work | Brand | Volume | Arrives how |
| ---- | ----- | ------ | ----------- |
| Originals already online | IG | ~2,090 | **migrated** (MIGRATION.md) as drafts, reviewed, bulk-published |
| Originals not yet online | IG | ~7,400 | **catalogued by hand** over months, from the drawers |
| Images per original | IG | 1 today → 3–6 (recto, verso, details, raking light) | photographed in batches; bulk upload |
| Makers, places, sources | IG (shared vocabulary) | hundreds of makers; a gazetteer of ~150–300 places; dozens of sources | seeded from the migration, then grown inline while cataloguing |
| Products at launch | OEI | 150–300, from perhaps 30–60 designs | the **merch-from-work wizard** + the owner's product list (CSV import) |
| Stories and essays | both | existing essays migrate; the owner's history columns (with permission) | editors |
| Offers, holds, price requests, enquiries | IG | daily | the desk and the inbox |
| Orders, pickups, returns | both | daily | the order screen |
| Newsletter | IG fortnightly · OEI as campaigns | 26+ issues a year | **generated from inventory**, edited, sent |

## 2. What each job needs to be fast

### Cataloguing an original — the single highest-leverage screen

A cataloguer works from the object in hand, one drawer at a time.

- **Above the fold:** stock number, hook title, original title, object type,
  maker (with role and certainty), date (any precision), place, technique,
  colour, dimensions, condition grade. Everything else collapses.
- **Save and add another** keeps the drawer's context — the source work, the
  maker, the date range, the object type — and clears the rest. One keystroke.
- **Dates accept how people write them**: `1726`, `c. 1750`, `1724–26`,
  `before 1680`, `abad ke-18`, and show the interpretation before saving.
  **Dimensions** accept `45 by 38 cm`, `450 x 380 mm`, `17¾ × 15 in`.
- **Makers and places are created inline**, with alias hints ("Valentyn → did you
  mean Valentijn?") and a duplicate warning on a similar title + maker, or a
  reused stock number.
- **The grade picker shows each grade's definition**; defects are a checklist,
  never "study images carefully".
- **Autosave to draft.** Side-by-side English and Indonesian.
- **AI drafting** (flagged, optional): from the scan, suggested title, original
  title transcription, places, makers and a first paragraph — every suggestion
  marked until a human verifies it; nothing unverified publishes (ARCHITECTURE.md
  §1, principle 7).

### Photographing and uploading

Batches of files named by stock number (`M.1044-recto.tif`, `M.1044-verso.tif`)
are dropped onto the bulk uploader, matched to works, tagged by role, captioned
inline, and queued for derivatives and IIIF tiles with visible status. The
capture standards (the Design stage, TASKS.md 6.2) say what to shoot for which object
type, and how.

### Making merchandise from a work

The shop manager opens a work (a provenance copy from the gallery), crops a
design with the **print ceiling** shown, picks product types (giclée, poster,
postcard set, tote), previews the generated variants — only those the scan's
resolution and the product type's constraints allow — sees prices from the
tables, and creates drafts with room mockups. Target: **a twelve-variant print
product in under five minutes** (the Admin stage's done-criterion, TASKS.md 38.2).

### Answering buyers

The **desk** is the admin's home: queues for offers (with the private floor
visible), holds expiring today, price requests, enquiries, consignments, orders
to fulfil, pickups ready, low stock, and drafts awaiting verification. Each item
opens where the action is: accept / counter / decline an offer (issuing a payment
link), grant or release a hold, answer a price request from a template, reply on
WhatsApp.

## 3. The lifecycle of a record

```
works:     draft ──► catalogued ──► verified ──► published ──► (sold: stays published)
products:  draft ──► available ──► (on hold — derived) ──► sold | not-for-sale | archived
designs:   draft ──► ready ──► products generated ──► published (only if rights allow)
```

- **Saving is cheap; publishing is the claim.** Save-time rules catch only what
  is always a mistake; publish-time guards insist on what a buyer needs
  (CONTENT-MODEL.md §9). A required field that blocks saving is one people learn
  to defeat with junk (KOI).
- **Nothing is public by a script's authority** — seeds and migrations land as
  drafts.
- **Corrections are the common case.** Reattributing a maker, refining a date,
  swapping the primary image, merging two makers: each is as cheap as creating,
  with version history to undo.

## 4. Who does what

| Role | Day to day |
| ---- | ---------- |
| **cataloguer** | works, makers, places, sources, images; verifies AI drafts; cannot touch prices or orders |
| **manager** | prices, offers, holds, discounts, customers, refunds; publishes |
| **editor** | stories, pages, curations, the homepage, navigation, newsletters |
| **fulfilment** | orders, packing, shipments, pickups, returns, stock counts |
| **analyst** | dashboards (ANALYTICS.md §3) |
| **contributor** | drafts only — the default for anyone new |

The **curator** (Dr Parry's role) has two jobs the system cannot do alone: signing
off the migration's category → facet mapping, and the grading scale's wording.

## 5. Languages

English is the working language of the gallery's records and Indonesian a full
second locale; the shop is written for both from the start. Machine translation
is allowed and shown as `machine` until an editor marks it `reviewed`
(CONTENT-MODEL.md). Original titles are never translated — they are transcriptions.

## 6. What the owner's team is trained on

The Launch stage ends with a training session and two manuals written for
non-developers: `manual/cms-guide.md` (cataloguing, uploading, the merch wizard,
the desk, orders, offers, holds, refunds, returns, newsletters) and
`manual/user-guide.md` (what buyers see, for staff answering them). The
done-criterion is KOI's: someone who has never seen the project catalogues a work
and fulfils an order **using only the guide**.
