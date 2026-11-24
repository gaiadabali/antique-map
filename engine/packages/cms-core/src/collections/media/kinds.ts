/**
 * What a `media` record is — an image, a video or a PDF (`@engine/media/storage` `MEDIA_KINDS`) —
 * and the fields that depend on it (CONTENT-MODEL.md §6).
 *
 * - **`kind` is derived from the stored type**, never typed (`./hooks` `deriveFromFile`): the
 *   admin lists and filters by it, and every relation that needs an image takes only images
 *   (`IMAGES_ONLY`, which Payload's own upload validation applies on every write path, as well
 *   as narrowing the admin's picker).
 * - **The editor sees the fields that apply.** An image asks for alt text, its subject, role and
 *   provenance; a video or a PDF for a title and a description instead — for a video the
 *   description is its text alternative, for a PDF the title is its link's name. Until the file
 *   is saved the admin does not know its type, so a new record shows both sets; the save is
 *   validated on the server against the type Payload sniffed, which is when each set is required.
 */
import { MEDIA_KINDS, mediaKindOf, type MediaKind } from '@engine/media/limits'
import type { Field, TextFieldSingleValidation, TextareaFieldValidation, Where } from 'payload'

import { pickLanguage } from '../../i18n'

type Data = Record<string, unknown> | undefined

/**
 * The record's kind, from the type Payload stored; `null` before its file is known. Never from
 * `kind` itself: a new record's form carries the column's default (`image`) before any file.
 */
export function kindOfData(data: Data): MediaKind | null {
  return mediaKindOf(data?.mimeType)
}

/** Shown for an image, and while the type is not yet known (a new record). */
export const showForImage = (data: Data): boolean => {
  const kind = kindOfData(data)
  return kind === null || kind === 'image'
}

/** Shown for a video or a PDF, and while the type is not yet known (a new record). */
export const showForFile = (data: Data): boolean => kindOfData(data) !== 'image'

/** Adds the image-only condition to a field, keeping its own admin options. */
export function forImagesOnly<F extends Field>(field: F): F {
  return { ...field, admin: { ...field.admin, condition: showForImage } } as F
}

/** A relation that needs an image takes images only — the admin's picker and every save. */
export const IMAGES_ONLY: Where = { kind: { equals: 'image' } }
export const VIDEOS_ONLY: Where = { kind: { equals: 'video' } }
export const PDFS_ONLY: Where = { kind: { equals: 'pdf' } }

export const KIND_LABELS: Readonly<Record<MediaKind, { en: string; id: string }>> = {
  image: { en: 'Image', id: 'Gambar' },
  video: { en: 'Video', id: 'Video' },
  pdf: { en: 'PDF', id: 'PDF' },
}

const blank = (value: unknown) => typeof value !== 'string' || value.trim() === ''

export const TITLE_MAX_LENGTH = 160
export const DESCRIPTION_MAX_LENGTH = 1000

/** A video's or a PDF's title: required for both, once the type is known. */
export const validateFileTitle: TextFieldSingleValidation = (value, { data, req }) => {
  const kind = kindOfData(data as Data)
  if ((kind === 'video' || kind === 'pdf') && blank(value)) {
    return pickLanguage(
      req,
      kind === 'pdf'
        ? {
            en: 'Give the PDF a title: it is the name of the link that opens it.',
            id: 'Beri PDF ini judul: judul itu menjadi nama tautan yang membukanya.',
          }
        : { en: 'Give the video a title.', id: 'Beri video ini judul.' },
    )
  }
  if (typeof value === 'string' && value.length > TITLE_MAX_LENGTH) {
    return pickLanguage(req, {
      en: `Keep the title to ${TITLE_MAX_LENGTH} characters.`,
      id: `Judul paling banyak ${TITLE_MAX_LENGTH} karakter.`,
    })
  }
  return true
}

/** A video's description: its text alternative, for someone who cannot see or hear it. */
export const validateFileDescription: TextareaFieldValidation = (value, { data, req }) => {
  if (kindOfData(data as Data) === 'video' && blank(value)) {
    return pickLanguage(req, {
      en: 'Describe the video in words: it is what a person who cannot watch it reads instead.',
      id: 'Jelaskan video ini dengan kata-kata: itulah yang dibaca orang yang tidak dapat menontonnya.',
    })
  }
  if (typeof value === 'string' && value.length > DESCRIPTION_MAX_LENGTH) {
    return pickLanguage(req, {
      en: `Keep the description to ${DESCRIPTION_MAX_LENGTH} characters.`,
      id: `Deskripsi paling banyak ${DESCRIPTION_MAX_LENGTH} karakter.`,
    })
  }
  return true
}

/** The kind, in the sidebar: derived from the file, read-only, filterable in the list. */
export const KIND_FIELD: Field = {
  name: 'kind',
  type: 'select',
  label: { en: 'Type', id: 'Jenis' },
  defaultValue: 'image',
  index: true,
  options: MEDIA_KINDS.map((value) => ({ value, label: KIND_LABELS[value] })),
  admin: {
    position: 'sidebar',
    readOnly: true,
    // Shown once the file is saved: before, the column's default would call any new file an image.
    condition: (data) => kindOfData(data as Data) !== null,
    description: {
      en: 'Set from the file when it is saved: an image, a video or a PDF.',
      id: 'Ditentukan dari berkas saat disimpan: gambar, video, atau PDF.',
    },
  },
}

/** A video's or a PDF's own words, in place of an image's alt text. */
export const FILE_FIELDS: Field[] = [
  {
    name: 'title',
    type: 'text',
    label: { en: 'Title (video or PDF)', id: 'Judul (video atau PDF)' },
    localized: true,
    maxLength: TITLE_MAX_LENGTH,
    validate: validateFileTitle,
    admin: {
      condition: showForFile,
      description: {
        en: 'For a video or a PDF only. A PDF’s title names the link that opens it, e.g. "Wholesale price list 2027".',
        id: 'Hanya untuk video atau PDF. Judul PDF menjadi nama tautan yang membukanya, mis. "Daftar harga grosir 2027".',
      },
    },
  },
  {
    name: 'description',
    type: 'textarea',
    label: { en: 'Description (video or PDF)', id: 'Deskripsi (video atau PDF)' },
    localized: true,
    maxLength: DESCRIPTION_MAX_LENGTH,
    validate: validateFileDescription,
    admin: {
      condition: showForFile,
      description: {
        en: 'For a video: what happens in it, for someone who cannot watch it (required). For a PDF: what is inside (optional).',
        id: 'Untuk video: apa yang terjadi di dalamnya, bagi yang tidak dapat menontonnya (wajib). Untuk PDF: apa isinya (opsional).',
      },
    },
  },
]
