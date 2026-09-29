/**
 * Which environment a process runs in, from what it already has: `NODE_ENV`, and `SITE_URL`
 * — the origin it serves (DEPLOYMENT.md §8) — against the brand's own `domains` (C1). The
 * brand's production domain or an alias is production; its staging domain is staging; a
 * loopback host, or anything not a production build, is local. `NODE_ENV=production` alone
 * cannot say it: staging runs production builds on sandbox keys (DEPLOYMENT.md §1).
 *
 * It fails closed: a production build on a host that is none of the brand's domains is
 * refused and judged as production, so the strictest rules apply to whatever it is; so is one
 * with no `SITE_URL` or a malformed one.
 *
 * A production build on a loopback `SITE_URL` is judged local, by decision (3.4.f): it is how a
 * worktree and CI open the thing on a production build on their own port (CONVENTIONS.md §11),
 * with draft configs and sandbox or no keys, which production would refuse. It is never quiet
 * about it — the boot report warns — and it buys a misconfigured host little: local runs on
 * sandbox keys, so a host holding live keys refuses to start as local, and a loopback URL is
 * no origin a buyer, a gateway or an email can reach. `0.0.0.0` is not loopback: it is a bind
 * address, never an origin, and a production build naming it is judged production.
 */
import type { BrandConfig } from '../schema'
import { read, type DeploymentEnvironment, type Findings } from './findings'

const LOOPBACK = /^(?:localhost|.+\.localhost|127(?:\.\d{1,3}){3}|\[::1\])$/

export function deploymentEnvironment(
  env: Readonly<Record<string, string | undefined>>,
  config: Pick<BrandConfig, 'domains'>,
  findings: Findings,
): DeploymentEnvironment {
  const productionBuild = read(env, 'NODE_ENV') === 'production'
  const raw = read(env, 'SITE_URL')
  let url: URL | null = null
  try {
    url = raw === undefined ? null : new URL(raw)
  } catch {
    url = null
  }
  if (!url) {
    findings.refuse(
      'SITE_URL',
      raw === undefined
        ? 'is not set: the origin this process serves, for absolute URLs and the CSP (DEPLOYMENT.md §8)'
        : 'is not an absolute URL such as https://example.com',
    )
    return productionBuild ? 'production' : 'local'
  }
  const host = url.hostname.toLowerCase()
  const { production, staging, aliases } = config.domains
  const deployed: DeploymentEnvironment | null =
    host === production?.toLowerCase() || aliases.some((alias) => alias.toLowerCase() === host)
      ? 'production'
      : host === staging?.toLowerCase()
        ? 'staging'
        : null

  if (deployed) {
    if (!productionBuild) {
      findings.refuse('NODE_ENV', `must be "production" on ${host}, the brand's ${deployed} domain`)
    }
    if (url.protocol !== 'https:')
      findings.refuse('SITE_URL', `must be https:// on the ${deployed} domain`)
    return deployed
  }
  if (!productionBuild) return 'local'
  if (LOOPBACK.test(host)) {
    findings.warn(
      'SITE_URL',
      `is loopback (${host}): a production build judged local — sandbox keys only, drafts and fixtures allowed; a deployed host names its own domain (DEPLOYMENT.md §8)`,
    )
    return 'local'
  }
  findings.refuse(
    'SITE_URL',
    `host "${host}" is none of the brand's domains (domains.production, .staging, .aliases); judged as production until it is`,
  )
  return 'production'
}
