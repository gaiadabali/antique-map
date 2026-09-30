/**
 * Who may call a cron route (C13 `RouteAuth` `cron`; DEPLOYMENT.md §5): the site user's crontab,
 * with `Authorization: Bearer <CRON_SECRET>`. While `CRON_SECRET` is unset the route answers 503 —
 * a host that forgot it fails loudly rather than running its queue for anyone who asks — and a
 * wrong or missing bearer 401. The comparison is of two digests, in constant time.
 */
import { createHash, timingSafeEqual } from 'node:crypto'

import { plain } from '../legacy/respond'

type Env = Readonly<Record<string, string | undefined>>

const digest = (value: string) => createHash('sha256').update(value).digest()

/** `null` when the caller may proceed; otherwise the answer to send. */
export function refuseCron(request: Request, env: Env = process.env): Response | null {
  const secret = env.CRON_SECRET?.trim()
  if (!secret) return plain(503, 'cron is not configured on this host (CRON_SECRET)')
  const given = request.headers.get('authorization') ?? ''
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) {
    return plain(401, 'unauthorised', { 'WWW-Authenticate': 'Bearer' })
  }
  return null
}

/**
 * A cron route whose handler its owning lane has not built yet (C13 names the owner): it
 * authenticates like every cron route, then answers 404, as a mounted route with nothing behind it.
 */
export function unbuiltCron(owner: string): (request: Request) => Promise<Response> {
  return async (request) => refuseCron(request) ?? plain(404, `not built yet (${owner})`)
}
