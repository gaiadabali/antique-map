/**
 * @contract C9 — media artefacts: image roles and provenance · owner: ARC · entry `@engine/media/contract`
 *
 * What an image is — its role — and how it was made — its provenance — and the rules that follow
 * from the two (CONTENT-MODEL.md §1, §2, §6, §9; docs/design/imagery/). Both are set once, at
 * intake, on the master and on the media made from it (`media.role`, `media.provenance`): the row
 * that places an image on a work, a product or a location orders and captions it, and never says
 * again what it is. A synthetic image is labelled wherever it is shown, by whatever renders it,
 * from its provenance — never by words stored on the record (retouching-and-labelling.md §6).
 */

// ── Roles ──────────────────────────────────────────────────────────────────────────────

/**
 * Every role a page shows an image under — a work's first, in its manifest and filmstrip order
 * (v1.1), then a product's and a location's (appended in v1.4). `primary` is a designation, not a
 * role: a work's primary is its first photographed `recto` and a product's is
 * `primaryImageIndex()`'s choice, so no media record carries it (`MEDIA_ROLES`) and no view
 * model's image does either. It stays for v1.1's readers and leaves at the next major version.
 */
export const IMAGE_ROLES = [
  'primary',
  'recto',
  'verso',
  'detail',
  'raking',
  'transmitted',
  'framed',
  'in-room',
  'scale',
  'flat',
  'lifestyle',
  'packaging',
  'showroom',
] as const
export type ImageRole = (typeof IMAGE_ROLES)[number]

/** A work's images — the gallery's, and a sister's provenance copy of them — in manifest order. */
export const WORK_IMAGE_ROLES = [
  'recto',
  'verso',
  'detail',
  'raking',
  'transmitted',
  'framed',
  'in-room',
  'scale',
] as const

/**
 * The images of condition a collector judges an original by: on a work each is a photograph,
 * never retouched (retouching-and-labelling.md §1, §5; intake-spec.md H1).
 */
export const CONDITION_ROLES = ['recto', 'verso', 'detail', 'raking', 'transmitted'] as const

/**
 * A product's images, in the product page's order (EXPERIENCE-SHOP.md §4): framed on a wall
 * first, then flat, close-ups, in use, to scale, the gift wrap and the parcel, in the showroom.
 * The deep zoom of the scan is the design's image, not one of these. Requirement 7.12's launch
 * set is a `flat`, an `in-room` and a `detail`.
 */
export const PRODUCT_IMAGE_ROLES = [
  'in-room',
  'flat',
  'detail',
  'lifestyle',
  'scale',
  'packaging',
  'showroom',
] as const

/** A location's own photographs: the showroom, or any stock location a visitor may come to. */
export const LOCATION_IMAGE_ROLES = ['showroom'] as const
/**
 * Where in a location a photograph was taken, in the visit page's order — the street and the
 * entrance first, so a visitor recognises the place on arrival (shop-guide.md §5, handover.md §2).
 */
export const LOCATION_IMAGE_AREAS = [
  'street',
  'entrance',
  'wide',
  'wall',
  'counter',
  'vignette',
  'making',
] as const
export type LocationImageArea = (typeof LOCATION_IMAGE_AREAS)[number]

/**
 * `media.role`: what an image is, set at intake — every role above but the `primary`
 * designation, or an editorial image that documents no work, product or location (a story's illustration, a banner, a portrait of a maker).
 */
export const MEDIA_ROLES = [
  ...WORK_IMAGE_ROLES,
  'flat',
  'lifestyle',
  'packaging',
  'showroom',
  'editorial',
] as const
export type MediaRole = (typeof MEDIA_ROLES)[number]

/** Where an image is placed: on a work, a product or a location — or elsewhere. */
export const IMAGE_SUBJECTS = ['work', 'product', 'location', 'other'] as const
export type ImageSubject = (typeof IMAGE_SUBJECTS)[number]

/** The media roles each subject's images may carry; `other` is an editorial image. */
export const ROLES_BY_SUBJECT = {
  work: WORK_IMAGE_ROLES,
  product: PRODUCT_IMAGE_ROLES,
  location: LOCATION_IMAGE_ROLES,
  other: ['editorial'],
} as const satisfies Readonly<Record<ImageSubject, readonly MediaRole[]>>

export function roleAllowed(subject: ImageSubject, role: MediaRole): boolean {
  return (ROLES_BY_SUBJECT[subject] as readonly MediaRole[]).includes(role)
}

// ── Provenance ─────────────────────────────────────────────────────────────────────────

/**
 * How an image was made (retouching-and-labelling.md §4): a camera photograph of the real thing,
 * with only the corrections the rules allow, or one of three synthetic kinds — a real photograph
 * with something placed into it, a scene rendered in 3D or drawn, anything an AI model made.
 * Declared at intake (intake-spec.md H4), never inferred. It replaces KOI's `aiGenerated` flag,
 * which is its last value.
 */
export const MEDIA_PROVENANCES = ['photograph', 'composite', 'rendered', 'ai-generated'] as const
export type MediaProvenance = (typeof MEDIA_PROVENANCES)[number]

export function isSynthetic(provenance: MediaProvenance): boolean {
  return provenance !== 'photograph'
}

/**
 * The label a synthetic image carries on the image, at the start of its rendered alt text, in its
 * caption and in the filmstrip — in the lexicon's words (`image.synthetic.<label>`,
 * `image.syntheticAlt.<label>`; TASKS.md 6.3), never an icon alone. It is added where the image is
 * rendered, from its provenance (`renderedAlt()`), and never stored in `media.alt`, which describes
 * the image and nothing else (v1.6): no edit of the alt can remove the label.
 */
export const SYNTHETIC_LABEL = {
  photograph: null,
  composite: 'digital-mockup',
  rendered: 'digital-mockup',
  'ai-generated': 'ai-generated',
} as const satisfies Readonly<Record<MediaProvenance, 'digital-mockup' | 'ai-generated' | null>>
export type SyntheticLabel = NonNullable<(typeof SYNTHETIC_LABEL)[MediaProvenance]>

/** The lexicon's words for a synthetic image's label, in the page's locale. */
export type SyntheticLabelWords = {
  /** `image.synthetic.<label>`: "Digital mockup". */
  readonly label: (label: SyntheticLabel) => string
  /** `image.syntheticAlt.<label>` filled with the stored alt: "Digital mockup: {alt}". */
  readonly labelled: (label: SyntheticLabel, alt: string) => string
}

/**
 * Whether `alt` already opens with a label's words, ignoring case and surrounding space — a legacy
 * alt, or a baseline written before v1.6 — so a label is never shown twice. Blank words never
 * match: a missing lexicon value must not drop a label.
 */
export function opensWithLabel(alt: string, words: string): boolean {
  const opening = words.trim().toLowerCase()
  return opening.length > 0 && alt.trim().toLowerCase().startsWith(opening)
}

/**
 * The alt text an image is shown with: a photograph's stored alt as it is; a synthetic image's
 * with its label first, in the lexicon's words — unless the stored alt already opens with them.
 * `label` is `SYNTHETIC_LABEL[provenance]`, so the label follows the image's provenance, fixed at
 * intake, and never the alt's wording.
 */
export function renderedAlt(
  alt: string,
  label: SyntheticLabel | null,
  words: SyntheticLabelWords,
): string {
  if (label === null || opensWithLabel(alt, words.label(label))) return alt
  return words.labelled(label, alt)
}

/**
 * Whether an image of this provenance may be placed under this role on this subject
 * (retouching-and-labelling.md §5). A photograph always may; otherwise:
 * - on a work, only an `in-room` view — a composite or a render, labelled and never first — since
 *   every other image shows the object itself, and no AI-generated image ever shows an original;
 * - on a location, never: its photographs are the shop's proof that the place is real;
 * - on a product, any, labelled: whether an AI image shows a product the shop really makes is a
 *   person's judgement, not the schema's;
 * - an editorial image may be anything, labelled.
 * Whether the subject takes the role at all is `roleAllowed()`'s answer.
 */
export function provenanceAllowed(
  subject: ImageSubject,
  role: MediaRole,
  provenance: MediaProvenance,
): boolean {
  if (provenance === 'photograph') return true
  switch (subject) {
    case 'work':
      return role === 'in-room' && provenance !== 'ai-generated'
    case 'location':
      return false
    case 'product':
      return true
    case 'other':
      return true
  }
}

// ── Page order and the primary ─────────────────────────────────────────────────────────

/** What ordering and the primary read of an image: its role and how it was made. */
export type RoledImage = { readonly role: MediaRole; readonly provenance: MediaProvenance }

const PAGE_ORDER = { work: WORK_IMAGE_ROLES, product: PRODUCT_IMAGE_ROLES } as const

function rank(subject: 'work' | 'product', image: RoledImage): number {
  const at = (PAGE_ORDER[subject] as readonly MediaRole[]).indexOf(image.role)
  return at === -1 ? Number.MAX_SAFE_INTEGER : at
}

/**
 * A work's or a product's images in page order — a manifest's canvases, the filmstrip, a C12
 * snapshot's: by the subject's role order; within a role, photographs before synthetic images (a
 * real photograph takes a mockup's place, retouching-and-labelling.md §7), then as given. A role
 * the subject does not take sorts last, where its guard names it. Returns a new, stable array.
 */
export function orderImages<T extends RoledImage>(
  subject: 'work' | 'product',
  images: readonly T[],
): T[] {
  return images
    .map((image, index) => ({ image, index }))
    .sort(
      (a, b) =>
        rank(subject, a.image) - rank(subject, b.image) ||
        Number(isSynthetic(a.image.provenance)) - Number(isSynthetic(b.image.provenance)) ||
        a.index - b.index,
    )
    .map(({ image }) => image)
}

/**
 * The index in `images` of the image a page leads with — its LCP, its card, its social preview —
 * or -1 for none:
 * - a work: its first photographed `recto` — the whole sheet, cropped outside the sheet and never
 *   into it — never a photograph of its own, a detail or a synthetic image; a work without one
 *   has no primary, and its publish guard says so (CONTENT-MODEL.md §9);
 * - a product: its first photographed `in-room` or `flat` image in page order; until one exists,
 *   its first image in page order, labelled if synthetic (retouching-and-labelling.md §5).
 */
export function primaryImageIndex(
  subject: 'work' | 'product',
  images: readonly RoledImage[],
): number {
  const ordered = orderImages(
    subject,
    images.map((image, index) => ({ ...image, index })),
  )
  const photographed = (roles: readonly MediaRole[]) =>
    ordered.find((image) => roles.includes(image.role) && image.provenance === 'photograph')
  const lead =
    subject === 'work' ? photographed(['recto']) : (photographed(['in-room', 'flat']) ?? ordered[0])
  return lead?.index ?? -1
}
