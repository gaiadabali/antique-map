/**
 * @contract C9 — media artefacts: masters, the object in the frame, the print ceiling · owner: ARC
 * · entry `@engine/media/contract`
 *
 * A master is one capture as received — the file a camera, a scanner or a renderer made — kept in
 * the private masters bucket (`masterKey()`, `intakeMasterKey()`) and described by a `masters`
 * record (CONTENT-MODEL.md §6). What the intake measures on it is here: the object's box in the
 * frame, the object's ppi, the capture tier, the verdict (docs/design/imagery/intake-spec.md).
 * The print ceiling comes from the object's pixels or a design's crop of them — never from the
 * file's long edge, which also holds the background, the colour card and the ruler.
 */
import type { MediaProvenance, MediaRole } from './roles'

/** A rectangle in an image's own pixels: origin at the top left, whole pixels, never empty. */
export type PixelBox = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}
export type PixelPoint = { readonly x: number; readonly y: number }

/** Whether `box` is a whole-pixel, non-empty rectangle inside an image of `widthPx` × `heightPx`. */
export function boxFits(box: PixelBox, widthPx: number, heightPx: number): boolean {
  const whole = [box.x, box.y, box.width, box.height].every(Number.isSafeInteger)
  return (
    whole &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.width > 0 &&
    box.height > 0 &&
    box.x + box.width <= widthPx &&
    box.y + box.height <= heightPx
  )
}

// ── What the intake records ─────────────────────────────────────────────────────────────

/**
 * A master's role: what the capture is — any media role (`./roles`), or a `reference` frame (the
 * grey board, the colour card alone, a scene's colour reference, handover.md §2), which is kept to
 * correct the shots it belongs with and is never published.
 */
export type MasterRole = MediaRole | 'reference'

/** The kit a capture was made with (gallery-guide.md §2, shop-guide.md §2). */
export const CAPTURE_TIERS = ['good', 'better', 'best'] as const
export type CaptureTier = (typeof CAPTURE_TIERS)[number]

/**
 * The intake's verdict on a master it keeps (intake-spec.md §2) — a rejected file is not kept, and
 * one "fixed by us" is fixed at intake and passes with a note:
 * - `pass` — used under its role;
 * - `fix-owner` — used for design work, never published under its role until re-taken;
 * - `legacy` — an image that already existed, assessed and never rejected, not held to the spec
 *   (intake-spec.md §8).
 */
export const INTAKE_VERDICTS = ['pass', 'fix-owner', 'legacy'] as const
export type IntakeVerdict = (typeof INTAKE_VERDICTS)[number]

/** Whether media made from a master of this verdict may be published under its role. */
export function publishableVerdict(verdict: IntakeVerdict): boolean {
  return verdict !== 'fix-owner'
}

/**
 * What is known of retouching on a master (retouching-and-labelling.md §1): `none` for a capture
 * that passed check H1; for a legacy image `unknown`, or `retouched-legacy` where the owner knows
 * it was cleaned up — which puts its item on the re-shoot list.
 */
export const RETOUCHING_STATES = ['none', 'unknown', 'retouched-legacy'] as const
export type RetouchingState = (typeof RETOUCHING_STATES)[number]

/**
 * Object ppi, to the nearest whole ppi: the object's long edge in pixels over its real long edge
 * in inches (intake-spec.md §1). The pixels are the object's box's, never the frame's; the real
 * size is measured from the ruler in the frame and cross-checked against the catalogue's
 * dimensions — never read from the file's DPI tag, which cameras set arbitrarily.
 */
export function objectPpi(objectLongEdgePx: number, objectLongEdgeMm: number): number {
  return Math.round((objectLongEdgePx / objectLongEdgeMm) * 25.4)
}

/**
 * One file of an intake batch as the reviewer records it (intake-spec.md §7): the row a `masters`
 * record is made from once the collection exists (TASKS.md 8.3), and meanwhile the pilot set's
 * only record (OA3), kept beside its files at `intakeManifestKey()`.
 */
export type IntakeEntry = {
  /** The file's SHA-256, 64 lower-case hex digits: the name its key is built from. */
  readonly checksum: string
  readonly extension: string
  /** The name it was handed over under (`M-9999_recto_01.cr3`, handover.md §2). */
  readonly receivedAs: string
  /** What it is of, as the handover names it: a stock number, a product's words, `showroom`. */
  readonly reference: string
  readonly role: MasterRole
  readonly provenance: MediaProvenance
  /** The frame's pixels, as the file holds them. */
  readonly widthPx: number
  readonly heightPx: number
  /** The object's bounding box in the frame (for a sheet, its outer edge, margins included). */
  readonly objectBox: PixelBox | null
  readonly objectPpi: number | null
  /** `null` where nobody knows: a legacy file. */
  readonly captureTier: CaptureTier | null
  readonly verdict: IntakeVerdict
  readonly retouching: RetouchingState
  /** "print ceiling 34 cm", "colour unverified — grey card only", "ΔE00 2.9"… */
  readonly notes: readonly string[]
}

export type IntakeManifest = {
  readonly brand: string
  readonly batch: string
  /** When the batch arrived, ISO 8601 with its offset. */
  readonly receivedAt: string
  readonly entries: readonly IntakeEntry[]
}

// ── The print ceiling ───────────────────────────────────────────────────────────────────

/** The default minimum print resolution (D26); a product type may raise it. */
export const MIN_PRINT_PPI = 240

/**
 * The longest print, to the nearest mm, that `longEdgePx` supports at `ppi`. `longEdgePx` is the
 * long edge of what is printed, in the master's own pixels: a design's crop — for a whole-sheet
 * design, the object's box. Never the master file's long edge, which also holds the background,
 * the colour card and the ruler: a 3543 px frame whose sheet spans 3300 px of it prints to 349 mm
 * at 240 ppi, not 375.
 */
export function printCeilingMm(longEdgePx: number, ppi: number = MIN_PRINT_PPI): number {
  return Math.round((longEdgePx / ppi) * 25.4)
}

/**
 * The print ceiling of a region of a master — a design's crop, or the object's box — from its own
 * long edge. A crop's `width` × `height` are its own, before any rotation.
 */
export function printCeilingOf(
  region: Pick<PixelBox, 'width' | 'height'>,
  ppi: number = MIN_PRINT_PPI,
): number {
  return printCeilingMm(Math.max(region.width, region.height), ppi)
}

// ── Restoring a print file ──────────────────────────────────────────────────────────────

/**
 * What a design's print file may be restored for (retouching-and-labelling.md §2): recorded on the
 * design, its restoration note (CONTENT-MODEL.md §2), and said on every product made from it beside
 * the Reproduction label, in the lexicon's words (TASKS.md 6.3). A print file carries no other
 * restoration; its crop is the design itself, not a restoration; and a capture master is never
 * restored — a print file is a copy made from it.
 * - `foxing-and-stains` — foxing, spots, stains, tide lines, dirt, offsetting, show-through;
 * - `folds-and-creases` — fold lines and creases;
 * - `tears-closed` — tears closed, through the line where they run through it;
 * - `losses-filled` — small losses and wormholes filled from the surrounding paper and line;
 * - `tone-rebalanced` — colour and tone rebalanced against fading and toning;
 * - `paper-neutralised` — the paper's own tone neutralised;
 * - `digitally-coloured` — colour added to an uncoloured sheet, or the colouring changed;
 * - `sheets-joined` — two sheets or two states joined into one design.
 */
export const PRINT_RESTORATIONS = [
  'foxing-and-stains',
  'folds-and-creases',
  'tears-closed',
  'losses-filled',
  'tone-rebalanced',
  'paper-neutralised',
  'digitally-coloured',
  'sheets-joined',
] as const
export type PrintRestoration = (typeof PRINT_RESTORATIONS)[number]
