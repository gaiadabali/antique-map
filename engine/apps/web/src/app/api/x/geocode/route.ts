/**
 * `/api/x/geocode` — the engine route the checkout's pin picker posts to (TASKS.md 6.3.a). This
 * file only hands the handler (`server/shop/checkout/geocode`) the request's pieces; the body is
 * read once, as text, so a bad payload is refused without ever throwing.
 */
import { geocode } from '../../../../server/shop/checkout/geocode'

export async function POST(request: Request): Promise<Response> {
  const body = await request.text().catch(() => null)
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
      address: request.headers.get('x-forwarded-for'),
      // `||`, not `??`: a blank key in a host's .env means no key (no outbound call).
      serverKey: process.env.GOOGLE_MAPS_SERVER_KEY || null,
    },
  )
  return Response.json(answer, { status: answer.ok ? 200 : answer.status })
}
