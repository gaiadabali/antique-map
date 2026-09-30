/**
 * The body `POST /api/x/revalidate` takes (C13 `REVALIDATE_REQUEST`): JSON, at most `maxBodyBytes`
 * bytes, an object whose `tags` is a list of one to `maxTags` tags, each one `@engine/cache`'s
 * builders make (`parseCacheTag`). Anything else is a 400 and expires nothing: the whole body is
 * judged before any tag is expired. A key besides `tags` is never read — a body cannot name a
 * profile, since each tag expires at its kind's (`tagExpiry`), so one that tries is not refused for
 * it, only ignored.
 */
import { parseCacheTag, type CacheTag } from '@engine/cache'

import { REVALIDATE_REQUEST } from '../manifest'

export type BodyVerdict =
  | { readonly ok: true; readonly tags: readonly CacheTag[] }
  | { readonly ok: false; readonly reason: string }

const refuse = (reason: string): BodyVerdict => ({ ok: false, reason })

/**
 * Reads at most `maxBytes` bytes of `request`'s body: its text, or `null` once it runs past them —
 * a `Content-Length` that says so is refused before a byte is read, and a body that lies about it
 * (or sends none) is cut off as it streams, never buffered whole.
 */
export async function readBoundedText(
  request: Request,
  maxBytes: number = REVALIDATE_REQUEST.maxBodyBytes,
): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return null
  if (request.body === null) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.byteLength
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** The verdict on a body's text: its checked tags, or why it is refused. */
export function judgeBody(text: string | null): BodyVerdict {
  if (text === null)
    return refuse(`the body is not UTF-8 within ${REVALIDATE_REQUEST.maxBodyBytes} bytes`)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return refuse('the body is not JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return refuse('the body is not an object')
  }
  const tags: unknown = (parsed as { tags?: unknown }).tags
  if (!Array.isArray(tags)) return refuse('`tags` is not a list')
  if (tags.length === 0) return refuse('`tags` is empty')
  if (tags.length > REVALIDATE_REQUEST.maxTags) {
    return refuse(`\`tags\` holds more than ${REVALIDATE_REQUEST.maxTags}`)
  }
  const checked: CacheTag[] = []
  for (const [index, value] of tags.entries()) {
    const tag = parseCacheTag(value)
    // The position, never the value: a refusal quotes nothing the caller sent.
    if (tag === null) return refuse(`tags[${index}] is not a tag @engine/cache makes`)
    checked.push(tag)
  }
  return { ok: true, tags: checked }
}
