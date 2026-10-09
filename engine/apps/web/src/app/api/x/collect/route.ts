/**
 * `/api/x/collect` — the engine route the beacon posts to (ANALYTICS.md §3; TASKS.md 9.2.a). The
 * pipeline is `server/analytics/collect`'s; this file only hands it the request's pieces and the
 * process's Payload, opened lazily so a refused request never touches the database.
 */
import { clientAddress } from '../../../../security/rate-limit'
import { collect, MAX_BODY_BYTES } from '../../../../server/analytics/collect'
import { readCappedText } from '../../../../server/capped-body'

/** The caller's address, or null off nginx (a workstation, CI): `collect` counts those apart. */
function knownAddress(headers: Headers): string | null {
  const address = clientAddress(headers)
  return address === 'unknown' ? null : address
}

export async function POST(request: Request): Promise<Response> {
  // Capped while read: a chunked body has no Content-Length, and `text()` would buffer it whole.
  // Over the cap → null, which `collect` drops and answers 204 like any too-large body.
  const read = await readCappedText(request, MAX_BODY_BYTES).catch(() => null)
  const body = read === 'too-large' ? null : read
  return collect(
    {
      method: request.method,
      origin: request.headers.get('origin'),
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent'),
      // The address nginx appended, never the whole header: `collect` reads its first entry, which a
      // client chooses, so a forged prefix would be a fresh bucket and a fresh session each time.
      address: knownAddress(request.headers),
      body,
      referer: request.headers.get('referer'),
    },
    {
      getPayload: () => import('@engine/cms/instance').then(({ cms }) => cms()),
    },
  )
}
