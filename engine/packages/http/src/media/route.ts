/**
 * `GET /api/x/media/{id}` — `@engine/http/media` (CONTENT-MODEL.md §6, SECURITY.md §uploads): a
 * video or a PDF that a published shop page places, served from the site's own origin, as it was
 * uploaded. The rule of which file is public is `@engine/cms`'s (`collections/media/public-file`),
 * loaded with `import()` after the path is read (`./payload-media`), so `next build`, route parity
 * and this route's tests never evaluate the Payload config. Every miss — no such record, an image,
 * a draft or unpublished page, a file storage no longer holds — is the same plain 404.
 *
 * - **The type is the record's**, from the allowlist (`video/mp4`, `video/webm`,
 *   `application/pdf`), with `nosniff`: the browser never guesses another.
 * - **A PDF opens inline, sandboxed**: `Content-Disposition: inline` with a safe file name, and
 *   `Content-Security-Policy: sandbox`, so a script inside a PDF runs in an opaque origin — never
 *   with the site's cookies or storage, even where a browser renders PDFs as a page of its own.
 * - **A video streams in ranges** (`./range`): a player asks for `bytes=…` and seeks without
 *   downloading the whole file; the body is streamed from storage, never buffered here.
 * - **Short public cache** (5 min): an unpublished page stops serving its file within it.
 *
 * Nothing here logs the file name: a failure logs its error's name alone.
 */
import { atRequestTime, notFound, plain } from '../shared/respond'
import type { PublicMediaFile } from './payload-media'
import { rangeOf } from './range'

/** Loads the Payload-backed port: `./payload-media` in the process, a fake in a test. */
export type MediaFileLoader = () => Promise<{
  publicMediaFileFor: (id: number) => Promise<PublicMediaFile | null>
}>

const loadSource: MediaFileLoader = () => import('./payload-media')

type Context = { readonly params: Promise<{ readonly id: string }> }

const ID = /^[1-9]\d{0,9}$/
const UNAVAILABLE = 'The file is unavailable.'
export const MEDIA_CACHE_CONTROL = 'public, max-age=300'

/** A file name a header may carry: letters, digits, dot, dash and underscore. */
function safeName(filename: string): string {
  const name = filename.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '')
  return name === '' ? 'document.pdf' : name.slice(0, 120)
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'error'
}

/** The headers every answer for `file` carries. */
export function fileHeaders(file: PublicMediaFile): Record<string, string> {
  return {
    'Content-Type': file.mimeType,
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
    'Cache-Control': MEDIA_CACHE_CONTROL,
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...(file.kind === 'pdf'
      ? {
          'Content-Disposition': `inline; filename="${safeName(file.filename)}"`,
          'Content-Security-Policy': 'sandbox',
        }
      : {}),
  }
}

export function mediaRoute(
  load: MediaFileLoader = loadSource,
): (request: Request, context: Context) => Promise<Response> {
  return async function GET(request: Request, { params }: Context): Promise<Response> {
    atRequestTime(request)
    const { id } = await params
    if (!ID.test(id)) return notFound()

    let file: PublicMediaFile | null
    try {
      const { publicMediaFileFor } = await load()
      file = await publicMediaFileFor(Number(id))
    } catch (error) {
      console.error(`[media] the record lookup failed: ${errorName(error)}`)
      return plain(500, UNAVAILABLE)
    }
    if (file === null) return notFound()

    const headers = fileHeaders(file)
    const range = rangeOf(request.headers.get('range'), file.size)
    if (range.type === 'unsatisfiable') {
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${file.size}` },
      })
    }
    const span =
      range.type === 'partial'
        ? { start: range.start, end: range.end }
        : { start: 0, end: file.size - 1 }

    let read: Awaited<ReturnType<PublicMediaFile['read']>>
    try {
      read = await file.read(span)
    } catch (error) {
      console.error(`[media] the storage read failed: ${errorName(error)}`)
      return plain(502, UNAVAILABLE)
    }
    if (read === null) return notFound()
    return new Response(read.body, {
      status: range.type === 'partial' ? 206 : 200,
      headers: {
        ...headers,
        'Content-Length': String(read.length),
        ...(range.type === 'partial'
          ? { 'Content-Range': `bytes ${span.start}-${span.end}/${file.size}` }
          : {}),
      },
    })
  }
}

export const GET = mediaRoute()
