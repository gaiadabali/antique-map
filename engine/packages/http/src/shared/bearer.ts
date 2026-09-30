/**
 * A route whose caller proves itself with a shared secret as a bearer (C13 `RouteAuth` `cron` and
 * `revalidate`; DEPLOYMENT.md §5, ARCHITECTURE.md §9): the site user's crontab, or a worker's
 * `invalidate(tags)` posting from outside a request. While the secret is unset the route answers
 * 503 — a host that forgot it fails loudly rather than serving anyone who asks — and a wrong or
 * missing bearer 401. The secret is trimmed as the boot check reads it (and as `@engine/cache`'s
 * `postTags` sends it); the header is compared as sent, the whole `Bearer <secret>` string, so
 * `bearer`, a second space or a trailing byte is a 401. The comparison is of two SHA-256 digests,
 * 32 bytes against 32, in constant time: neither the secret's length nor its prefix leaks.
 */
import { createHash, timingSafeEqual } from 'node:crypto'

import { plain } from './respond'

type Env = Readonly<Record<string, string | undefined>>

const digest = (value: string) => createHash('sha256').update(value).digest()

/** `null` when the caller holds `env[secretName]`; otherwise the answer to send. */
export function refuseBearer(
  request: Request,
  secretName: string,
  purpose: string,
  env: Env = process.env,
): Response | null {
  const secret = env[secretName]?.trim()
  if (!secret) return plain(503, `${purpose} is not configured on this host (${secretName})`)
  const given = request.headers.get('authorization') ?? ''
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) {
    return plain(401, 'unauthorised', { 'WWW-Authenticate': 'Bearer' })
  }
  return null
}
