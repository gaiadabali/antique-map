/**
 * `/api/x/collect` — the engine route the beacon posts to (ANALYTICS.md §3; TASKS.md 9.2.a). The
 * pipeline is `server/analytics/collect`'s; this file only hands it the request's pieces and the
 * process's Payload, opened lazily so a refused request never touches the database.
 */
import { collect } from '../../../../server/analytics/collect'

export async function POST(request: Request): Promise<Response> {
  const body = await request.text().catch(() => null)
  return collect(
    {
      method: request.method,
      origin: request.headers.get('origin'),
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent'),
      address: request.headers.get('x-forwarded-for'),
      body,
      referer: request.headers.get('referer'),
    },
    {
      getPayload: () => import('@engine/cms/instance').then(({ cms }) => cms()),
    },
  )
}
