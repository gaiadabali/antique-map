/**
 * Which `media` files the public may fetch whole, as they were uploaded (CONTENT-MODEL.md §6;
 * SECURITY.md §uploads): a **video or a PDF that a published shop page places** — the page's
 * Video or PDF link block (`../pages/blocks/media`), or a published article's PDF (TASKS.md 28.2) —
 * and nothing else. Read by the one public
 * route that serves them (`@engine/http/media`), from its `payload-*` port.
 *
 * - **Never an image.** An image's upload is the full-resolution file, which may carry GPS and
 *   camera metadata; the public sees its derivatives only (`./access`, `@engine/media/storage`
 *   `PUBLIC_MEDIA_PREFIXES`). A record whose kind or stored type is not a video or a PDF is no
 *   file here, whatever places it.
 * - **Published only.** The placing page is found as the public reads pages — `overrideAccess:
 *   false`, no user, `_status: 'published'` — so a draft, an unpublished page or a gallery page
 *   never opens a file; a file stops being served when its page is unpublished or the block is
 *   removed (up to the route's short cache).
 * - **Its stored type, from the allowlist.** The route answers with the record's `mimeType`, one
 *   of `MEDIA_VIDEO_MIME_TYPES` or `MEDIA_DOCUMENT_MIME_TYPES` — Payload sniffed it at upload and
 *   `refuseMislabelledUpload` held it to its bytes — never a type read back from storage.
 */
import { shopOnly } from '@engine/cms-shop/site'
import {
  mediaKindOf,
  mediaStorageTarget,
  readUploadRange,
  UPLOADS_PREFIX,
  type ByteRange,
  type UploadRange,
} from '@engine/media/storage'
import type { Payload } from 'payload'

export type PublicMediaFile = {
  readonly kind: 'video' | 'pdf'
  readonly mimeType: string
  readonly filename: string
  /** The file's size in bytes, as Payload stored it. */
  readonly size: number
  /** A byte range of the file, or `null` when storage no longer holds it. */
  read(range: ByteRange): Promise<UploadRange | null>
}

type Doc = Record<string, unknown>
const str = (value: unknown) => (typeof value === 'string' ? value : '')

/**
 * Whether a published shop page places the record in a Video or a PDF link block. The shop's pages
 * are `shopOnly`'s: `site: shop` in today's one CMS, every page in the shop's own (TASKS.md 23.4),
 * whose records carry no `site` — so the shop app's media route reads this rule too.
 */
async function placedOnAPublishedPage(payload: Payload, id: number): Promise<boolean> {
  const shopPages = shopOnly(payload, 'pages')
  const { totalDocs } = await payload.count({
    collection: 'pages',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        ...(shopPages ? [shopPages] : []),
        { or: [{ 'layout.video': { equals: id } }, { 'layout.document': { equals: id } }] },
      ],
    },
  })
  if (totalDocs > 0) return true
  return placedByAPublishedArticle(payload, id)
}

/**
 * Whether a published shop article (TASKS.md 28.2) is this PDF — read as the public reads articles
 * (`overrideAccess: false`, `_status: 'published'`). A CMS without articles answers no.
 */
async function placedByAPublishedArticle(payload: Payload, id: number): Promise<boolean> {
  if (!payload.collections?.['articles' as never]) return false
  const { totalDocs } = await payload.count({
    collection: 'articles' as never,
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { pdf: { equals: id } }] },
  })
  return totalDocs > 0
}

/** Where this process stores uploads: the media bucket, or the collection's folder on disk. */
function uploadSource(payload: Payload) {
  const target = mediaStorageTarget(process.env)
  if (target) return { target }
  const upload = payload.collections.media?.config.upload
  const dir = typeof upload === 'object' && upload.staticDir ? upload.staticDir : 'media'
  return { dir }
}

/** The video or PDF `id` names, when a published shop page places it; else `null`. */
export async function publicMediaFile(
  payload: Payload,
  id: number,
): Promise<PublicMediaFile | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null
  const doc = (await payload
    .findByID({
      collection: 'media',
      id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      select: { kind: true, mimeType: true, filename: true, filesize: true, prefix: true },
    })
    .catch(() => null)) as Doc | null
  if (!doc) return null
  const kind = mediaKindOf(doc.mimeType)
  const filename = str(doc.filename)
  const size = Number(doc.filesize)
  if ((kind !== 'video' && kind !== 'pdf') || doc.kind !== kind) return null
  if (filename === '' || !Number.isSafeInteger(size) || size < 1) return null
  if (!(await placedOnAPublishedPage(payload, id))) return null
  const source = uploadSource(payload)
  const prefix = str(doc.prefix) || UPLOADS_PREFIX
  return {
    kind,
    mimeType: str(doc.mimeType).split(';')[0]!.trim().toLowerCase(),
    filename,
    size,
    read: (range) => readUploadRange(source, prefix, filename, range),
  }
}
