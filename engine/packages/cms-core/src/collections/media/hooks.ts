/**
 * The `media` collection's rules on every write path — the admin, REST, the Local API, a seed, the
 * migration (CONTENT-MODEL.md §9: guards run on every write path; TASKS.md 8.3.a, 8.3.d, 8.3.f).
 */
import { createReadStream } from 'node:fs'
import { open } from 'node:fs/promises'

import {
  bytesMatchType,
  formatBytes,
  MEDIA_PDF_MAX_BYTES,
  MEDIA_UPLOAD_MAX_BYTES,
  mediaKindOf,
  sha256HexOf,
  type MediaKind,
} from '@engine/media/storage'
import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
} from 'payload'

import { pickLanguage, type Bilingual } from '../../i18n'
import { DERIVED_FIELDS } from './fields'

const SLUG = 'media'
type Data = Record<string, unknown>
type UploadedFile = NonNullable<PayloadRequest['file']>

/** "an image", "a video", "a PDF" — and the same in Indonesian. */
const A_KIND: Readonly<Record<MediaKind, Bilingual>> = {
  image: { en: 'an image', id: 'gambar' },
  video: { en: 'a video', id: 'video' },
  pdf: { en: 'a PDF', id: 'PDF' },
}

/**
 * A file over the limit is refused before Payload reads its type or stores it — 413, in words. The
 * limit holds for the Local API and a seed too, not only behind the CDN (8.3.d). A PDF has its
 * own, lower one (`MEDIA_PDF_MAX_BYTES`), judged by its declared type — which
 * `refuseMislabelledUpload` holds to its bytes.
 */
export const refuseOversizedUpload: CollectionBeforeOperationHook = ({ operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return
  const size = req.file?.size
  if (typeof size !== 'number') return
  if (size > MEDIA_UPLOAD_MAX_BYTES) {
    throw new APIError(
      pickLanguage(req, {
        en: `This file is ${formatBytes(size)}; a file may be at most ${formatBytes(MEDIA_UPLOAD_MAX_BYTES)}. Export it at a lower quality or size — the full-resolution capture belongs in masters.`,
        id: `Berkas ini ${formatBytes(size)}; sebuah berkas paling besar ${formatBytes(MEDIA_UPLOAD_MAX_BYTES)}. Ekspor dengan kualitas atau ukuran lebih rendah — tangkapan resolusi penuh disimpan di masters.`,
      }),
      413,
    )
  }
  if (mediaKindOf(req.file?.mimetype) === 'pdf' && size > MEDIA_PDF_MAX_BYTES) {
    throw new APIError(
      pickLanguage(req, {
        en: `This PDF is ${formatBytes(size)}; a PDF may be at most ${formatBytes(MEDIA_PDF_MAX_BYTES)}, so that it opens on a phone. Save it again with smaller pictures and upload that.`,
        id: `PDF ini ${formatBytes(size)}; sebuah PDF paling besar ${formatBytes(MEDIA_PDF_MAX_BYTES)}, agar bisa dibuka di ponsel. Simpan ulang dengan gambar yang lebih kecil, lalu unggah hasilnya.`,
      }),
      413,
    )
  }
}

async function headOf(file: UploadedFile): Promise<Uint8Array> {
  if (file.data && file.data.length > 0) return new Uint8Array(file.data.subarray(0, 16))
  if (!file.tempFilePath) return new Uint8Array()
  const handle = await open(file.tempFilePath, 'r')
  try {
    const head = new Uint8Array(16)
    const { bytesRead } = await handle.read(head, 0, 16, 0)
    return head.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

/**
 * A video or a PDF must be what it says it is. Payload sniffs every file and refuses a type not
 * allowed, but stores the *declared* type of anything that is not an image: a PDF sent as
 * `video/mp4` would be served as a video, and escape the PDF limit (`bytesMatchType`).
 */
export const refuseMislabelledUpload: CollectionBeforeOperationHook = async ({
  operation,
  req,
}) => {
  if ((operation !== 'create' && operation !== 'update') || !req.file) return
  const kind = mediaKindOf(req.file.mimetype)
  if (kind !== 'video' && kind !== 'pdf') return
  if (bytesMatchType(await headOf(req.file), req.file.mimetype)) return
  throw new APIError(
    pickLanguage(req, {
      en: `This file is not ${A_KIND[kind].en}, as its name says. Export it again as an MP4 or WebM video, or as a PDF.`,
      id: `Berkas ini bukan ${A_KIND[kind].id} seperti namanya. Ekspor ulang sebagai video MP4 atau WebM, atau sebagai PDF.`,
    }),
    400,
  )
}

/**
 * A record is made in the default locale first, so every page has its words: a record created in
 * another language alone would leave the default site's image with no alt text, or its video or
 * PDF with no title (fallback reads the default). Other languages are added by updating it.
 */
export const altInDefaultLocaleFirst: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const defaultLocale = req.payload.config.localization
    ? req.payload.config.localization.defaultLocale
    : undefined
  if (!defaultLocale || !req.locale || req.locale === defaultLocale) return data
  const kind = mediaKindOf((data as Data | undefined)?.mimeType) ?? 'image'
  const path = kind === 'image' ? 'alt' : 'title'
  const words = (data as Data | undefined)?.[path]
  const inDefault =
    req.locale === 'all' && words && typeof words === 'object'
      ? (words as Record<string, unknown>)[defaultLocale]
      : undefined
  if (typeof inDefault === 'string' && inDefault.trim().length > 0) return data
  throw new ValidationError({
    collection: SLUG,
    errors: [
      {
        path,
        message: pickLanguage(
          req,
          kind === 'image'
            ? {
                en: `Create the image with its alt text in the default language (${defaultLocale}) first, then add other languages.`,
                id: `Buat gambar ini dengan teks alternatifnya dalam bahasa default (${defaultLocale}) terlebih dahulu, lalu tambahkan bahasa lain.`,
              }
            : {
                en: `Create ${A_KIND[kind].en} with its title in the default language (${defaultLocale}) first, then add other languages.`,
                id: `Buat ${A_KIND[kind].id} ini dengan judulnya dalam bahasa default (${defaultLocale}) terlebih dahulu, lalu tambahkan bahasa lain.`,
              },
        ),
      },
    ],
  })
}

async function sha256OfUpload(file: UploadedFile): Promise<string> {
  if (file.data && file.data.length > 0) return sha256HexOf([file.data])
  if (file.tempFilePath) return sha256HexOf(createReadStream(file.tempFilePath))
  throw new APIError('The uploaded file could not be read.', 400)
}

/**
 * What the file decides, never a request: the record's `kind`, from the type Payload stored, and
 * the fields the pipeline owns. A request — the admin, REST — never sets the latter; it keeps the
 * stored values, or none on a create. A new image gives a new content address (C9 `AssetId`: the
 * first 32 hex digits of its SHA-256) and resets the derivatives and tiles, which 15.1 and 15.2
 * rebuild; a video or a PDF has none, and no pipeline. Only the Local API — the jobs — writes the
 * status fields. A replacement file is the same kind as the one it replaces: an image a product
 * shows never becomes a PDF.
 */
export const deriveFromFile: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const next: Data = { ...data }
  const stored = originalDoc as Data | undefined
  if (req.payloadAPI !== 'local') {
    for (const field of DERIVED_FIELDS) {
      if (stored && field in stored) next[field] = stored[field]
      else delete next[field]
    }
  }
  const before = mediaKindOf(stored?.mimeType) ?? (stored?.kind as MediaKind | undefined)
  const kind: MediaKind = mediaKindOf(next.mimeType) ?? before ?? 'image'
  if (before && kind !== before) {
    throw new ValidationError({
      collection: SLUG,
      errors: [
        {
          path: 'file',
          message: pickLanguage(req, {
            en: `This record is ${A_KIND[before].en}: replace its file with ${A_KIND[before].en}, or upload ${A_KIND[kind].en} as a new record.`,
            id: `Rekaman ini berisi ${A_KIND[before].id}: ganti berkasnya dengan ${A_KIND[before].id} juga, atau unggah ${A_KIND[kind].id} sebagai rekaman baru.`,
          }),
        },
      ],
    })
  }
  next.kind = kind
  if (req.file && kind === 'image') {
    next.assetId = (await sha256OfUpload(req.file)).slice(0, 32)
    next.derivatives = { status: 'pending', version: null, blurDataUri: null }
    next.iiif = { status: 'none' }
  } else if (kind !== 'image') {
    next.assetId = null
    next.derivatives = { status: null, version: null, blurDataUri: null }
    next.iiif = { status: 'none' }
  }
  return next
}
