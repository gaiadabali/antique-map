/**
 * `/api/x/geocode` — the engine route the checkout's pin picker posts to (TASKS.md 6.3.a). This
 * file only hands the handler (`server/shop/checkout/geocode`) the request's pieces; the body is
 * read once, as text, so a bad payload is refused without ever throwing.
 */
import { clientAddress } from '../../../../security/rate-limit'
import { readCappedText } from '../../../../server/capped-body'
import { geocode } from '../../../../server/shop/checkout/geocode'

const MAX_BODY_BYTES = 4096

export async function POST(request: Request): Promise<Response> {
  // Capped while read (a chunked body has no Content-Length); over the cap is refused like a bad
  // payload, i.e. an empty input. The payload is a pin or a pasted link — well under 4 KB.
  const read = await readCappedText(request, MAX_BODY_BYTES).catch(() => null)
  const body = read === 'too-large' ? null : read
  let parsed: unknown = null
  if (body !== null && body !== '') {
    try {
      parsed = JSON.parse(body)
    } catch {
      parsed = null
    }
  }
  const input =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}

  const answer = await geocode(
    { lat: input.lat, lng: input.lng, link: input.link },
    {
      // The address nginx appended, never the whole header: a client chooses its leading entries.
      address: clientAddress(request.headers),
      // `||`, not `??`: a blank key in a host's .env means no key (no outbound call).
      serverKey: process.env.GOOGLE_MAPS_SERVER_KEY || null,
    },
  )
  return Response.json(answer, { status: answer.ok ? 200 : answer.status })
}
