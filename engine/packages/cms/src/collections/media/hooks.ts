/**
 * The `media` collection's rules on every write path — the admin, REST, the Local API, a seed, the
 * migration (CONTENT-MODEL.md §9: guards run on every write path; TASKS.md 8.3.a, 8.3.d, 8.3.f).
 */
import { createReadStream } from 'node:fs'

import { MEDIA_UPLOAD_MAX_BYTES, formatBytes, sha256HexOf } from '@engine/media/storage'
import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
} from 'payload'

import { pickLanguage } from '../products/money'
import { DERIVED_FIELDS } from './fields'

const SLUG = 'media'
type Data = Record<string, unknown>
type UploadedFile = NonNullable<PayloadRequest['file']>

/**
 * A file over the limit is refused before Payload reads its type or stores it — 413, in words. The
 * limit holds for the Local API and a seed too, not only behind the CDN (8.3.d).
 */
export const refuseOversizedUpload: CollectionBeforeOperationHook = ({ operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return
  const size = req.file?.size
  if (typeof size === 'number' && size > MEDIA_UPLOAD_MAX_BYTES) {
    throw new APIError(
      `This file is ${formatBytes(size)}; an image may be at most ${formatBytes(MEDIA_UPLOAD_MAX_BYTES)}. Export it at a lower quality or size — the full-resolution capture belongs in masters.`,
      413,
    )
  }
}

/**
 * An image is made in the default locale first, so every page has its alt text: a record created
 * in another language alone would leave the default site's image with none (fallback reads the
 * default). Other languages are added by updating it.
 */
export const altInDefaultLocaleFirst: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const defaultLocale = req.payload.config.localization
    ? req.payload.config.localization.defaultLocale
    : undefined
  if (!defaultLocale || !req.locale || req.locale === defaultLocale) return data
  const alt = (data as Data | undefined)?.alt
  const inDefault =
    req.locale === 'all' && alt && typeof alt === 'object'
      ? (alt as Record<string, unknown>)[defaultLocale]
      : undefined
  if (typeof inDefault === 'string' && inDefault.trim().length > 0) return data
  throw new ValidationError({
    collection: SLUG,
    errors: [
      {
        path: 'alt',
        message: pickLanguage(req, {
          en: `Create the image with its alt text in the default language (${defaultLocale}) first, then add other languages.`,
          id: `Buat gambar ini dengan teks alternatifnya dalam bahasa default (${defaultLocale}) terlebih dahulu, lalu tambahkan bahasa lain.`,
        }),
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
 * The fields the pipeline owns: a request — the admin, REST — never sets them; it keeps the stored
 * values, or none on a create. A new file gives a new content address (C9 `AssetId`: the first 32
 * hex digits of its SHA-256) and resets the derivatives and tiles, which 15.1 and 15.2 rebuild.
 * Only the Local API — the jobs — writes the status fields.
 */
export const deriveFromFile: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const next: Data = { ...data }
  if (req.payloadAPI !== 'local') {
    for (const field of DERIVED_FIELDS) {
      if (originalDoc && field in originalDoc) next[field] = (originalDoc as Data)[field]
      else delete next[field]
    }
  }
  if (req.file) {
    next.assetId = (await sha256OfUpload(req.file)).slice(0, 32)
    next.derivatives = { status: 'pending', version: null, blurDataUri: null }
    next.iiif = { status: 'none' }
  }
  return next
}

type MasterFacts = { kind?: unknown; role?: unknown; provenance?: unknown }

/**
 * An image's role and provenance are its master's, set once at intake (CONTENT-MODEL.md §6):
 * linked to a capture, a media record may not say it is something else, or made another way.
 * The master is read with `overrideAccess` — the field is staff-only, the check is not.
 */
export const matchItsMaster: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const merged = { ...(originalDoc as Data | undefined), ...(data as Data | undefined) }
  const ref = merged.master
  const id = typeof ref === 'object' && ref !== null ? (ref as { id?: unknown }).id : ref
  if (id === null || id === undefined || id === '') return data
  const master = (await req.payload
    .findByID({ collection: 'masters', id: id as number, depth: 0, overrideAccess: true, req })
    .catch(() => null)) as MasterFacts | null
  const errors: Array<{ path: string; message: string }> = []
  if (!master) {
    errors.push({
      path: 'master',
      message: pickLanguage(req, { en: 'That master does not exist.', id: 'Master tersebut tidak ada.' }),
    })
  } else {
    if (master.kind !== 'capture') {
      errors.push({
        path: 'master',
        message: pickLanguage(req, {
          en: 'An image is processed from a capture, not a print file.',
          id: 'Gambar diproses dari sebuah capture, bukan berkas cetak.',
        }),
      })
    }
    for (const field of ['role', 'provenance'] as const) {
      if (master[field] && merged[field] !== master[field]) {
        errors.push({
          path: field,
          message: pickLanguage(req, {
            en: `Its master says ${field} "${String(master[field])}": an image's ${field} is its master's.`,
            id: `Master-nya menyatakan ${field} "${String(master[field])}": ${field} gambar mengikuti masternya.`,
          }),
        })
      }
    }
  }
  if (errors.length > 0) throw new ValidationError({ collection: SLUG, errors })
  return data
}
