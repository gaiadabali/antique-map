/**
 * The origins Payload is told about (ARCHITECTURE.md §2, SECURITY.md B4, B5, X2), all from the
 * host allow-list in the environment (`GALLERY_HOSTS`, `SHOP_HOSTS`, `ADMIN_HOST` —
 * `@engine/config/sites`), never from a request:
 * - `siteOrigin()` — Payload's `serverURL`: the admin host's origin, where `/admin` and the REST
 *   API answer and staff cookies stay; every absolute URL Payload builds (an email's reset link,
 *   say) starts here;
 * - `trustedOrigins()` — Payload's CSRF and CORS lists: the admin host's origin and nothing else.
 *   A staff cookie authenticates a REST call only from the admin's own pages. Never a site's: on
 *   staging both sites' hosts are one site under `gaiada.com`, so a `SameSite=Lax` cookie rides a
 *   request from the gallery's pages, and with the gallery's origin listed any script there could
 *   read and write as the signed-in staff member (2.2's second review). Payload compares a
 *   request's `Origin` with these exactly, so each is a bare origin — scheme, host and, for a
 *   `*.localhost` host, the process's `PORT`.
 *
 * With no usable allow-list (the build, a CLI, `generate:types`) both are empty; a serving process
 * always has one, or its boot check refuses it. The lists never depend on anything else, so the
 * config — and the types, import map and migration snapshot made from it — is the same in every
 * environment.
 */
import { adminOrigin } from '@engine/config/sites'

type Env = Readonly<Record<string, string | undefined>>

/** Payload's `serverURL`: the admin host's origin, or `undefined` while there is none. */
export function siteOrigin(env: Env): string | undefined {
  return adminOrigin(env) ?? undefined
}

/**
 * Payload's CSRF and CORS lists: exactly the admin host's origin, or `[]` while there is none.
 *
 * The second argument is ignored: `payload.config.ts` still passes one (`null`).
 */
export function trustedOrigins(env: Env, _ignored?: unknown): string[] {
  const origin = adminOrigin(env)
  return origin === null ? [] : [origin]
}
