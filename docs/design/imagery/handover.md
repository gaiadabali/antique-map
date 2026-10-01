# Handing over photographs — files, names, folders

*Bahasa Indonesia:* [handover.id.md](handover.id.md)

For the owner, the staff and the reviewer. How photos travel from the camera to the
platform without losing quality on the way, and what happens to them after.

## 1. Which files to send

**Send the original file the camera or phone made** — not an edited copy, not a
screenshot, not a photo that has passed through a chat app.

| Accepted | Notes |
| -------- | ----- |
| Camera RAW — `.cr2` `.cr3` `.nef` `.arw` `.raf` `.orf` `.rw2` `.dng` | best: it keeps everything the camera saw |
| TIFF — `.tif` | fine, 8- or 16-bit, with its colour profile |
| JPEG — `.jpg` | fine, straight from the camera or phone, highest quality setting |
| HEIC — `.heic` (iPhone) | fine; we convert it |
| PNG, or a scanner's PDF | accepted; we convert it — a TIFF from the scanner is better |

Shooting RAW and JPEG together? Send both; we use the RAW.

**Not accepted**, because the picture has already been shrunk or changed:

- photos sent through **WhatsApp** as photos (even "HD"), Instagram, Facebook, or any
  chat app;
- photos attached to an email that offered to "reduce size";
- links from photo apps set to save space (for example Google Photos' storage saver);
- screenshots, and photos edited in a filter or beauty app.

If WhatsApp is the only way for a few files, send them **as a document** (the paper-clip
→ Document), not as a photo — that keeps the original file.

## 2. Names

The name says what the photo is, so nothing depends on memory. If naming every file is
too slow, put each item's photos in a folder named after the item (§3) and we rename
them — that is a "fix — us", never a problem.

**Gallery — one item:** `<stock number>_<role>_<nn>.<ext>`

- the stock number with its dot as a hyphen: `M.9999` → `M-9999`;
- the role, in lower case: `recto` · `verso` · `detail` · `raking` · `transmitted` ·
  `framed` · `in-room` · `scale` — and `ref` for a test or reference frame (the grey
  board, the colour card alone);
- a two-digit number: `01`, `02`…

```
M-9999_recto_01.cr3
M-9999_verso_01.cr3
M-9999_detail_01.cr3      the cartouche
M-9999_detail_02.cr3      the tear at the lower margin
M-9999_raking_01.cr3
```

An item with no stock number yet: `NEW-` and your own number (`NEW-014`).

**Shop — one product:** `<product>_<role>_<nn>.<ext>`, where the product is its Archive
No. if it has one, otherwise a few words with hyphens (`tote-bali-map`,
`postcard-set-java`). Roles: `flat` · `detail` · `in-room` · `lifestyle` · `scale` ·
`packaging`. The Archive No.'s own format is set with the sister system (TASKS.md
12.3.a); until then, use whatever number the product has today.

**Showroom:** `showroom_<area>_<nn>.<ext>`, with areas `street` · `entrance` · `wide` ·
`wall` · `counter` · `vignette` · `making`.

## 3. Folders

One shared folder, laid out like this:

```
<shared folder>/
  gallery/
    M-9999/                   one folder per item: its photos and notes.txt
    M-9998/
    legacy-M-9997/            the typical migrated item: its existing file, unchanged
  shop/
    products/tote-bali-map/   catalogue shots: flat, detail
    scenes/villa-morning/     one folder per scene: the ref frame first, then the shots
  showroom/
  notes.xlsx                  optional: one row per item instead of notes.txt files
```

## 4. The notes for each item

A few lines per item, in `notes.txt` or one row of a spreadsheet. Whatever you do not
know, leave blank — never guess.

| Note | Example |
| ---- | ------- |
| stock number | M.9999 |
| what it is, as you know it | a map of Java, Blaeu, about 1640 |
| sheet size | 50 × 38 cm |
| framed or matted? can it come out safely? | in a mat, can come out |
| defects you know of | a repaired tear at the lower margin; light foxing |
| camera or phone, and the light used | phone; window light and a white board |
| anything done to older photos of it | the old photo was lightened — not sure |

For the shop, add for each life-shot scene: where it is, and whether anyone
recognisable is in it and has agreed (§6).

## 5. How to send

- **A shared cloud folder** — Google Drive, Dropbox or whatever you already use —
  shared with the address in the request. Or we create one and send you the link.
- Upload **from the camera's card, or the phone's own files**. If the phone or the app
  asks, choose "original" or "actual size", never "reduced" or "optimised".
- Upload one item first and tell us. We check it before you go on, so a problem with
  the setup is found before you have photographed the rest.
- **We never collect anything from the current websites.** Photos come from you.

## 6. Privacy and consent

- **Location.** Phones record where each photo was taken. We keep the original files
  private and **remove location and camera details from everything published**. If you
  would rather the location never leaves your phone, switch off location in the
  camera's settings before shooting.
- **People.** A recognisable person in a shop photo needs their written consent, and a
  child a parent's — staff included. We will send a one-paragraph consent form for
  this; hands need nothing.
- **Your stock.** The files show what you own and where it is kept; they stay in private
  storage and are shared with nobody outside the design team.

## 7. What happens next

1. We copy every file, as received, into the platform's private storage (the masters
   bucket). **Nothing is published.**
2. We check each image against the intake spec and put a report in the folder
   (`_intake`): pass, fix — us, fix — owner, or reject, with the reason for each
   (intake-spec.md §7).
3. The passing images are used to design the new pages. In the design stage they are
   shown to you and to a small group of test buyers (TASKS.md 13.2); nothing appears on
   a public site until you approve it.
