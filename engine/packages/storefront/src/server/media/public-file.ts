/**
 * Which URL the public is given for a `media` video or PDF (CONTENT-MODEL.md §6): the one route
 * that serves it, `/api/x/media/{id}` on the site's own origin (`@engine/http/media`) — which
 * answers only while a published page places the file, so a loader that projects a draft (the
 * preview) links a URL the public cannot open, never a leak. An image is never a file here: its
 * upload is staff-only, and the public sees its derivatives (`./public-image`).
 */
import { mediaKindOf } from '@engine/media/limits'

import type { PublicFile } from '../shop/pages/blocks'

/** What a loader selects on a `media` relation for a video or a PDF, beside the image's fields. */
export const PUBLIC_FILE_SELECT = {
  kind: true,
  mimeType: true,
  filesize: true,
  title: true,
  description: true,
} as const

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

/** A populated `media` relation of `kind` as the page links it, or `null` when it is not one. */
export function publicFileOf(media: unknown, kind: 'video' | 'pdf'): PublicFile | null {
  if (typeof media !== 'object' || media === null) return null
  const record = media as Record<string, unknown>
  const id = record.id
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) return null
  if (record.kind !== kind || mediaKindOf(record.mimeType) !== kind) return null
  const title = text(record.title)
  if (title === null) return null
  const size = Number(record.filesize)
  return {
    url: `/api/x/media/${id}`,
    mimeType: String(record.mimeType).split(';')[0]!.trim().toLowerCase(),
    title,
    description: text(record.description),
    size: Number.isSafeInteger(size) && size > 0 ? size : null,
  }
}
