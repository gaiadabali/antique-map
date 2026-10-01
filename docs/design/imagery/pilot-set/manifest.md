# Pilot set — manifest

Task 6.2.b (TASKS.md). Batch `pilot-2026-10`, brand `indies-gallery`, assessed 2026-10-01
against [intake-spec.md](../intake-spec.md). What the set is and what it tells the comps is
in [README.md](README.md).

- **Source:** the local copy of the old site's read-only public read (D41), under
  `LEGACY_DATA_DIR` (`../indies-legacy-data` from the main checkout). Every path below is
  relative to it. Nothing was fetched for this task: the files were read from disk.
- **Files:** never in git. The kept ones are in the local dev bucket `archive-masters`
  under `pilot/` (§5).
- **Two verdicts per image.** *Today* is the verdict the image would get if the owner handed
  it over now (intake-spec.md §2–§4, the worst finding wins). *Recorded* is what its
  `masters` record carries: a legacy image is assessed and recorded as `legacy`, never
  rejected for quality (§8). A file that breaks an honesty rule, or is not a photograph of
  this item, is not kept (§2).

## 1. The archive, measured

All 1,823 products and 2,289 images of the public read, measured on disk with Pillow
(scratch scripts outside the repo; numbers as of the read of 2026-09-30).

| Measure | Value |
| ------- | ----- |
| Images | 2,289 files, 2,120 distinct by SHA-256 — 77 groups of byte-identical files hold 246 of them |
| Format | JPEG 2,289 (100%) · RGB · baseline · 4:4:4 · quantisation ≈ quality 90 on every file |
| Metadata | no ICC profile on any file · no EXIF (no camera, software or GPS) on any file · DPI tag 96 on every file |
| Long edge, px | min 311 · p10 1,618 · **median 2,706** · p90 3,732 · max 12,992 |
| Short edge, px | min 260 · p10 1,135 · **median 1,697** · p90 2,771 · max 8,506 |
| Megapixels | min 0.09 · p10 2.01 · **median 4.56** · p90 10.26 · max 93.51 |
| File size | min 0.02 MB · p10 0.46 · **median 1.15 MB** · p90 2.17 · max 15.96 |
| Long edge vs intake-spec §4 | < 1,600 px: 224 · 1,600–2,399: 740 · 2,400–2,999: 628 · 3,000–3,999: 549 · ≥ 4,000: 148 — so 964 (42%) are under the recto's reject line and 1,592 (70%) under its pass line |
| The "3543 px" sample | 104 files (4.5%) have exactly a 3,543 px long edge, and 82% of the archive is smaller — the docs' sample was the upper fifth, not the middle |
| Orientation | landscape 1,178 · portrait 1,110 · square 1 |
| Images per product | 0: 3 · **1: 1,598 (88%)** · 2: 96 · 3: 45 · 4: 59 · 5–8: 22 |
| Kind (top category) | prints only 1,235 · maps only 270 · photographs only 70 · overlaps and books, posters, special the rest |
| Size in the catalogue | 1,676 products give an "Image Dimensions" field; 1,047 parse as *w* by *h* cm |
| Object ppi, where the size parses | first image's long edge ÷ the catalogue's long edge: p10 135 · **median 234** · p90 295 — 497 of 1,047 (47%) at 240 or more |
| Print ceiling, first image's frame | median **286 mm** at 240 ppi (D26), from the frame — an upper bound, because a frame is never smaller than its object |
| Colour card, raking, verso | none seen in any image reviewed (the six items' 19 images and about 30 more items' contact sheets) |

## 2. The six items

| Item | Kind | Why it is in the set |
| ---- | ---- | -------------------- |
| **M.0389** (legacy 972) — Raffles' chart of Calloombyan Harbour, Sumatra, 52 × 44 cm | map | the best the archive offers: a 4,000 px recto and two details at about three times its resolution; and the old site led with a detail, not the recto |
| **M.NN34** (legacy 563) — folding tourist map of Java, 1905, 115 × 50 cm, with its case and register | map | a large sheet in one frame (84 ppi), a soft recto, and parts of the object no work role names (the case, the booklet) |
| **P.2425** (legacy 1843) — *Dauphin ordinaire*, d'Orbigny, 24 × 15 cm | print | **the typical migrated item**: one image, 2,672 × 1,700 px, 4.54 MP, 1.15 MB — within 1.5% of the archive's median long edge (2,706), megapixels (4.56) and file size (1.15 MB) — and a single-image print, like 88% and 68% of the archive |
| **P.1674** (legacy 1162) — three Dutch views of China (Fuzhou, Beijing, Nanjing), 40 × 26 cm | print | a set of three sheets on one item, at the 3,543 px the docs sampled, and a synthetic overview image the old site showed as a photograph |
| **P.2301** (legacy 1721) — Singapore shophouses, albumen print on its album leaf | photograph | the one kind of legacy image with the object's edges in frame; and three more images that are other items' photographs |
| **IM.66** (legacy 354) — Singapore and Johore, 3 of a set of 15 photographs, 230 × 180 mm | photograph | the archive's low tail: 1,700–1,900 px, under the recto's reject line, as 42% of the archive is |

## 3. Every image, check by check

The checks every legacy image fails the same way are stated once, then the table gives
each image's own findings.

**The same for all 19:** F1 JPEG — accepted · **F2 not an original** — no camera metadata,
re-encoded by the old site (≈ q90, 96 dpi); the owner's original scan, where one exists,
replaces it · F3 no ICC profile — sRGB assigned (fix — us) · F4 renamed to handover.md §2
(fix — us) · F6 no GPS · **Q5 no colour card** in any frame (fix — owner) · Q6 colour
accuracy unmeasurable — "colour unverified — no card" · Q4 even light unmeasurable — no
background around the object (except #5, #7, #13) · H2 no people or hands; H1 nothing seen
retouched at 100%, but retouching is `unknown` (§8) · **no raking, no transmitted, no
verso** for any item · no watermark or overlay on any image. Q2 is measured as the share of
frame pixels with a channel at 254–255; "block" is the mean step across JPEG 8-px block
boundaries over the step inside them (1.0 = no visible grid; ≥ 1.7 = a grid visible on flat
paper at 100%, invisible at page size).

| # | Source (in `LEGACY_DATA_DIR`) | Role | Frame px | Q1 sharp | Q2 clip | Q7 whole object | Artefacts |
| - | ----------------------------- | ---- | -------- | -------- | ------- | --------------- | --------- |
| 1 | `indies-gallery/public-read/images/972-1267.jpg` | recto | 4000 × 3361 | crisp | 1.25% — paper pushed to white | no — cropped inside the margins, no sheet edge | block 1.52 |
| 2 | `…/images/972-1265.jpg` | detail (inset view, text, scale) | 5151 × 3837 | crisp | 1.46% | — | block 2.10 |
| 3 | `…/images/972-1266.jpg` | detail (sailing directions) | 2477 × 2012 | crisp, slight ringing on letters | 0.84% | — | block 2.02 |
| 4 | `…/images/563-753.jpg` | recto | 3787 × 1614 | **soft overall** — text does not resolve at 100%; resampled after compression | 0.01% | partly — case edge at left, top margin cut | block 1.05 (grid gone: resampled) |
| 5 | `…/images/563-754.jpg` | detail (the case) | 1508 × 2108 | fair | 0.02% | yes — white bed all round, ~1% at the foot | block 1.46 |
| 6 | `…/images/563-755.jpg` | detail (Batavia to Bandung) | 2194 × 2011 | fair | 0.17% | — | block 1.31 |
| 7 | `…/images/563-756.jpg` | detail (register, pp. 4–5) | 2799 × 2033 | fair | 0.04% | yes, three sides | block 1.33 |
| 8 | `…/images/1843-2542.jpg` | recto | 2672 × 1700 | crisp | 0.01% | no — cropped in the margin | block 1.22 |
| 9 | `…/images/1162-1514.jpg` | recto (Fuzhou) | 3543 × 2579 | crisp | 1.05% | no — plate mark in frame, sheet edge not | block 1.80 |
| 10 | `…/images/1162-1515.jpg` | recto (Beijing) | 3543 × 2571 | crisp | 1.63% | no — as #9 | block 1.71 |
| 11 | `…/images/1162-1516.jpg` | recto (Nanjing) | 3543 × 2629 | crisp | 1.33% | no — as #9 | block 1.91 |
| 12 | `…/images/1162-1517.jpg` | none — a digital layout of #9–#11 with drop shadows | 680 × 709 | — | 37.6% (white ground) | — | resized |
| 13 | `…/images/1721-2301.jpg` | recto | 3988 × 3386 | soft as albumen is; no camera blur seen | 0.01% | yes — the print's four edges on its leaf; the leaf cropped | block 1.87 |
| 14 | `…/images/1721-2458.jpg` | none — P.2314's photograph | 2916 × 3697 | — | — | — | — |
| 15 | `…/images/1721-2459.jpg` | none — P.2311's photograph | 3153 × 2487 | — | — | — | — |
| 16 | `…/images/1721-2460.jpg` | none — P.2307's photograph | 2793 × 3712 | — | — | — | — |
| 17 | `…/images/354-455.jpg` | recto (Raffles Museum) | 1800 × 1350 | fair | 0% | no — cropped into the print; blind stamp in frame, part of the object | block 1.39 |
| 18 | `…/images/354-457.jpg` | recto (view from Fort Canning) | 1900 × 1439 | fair | 0% | no — as #17 | block 1.45 |
| 19 | `…/images/354-458.jpg` | recto (portrait) | 1700 × 2307 | fair | 0% | no — as #17 | block 1.52 |

## 4. Ppi, print ceiling and verdict

Object ppi is C9 `objectPpi()` from the object's long edge in pixels and the catalogue's long
edge. The print ceiling is C9 `printCeilingOf()` at 240 ppi (D26) **from the object's box**;
where the sheet's edge is not in the frame the box is not measurable and the frame stands in
for it — a lower bound of the sheet, so the ceiling is the frame's. Boxes marked ≈ are the
reviewer's measurement (± 2%).

| # | Object box (px) | Object ppi | Print ceiling | Today | The gap | Recorded |
| - | --------------- | ---------- | ------------- | ----- | ------- | -------- |
| 1 | the frame — no sheet edge | **195** (4000 px over 52 cm; the catalogue's 52 × 44 has the frame's proportions) | **423 mm** (sheet 520) | Fix — owner | no card; sheet edge cut; 1.25% clipped; below 240 ppi: "print ceiling 42 cm" | legacy |
| 2 | — (detail) | ≈ 600 (3.1 × the recto's) | 545 mm, as a crop design's source | Fix — owner | no card | legacy |
| 3 | — (detail) | ≈ 570 (2.9 × the recto's) | 262 mm | Fix — owner | no card | legacy |
| 4 | the frame — sheet edges partly out | **84** (3787 px over 115 cm) | **401 mm** (sheet 1,150) | **Reject** | soft overall (Q1); no card; edges cut | legacy |
| 5 | ≈ 1435 × 2045 at (45, 40) | — (case size not given) | 216 mm | Fix — owner | frame 2108 px (1,600–2,399); no card | legacy |
| 6 | — (detail) | ≈ 240 (2.9 × the recto's) | 232 mm | Fix — owner | frame 2194 px (1,600–2,399); no card | legacy |
| 7 | the spread, ≈ the frame | — | 296 mm | Fix — owner | no card | legacy |
| 8 | the frame — no sheet edge | **283** if 24 cm is the frame's region; **≈ 232** if it is the plate (≈ 2195 px) — the catalogue's 24 × 15 (1.60) sits between the two (1.57, 1.71) | **283 mm** (the plate alone ≈ 232) | Fix — owner | 2672 px (2,400–2,999); no card; sheet edge cut | legacy |
| 9 | the frame — no sheet edge | **≈ 200** — the catalogue's 40 × 26 is the plate (≈ 3190 × 2180 px), not the frame | 375 mm (the plate alone ≈ 338) | Fix — owner | no card; sheet edge cut; 1.05% clipped | legacy |
| 10 | as #9 | ≈ 200 | 375 mm | Fix — owner | as #9; 1.63% clipped | legacy |
| 11 | as #9 | ≈ 200 | 375 mm | Fix — owner | as #9; 1.33% clipped | legacy |
| 12 | — | — | — | **Reject** | a composite (H4) shown as a photograph; no work role takes one but `in-room` (C9 `provenanceAllowed()`); 680 px | not kept |
| 13 | ≈ 3750 × 2710 at (80, 135) — the print | — (no size in the catalogue) | 397 mm | Fix — owner | no card; no size, so no ppi | legacy |
| 14–16 | — | — | — | **Reject** for this item | another item's photograph, byte-identical to its first image (F5): it stays on its own item | not kept here |
| 17 | the frame — cropped into the print | 199 (1800 px over 230 mm) | 190 mm (print 230) | **Reject** | recto < 2,400 px; edges cut; no card | legacy |
| 18 | as #17 | 210 | 201 mm | **Reject** | as #17; the same file is M.Canning's (legacy 359, sold) image | legacy |
| 19 | as #17 | 255 | 244 mm | **Reject** | as #17 | legacy |

## 5. Per item, and where the files are

Launch set (requirement 6.12) = a passing recto, verso and detail: **no item has one** —
none has a verso, a colour card or a raking shot.

| Item | Recto | Verso | Details | Launch set | Storage keys (bucket `archive-masters`) |
| ---- | ----- | ----- | ------- | ---------- | --------------------------------------- |
| M.0389 | 1 (fix) | — | 2 | no | `pilot/M-0389/recto_01.jpg` · `detail_01.jpg` (#2) · `detail_02.jpg` (#3) |
| M.NN34 | 1 (reject) | — | 3 | no | `pilot/M-NN34/recto_01.jpg` · `detail_01.jpg` (#5) · `detail_02.jpg` (#6) · `detail_03.jpg` (#7) |
| P.2425 *typical* | 1 (fix) | — | — | no | `pilot/P-2425/recto_01.jpg` |
| P.1674 | 3 (fix) | — | — | no | `pilot/P-1674/recto_01.jpg` (#9) · `recto_02.jpg` (#10) · `recto_03.jpg` (#11) — #12 not copied |
| P.2301 | 1 (fix) | — | — | no | `pilot/P-2301/recto_01.jpg` — #14–#16 not copied |
| IM.66 | 3 of 15 (reject) | — | — | no | `pilot/IM-66/recto_01.jpg` (#17) · `recto_02.jpg` (#18) · `recto_03.jpg` (#19) |

15 files kept, 4 not. Each key is `pilot/<stock number, dot as hyphen>/<role>_<nn>.jpg`
(handover.md §2), the file byte-for-byte as it is on disk. The SHA-256 of each — what C9
`intakeMasterKey()` names a capture by — is in §6.

## 6. Checksums

The local `pilot/` keys mirror the set for the comps. On staging the same files would land at
C9's `intakeMasterKey('indies-gallery', 'pilot-2026-10', <sha256>, 'jpg')`, i.e.
`masters/intake/indies-gallery/pilot-2026-10/<sha256>.jpg`, with this manifest as an
`IntakeManifest` at `intakeManifestKey()` beside them (README.md, "What goes to staging").

| Key | SHA-256 |
| --- | ------- |
| `pilot/M-0389/recto_01.jpg` | `219808af25ab270a5174d741c49512cf3407eba84ba4085f80dc8d95804b6a8c` |
| `pilot/M-0389/detail_01.jpg` | `8067328283369aed74e6a34d742397c08252fb025c50b665cd1d15eb0f8577fa` |
| `pilot/M-0389/detail_02.jpg` | `142a970b001cfa6ef687805590af55dc4efc98c23b67bc69dccf79da0c061a53` |
| `pilot/M-NN34/recto_01.jpg` | `6d842519fec720cf5f8ec3b05ed017bd4f376492e3abf02c63259e64595ab8fa` |
| `pilot/M-NN34/detail_01.jpg` | `ed4140414d5e1e8a1811d614afad61a5a17c59d7216570f0c91fbcc85808443e` |
| `pilot/M-NN34/detail_02.jpg` | `c0fdffd0f61498ec90c7af88354b03c397ead2a9fd5e04df018ca12e1a63fd36` |
| `pilot/M-NN34/detail_03.jpg` | `ed28bae73665910c8dd234372cd011c3925012027017f48503a163b0458720a6` |
| `pilot/P-2425/recto_01.jpg` | `8839af5badbfb4735b574091f4a416cc174f3ce87ac98ff37c0c06593f5ff5b5` |
| `pilot/P-1674/recto_01.jpg` | `9c165206dc6b7bd2c2b397b6179c7bb6918395d2dea44d88366706a4b5f58cd0` |
| `pilot/P-1674/recto_02.jpg` | `0a22452637e3dc694f9e1f5109562dd61cd6ef245eddb7e0b981646f0718440d` |
| `pilot/P-1674/recto_03.jpg` | `659be830aae1510221fcc0fde519bd8ffe4c98f10ac24ffe6c019305b5c6df25` |
| `pilot/P-2301/recto_01.jpg` | `43d3b5b38f65e390e1ef4d41be7ea06c79adbe5fa60c576fca6be818ee541bab` |
| `pilot/IM-66/recto_01.jpg` | `12cfbd224fd831ceb0ff43e9dc0f0845588dbf0ad1d76a8994974da55c76b94d` |
| `pilot/IM-66/recto_02.jpg` | `9f7561597c54bee700404d2695cccdef8334c614abd1762bc15ea6e62268473f` |
| `pilot/IM-66/recto_03.jpg` | `11e726de123e3c2d7c90dc9b7cee25d7fa4491bcb78c7587c8848ebde1bfa321` |

Read back from the bucket on 2026-10-01, every object's SHA-256 matched this table (15 of 15).
