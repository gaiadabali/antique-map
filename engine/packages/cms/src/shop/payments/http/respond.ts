/**
 * The payment routes' plain answers and bounded body read. The same shape `@engine/http`'s
 * `shared/respond` gives every engine route (no cache, no sniffing), kept here because cms never
 * imports `@engine/http` (C13); the routes move there whole when the PLT lane mounts them.
 */

export type Env = Readonly<Record<string, string | undefined>>

/** A plain-text answer that no cache keeps and no browser sniffs. */
export function plain(
  status: number,
  text: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

/**
 * The body as text, or null once it passes `limit` bytes — read in chunks, so an oversized or
 * endless body is cut off rather than buffered whole.
 */
export async function readBounded(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > limit) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}
