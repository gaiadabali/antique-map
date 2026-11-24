/**
 * `/api/x/geocode/search` — the store editor's address search (TASKS.md 27.4.a). This handler
 * (moved here from today's app so the shop app mounts the same, TASKS.md 23.5) hands
 * `./geocode-search` the request's pieces: the session (Payload's own cookie, read the
 * way the admin reads it — `server/orders/routes`, as the store panel's routes do), the caller's
 * address and the server key. The body is read once, capped, as text, so a bad payload is refused
 * without ever throwing.
 */
import { readCappedText } from '@engine/chat/server/capped-body'
import { cms } from '@engine/cms/instance'
import { staffActor } from '@engine/cms-shop/fulfilment/staff-routes'
import { clientAddress } from '@engine/http/limits'

import { searchPlaces } from './geocode-search'

/** Who the request's session names, on the app's own Payload. */
const actorFrom = (request: Request) => staffActor(cms, request)

const MAX_BODY_BYTES = 4096

export async function POST(request: Request): Promise<Response> {
  const { user } = await actorFrom(request).catch(() => ({ user: null }))
  const read = await readCappedText(request, MAX_BODY_BYTES).catch(() => null)
  const body = read === 'too-large' ? null : read
  let query: unknown = null
  try {
    query = body ? (JSON.parse(body) as { query?: unknown })?.query : null
  } catch {
    query = null
  }
  const answer = await searchPlaces(query, {
    // A staff account (`users`, not a partner) whose role is the owner's — `roleOf`'s own test.
    isOwner: user?.collection === 'users' && user.role === 'owner',
    // The address nginx appended, never the whole header: a client chooses its leading entries.
    address: clientAddress(request.headers),
    // `||`, not `??`: a blank key in a host's .env means no key (no outbound call).
    serverKey: process.env.GOOGLE_MAPS_SERVER_KEY || null,
  })
  return Response.json(answer, {
    status: answer.ok ? 200 : answer.status,
    headers: { 'cache-control': 'no-store' },
  })
}
