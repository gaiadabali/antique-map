/**
 * The leads route's body reader (5.3.c): the cap holds before a byte is buffered past it. A
 * declared `Content-Length` over the cap is refused unread; a body that declares nothing (chunked)
 * or lies is read as a stream and abandoned the moment it passes the cap — the route never holds
 * more than the cap in memory, whatever the client sends.
 */

/** The body's text, or `'too-large'` once it passes `max` bytes (declared or actual). */
export async function readCappedText(request: Request, max: number): Promise<string | 'too-large'> {
  const declared = request.headers.get('content-length')
  if (declared !== null && (!/^\d+$/.test(declared.trim()) || Number(declared) > max)) {
    return 'too-large'
  }
  if (request.body === null) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel().catch(() => undefined)
      return 'too-large'
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}
