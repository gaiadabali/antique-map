/**
 * Which origins Payload trusts with its session cookie (CSRF) and answers cross-origin (CORS) —
 * one of the few things `BRAND` may shape (ARCHITECTURE.md §2). The process's own origin
 * (`SITE_URL`, DEPLOYMENT.md §8) and the brand's hostnames (C1 `domains`: production, staging
 * and every alias), https only. Payload compares a request's `Origin` header with these exactly,
 * so each is a bare origin — scheme and host, no path, no trailing slash.
 *
 * With no brand and no `SITE_URL` (the build, a CLI) the list is empty; a serving process always
 * has both, or its boot check refuses it.
 */
import type { BrandConfig } from '@engine/config/schema'

type Env = Readonly<Record<string, string | undefined>>

/** `SITE_URL` as a bare origin, or `undefined` when unset or not an absolute URL. */
export function siteOrigin(env: Env): string | undefined {
  const raw = env.SITE_URL?.trim()
  if (!raw) return undefined
  try {
    return new URL(raw).origin
  } catch {
    return undefined
  }
}

export function trustedOrigins(env: Env, brand: Pick<BrandConfig, 'domains'> | null): string[] {
  const hosts = brand
    ? [brand.domains.production, brand.domains.staging, ...brand.domains.aliases]
    : []
  const origins = [
    siteOrigin(env),
    ...hosts.filter((host): host is string => Boolean(host)).map((host) => `https://${host}`),
  ]
  return [...new Set(origins.filter((origin): origin is string => origin !== undefined))]
}
