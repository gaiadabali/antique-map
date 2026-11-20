/**
 * `POST /api/x/collect` — the engine route the beacon posts to (ANALYTICS.md §3; TASKS.md 9.2.a),
 * as a handler each app mounts with one line (moved from today's app, TASKS.md 23.4):
 *
 *   export const POST = collectRoute({ sites: ['shop'] })
 *
 * The pipeline is `./collect`'s; this only hands it the request's pieces and the process's Payload
 * (`@engine/cms/instance`, the app's own CMS), opened lazily so a refused request never touches the
 * database.
 */
import { readCappedText } from '@engine/chat/server/capped-body'
import type { SiteKey } from '@engine/config/sites'
import { clientAddress } from '@engine/http/limits'

import { collect, MAX_BODY_BYTES } from './collect'

/** The caller's address, or null off nginx (a workstation, CI): `collect` counts those apart. */
function knownAddress(headers: Headers): string | null {
  const address = clientAddress(headers)
  return address === 'unknown' ? null : address
}

export type CollectRouteOptions = {
  /** The sites the app serves; today's one app serves both (the default). */
  readonly sites?: readonly SiteKey[]
}

export function collectRoute(options: CollectRouteOptions = {}) {
  return async function POST(request: Request): Promise<Response> {
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
        // The address nginx appended, never the whole header: `collect` reads its first entry, which
        // a client chooses, so a forged prefix would be a fresh bucket and a fresh session each time.
        address: knownAddress(request.headers),
        body,
        referer: request.headers.get('referer'),
      },
      {
        openPayload: () => import('@engine/cms/instance').then(({ cms }) => cms()),
        ...(options.sites ? { sites: options.sites } : {}),
      },
    )
  }
}
