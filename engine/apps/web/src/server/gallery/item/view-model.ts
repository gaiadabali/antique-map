/**
 * The gallery item's view model (5.2.b): everything `/product/{publicId}-{slug}` shows, and
 * nothing it must not. **No price and no staff field exists here** — the loader's select never
 * names a price, a note for staff, rights, physical costs, cataloguing or legacy fields, and a
 * db test asserts the result's JSON carries no `askingPrice`; the gallery sells by enquiry and
 * quotes no price (EXPERIENCE-GALLERY.md §4). Vocabulary values stay codes (`objectType`,
 * `technique`, `colouring`, a credit's `role` and `certainty`): the page says them in its
 * locale's words, from the lexicon.
 */
import type { MediaRole, SyntheticLabel } from '@engine/media/contract'

/** One image on the item page: what the visitor sees and what the viewer needs. */
export type ItemImage = {
  /** The page's own image: the media record's file (C9 public derivatives arrive with 15.1). */
  readonly url: string
  readonly alt: string
  /** The media record's role — recto, verso, detail … — as the filmstrip names it. */
  readonly role: MediaRole
  /** A synthetic image's label (C9 `SYNTHETIC_LABEL`): the page names it; `null` for a photograph. */
  readonly syntheticLabel: SyntheticLabel | null
  readonly width: number | null
  readonly height: number | null
  /** The capped IIIF `info.json` URL (C9 `iiifInfoUrl()`) when the pyramid is built; else `null`. */
  readonly infoUrl: string | null
  /** What the viewer opens when there are no tiles: the largest public derivative (C9
   * `derivativeKey()`), else the media record's own file. Never empty. */
  readonly viewerSrc: string
  /** The viewer's honesty notice applies: the long edge is under the zoom threshold (1,600 px). */
  readonly lowResolution: boolean
}

export type ItemCredit = {
  readonly name: string
  /** C2 `MakerRole` code: `maker.role.<role>` in the lexicon. */
  readonly role: string
  /** C2 `Certainty` code: `maker.certainty.<certainty>` in the lexicon. */
  readonly certainty: string
}

export type ItemPlace = {
  readonly name: string
  readonly role: string
  readonly primary: boolean
}

/** One former owner, as the record lists it. */
export type ItemProvenance = {
  readonly holder: string
  readonly period: string | null
  readonly note: string | null
}

/** One reference, as catalogued: "Tooley (Australia) 1268", with its note. */
export type ItemReference = {
  readonly citation: string
  readonly note: string | null
}

export type ItemView = {
  readonly publicId: number
  readonly workUid: string | null
  readonly stockNumber: string | null
  readonly title: string
  readonly originalTitle: string | null
  /** `lang` the original title's transcription sets on the page. */
  readonly originalTitleLanguage: string | null
  /** C2 object type code: `objectType.<code>` in the lexicon. */
  readonly objectType: string | null
  readonly maker: ItemCredit | null
  readonly places: readonly ItemPlace[]
  /** The date as written (`date.display`, localized) or the reading's own words. */
  readonly date: string | null
  /** The card's dimensions line, in cm and inches; `null` when none is measured. */
  readonly dimensions: string | null
  /** Technique code: `technique.<code>` in the item lexicon. */
  readonly technique: string | null
  /** C2 `Colouring` code: `colouring.<code>` in the lexicon. */
  readonly colouring: string | null
  readonly status: 'available' | 'on-hold' | 'sold'
  readonly conditionGrade: string | null
  readonly conditionNotes: string | null
  readonly conditionDefects: readonly string[]
  readonly conditionRestoration: string | null
  readonly provenance: readonly ItemProvenance[]
  readonly references: readonly ItemReference[]
  readonly subjects: readonly string[]
  /** The images in page order (C9 `orderImages('work', …)`): recto first, photographs before
   * synthetic images. */
  readonly images: readonly ItemImage[]
  /** The index in `images` of the page's lead image (C9 `primaryImageIndex('work', …)`): the first
   * photographed recto, never a detail or a mockup; -1 when the work has none. */
  readonly primaryIndex: number
  /** The canonical address's slug segment, derived from the title (`/product/{publicId}-{slug}`). */
  readonly slug: string
}

/** Letters NFKD does not take apart into a base letter and a mark (the CMS's `slugify`). */
const LETTERS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
}

const SLUG_MAX_LENGTH = 96

/**
 * The words the address's slug segment carries, cut the way the CMS's own `slugify` cuts
 * (`packages/cms/src/fields/slug.ts`, not exported to the app): accents dropped, apostrophes
 * joined, a plus spelled out, every other run of non-letters one hyphen, cut at a hyphen to 96.
 * `antique` when nothing Latin is left, so the address always has a slug.
 */
export function slugOf(title: string): string {
  const ascii = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, (letter) => LETTERS[letter] ?? '')
    .replace(/['’ʼ`]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (ascii === '') return 'antique'
  if (ascii.length <= SLUG_MAX_LENGTH) return ascii
  const cut = ascii.slice(0, SLUG_MAX_LENGTH + 1)
  const hyphen = cut.lastIndexOf('-')
  return (hyphen > 0 ? cut.slice(0, hyphen) : cut.slice(0, SLUG_MAX_LENGTH)).replace(/-+$/, '')
}
