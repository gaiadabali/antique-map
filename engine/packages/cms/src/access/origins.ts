/**
 * The origins Payload is told about (ARCHITECTURE.md §2, SECURITY.md B4, B5, X2), all from the
 * host allow-list in the environment (`GALLERY_HOSTS`, `SHOP_HOSTS`, `ADMIN_HOST` —
 * `@engine/config/sites`), never from a request:
 * - `siteOrigin()` — Payload's `serverURL`: the admin host's origin, where `/admin` and the REST
 *   API answer and staff cookies stay; every absolute URL Payload builds (an email's reset link,
 *   say) starts here;
 * - `trustedOrigins()` — Payload's CSRF and CORS lists: each site's canonical origin, so a staff
 *   member's cookie is accepted from either site's pages and nothing else. Payload compares a
 *   request's `Origin` with these exactly, so each is a bare origin — scheme, host and, for a
 *   `*.localhost` host, the process's `PORT`.
 *
 * With no usable allow-list (the build, a CLI, `generate:types`) both are empty; a serving process
 * always has one, or its boot check refuses it. The lists never depend on anything else, so the
 * config — and the types, import map and migration snapshot made from it — is the same in every
 * environment.
 */
import { adminOrigin, siteOrigins } from '@engine/config/sites'

type Env = Readonly<Record<string, string | undefined>>

/** Payload's `serverURL`: the admin host's origin, or `undefined` while there is none. */
export function siteOrigin(env: Env): string | undefined {
  return adminOrigin(env) ?? undefined
}

/**
 * Payload's CSRF and CORS lists: each site's canonical origin, once each.
 *
 * The second argument is ignored: it is the brand config `payload.config.ts` passed before the
 * sites replaced the brands, accepted until that file (2.4's) stops passing it.
 */
export function trustedOrigins(env: Env, _ignored?: unknown): string[] {
  return [...new Set(siteOrigins(env))]
}
