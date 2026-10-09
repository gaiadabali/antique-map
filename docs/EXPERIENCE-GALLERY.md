# Experience — Indies Gallery

How the gallery site behaves, surface by surface, so a designer and a developer read the same thing. It is an
**enquiry-only catalogue** (DR-3, DR-4): it shows the client's antique maps, prints and photographs, held in
Singapore and Jakarta, and gets a serious buyer into a conversation with the client fast. It sells nothing online.
The shared look is [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md); the content team's side is
[CONTENT-OPERATIONS.md](CONTENT-OPERATIONS.md); the AI rules are [AI.md](AI.md).

**Feeling:** a print room re-hung as a modern museum. Warm paper, generous margins, the sheet on its mat, never
cropped. The interface recedes; the object leads. Nothing on the page may make a one-of-one map look like a poster.

## 1. Who it serves

| Visitor                       | Arrives wanting                                                                      | What they need from the site                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Collectors**                | a specific maker, place or state; usually from search onto one item page, on a phone | the full record (collation, state, condition, references), deep zoom of recto and verso, then a fast way to ask |
| **Institutions**              | a piece for a collection; acquisitions offices write by email                        | provenance, condition, dimensions, a clear contact; no institution is named in public (G10)                     |
| **Designers, villas, hotels** | something by place, size and look, to show a client                                  | browse by place and type, dimensions in cm and inches, a printable page (G14)                                   |
| **Heritage buyers**           | the town their family knew, often under its old name                                 | search that knows Buitenzorg is Bogor and Celebes is Sulawesi                                                   |
| **People selling an antique** | to know whether the client buys, and how                                             | a "Sell to us" page with WhatsApp, email and a short form (DR-4)                                                |

Every buyer reaches the deal the same way: a conversation on **WhatsApp or email** (or a call) with the client,
who negotiates the price (G3). The reply promise beside every contact button is **"the same working day,
Singapore time"** (G9).

## 2. Sitemap

Paths follow the route map in [ARCHITECTURE.md](ARCHITECTURE.md) §5. Indonesian lives under `/id/…` with translated
route segments; record slugs stay as they are (DR-12). An old item URL is still its address; other old addresses
answer through `redirects` ([DATA.md](DATA.md) §6).

| Surface              | Example path                                                                                  | Purpose                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Home                 | `/`                                                                                           | one featured work, new arrivals, browse by place, makers, trust facts                         |
| Browse               | `/antique-maps`, `/antique-prints`, `/photographs`, `/antique-maps/java`; all types `/browse` | the catalogue by object type (`works.objectType`), with facets                                |
| Search               | `/search?q=batavia`                                                                           | full-text over titles, makers, places (historical names included), stock numbers              |
| Item                 | `/product/{publicId}-{slug}` (the old site's shape)                                           | the work: deep zoom, record, status, Ask about this                                           |
| Makers index · Maker | `/makers`, `/makers/valentijn`                                                                | biography, life dates, available and sold works                                               |
| Places index · Place | `/places`, `/places/java/batavia`                                                             | modern and historical names, the works depicting it                                           |
| Sell to us           | `/sell-to-us`                                                                                 | WhatsApp, email and an optional form → a `sell` lead (DR-4)                                   |
| Visit                | `/visit`                                                                                      | viewings by appointment in Singapore and Jakarta (G2) — contact only, no booking system       |
| About                | `/about`                                                                                      | the gallery, since 2001, over 9,500 antiques, the curator (G13)                               |
| The guarantee        | `/guarantee`                                                                                  | the lifetime authenticity guarantee, in counsel's words (G6)                                  |
| The certificate      | `/certificate`                                                                                | every original comes with one; no sample shown (G7)                                           |
| Condition grades     | `/condition`                                                                                  | the published scale the item record links to                                                  |
| Shipping             | `/shipping`                                                                                   | the buyer pays shipping and duties, quoted after agreement, paid in full before sending (G11) |
| Editorial pages      | `/stories/{slug}`                                                                             | essays and guides from `pages`, built from blocks                                             |
| Contact              | `/contact`                                                                                    | WhatsApp, email, the reply promise, an optional form → a `contact` lead                       |
| Privacy · Terms      | `/privacy`, `/terms`                                                                          | counsel's pages (an owner item)                                                               |
| Not found · Error    | —                                                                                             | designed pages with search and the WhatsApp button                                            |

**Header** — the design team's (their lockup: the globe mark, the name, "Antique Maps & Prints of Indonesia";
transparent over the hero film, frosted linen once scrolled; a drawer at ≤ 1024 px): logo · Maps · Prints ·
Photographs · Places · Makers · search · language, and in its button slot (their "Enquire") **Ask on WhatsApp**.
No basket, no account, no price, no currency. **Footer** (theirs — contact on the left, link columns, social):
Visit · Sell to us · Guarantee · Certificate · Condition grades · Shipping · About · Contact · the sister link
("Prints from our archive at Old East Indies") · privacy, terms · language; their "Gifts under $350" goes (no price
on the gallery) and their "Journal" waits for a stories index. **On a phone** the header is logo, search, WhatsApp
and a menu; the menu lists types, places and makers first, the rest after; the place tree opens as a drill-down,
never a 100-link list.

## 3. Home

The design team's page is the composition (TASKS.md 4.3.b); its bands are ordered in the CMS (an edit, not a
deploy), never a carousel, and its copy yields to the owner's answers:

1. **The hero** — the eyebrow, the H1, one line, the two actions and the owner's facts as proof points (since 2001,
   over 9,500 antiques, a certificate with every original — G7, G13; no institution, G10), beside **the lead sheet**:
   the newest available map with a published image, whole on its mat, captioned with its title, maker and date,
   _Price on request_ and its stock number (phase 14, the user's request 2026-10-09). The drawn hero film
   (`assets/hero-film.mp4`, DESIGN-SYSTEM.md §6) is not used while no film is supplied; it would return through
   the CMS's hero media, not as a placeholder.
2. **About** — a short paragraph and three signals, **since 2001** and **over 9,500 authentic antiques** among them
   (G13), over an old map the cursor reveals on hover screens.
3. **The collection** — three numbered entries (their _Pre-1750 maps_, _Spice Islands_, _Botanical prints_), each
   a plate, a hairline and **Explore** into a browse page — by type, place or a curated `page`, chosen in the CMS.
4. **The curator** — his portrait, two short paragraphs, a link to his note (G13).
5. **Recently placed** — three sold works, each "Sold" and nothing more: no buyer, no "private collection" (G10).
6. **Printed editions** — "Live with the collection" and the bridge to Old East Indies.
7. **Enquire** — "Nothing here is sold online": WhatsApp first, email, and the short form (§8) creating a `contact`
   lead, with the reply promise of G9 (not the drawn "two working days").

The CMS can also place the bands the drawing lacks: new arrivals with their dates, browse by place with counts,
makers with available counts, how buying works (G3, G11) and Sell to us (DR-4). A band whose data is empty is
omitted, never shown empty.

## 4. Browse and search

**Facets** — counts follow the all-but-this-facet rule; each facet is a real link or checkbox, so a filtered page
has a URL:

| Facet        | Source                 | Notes                                                                                             |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Availability | `works.status`         | **default: available + on hold**; a visible "Include sold" toggle — the sold archive is a feature |
| Type         | `works.objectType`     | the fixed list: map, sea chart, city plan, view, print, photograph… (CONTENT-MODEL.md §3)         |
| Maker        | `makers`               | with counts; alias spellings resolve (Valentyn → Valentijn)                                       |
| Place        | `places`               | a tree: island group → region → town; one primary place per work; counts roll up to parents       |
| Period       | `works` date           | century chips plus a from–to year pair (number inputs, never a slider alone)                      |
| Subject      | `terms` kind `subject` | curated themes (ships, costume, flora and fauna…) — tags, not branches of the place tree          |

**No price facet and no price sort**: with no price shown, either would leak the price the page hides. **Sort:**
newest · date of the work (old → new, new → old) · maker A–Z.

**Places and their names.** Each place carries its modern name and its historical names (`places`). Search treats
them as one: "Batavia", "Jakarta" and "Djakarta" find the same works; a result line shows the record's name with
today's beside it — "Buitenzorg (Bogor)" — and never corrects the record. The tree's roots are the Indonesian island
groups (Sumatra, Java, Bali and Lombok, Nusa Tenggara, Kalimantan, Sulawesi, Maluku, Papua) plus **Beyond
Indonesia** for everything else the catalogue holds.

**Search** reads titles (hook and original), makers and their aliases, places and their historical names, subjects
and stock numbers (`M.0500` jumps straight to the item). Indonesian queries work ("peta Bali kuno"). A misspelling
or historical name gets one suggestion — "Did you mean Sulawesi (Celebes)?".

**Cards:** the image on its mat (contained, never cropped — a 3.5 : 1 coastal profile and a 0.3 : 1 costume print
share one grid), title, maker and date with their precision, dimensions, and one status line: _Price on request_ ·
_On hold_ · _Sold_. One card is one link.

**Phone:** a two-column grid; facets in a bottom sheet with applied-filter chips above the grid, a live count on
the apply button ("Show 34 works"), sticky Apply and Clear. **Desktop (1280):** facets in a left column, the grid
in four columns.

## 5. The item page

The heart of the site. Top to bottom on a phone; on a desktop the media sit left and the record and the Ask panel
sit right, the panel sticky.

**Title block.** H1 is the hook title where one exists ("Bali by François Valentijn, 1726"); the **original
title** follows in italic, transcribed as printed. Most migrated works have no hook title, so the fallback is
designed: the original title becomes the H1 and the maker line moves up. Then the maker line with role and
certainty (`VALENTIJN, François (1666–1727)`, "attributed to", "after"), and the **stock number** (`M.0500`) —
also the WhatsApp reference.

**Media.**

- The primary image is the **recto**: an ordinary responsive `<img>` with real alt text, the page's LCP, cropped
  outside the sheet and never into it.
- The deep-zoom viewer (§6) holds every image the work has: recto, **verso** (a flip, not a separate page), details,
  raking and transmitted light. A filmstrip shows what exists; "Verso" is always named, even when blank.
- An in-room composite is labelled "Digital mockup" and is never first.
- A **scale view** — a simple drawing of the sheet beside a person and an A4 page, from the dimensions — because
  misjudged size is the commonest disappointment.

**Status and the Ask panel** — a conversation, never a checkout:

| `works.status` | The panel reads                                                            | Leads with                                                                                                       |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `available`    | **Price on request** · Held in {Singapore / Jakarta}                       | **Ask about this** (WhatsApp) · Email us · Ask our guide · the reply promise                                     |
| `on-hold`      | **On hold** — "Another buyer is in conversation about this work."          | "Ask to be told if it becomes available" (WhatsApp / email, prefilled) · similar works                           |
| `sold`         | **Sold** — nothing else: no price, no buyer, no "private collection" (G10) | "Prints of this from Old East Indies" when a product links this work · similar works · "Ask for another example" |

_On hold_ is set by staff by hand while a deal is under way; it carries no date (staff-issued invoices are v2,
DR-3). No Buy, Reserve, Offer or price appears in any state. The panel also carries the reassurance row — **a
certificate with every original** (G7), **the lifetime authenticity guarantee** (G6), each linked to its page —
and **shipping**: "Shipping and duties are quoted after we agree the price, and paid before the work is sent"
(G11). It states no returns rule until counsel words one.

**The record** — a definition list in the order collectors expect: place, publisher and date of this issue · date
on plate · source work · state and edition · technique · colouring · dimensions (image and sheet, **cm and
inches**; framed if framed) · condition (the grade, linked to the scale, plus the cataloguer's notes) · references ·
provenance · stock number. A field with no value is left out, never shown as "—".

**Context.** The description, restructured with subheads; the maker, collapsed ("Read the biography · 18 works
by Valentijn"); the place depicted; **related**: same maker · same place · same source work.

**Utilities.** Share (WhatsApp first; the native share sheet on phones) · **Print this page** — a print stylesheet
that is the designers' factsheet: the work, "Price on request", the gallery's contact and the date printed, no
price (G14) · "Have something similar to sell?" → Sell to us.

## 6. The deep-zoom viewer

- **Loads on intent** — the first tap or hover on the image, or when the browser is idle after LCP. Until then the
  primary image is an ordinary image and costs nothing.
- **Controls are real buttons** in the tab order: zoom in, zoom out, reset, full screen, previous/next image, and
  the verso flip. Keyboard: `+`/`−` zoom, arrows pan, `0` resets, `Esc` closes full screen.
- **On a phone:** pinch and double-tap to zoom; one-finger pan only once zoomed, so the page still scrolls at rest;
  `touch-action` stops the viewer's pinch fighting the page's. A clear, always-visible close.
- **Full screen is a fixed overlay**, not the Fullscreen API (iOS Safari gives that only to video), on the one dark
  surface the system allows, so paper reads true against it.
- Tiles are small WebP/AVIF; the viewer stays inside the memory limits of the WhatsApp and Instagram in-app
  browsers, and is tested in them.
- `prefers-reduced-motion`: zoom steps cut instead of animating.
- Everything the viewer shows is also on the page as text — the record and the alt text — so a screen-reader user
  loses no fact.

## 7. Makers, places and editorial pages

- **Maker page:** name with life dates and roles (cartographer, engraver, publisher, photographer), biography,
  available works first, then sold ones (the "Include sold" toggle again).
- **Place page:** modern name as H1 with the historical names under it ("Batavia · Djakarta"), a short note on how
  it was mapped where the CMS has one, child places, available works, sold works.
- **Editorial pages** (`pages`): essays, guides and the trust pages, from Payload blocks — prose, figure, a
  "zoom figure" that opens the viewer at a region ("see the cartouche"), a work rail, FAQ, call to action. An essay
  ends with "Works in this story".

## 8. Handoffs: WhatsApp, email and the guide

Every contact button opens a **prepared message in the page's language**, written in the visitor's voice, which they
can edit before sending. The values live in the lexicon (DESIGN-SYSTEM.md §11); the shapes are:

| Where                      | WhatsApp text (EN · ID)                                                                                                  | Email                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Item, available or on hold | "Hello, I am interested in {stockNumber} — {title}. {url}" · "Halo, saya tertarik dengan {stockNumber} — {title}. {url}" | subject "{stockNumber} — {title}", body the same plus an empty "My question:" line |
| Item, sold                 | "Hello, I see that {stockNumber} — {title} has sold. Do you have another example? {url}"                                 | same pattern                                                                       |
| Viewing                    | "Hello, I would like to arrange a viewing in {city} of {stockNumber} — {title}."                                         | subject "Viewing in {city}"                                                        |
| No results                 | "Hello, I am looking for {query}. Do you have anything?"                                                                 | subject "Looking for {query}"                                                      |
| Sell to us                 | "Hello, I have an antique I would like to sell: {what}. I can send photos here."                                         | subject "Selling an antique"                                                       |
| From the guide             | "Hello, I was asking your guide about {stockNumber} — {title}: {summary} {url}"                                          | the same, with the summary                                                         |

**Rules.** The stock number always comes first — it is the client's reference. The title is cut at 90 characters
with "…". `{url}` is the item's clean canonical URL in the page's locale, with no tracking parameters, so
WhatsApp shows its **link preview** — that preview (the recto as `og:image`, kept small enough for WhatsApp to
fetch, plus the title) is how the item travels "attached" to the message. The click is recorded as a first-party
`handoff` event before the app opens ([ANALYTICS.md](ANALYTICS.md)); a click is not a lead. WhatsApp uses
`https://wa.me/{number}?text=…` (the number from `site-settings`); email uses `mailto:` with an encoded subject and
body, and the address is also shown as text for visitors without a mail app.

**Optional forms** (Ask, Sell to us, Contact) post to `/api/x/leads` and create a **lead** (`ask`, `sell`,
`contact`) with the item attached when there is one. Fields: name · WhatsApp or email (one required, the visitor's
choice) · message. The Sell to us form takes no photos: they travel on WhatsApp or email
([CONTENT-MODEL.md](CONTENT-MODEL.md) §6). The thank-you state says what happens next: "We reply the same working
day, Singapore time, on the WhatsApp number or email you gave."

**The guide (AI chat, DR-9).** Entry points: "Ask our guide" in the item's Ask panel (opens with the item as
context), the no-results state (opens with the query), and a small launcher on browse and home. It opens as a
full-height sheet on a phone and a side panel on a desktop. The panel says plainly that it is an AI guide that
answers from the catalogue and can be wrong, that it **never quotes a price or agrees a deal**, and keeps **"Talk to
a person"** (WhatsApp · email) visible at all times. Before it records a `chat` lead it asks the visitor's
permission and shows what it will send. The transcript notice links to the privacy page. Behaviour and safety rules
are [AI.md](AI.md); the chat is switched off in `site-settings` without a deploy.

## 9. States

| State                      | What the visitor sees                                                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loading**                | the page arrives server-rendered; images reserve their space (no layout shift); the viewer shows the static image until tiles load; a streamed rail shows its reserved height, never a spinner in place of content                  |
| **Empty band**             | omitted (home, related, maker with no available works says "No works by {maker} are available now" and shows sold ones)                                                                                                             |
| **No results**             | never a dead end: "We hold over 9,500 works and not all are online — ask us", WhatsApp and email prefilled with the query, "Ask our guide", the historical-name suggestion, and the active filters as chips to remove one at a time |
| **Sold**                   | the page stays live and indexed: "Sold", related works, the print from Old East Indies when one exists                                                                                                                              |
| **On hold**                | "On hold", the ask-to-be-told button, similar works                                                                                                                                                                                 |
| **Removed work**           | a designed "No longer listed" page (404, noindex) with search and similar works; a sold work is never removed                                                                                                                       |
| **Old link**               | an old item address still opens its work, with one 308 if its slug changed; other old addresses answer 301 or 410, and one with no match gets the designed 404, its search prefilled (DATA.md §6)                                   |
| **Error**                  | a designed page: one sentence of what happened, a retry, the WhatsApp button with "Reference: {id}" prefilled                                                                                                                       |
| **Form sent back**         | the form keeps every value, the field in error says what to fix ("Add a WhatsApp number or an email so we can reply")                                                                                                               |
| **Offline / weak network** | a failed send keeps the text and offers WhatsApp instead                                                                                                                                                                            |

## 10. Phone-first rules

- Designed at **390 px first**, checked at 1280 px. Nothing scrolls sideways; nothing needs a pinch outside the
  viewer.
- **The bottom of the screen is one slot**: on the item page the Ask bar (WhatsApp · Email · guide) is sticky and
  the chat launcher merges into it; elsewhere the launcher alone. No pop-up, newsletter prompt or exit-intent on
  phones.
- Tap targets ≥ 44 px; inputs at 16 px so iOS does not zoom.
- The WhatsApp and Instagram in-app browsers are first-class: the viewer, share and handoffs are tested in them.
- Images serve no larger than rendered size × device pixel ratio; `Save-Data` picks a smaller ladder.

## 11. Accessibility

WCAG 2.2 AA (DESIGN-SYSTEM.md §10). Specific to the gallery: status is text, never colour alone; the viewer is
keyboard-complete with its text alternative on the page; dates carry their precision ("c. 1750") and attributions
their certainty, read out as written; an original title in Latin or Dutch carries its own `lang`; dimensions in cm
and inches; the facet sheet traps focus and returns it to its opener; the chat panel is a labelled dialog whose new
messages are announced politely.

## 12. Deliberately absent

| Not on the gallery                                             | Why                                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Cart, checkout, Buy, Reserve, online offers                    | DR-3: the deal is made in conversation (G3)                                            |
| Any price, price facet, price sort, `Offer` in structured data | G4, G14: every original is "Price on request"                                          |
| Accounts, sign-in, an account area                             | DR-3, DR-10: nothing but staff signs in                                                |
| Wishlists, saved searches, want-list alerts                    | out in PLAN.md; "ask to be told" is a WhatsApp message or a lead, answered by a person |
| A viewing booking system                                       | viewings are by appointment: a WhatsApp or email message (G2)                          |
| A staff-issued invoice with an online pay page                 | deferred to v2 (DR-3)                                                                  |
| Named institutions or buyers                                   | G10                                                                                    |
| VOC emblems or colonial nostalgia in the chrome or voice       | the owner's stance: no VOC imagery beyond the items themselves                         |

**SEO, briefly:** title `{title} – {maker}, {year} | Indies Gallery`; JSON-LD `VisualArtwork` with creator,
dates, dimensions, `spatialCoverage` and the stock number as `identifier`, plus `BreadcrumbList` — no `Product` or
`Offer`; sold works stay in the sitemap; `hreflang` pairs; canonicals on filtered pages beyond the named ones.

## Open

- **The gallery's WhatsApp number, email address and phone** — owner. Until then the buttons render from
  `site-settings` on staging only.
- **Viewing addresses and hours in Singapore and Jakarta** — owner. Default: the Visit page names the two cities,
  "by appointment", and the contact buttons; no address.
- **The guarantee, terms and any returns wording** — counsel (owner item). Default: the guarantee page states the
  lifetime authenticity guarantee in counsel's words once given; nothing about returns until then.
- **The condition-grade scale's wording** — the curator. Default: the grade shows; the scale page waits.
- **Whether "On hold" should say more** (for example a date) — owner. Default: no date, set by hand.
