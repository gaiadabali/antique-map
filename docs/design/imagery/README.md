# Imagery — capture standards, intake and room scenes

Task 6.2 (TASKS.md, phase 6). Photography decides perceived quality more than any
component (DESIGN-SYSTEM.md §11), so this folder fixes what a photograph of an
original, of a product and of the showroom must be before any comp is drawn on one.

**D19 (2026-10-01): no photographer is booked.** Every item is the owner's own
property and the owner supplies its photographs. So the standards are written twice:
once as a **guide the owner and staff can follow** with equipment a small gallery or
shop plausibly has, and once as the **intake spec** the platform checks every
handed-over image against.

## What is here, and who reads it

| File | For | What it settles |
| ---- | --- | --------------- |
| [gallery-guide.md](gallery-guide.md) · Indonesian: [gallery-guide.id.md](gallery-guide.id.md) | the owner and gallery staff | photographing originals: kit tiers, light, colour card, raking and transmitted light, frames and mats |
| [shop-guide.md](shop-guide.md) · Indonesian: [shop-guide.id.md](shop-guide.id.md) | the owner and shop staff | photographing products and the showroom: sun, hands, rooms, packaging |
| [shot-lists/map.md](shot-lists/map.md) · [print.md](shot-lists/print.md) · [photograph.md](shot-lists/photograph.md) · [merch-product.md](shot-lists/merch-product.md) · Indonesian: [map.id.md](shot-lists/map.id.md) · [print.id.md](shot-lists/print.id.md) · [photograph.id.md](shot-lists/photograph.id.md) · [merch-product.id.md](shot-lists/merch-product.id.md) | whoever holds the camera | one page per item type: every shot, in order, with its image role |
| [retouching-and-labelling.md](retouching-and-labelling.md) | everyone, both brands | what may and may never be corrected; how a synthetic image is labelled |
| [intake-spec.md](intake-spec.md) | the reviewer, and the checking tool later | the checks per image role, and the pass / fix / reject rubric |
| [handover.md](handover.md) · Indonesian: [handover.id.md](handover.id.md) | the owner and the reviewer | file formats, names, folders, how to send, what we do with location data |
| [room-scenes.md](room-scenes.md) | UXE, MED (30.4, 24.1) | the configurator's room plates: wall colours, scale props, perspective, labelling (6.2.c) |
| [pilot-set-request.md](pilot-set-request.md) · Indonesian: [pilot-set-request.id.md](pilot-set-request.id.md) | the owner — **it is sent to them** | the pilot set (6.2.b, 👤 OA3) and how to hand it over |

The owner-facing files are plain language on purpose. The ones the pilot request attaches
have Indonesian versions (`*.id.md`, 6.2.f) — drafts awaiting native review (D20), with
the English as the source: a change to a guide is made in the English and then carried
into its `.id.md`. The intake spec and the room scenes are for the people who build
and check. Where the two disagree, the intake
spec wins and the guide is corrected.

## The image roles

A work's images carry one role each, set once at intake on the media record
(`media.role`), as CONTENT-MODEL.md §1 (works' `images`) and §6 (`media`) and C9 v1.4
`WORK_IMAGE_ROLES` define, in manifest and filmstrip order (C9 `orderImages()`).
Every gallery shot in this folder maps to one of them:

| Role | The shot | Required? (gallery) |
| ---- | -------- | ------------------- |
| *primary* | **not a role** — a designation: the first photographed `recto`, cropped outside the sheet, never into it (C9 `primaryImageIndex()`; no media record carries `primary`) | always (derived) |
| `recto` | the whole front of the sheet, flat, colour card and ruler beside it | always |
| `verso` | the whole back | always — "blank" is information too |
| `detail` | a close-up nearer than the recto: cartouche, title, imprint, colour, and **every defect the condition report names** | at least one; one per named defect |
| `raking` | one low light from the side: plate mark, folds, cockling, repairs | maps and prints: yes; photographs: yes, low and gentle |
| `transmitted` | lit from behind: watermark, chain lines, tears, thin spots, repairs | when the kit allows (better tier) — never for mounted photographs |
| `framed` | the object as it will be delivered, in its frame or mat | only if it is sold framed or matted |
| `in-room` | the framed object on a real wall, or a labelled composite | optional; never the primary |
| `scale` | the object flat beside a ruler and an A4 sheet | optional — the page draws an SVG scale view from the dimensions anyway |

Requirement 6.12: the gallery's 200 most important items have at least a recto, a
verso and one detail shot to these standards at launch.

**The shop's product images** carry the roles CONTENT-MODEL.md §1 (products'
`images`) and C9 v1.4 `PRODUCT_IMAGE_ROLES` define, in the product page's order:
`in-room` · `flat` · `detail` · `lifestyle` · `scale` · `packaging` · `showroom`. A
product page leads with its first photographed `in-room` or `flat` image, and with a
labelled mockup only until one exists (C9 `primaryImageIndex()`). A location's own
photographs (the showroom) are role `showroom`, each with an area — `street` ·
`entrance` · `wide` · `wall` · `counter` · `vignette` · `making` — as CONTENT-MODEL.md
§2 (Stock, `locations`) and C9 `LOCATION_IMAGE_ROLES` and `LOCATION_IMAGE_AREAS`
define. A configurator room plate is role `room-plate` (room-scenes.md). How each
image was made is `media.provenance` — `photograph` · `composite` · `rendered` ·
`ai-generated` (CONTENT-MODEL.md §6, C9 `MEDIA_PROVENANCES`; retouching-and-labelling.md
§4). Requirement 7.12 needs `flat`, `in-room` and `detail` for every launch product
(a launch report, not a publish guard).

## Assumptions (not facts — the pilot and the owner interview confirm or correct them)

- **Equipment.** The guides assume the least a small gallery or shop plausibly has —
  a phone from the last few years, a window, a table — and describe what a
  mirrorless camera, two daylight lamps and a colour chart add. Nothing here states
  what the owner actually owns; the pilot request asks.
- **People.** The photographs are taken by the owner or by staff, not by a
  professional. Nobody is assumed to know colour management; the guide never asks
  anyone to edit.
- **Stock.** The owner can choose six representative originals, has at least one
  framed or matted piece and at least one with a visible defect — the request asks,
  and says what to do if not.
- **Existing files.** The one "typical migrated item" comes from the owner's own
  files, or from the catalogue export (👤 OA9) — **never downloaded from the live
  site** (AGENTS.md).
- **The showroom** is in Denpasar (PRODUCT.md, from research). Its layout, walls,
  light and opening hours are unknown here; the shot list names spaces generically.
- **Hofker (D6).** No standard, demo, pilot choice or plate depends on the Hofker
  Bali Hotel line; the pilot request asks the owner not to choose it.

## Status

| Subtask | State |
| ------- | ----- |
| 6.2.a capture standards per brand, as the owner's guide + the intake spec | written here |
| 6.2.b the owner's pilot set, checked against the intake spec | ⛔ 👤 OA3 — the request is [pilot-set-request.md](pilot-set-request.md) |
| 6.2.c the configurator's room scenes | written: [room-scenes.md](room-scenes.md); who produces the plates is D46 (default: a freelance 3D artist; the owner confirms) |
| 6.2.f fill the request, give its guides Indonesian versions, send it | the Indonesian guides drafted (awaiting native review, D20); filling the four placeholders, choosing Bapak or Ibu, and sending are the owner's |

## Follow-ups this folder depends on (outside its lane — routed, not done)

| # | For | What |
| - | --- | ---- |
| 1 | ✅ ARC (6.2.e), SCH builds it in 8.3, 9.1 | done, as CONTENT-MODEL.md / C9 v1.4 define: products' and works' `images` (§1), locations' `images` (§2, Stock), `designs.restoration` (§2, C9 `PRINT_RESTORATIONS`), `media.role` and `media.provenance` — which replaces the old `aiGenerated` flag (§6, C9 `MEDIA_ROLES`, `MEDIA_PROVENANCES`) — the `masters` intake fields: object ppi, `objectBox`, role, provenance, capture tier and the `intake` group (§6, C9 `IntakeEntry`), and the publish guards (§9, C9 `roleAllowed()`, `provenanceAllowed()`, `primaryImageIndex()`) |
| 2 | ✅ ARC (6.2.e), MED builds it in 15.4.c | done, as CONTENT-MODEL.md §2 (`designs.printCeiling`) and C9 v1.4 `printCeilingOf()` define: from the design's crop — the object's box for a whole sheet — never the file's long edge (D26; intake-spec.md §9) |
| 3 | ✅ ARC (6.2.e), with 22.7 | done, as CONTENT-MODEL.md §2 (product types' `roomView`) and §6 (the `room-plates` global) and C9 v1.4 `RoomPlate` define: one shared set for every wall-art product type (room-scenes.md §9) |
| 4 | ✅ ARC (6.2.e), MED files it in 8.3, 15.4 | done, as CONTENT-MODEL.md §6 (masters, "A capture is filed once") and C9 v1.4 `intakeMasterKey()` define: `masters/intake/<brand>/<batch>/<sha256>.<ext>`, with the batch's manifest at `intakeManifestKey()`; filed to `masterKey(workUid, …)` once the work exists (intake-spec.md §9) |
| 5 | MED | a checking script for intake-spec.md §3's mechanical checks, before the migration's bulk tiling (36.3); a test that public derivatives carry no metadata (15.1) |
| 6 | 6.3 (lexicon) | keys and native-reviewed values for the synthetic labels, the restoration line, "photographed in its mat" and the configurator caption |
| 7 | the owner (D46) | who produces the configurator plates (room-scenes.md §10) |
| 8 | the owner (a later request) | photographs of the real frame mouldings and mount boards, before 24.1 and 30.4 |
| 9 | this lane, later | a shot list for books, atlases and albums |
| 10 | 6.3 / OA4 | Indonesian versions of the owner-facing files, for staff — the request and the guides it attaches drafted (6.1.e, 6.2.f); their native review (D20), and retouching-and-labelling.md, which the guides link, remain |
| 11 | counsel (OA17) | the one-paragraph consent form for recognisable people (handover.md §6) |

**Every number in the intake spec is a pilot value.** The pilot set is the first
real test of the thresholds on the owner's own equipment; they are recalibrated
against it before 6.2 closes, and any answer from the owner interview (6.1.b) that
changes the standards is folded in then (6.2.d).
