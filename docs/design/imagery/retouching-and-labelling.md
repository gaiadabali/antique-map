# Retouching limits and synthetic labels — both brands

DESIGN-SYSTEM.md §11 sets two honesty rules: **never retouch away a defect on an
original** — the condition report and the image must agree — and **synthetic mockups
are labelled** until real photography replaces them. This file makes both rules
exact enough to check an image against (intake-spec.md §3, check H1).

## 0. Two kinds of file, two rules

The owner's draft copy for the shop says "we correct foxing, tears and fading". That
is true of a **reproduction** and must never be true of a photograph of an
**original**. The two are different files with different rules:

| | Rule A — an original's photographs | Rule B — a reproduction master |
| --- | --- | --- |
| The file | the capture master in `masters/` and every work image made from it | the design's print file in `print-files/` — a **derived copy**, never the capture master overwritten |
| Image roles | every work role: `primary` · `recto` · `verso` · `detail` · `raking` · `transmitted` · `framed` · `in-room` · `scale` — on the gallery's works **and** on the shop's provenance copies of them | the design's print file, and the shop's product images that show the reproduction (its own roles, README.md): `flat` · `detail` · `in-room` · `lifestyle` · `scale` · `packaging` |
| Defects | **shown, never restored** — raking and transmitted light exist to reveal them | may be restored, **within the limits of §2 and disclosed** |
| Where it shows | the gallery's item page and viewer; the shop's "The original" block | the shop's product page, the product itself |

Rule A is §1; rule B is §2. A file under rule A is never "fixed" into a file under
rule B in place: the print file is made as a copy, and the capture master stays as
shot.

## 1. Rule A — photographs of originals

A photograph of an original is **evidence**. A collector buying a USD 5,000 map
without seeing it is trusting that what the image shows is what arrives. Raking
light and transmitted light are shot precisely so that folds, repairs, thin spots and
infills show — **they are never softened**, and a raking shot that reveals a repair
the recto hid is the standard working, not a problem to fix.

**Allowed — global corrections that make the photo more faithful, not the object
better:**

- colour and white balance from the colour card in the frame;
- exposure and contrast applied to the whole image, within the card's white and black;
- the lens's own corrections: distortion, vignetting, colour fringing;
- straightening and perspective correction, so the sheet's edges are straight;
- cropping **outside** the sheet, never into it;
- cutting the sheet out of the background along its real edge, losses and tears
  included (the gallery's image treatment decides crop or cut-out, DESIGN.md);
- light, even sharpening of the whole image, as any camera applies;
- removing dust or a hair from the **background** only.

**Never — on any image of an original, web or master:**

- removing or reducing foxing, stains, spots, tide lines, mould, toning, fading,
  offsetting, ink burn, show-through or dirt on the sheet;
- hiding tears, holes, wormholes, losses, repairs, infills, folds, creases, cockling,
  trimmed or replaced margins, reinforced folds, or a laid-down sheet;
- clone, heal, patch, spot-removal or content-aware fill anywhere on the sheet;
- local brightening, darkening or colour changes on the sheet (dodge, burn,
  brushes, masks), selective saturation, "vibrance" or colour boosting;
- AI "enhance", upscaling, denoising or restoration that invents detail;
- HDR tone-mapping or filters that flatten stains and folds;
- digitally flattening a cockled or folded sheet;
- joining two different sheets, or two states of a plate, into one image.

**Dust on the sheet** is not a defect of the object, but it is not retouched either:
blow it off and take the photo again. This keeps the rule simple enough to check —
nothing on the sheet is ever touched in software.

**The grey zone is decided by asking, not by editing.** If a correction might change
what a collector would conclude about condition, it is not made.

**Old images.** An image from the old site may already have been retouched; nobody
here can tell for certain. If the owner knows an old image was cleaned up, it is
flagged `retouched-legacy` at intake and the item goes on the re-shoot list; it may
stay on the page meanwhile, with the condition report as the authority.

## 2. Rule B — reproduction masters (the shop's print files)

A **design** is a treatment of a work made for reproduction (CONTENT-MODEL.md §2).
Its print file may be restored, because the product is a reproduction, is labelled one
on every card and page (DESIGN-SYSTEM.md §10), and says what was done.

**Allowed on a print file:**

- removing foxing, stains, spots, tide lines, dirt, offsetting and show-through;
- removing fold lines and creases; closing tears;
- filling **small** losses and wormholes from the surrounding paper and line;
- rebalancing colour and tone to counter fading and toning, and neutralising the
  paper tone if the product calls for it;
- cropping to the design (a harbour from a larger plan) — the crop is the design.

**Never, even on a print file:**

- adding, removing or redrawing cartographic or pictorial content — coastlines, names,
  soundings, figures, borders, cartouches — beyond closing a tear through them;
- reconstructing a **large** loss (more than a small infill a restorer would call
  cosmetic): a large loss stays visible or the design is cropped to avoid it;
- altering or removing a date, imprint, signature, plate number or privilege line;
- adding colour to an uncoloured sheet, or changing the original's colouring, unless
  the product is disclosed as **digitally coloured**;
- generating any content with an AI model;
- joining two different sheets or states into one design without saying so.

**Disclosed — always, in three places:**

1. **On the design record**: what was done, in a restoration note (a field designs do
   not have yet — a follow-up for ARC and SCH, README.md);
2. **On the product page**, beside the Reproduction label: a line such as "Digitally
   restored for print: foxing and fold lines removed" — the wording is the lexicon's
   (task 6.3) — so the owner's "we correct foxing, tears and fading" becomes a claim
   made per product, true for that product;
3. **By comparison**: the product page's "The original" block shows the gallery's
   untouched photograph (rule A), so a buyer can see both.

A restored print file is **never** used as an image of the original, on either site —
not as a `recto`, not as a gallery thumbnail, not in the gallery's newsletter.

## 3. Rule B — photographs of shop products

**Allowed:** dust, lint, stray threads, fingerprints and scratches on the glazing;
the photographer's reflection; background tidying; colour correction toward the
product's true colour; straightening; cropping.

**Never:** changing the product's colour, paper, finish, frame, mount, size or
proportions; removing a real production flaw (use a good sample instead); adding an
option, colour or size that is not sold; making a product look larger than it is.

## 4. What counts as synthetic

Every image carries one of four provenance values. The first is a photograph; the
other three are **synthetic** and are labelled.

| Provenance | What it is | Example |
| ---------- | ---------- | ------- |
| `photograph` | a camera photograph of the real object or product, with only the corrections above | a recto; a tote on a shoulder |
| `composite` | a real photograph with something placed into it digitally | a print file placed into a photographed room |
| `rendered` | a scene made in 3D or drawn, with or without a real image placed into it | the configurator's room plates |
| `ai-generated` | any part of the image made by an AI model | an AI room, an AI model wearing a tote |

`ai-generated` also sets the media record's existing `aiGenerated` flag
(CONTENT-MODEL.md §6). The other three values need a field `media` does not have yet
— proposed as a follow-up (README.md).

## 5. Where synthetic images may appear

| Where | Gallery | Shop |
| ----- | ------- | ---- |
| primary image | **never** | allowed, labelled, until a real `in-room` or `flat` photo exists |
| any image of condition (recto, verso, detail, raking, transmitted) | **never** | not applicable |
| `in-room` | allowed, labelled, never first | allowed, labelled |
| the configurator preview | — | always synthetic; captioned (room-scenes.md §8) |
| social, newsletter, ads | labelled the same way | labelled the same way |

An AI-generated image never shows an original, and never shows a product the shop
does not make.

## 6. How a label shows

- **On the image:** a small, legible text tag in a corner of every synthetic image, on
  cards, the product page, the viewer and full screen — text, never an icon alone
  (DESIGN-SYSTEM.md §9). Its look is the design system's; its presence is not optional.
- **In the alt text:** the alt starts with the label word ("Digital mockup: …").
- **In the caption and the filmstrip**, where the image has one.
- **In the admin:** the media record shows its provenance; a synthetic image cannot
  be set as an original's primary image (a publish guard, proposed as a follow-up).

**Draft wording** — for the lexicon (task 6.3) and its native Indonesian review; not
final copy:

| Case | English | Indonesian (draft) |
| ---- | ------- | ------------------ |
| composite or rendered | Digital mockup | Mockup digital |
| AI-generated | AI-generated image | Gambar buatan AI |
| configurator preview | Preview — a digital illustration, to scale. Colours vary by screen. | Pratinjau — ilustrasi digital, sesuai skala. Warna bisa berbeda di tiap layar. |
| original in its mat | Photographed in its mat — margins not shown | Difoto di dalam passe-partout — tepi kertas tidak terlihat |

## 7. Replacing a mockup

When a real photograph of the same product in the same kind of setting arrives, it
takes the mockup's place and the mockup is archived, not deleted — the history of
what a buyer was shown stays on the record.
