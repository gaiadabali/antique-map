/**
 * `GET /api/x/track/{token}/driver-image` — `@engine/http/track/driver-image` (TASKS.md 7.3;
 * COMMERCE.md §9–10, SECURITY.md F5): the driver's details photo on the tracking page, served from
 * the shop's own origin. The photo is a private object, readable only by a presigned GET on the
 * *internal* storage endpoint (`S3_ENDPOINT`, loopback on a host): a buyer's phone can never reach
 * that URL, and Next's image optimiser refuses it. So this route reads the object where the
 * endpoint is reachable and streams the bytes back — the presigned URL never leaves the process.
 *
 * The token in the path is the order's whole credential, as on `/track/{token}`. The Payload-backed
 * part (`./payload-driver-image`: the order by `trackingTokenHash(token)`, status `on_the_way` or
 * `delivered`, then a 60 s presigned GET) is loaded with `import()` after the path is read, so
 * `next build`, route parity and this route's tests never evaluate the Payload config. A wrong
 * token, a wrong status and an order with no image answer the same plain 404. The proxy counts the
 * token against the tracking guess budget before this runs (`proxy/decide.ts`), the way it counts
 * the order page's.
 *
 * Nothing here logs the token or the URL: a failure logs its error's name alone.
 */
import { atRequestTime, notFound, plain } from '../../shared/respond'

/** How long the presigned GET lives: it is fetched at once, in this process. */
export const DRIVER_IMAGE_URL_TTL_SECONDS = 60
/** The longest token the tracking page accepts (`loadTrackingWith`). */
const MAX_TOKEN_LENGTH = 200
/** The upload limit is 10 MB before re-encoding, so a stored image is never larger. */
const MAX_BYTES = 10 * 1024 * 1024
const FETCH_TIMEOUT_MS = 8_000
const IMAGE_TYPES: readonly string[] = ['image/webp', 'image/jpeg', 'image/png']
const STORED_TYPE = 'image/webp'
const UNAVAILABLE = 'The photo is unavailable.'

/** The presigned GET for the order `token` names, or `null` when it may not be shown. */
export type DriverImageUrlSource = (token: string, ttlSeconds: number) => Promise<string | null>

/** Loads the Payload-backed port: `./payload-driver-image` in the process, a fake in a test. */
export type DriverImageLoader = () => Promise<{ driverImageUrlFor: DriverImageUrlSource }>

const loadSource: DriverImageLoader = () => import('./payload-driver-image')

type Context = { readonly params: Promise<{ readonly token: string }> }

const IMAGE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex',
} as const

/** The type the object answers with when it is an image we store, else the one we always store. */
function imageType(header: string | null): string {
  const type = header?.split(';')[0]?.trim().toLowerCase() ?? ''
  return IMAGE_TYPES.includes(type) ? type : STORED_TYPE
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'error'
}

export function driverImageRoute(
  load: DriverImageLoader = loadSource,
  fetchImage: typeof fetch = fetch,
): (request: Request, context: Context) => Promise<Response> {
  return async function GET(request: Request, { params }: Context): Promise<Response> {
    atRequestTime(request)
    const { token } = await params
    if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return notFound()

    let url: string | null
    try {
      const { driverImageUrlFor } = await load()
      url = await driverImageUrlFor(token, DRIVER_IMAGE_URL_TTL_SECONDS)
    } catch (error) {
      console.error(`[track/driver-image] the order lookup failed: ${errorName(error)}`)
      return plain(500, UNAVAILABLE)
    }
    if (url === null) return notFound()

    let upstream: Response
    try {
      upstream = await fetchImage(url, {
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch (error) {
      console.error(`[track/driver-image] the storage read failed: ${errorName(error)}`)
      return plain(502, UNAVAILABLE)
    }
    // Every early return below leaves the body unread, which would hold the socket until timeout.
    const release = () => upstream.body?.cancel().catch(() => undefined)
    if (upstream.status >= 500) {
      await release()
      console.error(`[track/driver-image] storage answered ${upstream.status}`)
      return plain(502, UNAVAILABLE)
    }
    if (!upstream.ok) {
      await release()
      return notFound()
    }
    if (Number(upstream.headers.get('content-length') ?? 0) > MAX_BYTES) {
      await release()
      return plain(502, UNAVAILABLE)
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer())
    if (bytes.byteLength === 0) return notFound()
    if (bytes.byteLength > MAX_BYTES) return plain(502, UNAVAILABLE)
    return new Response(bytes, {
      status: 200,
      headers: {
        ...IMAGE_HEADERS,
        'Content-Type': imageType(upstream.headers.get('content-type')),
      },
    })
  }
}

export const GET = driverImageRoute()
