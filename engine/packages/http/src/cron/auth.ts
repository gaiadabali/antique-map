/**
 * Who may call a cron route (C13 `RouteAuth` `cron`; DEPLOYMENT.md §5): the site user's crontab,
 * with `Authorization: Bearer <CRON_SECRET>`. While `CRON_SECRET` is unset the route answers 503 —
 * a host that forgot it fails loudly rather than running its queue for anyone who asks — and a
 * wrong or missing bearer 401. The comparison is `../shared/bearer`'s, the revalidate route's too.
 */
import { refuseBearer } from '../shared/bearer'
import { plain } from '../shared/respond'

type Env = Readonly<Record<string, string | undefined>>

/** `null` when the caller may proceed; otherwise the answer to send. */
export function refuseCron(request: Request, env: Env = process.env): Response | null {
  return refuseBearer(request, 'CRON_SECRET', 'cron', env)
}

/**
 * A cron route whose handler its owning lane has not built yet (C13 names the owner): it
 * authenticates like every cron route, then answers 404, as a mounted route with nothing behind it.
 */
export function unbuiltCron(owner: string): (request: Request) => Promise<Response> {
  return async (request) => refuseCron(request) ?? plain(404, `not built yet (${owner})`)
}
