# Intake spec — what the platform checks on every image

Every image the owner hands over (D19) is checked against this spec before it is used
for a comp, a master or a page. It is the counterpart of the owner's guides
(gallery-guide.md, shop-guide.md): the guides say how to take a photo; this says how
we judge one. **Where the two disagree, this file wins and the guide is corrected.**

Today the checks are run by a reviewer with an image editor that shows pixel values
and a colour picker. The mechanical ones (§3, F-checks) are written so a script can
run them later — proposed as a follow-up for MED, before the migration's bulk tiling.

**Every threshold is a pilot value.** It is recalibrated against the owner's pilot set
(6.2.b) — the first test on the owner's own equipment — before 6.2 closes.

## 1. Terms

- **Frame** — the whole photograph as the camera recorded it.
- **Object** — the sheet, photograph, frame or product the image is of. For a sheet:
  its outer edge, margins included; for an irregular sheet, its bounding box.
- **Object long edge (px)** — how many pixels the object's longer side spans in the
  frame. It is smaller than the frame's long edge, because the frame also holds the
  background, the colour card and the ruler.
- **Object ppi** — pixels per inch **at the object's real size**: object long edge (px)
  ÷ the object's long edge in inches. Measured from the ruler in the frame, and
  cross-checked against the catalogue's dimensions. It is **never** read from the
  file's DPI tag, which cameras set arbitrarily (often 72). Recorded as the master's
  `objectPpi` beside its `objectBox` (CONTENT-MODEL.md §6; C9 `objectPpi()`, `PixelBox`).
- **Reference frame** — a photo with the colour card taken at the start of a scene, for
  the shop's life shots, where the card cannot stay in every frame. Handed over as
  `ref` (handover.md §2) and kept under the master role `reference` — never published
  (C9 `MasterRole`).
- **Legacy image** — an image that already exists (the old site's, the owner's older
  files), assessed but not held to this spec (§8).

## 2. Verdicts

Each image gets one verdict — **the worst finding wins**.

| Verdict | Meaning | What happens |
| ------- | ------- | ------------ |
| **Pass** | meets the spec for its role | used as is, after the standard processing (§9); may carry a note |
| **Fix — us** | a shortcoming we correct at intake without the owner | we rename, rotate, convert or crop outside the object; the owner is told, nothing asked |
| **Fix — owner** | a good file with one specific shortcoming only a re-take cures | used for design work meanwhile, **not published under its role** until re-taken; one sentence says what to change |
| **Reject** | unusable, or it breaks an honesty rule | not used and not kept; the reason, and how to avoid it next time |

The master records a kept file's verdict as C9 `INTAKE_VERDICTS` define
(CONTENT-MODEL.md §6): Pass and Fix — us are `pass` (Fix — us with its note), Fix —
owner is `fix-owner` (nothing made from it publishes under its role, §9 there), a
legacy image is `legacy` (§8); a Reject is not kept, so it has no record.

**Anything that breaks an honesty rule is a reject, whatever its quality** — a
retouched defect on an original, a person in a gallery shot, a synthetic image
passed off as a photograph. The rules are retouching-and-labelling.md.

## 3. Checks on every image

| # | Check | How | Pass | Fix — us | Fix — owner | Reject |
| - | ----- | --- | ---- | -------- | ----------- | ------ |
| F1 | Format | opens; type per handover.md §1 | accepted type | HEIC, PNG or a PDF-wrapped image → converted | — | will not open; an unaccepted type |
| F2 | An original file | camera metadata present; size plausible for the device | original from the camera or phone | — | — | a screenshot; a WhatsApp, Instagram or email-shrunk copy (long edge ≤ 2560 px and no camera metadata); an edited export when the original exists |
| F3 | Colour profile | embedded ICC profile | sRGB, Display P3, Adobe RGB or ProPhoto; RAW (profiled on conversion) | none embedded → sRGB assigned, noted | — | — |
| F4 | Name | handover.md §2 | matches | anything else → renamed from the folder and notes | — | — |
| F5 | Duplicate | checksum | new | an exact duplicate → dropped, noted | — | — |
| F6 | Location data | GPS in the metadata | none | present → kept on the private master, **stripped from everything public** (§9) | — | — |
| Q1 | Sharp | at 100%: the finest lines or texture, centre and four corners | crisp throughout | — | soft in the corners only | blurred or shaken overall |
| Q2 | Exposure | the card's white patch; the brightest paper or product area | white patch below 250 in every channel (8-bit); object not clipped | — | more than 0.1% of object pixels clipped; the white patch clipped | detail lost across the object |
| Q3 | Square | skew of the object's edges; keystone = difference between opposite edges | skew ≤ 1°, keystone ≤ 1% | skew ≤ 5°, keystone ≤ 3% → corrected | beyond that — the camera was not parallel | — |
| Q4 | Even light | the background just outside the object's four corners and edges, in L\* | spread ≤ 3 L\* | 3–6 L\*, corrected if a grey-board frame was supplied, otherwise noted | more than 6 L\*, or a hot spot on the object | — |
| Q5 | Colour card | present and usable (§5) | as §4 requires for the role | — | missing, cut off, shaded or glaring | — |
| Q6 | Colour accuracy | after correction from the card, measured on its patches (§5) | mean ΔE00 ≤ 4 (24-patch); grey a\*, b\* within ±2 (grey card) | — | mean ΔE00 4–8 — better light next session | mean above 8, or mixed light that no correction fixes |
| Q7 | Whole object | every edge inside the frame, background visible all round | a clear margin on every side | — | an edge, corner or frame moulding cut off | — |
| Q8 | Glare | reflections on paper, gloss, gilt or glazing | none on the object | — | a reflection over part of the object | — |
| H1 | Not retouched (rule A) | the condition report's named defects are visible; no clone or smoothing patterns at 100%; the Software tag | nothing touched on the object | — | — | any correction the retouching rules forbid |
| H2 | People (gallery) | anyone or any hand in the frame | none | — | — | a person or hand in a gallery shot |
| H3 | Consent (shop) | a recognisable face | none, or consent on file | — | a face without consent on file — held until it arrives | — |
| H4 | Provenance declared | `media.provenance`: photograph · composite · rendered · ai-generated (CONTENT-MODEL.md §6, C9 `MEDIA_PROVENANCES`), and one the role allows on its subject (C9 `provenanceAllowed()`) | declared and true | — | undeclared — held until declared | declared a photograph but synthetic |

## 4. By image role — the gallery

"Object ppi ≥ 240" is D26's print minimum: an image that meets it lets the shop print
the work at its own size. Below it the image is fine for the site, and the print
ceiling is smaller than the sheet.

| Role | Object long edge | Object ppi | Colour card | Also |
| ---- | ---------------- | ---------- | ----------- | ---- |
| `recto` | pass ≥ 3000 px · fix — owner 2400–2999 · reject < 2400 (the top of the derivative ladder, C9) | ≥ 240: **reproduction-ready**; below: pass, noted "print ceiling N cm" | every frame, required | the whole sheet out of its mat and glass; if it cannot come out, declared "in its mat" |
| `verso` | pass ≥ 2400 px · reject below | ≥ 150, so text and stamps read | every frame | shot even when blank |
| `detail` | frame ≥ 2400 px | ≥ 2× the recto's, or ≥ 600 — else fix — owner: "no closer than the recto; the viewer already shows this" | every frame | each defect the condition report names has a detail, or reads clearly on the recto at 100% |
| `raking` | as the recto, or frame ≥ 2400 px for a raking detail | as the recto | every frame | one light, 10–20° above the surface, from one side; relief visible; other lights off |
| `transmitted` | frame ≥ 2400 px | ≥ 150 | exempt — the ruler in the frame | no front light; never a mounted photograph |
| `framed` | frame ≥ 2400 px | — | every frame | the whole frame, square on; no room, lamp or person reflected in the glazing |
| `in-room` | frame ≥ 2400 px | — | a reference frame | no people; provenance declared; synthetic labelled (`composite` or `rendered`, never `ai-generated` on a work); never the primary |
| `scale` | frame ≥ 2400 px | — | every frame | ruler and an A4 sheet fully visible |
| *primary* | — | — | — | not a role and not handed over: C9 `primaryImageIndex()` picks the first photographed, passing `recto`, cropped outside the sheet; never synthetic, never a detail, never a photograph of its own |

Where a row says only "frame ≥ 2400 px", 1600–2399 px is fix — owner and below
1600 px is reject.

**An item's launch set** (requirement 6.12) is a passing `recto`, `verso` and at least
one `detail`. The per-item summary (§7) says whether the item has it.

## 5. The colour card, measured

- **In the frame** means: the whole card visible, on the object's plane, in the same
  light, not overlapping the object, not in shadow, not glaring, not faded or soiled.
- **24-patch chart**: we build a correction from it and measure every patch after the
  correction, as ΔE00 against the chart's reference values. This is the "better" and
  "best" tiers' check.
- **Grey card only** ("good" tier): only white balance and exposure can be checked — the
  grey's a\* and b\* within ±2 after correction. Colour accuracy is then recorded as
  "unverified — grey card only", which is a pass with a note, not a fault.
- **Transmitted light** is exempt: a reflective card is meaningless lit from behind.
- **Shop life shots** use a reference frame per scene or change of light; each life
  shot sits in its scene's folder, the reference frame first (handover.md §3).

## 6. By image role — the shop

The shop's roles as CONTENT-MODEL.md §1 (products' `images`) and C9 v1.4
`PRODUCT_IMAGE_ROLES` define; a location's photographs are role `showroom` with an
area (CONTENT-MODEL.md §2, C9 `LOCATION_IMAGE_ROLES`, `LOCATION_IMAGE_AREAS`) and are
always photographs (C9 `provenanceAllowed()`).

| Role | Frame long edge | Colour card | Also |
| ---- | --------------- | ----------- | ---- |
| `flat` | pass ≥ 2400 px · fix — owner 1600–2399 · reject < 1600 | every frame | the whole product square on; **the colour reference** for the product's other images |
| `detail` | as `flat` | every frame | material, finish, print sharpness, a frame corner or mount bevel |
| `in-room` | as `flat` | a reference frame | a photograph, or a labelled synthetic image; the product's colour matches its `flat` by eye, side by side |
| `lifestyle` | as `flat` | a reference frame | H3 consent; nothing culturally out of bounds (shop-guide.md §6) |
| `scale` | as `flat` | a reference frame | the size reference is an object everyone knows |
| `packaging` | as `flat` | a reference frame | what the buyer or recipient actually receives |
| `showroom` | as `flat` | a reference frame per room | verticals straight (fix — us ≤ 3°) |
| `showroom`, area `making` (`showroom_making`) | as `flat` | a reference frame per room or workspace | how a print is made (S14, shop-guide.md §5): hands at work, H3 consent for a face; an original in the frame handled as gallery-guide.md §4 says and never in sun; verticals straight in a wide view only |

## 7. What the owner receives

One line per image, one summary per item, in the handover folder's `_intake` report.
The same judgements are recorded per file as a C9 `IntakeEntry` in the batch's
`IntakeManifest`, kept beside the files at `intakeManifestKey()` (CONTENT-MODEL.md §6)
— an invented example of the report:

```
M-9999_recto_01.cr3   Pass   6100 px on the sheet · 329 ppi · reproduction-ready · ΔE00 2.9
M-9999_verso_01.cr3   Fix — owner   the colour card is cut off on the left — please re-take with the whole card in view
M-9999_detail_02.jpg  Fix — us   renamed (was IMG_4471.JPG)
M-9999                launch set: yes (recto, verso, 3 details) · raking: yes · transmitted: no (optional)
```

## 8. Legacy images

The old site's images (sampled at 3543 × 2840 px, one per item, MIGRATION.md §1) are
what 2,090 items will launch with. They are **assessed, never rejected** at migration:
each records its object long edge, object ppi where the dimensions are known, a print
ceiling **from its object's box** (C9 `printCeilingOf()`), "colour unverified — no
card", and retouching `unknown` — or `retouched-legacy` if the owner knows it was cleaned
(retouching-and-labelling.md §1; C9 `RETOUCHING_STATES`) — under the verdict `legacy`.
The pilot's typical migrated item is assessed this
way, so the comps are drawn on the quality most pages will really have.

## 9. After a pass

1. **The file as received** goes to the private masters bucket, recording what
   CONTENT-MODEL.md §6 asks of a `masters` record — frame pixels, colour profile,
   checksum (SHA-256), and the intake's `role`, `provenance`, `objectBox`, `objectPpi`
   (**object ppi**, §1), `captureTier` and `intake` group (C9 `IntakeEntry`). A capture
   received before its work exists — the pilot set, a migration batch not yet loaded —
   lands at `masters/intake/<brand>/<batch>/<sha256>.<ext>` (C9 `intakeMasterKey()`),
   and is filed once to `masters/<workUid>/<sha256>.<ext>` (C9 `masterKey()`) when its
   work exists; a capture of no work (a showroom photograph, a room plate's render)
   keeps its intake key.
2. **The processed image** — colour-corrected from the card, straightened, cropped
   outside the object — becomes the media upload the derivatives and tiles are made
   from (C9). The capture master is never overwritten; a print file for the shop is a
   separate derived copy (retouching-and-labelling.md §0).
3. **Nothing public carries the file's metadata** — no GPS, no serial numbers, no
   editing history. The derivatives and tiles are written without it (a test proposed
   for MED).
4. **The print ceiling comes from the design's crop — the object's box for a whole
   sheet** — at 240 ppi (D26), as CONTENT-MODEL.md §2 (`designs.printCeiling`) and C9
   v1.4 `printCeilingOf()` define; never from the file's long edge, which includes the
   background, the card and the ruler (a 3543 px frame whose sheet spans 3300 px gives
   349 mm, not 375).
