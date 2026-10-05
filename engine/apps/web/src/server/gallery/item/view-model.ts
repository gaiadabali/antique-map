/**
 * The gallery item's view model (5.2.b): everything `/product/{publicId}-{slug}` shows, and
 * nothing it must not. **No price and no staff field exists here** — `askingPrice`, `notes`,
 * `rights`, `physical`, `cataloguing` and `legacy` never appear in the loader's select, in a
 * type, or in a test's assertion; the gallery sells by enquiry and quotes no price
 * (EXPERIENCE-GALLERY.md §4). One view, two sites never share it: this is the gallery's own.
 */
/** One image on the item page: what the visitor sees and what the viewer needs. */
export type ItemImage = {
  readonly url: string
  readonly alt: string
  /** The media record's role — recto, verso, detail … — as the filmstrip names it. */
  readonly role: string
  /** True when the image is synthetic (a digital mockup): the page labels it, never first. */
  readonly synthetic: boolean
  readonly width: number | null
  readonly height: number | null
  /** The IIIF `info.json` URL when deep-zoom tiles exist for this image; else `null`. */
  readonly infoUrl: string | null
  /** The image the viewer falls back to when there are no tiles: the largest derivative, or
   * the media record's own file. Never `null` — the row carried a media record. */
  readonly viewerSrc: string
  /** The viewer's honesty notice applies: a legacy photo below the zoom threshold. */
  readonly lowResolution: boolean
}

export type ItemCredit = {
  readonly name: string
  readonly role: string
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
  readonly id: number
  readonly publicId: number
  readonly workUid: string | null
  readonly stockNumber: string | null
  readonly title: string
  readonly originalTitle: string | null
  /** `lang` the original title's transcription sets on the page. */
  readonly originalTitleLanguage: string | null
  readonly objectType: string | null
  readonly maker: ItemCredit | null
  readonly places: readonly ItemPlace[]
  /** The date as written (`date.display`, localized) or the reading's own words. */
  readonly date: string | null
  /** The card's dimensions line, in cm and inches; `null` when none is measured. */
  readonly dimensions: string | null
  readonly technique: string | null
  readonly colouring: string | null
  readonly status: 'available' | 'on-hold' | 'sold'
  readonly conditionGrade: string | null
  readonly conditionNotes: string | null
  readonly conditionDefects: readonly string[]
  readonly conditionRestoration: string | null
  readonly provenance: readonly ItemProvenance[]
  readonly references: readonly ItemReference[]
  readonly subjects: readonly string[]
  /** The images in page order (`orderImages('work', …)` order): recto first. */
  readonly images: readonly ItemImage[]
  /** The canonical address's slug segment, derived from the title (`/product/{publicId}-{slug}`). */
  readonly slug: string
}

/** The words the address's slug segment carries, cut the way the CMS's own slug field cuts. */
export function slugOf(title: string): string {
  const ascii = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, '')
    .replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  return ascii.replace(/-+$/g, '') || 'antique'
}
