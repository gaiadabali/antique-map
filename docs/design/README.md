# docs/design — design inputs and working material

What is in this folder and how far each part holds under [PLAN.md](../PLAN.md). The rules for both sites are
[DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md); behaviour is [EXPERIENCE-GALLERY.md](../EXPERIENCE-GALLERY.md) and
[EXPERIENCE-SHOP.md](../EXPERIENCE-SHOP.md); the product brief is the root [PRODUCT.md](../../PRODUCT.md). **Where a
file here disagrees with those, they win.** The files below are kept as they are; their mentions of brand folders,
contracts (C1–C13), accounts, invoices, offers, reservations or a single stock pool describe the earlier plan.

## What is here

| Path | What it is | Status |
| --- | --- | --- |
| [input/claude-design-2026-09/](input/claude-design-2026-09/) | the design team's delivered work: the luxury-minimalist design system (`_ds/…/`: three-tier tokens, component CSS, fonts, readme, an adherence lint), both home pages, the shop's `Old East Indies/Partnership.dc.html`, the hero film (`assets/hero-film.mp4`), their project notes (`CLAUDE.md`, the same text as `project-notes.md`: the client's form and the decisions of 11 Sept 2026), and their brief and reference analyses | **valid with one change — the base of the first-run UI** (DR-14, DR-16; [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)). The change: the Partnership page's last section, a sign-up and sign-in bridge for retailer accounts, becomes the enquiry call to action — WhatsApp, email and a short form creating a `partnership` lead (DR-8, [EXPERIENCE-SHOP.md](../EXPERIENCE-SHOP.md) §11); the shop's header Partnership item and the home's highlight stay. Settled since: Inter stays (Karla is Q15) and each site gets its own palette (Q16). Their copy is not fact where an owner answer differs (no institution or buyer named, G10; the same-working-day reply, G9; no gift cards, returns or shipping abroad, S3, S10, S12). `Home - Kingdoms of Indonesia` is a third, unrelated site: out of scope |
| [journeys/owner-answers.md](journeys/owner-answers.md) | the owner's answers G1–G15 and S1–S15 | **valid**, except where PLAN.md overrides: D30/D50/D51 pay page (deferred to v2), retailer accounts and tiers (DR-8), D47 export, D52 one stock pool (stock is per store, DR-6), D54 |
| [journeys/owner-interview*.md](journeys/) | the questions behind those answers, in English and Indonesian | reference |
| [journeys/gallery/](journeys/gallery/), [journeys/shop/](journeys/shop/) | buyer scenarios a test facilitator can run | **partly valid** — see below |
| [gallery/voice.md](gallery/voice.md), [emporium/voice.md](emporium/voice.md) | how each site speaks in English and Indonesian: register, principles, the VOC stance, the settled words | **valid for register, principles and words** (*Anda*, British spelling, no VOC imagery). Lexicon key lists that name accounts, offers, holds, returns, carts or the configurator follow the reshaped lexicon (DESIGN-SYSTEM.md §11). Indonesian lines await native review |
| [imagery/](imagery/README.md) | photography guides for the owner and staff, shot lists per item type, the intake spec, retouching and labelling rules | **valid** — the owner supplies the photographs (D19). The image roles hold; the configurator's room plates (`room-scenes.md`) are not needed while products are stocked variants |

## The journeys under the plan

| Journey | Runs as | What no longer applies |
| --- | --- | --- |
| J-G1 collector from search → verso zoom → WhatsApp | **to the WhatsApp handoff** | the invoice and the pay page (v2, DR-3) |
| J-G2 institution → enquiry | **to the enquiry** (email or form, a `contact` or `ask` lead) | the proforma pay page |
| J-G3 designer → shortlist → printed page | **with "Print this page"** as the factsheet | the device wishlist; the invoice |
| J-G4 heritage buyer → old town name → enquiry | **as written, to the enquiry** | the invoice paid from home |
| J-G5 old link to a sold map | **as written** — "Sold", similar works, the print at Old East Indies | want-list alerts (out) |
| J-G6 online offer | retired | — |
| J-G7 Jakarta collector → viewing | **to the viewing request** on WhatsApp or email | a booking system; the rupiah invoice |
| J-G8 call → negotiated invoice | not run in v1 | the invoice is v2 |
| J-S1 Instagram → product → QRIS | **as written**, with stocked variants instead of a configurator | the live preview |
| J-S2 tourist → delivery to a villa before departure | **the Bali half**, with the map pin | shipping abroad (S3) |
| J-S3 hotel → partnership | **to the partnership enquiry** (DR-8) | partner accounts, quotes, trade prices |
| J-S4 store QR walk-in | **the QR → product page** half | pickup of online orders (not at launch, DR-6) |
| J-S5 gift to a recipient in reach | **within the delivery area**, with a gift note | a recipient abroad |
| J-S6 saved items and an alert | not run | wishlists and alerts are out |
| J-S7 virtual account → pending page → tracking | **as written**, ending on the tracking page (`/orders/{token}`) | order lookup by account |

Each journey's common success criteria in [journeys/README.md](journeys/README.md) still hold, read against the plan:
no price or purchase control on any gallery original; no account anywhere; no page promising a refund or a return
until counsel words it.

## Adding to this folder

New design work — phase 4's notes, and later the owner's UI/UX pass after the build (TASKS.md v2.0) — goes in a
dated subfolder (`docs/design/<yyyy-mm>/`), and its decisions end up in `DESIGN.md` and the two palette files
(`sites/gallery/tokens`, `sites/shop/tokens`), not here.
