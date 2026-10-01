# The configurator's room scenes (6.2.c)

The shop's configurator previews a print three ways — **Flat**, **On a wall** (three
wall colours) and **To scale** (a 1.7 m person and a 2 m sofa with dimension lines) —
layered in the browser from a pre-sized ~1200 px AVIF of the design, 9-slice frame
layers, **pre-composited room plates** and an SVG scale view, in under 100 ms, never
the scan redrawn on a canvas (EXPERIENCE-SHOP.md §5, DESIGN-SYSTEM.md §7). The preview
is `aria-hidden` decoration over a text summary (§9 there). This file specifies the
plates: how many, their walls, props, camera, scale method, light, source and label.
It is the input to 30.4.b (the preview) and 24.1.c (the wizard's mockups).

## 1. What each view needs

| View | Built from | Plate? |
| ---- | ---------- | ------ |
| Flat | the design image, mount and frame layers on a plain ground | no |
| On a wall | a room plate + the cast shadow + frame + mount + design image | **yes — this file** |
| To scale | SVG: the outer size with dimension lines, a 1.7 m person, a 2 m sofa | no — drawn (§6) |

## 2. How many plates

**Six master plates: three wall colours × two framings** (C9 `ROOM_FRAMINGS`: `near`,
`wide`). Each is delivered in two crops (§9; C9 `ROOM_CROPS`: `landscape`, `square`),
so the preview has twelve images to choose from, in the C9 ladder's widths. Each
plate's `maxOuterLongEdgeCm` is its framing's limit below, and C9 `framingFor()` picks
the framing with the smallest limit a print fits under.

| Framing | Wall width shown | Used when the framed outer long edge is | Why |
| ------- | ---------------- | --------------------------------------- | --- |
| **near** — a sideboard wall | 1.8 m | ≤ 75 cm | a 21 × 30 cm poster on a 3 m wall is a few pixels wide on a phone; it needs a closer wall |
| **wide** — a sofa wall | 3.2 m | > 75 cm, up to 125 cm | a 70 × 100 poster with an 8 cm mount (≈ 122 cm outer) needs room above a sofa |

125 cm covers the largest outer size EXPERIENCE-SHOP.md §5 allows (a 90 cm giclée or a
70 × 100 poster, with an 8 cm mount and a frame). The framing follows the size
automatically; the caption states the wall width shown (§8), so a jump from near to
wide reads as "this is much bigger", which it is. The swap is a cross-fade — a cut
under `prefers-reduced-motion`.

## 3. The three wall colours

Chosen to span light, mid and dark, so a buyer sees how the mounts (warm white · ivory
· black) and frames (slim black · natural teak · dark teak · antique gold) read on
each. They are **rooms, not the brand's palette**: they must not wait on, or pretend
to be, the accents chosen in phase 12. Values are drafts.

| Name | Draft sRGB | ≈ L\* | Why |
| ---- | ---------- | ----- | --- |
| Warm white | `#ECE7DE` | 92 | most real walls; the default view |
| Clay | `#B98A6E` | 61 | a warm mid-tone common in Bali interiors; frames and teak read against it |
| Deep green | `#2E4A40` | 29 | a dark wall: shows the black mount and gold frame at their best, and their limits |

To review in phase 12 (so no wall clashes with the shop's accents) and in the cultural
review (12.2, OA5).

## 4. Scale props

Props exist to make size readable, so every one has a **stated, standard size**, and
its back touches the wall — its top edge then lies on the wall plane and reads at the
wall's scale.

| Framing | Props | Sizes (recorded in the plate's data) |
| ------- | ----- | ------------------------------------ |
| near | a low sideboard; a table lamp; a short stack of books; a light switch | sideboard 120 × 80 cm (h), lamp 50 cm, switch plate ≈ 8 cm at 120 cm |
| wide | a three-seat sofa; a light switch | sofa 200 cm wide, back 85 cm high — the same 2 m sofa the To-scale view draws |

**Rules.** Nothing in the plate overlaps the art box (§5). No other artwork, mirror,
logo, brand or text on the walls. No plant or object whose size varies as a scale cue.
Contemporary Indonesian materials — teak, rattan, woven textile, plaster, terrazzo —
and **no colonial pastiche** (shop-guide.md §6). No people: the To-scale view carries
the person.

## 5. Perspective and camera

**Frontal, level, parallel.** The camera looks straight at the wall, its sensor
parallel to it, the lens axis level. Then every rectangle on the wall stays a
rectangle, and **the scale is the same everywhere on the wall plane** — which is what
lets the browser place a print with plain positioning and no perspective transform.
Angled views would need a transform per frame edge and a shadow per angle; they are
out of scope at launch.

| | near | wide |
| --- | --- | --- |
| Camera height (lens centre) | 130 cm | 145 cm |
| Frame spans, on the wall | ≈ 70–190 cm high | ≈ 38–252 cm high |
| Lens (full-frame equivalent) | 40 mm (35–50 mm accepted) | 40 mm |
| Distance to the wall (at 40 mm) | ≈ 2.0 m | ≈ 3.6 m |
| The art box | 75 × 75 cm, **centred at 145 cm** — a gallery hang | 125 × 125 cm, its **bottom 22 cm above the sofa back** — larger art grows upward |
| Anchor mode (C9 `ROOM_ANCHORS`) | `centre` — the art's centre on the anchor | `bottom` — the middle of the art's bottom edge on the anchor |

A longer lens from further away keeps the furniture in front of the wall closer to the
wall's scale; a wide lens exaggerates it. Tilt is never used; a render may shift its
camera, a photograph lowers or raises the tripod instead.

## 6. The scale reference

- **Rendered plates:** the scene is modelled in centimetres; the plate's pixels per
  centimetre at the wall plane come from the render camera, exactly.
- **Photographed plates:** before the clean plate, with the tripod locked, a
  reference frame with **two 1 m marks on the wall** — tape, or a folding rule —
  horizontal and vertical, crossing at the anchor. Then remove them and shoot the
  plate without touching the camera. Pixels per centimetre are measured from the
  reference frame.
- **Tolerance:** ±1% at the anchor and at the art box's four corners (the check that
  the camera really was parallel).
- **The To-scale view** is drawn from the same numbers: the outer size (frame and mount
  included) with dimension lines in cm (inches for an export market's locale), beside
  a 170 cm figure — a neutral silhouette, not a caricature of anyone — and the 200 cm
  sofa. Honest by construction; no plate involved.

## 7. Light and shadow

- Soft daylight from a window **to the left**, out of frame, neutral (≈ 5500 K), the
  same in all six plates. A soft patch of sun on the floor or the sofa is allowed for
  warmth; never on the art box, which must be evenly lit so the print's colours read
  true.
- The plate carries **no shadow of the print** — the shadow is a layer, because it
  depends on the frame's depth. Each plate records the light's direction and the
  shadow's offset, blur and opacity per centimetre of frame depth; the dark wall takes
  a lighter shadow. Values are tuned in 30.4.b against a real framed print on a
  wall — the showroom's, if the pilot provides one.
- **Layer order**, bottom to top: plate → cast shadow → frame (9-slice) → mount (with
  its bevel) → design image → a faint glazing sheen (never on canvas).

## 8. Labelled as synthetic

Every plate is `rendered` or, if photographed with a print placed into it, `composite`
(retouching-and-labelling.md §4). So:

- **Under the On-a-wall and To-scale views**, always visible, a caption — draft wording
  for the lexicon (6.3): "Preview — a digital illustration, to scale. Colours vary by
  screen. Wall shown: 1.8 m wide." / "Pratinjau — ilustrasi digital, sesuai skala.
  Warna bisa berbeda di tiap layar. Lebar dinding: 1,8 m."
- **The wizard's mockups** (24.1.c) are made from the same plates at fixed sizes, and
  carry "Digital mockup" on the image and at the start of their alt text; they are the
  shop's `in-room` images until a real photograph replaces them.
- The demo design used to tune and show the plates is **never** a Hofker work (D6).

## 9. Files and data

- **Master:** 6000 × 4000 px (3:2), 16-bit TIFF, embedded profile, kept privately —
  a capture of no work, so it keeps its intake key, `masters/intake/<brand>/<batch>/…`
  (C9 `intakeMasterKey()`, CONTENT-MODEL.md §6). At the wall plane: near ≈ 33 px/cm,
  wide ≈ 19 px/cm.
- **Crops:** `landscape` 3:2 (desktop) and `square` 1:1 (the phone's pinned preview),
  both keeping the art box with a margin; the same scale, different offsets. Each crop
  is a `media` record of role `room-plate`, and its geometry is measured on that file:
  a crop re-rendered or re-uploaded is left out of the set until re-measured.
- **Previews:** AVIF and WebP in the C9 ladder's widths, so one image loader serves
  them; a pilot target of ≤ 150 KB for the 1600 px AVIF, to be confirmed in 30.4.
- **Data per plate**, as CONTENT-MODEL.md §6 (the `room-plates` global) and C9 v1.4
  `RoomPlate` define: `key` (`<framing>-<wall>`), `framing`, `maxOuterLongEdgeCm`,
  `wallWidthCm`, `wall` `{ name, hex, lab }`, `anchorMode` (`centre` · `bottom`), one
  `crops[]` entry per crop — `crop`, its media's `assetId`, `widthPx` × `heightPx`,
  `pxPerCm` at the wall plane, the `anchor` point and the `artBox`, all in that crop's
  own pixels (C9 `RoomPlateCrop`) — `lightFrom`, `shadow` `{ offsetXPerCm,
  offsetYPerCm, blurPerCm, opacity }`, `props[]` with sizes, and `provenance`. The
  caption's lexicon key is 6.3's (TASKS.md 6.3.f).

The set is **one shared global for every wall-art product type**: a type opts in with
`roomView` (CONTENT-MODEL.md §2) and has no plates of its own — the earlier per-type
`mockupScenes` is gone. The preview (C2 `PreviewVM`, TASKS.md 22.7, 30.4) and the
wizard's mockups (24.1.c) both place a print with C9 `framingFor()` and `placeArt()`,
so a mockup and the live preview hang it at the same place.

## 10. Photographed or rendered

| Option | Scale | Three walls | Consistent light | Verdict |
| ------ | ----- | ----------- | ---------------- | ------- |
| **Render in 3D** | exact | from one scene | identical | **recommended** for all six |
| Photograph one real room, recolour the wall | ±1–2%, with the marks | light and mid work; a dark wall looks false (its bounce light is wrong) | good | the fallback, for near and wide separately |
| Photograph three painted walls | with the marks | real | varies by day | impractical |
| Licensed stock interiors | unknown; rarely frontal | fixed | varies | rejected |
| AI-generated rooms | cannot be trusted | any | varies | **rejected** — a plate whose scale is wrong misleads |

A seventh, **photographed** plate of a showroom wall — real place, real light — would
add trust later. It is optional in the pilot request.

**Who makes them is D46** (open, the owner's budget). D19 covers the owner's
photographs of items; nobody is booked to model rooms or retouch plates. D46's default:
a freelance 3D artist renders the six (recommended); the alternatives are the owner
photographing one room to §5–§6 and recolouring it, or launching with the near plates
only.

## 11. Frames and mounts are photographed, not drawn

The 9-slice frame layers come from **photographs of the real mouldings** the shop sells
(its suppliers are not yet known, PRODUCT.md): per finish, a straight length and a
mitred corner, square on, on the copy setup with the colour card, at ≥ 300 ppi, plus a
side view for the depth. Mounts: a flat swatch of each colour with the card, and the
bevel close-up. This is a second, later request to the owner (README.md follow-ups).

**For the phase 12 comps**, before the plates exist: one provisional plate (a quick
render, or the showroom wall from the pilot), marked provisional in the comp, so a
comp is never judged on plate quality.

## 12. Check for a finished plate

- Scale within ±1% at the anchor and the art box's corners; verticals within 0.5°.
- The wall at the art box within ΔE00 3 of its specified colour.
- Nothing overlaps the art box; no artwork, logo or text anywhere in the plate.
- The three colours of one framing differ **only** in the wall — the props and light
  do not move when a buyer switches colour.
- Its provenance recorded (`rendered` or `photograph`, C9 `provenanceAllowed()`) and
  its caption key set.
- Each crop's `pxPerCm`, `anchor` and `artBox` measured on the crop's own file, the art
  box inside the image (C9 `boxFits()`, CONTENT-MODEL.md §9).
