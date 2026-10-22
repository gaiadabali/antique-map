/**
 * A work's images, judged by what each `media` record says it is (TASKS.md 8.2.a, 8.2.c;
 * CONTENT-MODEL.md §1, §9; C9 `roleAllowed()`, `provenanceAllowed()`, `primaryImageIndex()`).
 * The row orders and captions an image; its role and provenance are the media's own, set once at
 * intake — so these rules read them from the record, which the hook that calls them fetched.
 *
 * - **Every save**: an image's role is one a work takes, and its provenance one that role allows
 *   on a work — a photograph, or a labelled composite or render for an `in-room` view alone;
 *   nothing on a work is AI-generated.
 * - **To publish** (`./work-publish`): a primary image — the first photographed recto — with alt
 *   text; no image whose master waits on a re-take; no image whose description an AI drafted and
 *   nobody has checked.
 *
 * Pure.
 */
import {
  MEDIA_PROVENANCES,
  MEDIA_ROLES,
  primaryImageIndex,
  provenanceAllowed,
  roleAllowed,
  type IntakeVerdict,
  type MediaProvenance,
  type MediaRole,
} from '@engine/media/contract'

/** What a work's guard reads of one image's media record. */
export type ImageFacts = {
  /** The media record's id; `null` when the row names none, or one that does not exist. */
  readonly id: string | null
  readonly role: string | null
  readonly provenance: string | null
  /** Its alt text in the default locale — the stored description, never the rendered label. */
  readonly alt: string | null
  /** `media.altSource` in the default locale: `ai-draft` stays flagged until checked. */
  readonly altSource: string | null
  /** Its master's intake verdict, if it has a master. */
  readonly masterVerdict: IntakeVerdict | null
}

const isRole = (value: string | null): value is MediaRole =>
  value !== null && (MEDIA_ROLES as readonly string[]).includes(value)
const isProvenance = (value: string | null): value is MediaProvenance =>
  value !== null && (MEDIA_PROVENANCES as readonly string[]).includes(value)

/**
 * One problem: the full `message`, shown on the field, and a `summary` — a few words and no
 * comma — which the admin's error toast lists (it splits its list at commas), so a refusal reads
 * in plain words there too.
 */
export type Issue = { readonly message: string; readonly summary: string }

/** What is wrong with each image on any save — `null` for an image that is fine. */
export function imageRowErrors(images: readonly ImageFacts[]): (Issue | null)[] {
  return images.map((image) => {
    if (image.id === null) return null
    if (!isRole(image.role) || !isProvenance(image.provenance)) {
      return {
        message: 'This image has no role or provenance on record: set both on the image first.',
        summary: 'has no role or provenance on record',
      }
    }
    if (!roleAllowed('work', image.role)) {
      return {
        message: `An image of role "${image.role}" belongs to a product or a page, not a work: a work shows its recto, verso, details, light studies, frame, a room view or a scale view.`,
        summary: `is a "${image.role}" image — a product’s or a page’s and not a work’s`,
      }
    }
    if (!provenanceAllowed('work', image.role, image.provenance)) {
      return image.provenance === 'ai-generated'
        ? {
            message: 'Nothing on a work is AI-generated: a work shows the real object.',
            summary: 'is AI-generated — nothing on a work may be',
          }
        : {
            message:
              'Only a view in a room may be a mockup or a render on a work: every other image shows the object itself, as photographed.',
            summary: 'is a mockup or a render — only a room view may be one',
          }
    }
    return null
  })
}

/** The rows' images as C9 reads them: those whose role and provenance are on record. */
function roled(images: readonly ImageFacts[]) {
  return images.flatMap((image, index) =>
    isRole(image.role) && isProvenance(image.provenance)
      ? [{ role: image.role, provenance: image.provenance, index }]
      : [],
  )
}

/** The row index of the work's primary image — its first photographed recto — or -1. */
export function primaryImageRow(images: readonly ImageFacts[]): number {
  const known = roled(images)
  const at = primaryImageIndex('work', known)
  return at === -1 ? -1 : known[at]!.index
}

export type ImageProblem = Issue & { readonly row: number | null }

/** What publishing demands of the images, every one at once. */
export function imagePublishProblems(images: readonly ImageFacts[]): ImageProblem[] {
  const problems: ImageProblem[] = []
  const primary = primaryImageRow(images)
  if (primary === -1) {
    problems.push(
      images.length === 0
        ? {
            row: null,
            message:
              'Add a photograph of the whole front (the recto): it is the image the page leads with.',
            summary: 'Images — add a photograph of the whole front (the recto)',
          }
        : {
            row: null,
            message:
              'None of the images is a photograph of the whole front (the recto): add one — a detail, a verso or a mockup cannot lead the page.',
            summary: 'Images — none is a photograph of the whole front (the recto)',
          },
    )
  } else if (!images[primary]!.alt?.trim()) {
    problems.push({
      row: primary,
      message:
        'Describe the recto in English (its alt text, on the image): it is what a person who cannot see the page reads instead.',
      summary: `Image ${primary + 1} — describe the recto in its alt text`,
    })
  }
  images.forEach((image, row) => {
    if (image.masterVerdict === 'fix-owner') {
      problems.push({
        row,
        message:
          'This image’s capture waits on a re-take (intake verdict "fix-owner"): replace or remove it before publishing.',
        summary: `Image ${row + 1} — its capture waits on a re-take`,
      })
    }
    if (image.altSource === 'ai-draft') {
      problems.push({
        row,
        message:
          'An AI drafted this image’s description: check it, then mark it as written by a cataloguer.',
        summary: `Image ${row + 1} — an AI drafted its description and nobody has checked it`,
      })
    }
  })
  return problems
}
