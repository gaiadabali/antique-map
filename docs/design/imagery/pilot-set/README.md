# The pilot set — the client's existing photographs

Task 6.2.b (TASKS.md). **D19, updated 2026-10-01:** there is no pilot shoot and no request
to the owner (6.2.f cut). The pilot set is the client's existing photographs — for the
gallery, the images the old site's read-only public read already gathered (D41). This
folder holds the record of that set; the images themselves are never in git.

| File | What it holds |
| ---- | ------------- |
| [manifest.md](manifest.md) | the archive's image statistics, the six items and why each was chosen, every image checked against [intake-spec.md](../intake-spec.md), its verdict and gaps, its storage key and checksum |
| this README | what the set is, where the files are, what it tells the design comps, the gaps |

## What the set is

Six gallery items, two of each kind the archive holds: maps (M.0389, M.NN34), prints
(P.2425, P.1674) and photographs (P.2301, IM.66). **P.2425 is the typical migrated item** —
one image at the archive's median size and quality, not its best (manifest §1–§2). The rest
were chosen for what they show: the best the archive has (M.0389), a large sheet in one frame
(M.NN34), a set of sheets on one item (P.1674), a photograph with its edges in view
(P.2301), and the low tail under the recto's reject line (IM.66). Where an item had more than
one image, it was preferred.

19 images were assessed; 15 are kept, 4 are not — a synthetic overview and three images that
belong to other items (manifest §4).

## Where the files are

| Where | What |
| ----- | ---- |
| `LEGACY_DATA_DIR` → `indies-gallery/public-read/images/` | the source files, as the public read saved them (outside git, never committed) |
| local dev MinIO, bucket `archive-masters`, prefix `pilot/` | the 15 kept files, byte-for-byte, at `pilot/<stock number>/<role>_<nn>.jpg` (handover.md §2) — `docker compose -f docker-compose.dev.yml up -d minio`, then the console at <http://localhost:9001> |

**What goes to staging** (not done here — the orchestrator's, on Helios, D12 RustFS): the same
15 files in the staging masters bucket at C9 `intakeMasterKey('indies-gallery',
'pilot-2026-10', <sha256>, 'jpg')`, and the manifest as an `IntakeManifest` at
`intakeManifestKey('indies-gallery', 'pilot-2026-10')`, every entry `verdict: 'legacy'`,
`retouching: 'unknown'`, `captureTier: null`, `provenance: 'photograph'`. The checksums are in
manifest §6. The local `pilot/` prefix is a readable mirror for the comps; C9's intake key is
the one a `masters` record will point at.

## What the real images say — for the comps (phase 12)

Draw the comps on these, not on a stock photograph of a perfect scan. Most item pages will
look like **P.2425**, not like M.0389.

1. **One image is the normal case.** 88% of items have one image and none has a verso. The
   item page's default is a single recto with no filmstrip; the filmstrip, the verso and the
   condition views are the richer state, which the owner's new photographs add over time.
2. **About 2,700 px on the long edge.** The median frame is 2,706 × 1,697 px; 42% of images
   are under 2,400 px, the top of the derivative ladder (C9 `DERIVATIVE_WIDTHS`). A hero that
   shows a sheet 1,200 CSS px wide on a 2× screen needs 2,400 px, so on almost half the items
   the largest display must stop short of that, or the image is upscaled. Design the zoom to
   end where the pixels end — at the typical item, about 1:1 at 2,700 px — with a clear
   "this is the full resolution" state.
3. **Objects are cropped inside their edges.** Eight of the ten rectos show no edge of the
   sheet or print, and one shows it in part: the old scans were trimmed in the margin. The digital mat and shadow
   (gallery-guide.md §10) must look right against a hard rectangular crop, and no comp may
   promise deckle edges or torn corners the legacy images do not show.
4. **Colour is unverified, and the paper is often whiter than it is.** No image carries a
   colour card or a profile; the paper is pushed to white on the best scans (1–1.6% of the
   frame clipped on M.0389 and P.1674) and pink on the album leaves (P.2301). Never take a
   design token from a legacy paper colour, and test the mat and page tones against both a
   blown-white sheet and a warm album leaf.
5. **Both orientations, and extremes.** The archive is half landscape, half portrait, with
   panoramas (M.NN34 at 2.35 : 1) and tall sheets (IM.66 at 1 : 1.36). Grid cards, the hero
   and the share image need a rule for each, not a crop that cuts the object.
6. **A set is several rectos.** P.1674 is three sheets and IM.66 three of fifteen
   photographs; the page needs a pattern for "one item, several objects".
7. **The print ceiling is modest.** The typical item supports about 28 cm at 240 ppi (D26) — 23 cm if
   the catalogue's size is its plate;
   the archive's median is 286 mm from the frame, which is an upper bound. The shop's
   configurator comps should show the ceiling message as a normal state, not an error.

## Named gaps

- **The shop has no existing photographs on disk.** `../indies-legacy-data/old-east-indies`
  holds only the Wayback CDX index and archived sitemaps (7.3), no images. The owner forwards
  the shop's existing photos later; this is **not blocking**. Meanwhile the shop's comps use
  the gallery's archive images — the details of M.0389 and the three sheets of P.1674 as
  stand-in designs — labelled as stand-ins in the comp, never presented as the shop's
  product photography. When the shop's photos arrive they are assessed into this folder as
  a second batch.
- **No item has a launch set** (requirement 6.12: a passing recto, verso and detail): no
  verso, no colour card and no raking light in the whole set. That is the finding, not a fault
  of the set: the old site photographed for a web page, not for condition. The 200 launch
  items need the owner's new photographs, to [gallery-guide.md](../gallery-guide.md).
- **The capture thresholds are not recalibrated by this set.** The intake spec's numbers were
  to be tested on the owner's own equipment; a legacy set has no equipment, card or
  background to test them against. It calibrates the legacy record (intake-spec.md §8) only;
  the capture thresholds wait for the owner's first new item.
