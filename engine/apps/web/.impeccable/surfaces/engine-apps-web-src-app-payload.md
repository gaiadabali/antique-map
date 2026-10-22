---
version: 1
slug: "engine-apps-web-src-app-payload"
primary_target: "engine/apps/web/src/app/(payload)"
related_targets: ["engine/packages/cms/src/admin"]
---

# Surface brief — the admin (`/admin`, Payload 3.90)

**Mode:** Operate. **Scope:** the whole admin: sign-in, home, sidebar, header, every list and edit form, and the
custom views (Order panel, Leads inbox, Import stock, the analytics dashboard). Light only (DR-14).

**Audience and job:** the owner and editors in Indonesia keep both sites' catalogues, answer leads and watch orders;
store staff move their store's orders on a phone. None are developers. English or Indonesian per person (default
English, the user's decision of 2026-10-10).

**What hurt (the user, 2026-10-11):** looks generic and unbranded; hard to find things; long cluttered forms; poor
on a phone. **Must stay:** Payload's flows (draft, publish, versions), every field, label and access rule from
15.3, the Order panel's steps.

## Direction contract

THESIS: The admin opens on the archive itself: every antique and product as a matted card wearing its state. It
refuses the category default of a grey sidebar over a grid of collection tiles that repeats the sidebar.

OWN-WORLD: Linen ground, white paper panels with one hairline edge, ink type, bronze only for the one primary action,
the current selection and focus. Square corners (2 px on controls). Karla for everything read or clicked; Cormorant
only for page and record titles. Pictures sit in mats, as in the shop. State is a small square tag in text and tone:
Draft, Needs photo, AI draft to check, Out of stock, Sold.

STORY: The owner signs in and sees what needs him (orders, leads, drafts to check) above the archive's own wall; one
click on a card opens that record. Store staff land on their orders, never the wall.

FIRST VIEWPORT: Sidebar by site at left, Daily work first. Main column: "Catalogue" set in Cormorant at 32 px; a
single paper strip of today's counts (Orders to act on, New leads, AI drafts to check, Drafts), each a link; a filter
row (All, Indies Gallery, Old East Indies, then Needs attention, Drafts, Published, Sold or out of stock, and
search); then a four-column wall of matted cards (picture, title in two lines, site and reference, state tag), 24 to
a page. On a phone: two columns, the strip scrolls sideways, targets 44 px.

SIGNATURE INTERACTION AND MOTION: a card's hairline darkens to ink and its picture eases 2 % closer on hover or focus
(180 ms, the brand ease); reduced motion keeps the hairline only. No page-load choreography anywhere.

FORM: The Catalogue Wall, position 7 on the ordered list of seven; seed key 0411b984.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
