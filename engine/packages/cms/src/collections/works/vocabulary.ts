/**
 * A work's controlled lists (CONTENT-MODEL.md §3), each declared once here with the admin's words
 * for it; a credit's role is the makers' own `MAKER_ROLES`, imported, never repeated. The object
 * types lived in the brand schema (`@engine/config/schema`, C1), which TASKS.md 2.2 deletes, so
 * they are declared here now, with the same values (TASKS.md 2.4.c); 3.2.b aligns them with
 * CONTENT-MODEL.md §3.
 *
 * Values are kebab-case: they become Postgres enum labels, URL facet values and C2 keys alike, so
 * the publisher's colour is `publishers` (C2 `Colouring`), never `publisher's`.
 */
/** `works.objectType` — how the item page reads. */
export const OBJECT_TYPES = [
  'map',
  'sea-chart',
  'city-plan',
  'view',
  'print',
  'photograph',
  'book',
  'atlas',
  'poster',
  'document',
  'ethnographic',
  'other',
] as const
export type ObjectType = (typeof OBJECT_TYPES)[number]

type Option = { readonly value: string; readonly label: string }
const optionsOf = <V extends string>(values: readonly V[], labels: Record<V, string>): Option[] =>
  values.map((value) => ({ value, label: labels[value] }))

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  map: 'Map',
  'sea-chart': 'Sea chart',
  'city-plan': 'City plan',
  view: 'View',
  print: 'Print',
  photograph: 'Photograph',
  book: 'Book',
  atlas: 'Atlas',
  poster: 'Poster',
  document: 'Document',
  ethnographic: 'Ethnographic object',
  other: 'Other',
}
export const OBJECT_TYPE_OPTIONS = optionsOf(OBJECT_TYPES, OBJECT_TYPE_LABELS)

/** The types a volume's collation (`book`) belongs to. */
export const BOUND_OBJECT_TYPES = ['book', 'atlas'] as const satisfies readonly ObjectType[]

/** How certain a credit is (C2 `Certainty`, C12 `SnapshotMaker.certainty`): never implied certain. */
export const CERTAINTIES = ['certain', 'attributed', 'after', 'workshop'] as const
export type Certainty = (typeof CERTAINTIES)[number]
export const CERTAINTY_OPTIONS = optionsOf(CERTAINTIES, {
  certain: 'Certain',
  attributed: 'Attributed to',
  after: 'After (a copy of their work)',
  workshop: 'Workshop of',
})

/** What a place is to a work (C2 `PlaceRole`, C12 `SnapshotPlace.role`). */
export const PLACE_ROLES = ['depicts', 'published-at', 'photographed-at'] as const
export type PlaceRole = (typeof PLACE_ROLES)[number]
export const PLACE_ROLE_OPTIONS = optionsOf(PLACE_ROLES, {
  depicts: 'Depicts',
  'published-at': 'Published at',
  'photographed-at': 'Photographed at',
})

/** One primary place and at most this many secondary tags (EXPERIENCE-GALLERY.md §2). */
export const MAX_SECONDARY_PLACES = 5

/** How the image was made — controlled, because the item page and the HS code read it. */
export const TECHNIQUES = [
  'woodcut',
  'wood-engraving',
  'copperplate-engraving',
  'etching',
  'steel-engraving',
  'mezzotint',
  'aquatint',
  'lithograph',
  'chromolithograph',
  'offset-lithograph',
  'screenprint',
  'salt-print',
  'albumen-print',
  'gelatin-silver-print',
  'collotype',
  'photogravure',
  'cyanotype',
  'manuscript',
  'other',
] as const
export type Technique = (typeof TECHNIQUES)[number]
export const TECHNIQUE_OPTIONS = optionsOf(TECHNIQUES, {
  woodcut: 'Woodcut',
  'wood-engraving': 'Wood engraving',
  'copperplate-engraving': 'Copperplate engraving',
  etching: 'Etching',
  'steel-engraving': 'Steel engraving',
  mezzotint: 'Mezzotint',
  aquatint: 'Aquatint',
  lithograph: 'Lithograph',
  chromolithograph: 'Chromolithograph',
  'offset-lithograph': 'Offset lithograph',
  screenprint: 'Screenprint',
  'salt-print': 'Salt print',
  'albumen-print': 'Albumen print',
  'gelatin-silver-print': 'Gelatin silver print',
  collotype: 'Collotype',
  photogravure: 'Photogravure',
  cyanotype: 'Cyanotype',
  manuscript: 'Manuscript',
  other: 'Other',
})

/** The colouring (C2 `Colouring`). */
export const COLOURINGS = [
  'publishers',
  'original-hand',
  'old-hand',
  'later',
  'printed',
  'uncoloured',
] as const
export type Colouring = (typeof COLOURINGS)[number]
export const COLOURING_OPTIONS = optionsOf(COLOURINGS, {
  publishers: 'Publisher’s colour',
  'original-hand': 'Original hand colour',
  'old-hand': 'Old hand colour',
  later: 'Later colour',
  printed: 'Printed in colour',
  uncoloured: 'Uncoloured',
})

/**
 * Where an original may go (COMPLIANCE.md §1). **No default**: a blank one makes the item
 * routable to no destination — enquiry-only — until the owner's item register sets it.
 */
export const EXPORT_STATUSES = [
  'cleared',
  'domestic-only',
  'permit-pending',
  'not-applicable',
] as const
export type ExportStatus = (typeof EXPORT_STATUSES)[number]
export const EXPORT_STATUS_OPTIONS = optionsOf(EXPORT_STATUSES, {
  cleared: 'Cleared for export',
  'domestic-only': 'Domestic only (stays in Indonesia)',
  'permit-pending': 'Export permit pending',
  'not-applicable': 'Not applicable — held outside Indonesia',
})

/** The rights in the image (COMPLIANCE.md §8): what a reproduction may rest on. */
export const RIGHTS_STATUSES = [
  'public-domain',
  'licensed',
  'rights-pending',
  'restricted',
  'unknown',
] as const
export type RightsStatus = (typeof RIGHTS_STATUSES)[number]
/** The statuses under which printing may be allowed at all. */
export const PRINTABLE_RIGHTS = ['public-domain', 'licensed'] as const satisfies RightsStatus[]
export const RIGHTS_STATUS_OPTIONS = optionsOf(RIGHTS_STATUSES, {
  'public-domain': 'Public domain',
  licensed: 'Licensed',
  'rights-pending': 'Rights pending — being confirmed',
  restricted: 'Restricted — may not be reproduced',
  unknown: 'Unknown',
})

/** How far the record has got (CONTENT-MODEL.md §1 `cataloguing.status`). */
export const CATALOGUING_STATUSES = ['draft', 'catalogued', 'verified'] as const
export type CataloguingStatus = (typeof CATALOGUING_STATUSES)[number]
export const CATALOGUING_STATUS_OPTIONS = optionsOf(CATALOGUING_STATUSES, {
  draft: 'Draft',
  catalogued: 'Catalogued',
  verified: 'Verified',
})

/**
 * The fields an AI may draft (`cataloguing.aiDraft`): each stays listed — and the work
 * unpublishable — until a person has checked it and taken it off the list (CONTENT-MODEL.md §9).
 */
export const AI_DRAFTABLE_FIELDS = [
  'title',
  'originalTitle',
  'publication',
  'date',
  'makers',
  'places',
  'subjects',
  'technique',
  'colour',
  'condition',
  'references',
  'seo',
] as const
export type AiDraftableField = (typeof AI_DRAFTABLE_FIELDS)[number]
export const AI_DRAFTABLE_LABELS: Record<AiDraftableField, string> = {
  title: 'Title',
  originalTitle: 'Original title',
  publication: 'Publication',
  date: 'Date',
  makers: 'Makers',
  places: 'Places',
  subjects: 'Subjects',
  technique: 'Technique',
  colour: 'Colouring',
  condition: 'Condition',
  references: 'References',
  seo: 'SEO',
}
export const AI_DRAFTABLE_OPTIONS = optionsOf(AI_DRAFTABLE_FIELDS, AI_DRAFTABLE_LABELS)
