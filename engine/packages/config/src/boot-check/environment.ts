/**
 * Which environment a process runs in, from what it already has: `NODE_ENV`, and `SITE_URL`
 * — the origin it serves (DEPLOYMENT.md §8) — against the brand's own `domains` (C1). The
 * brand's production domain or an alias is production; its staging domain is staging; anything
 * not a production build is local. `NODE_ENV=production` alone cannot say it: staging runs
 * production builds on sandbox keys (DEPLOYMENT.md §1).
 *
 * It fails closed: a production build on a host that is none of the brand's domains is refused
 * and judged as production, so the strictest rules apply to whatever it is; so is one with no
 * `SITE_URL` or a malformed one — and so is one at a loopback `SITE_URL`, unless it says it is
 * local. A worktree and CI open the thing on a production build on their own port
 * (CONVENTIONS.md §11), with draft configs and sandbox or no keys, which production would
 * refuse; they set `LOCAL_PRODUCTION_BUILD=1`, and a host never does (3.4 senior-be #1): a staging
 * host provisioned from `.env.example`, whose `SITE_URL` is loopback, must not boot as a
 * workstation — with the dev secrets, drafts and missing keys a workstation may have. With the
 * opt-in, the report still warns. `0.0.0.0` is not loopback: it is a bind address, never an origin.
 */
import type { BrandConfig } from '../schema'
import { read, type DeploymentEnvironment, type Findings } from './findings'

const LOOPBACK = /^(?:localhost|.+\.localhost|127(?:\.\d{1,3}){3}|\[::1\])$/

/** The opt-in a workstation's `.env.local` and CI set to run a production build as local. */
export const LOCAL_PRODUCTION_BUILD = 'LOCAL_PRODUCTION_BUILD'

export function deploymentEnvironment(
  env: Readonly<Record<string, string | undefined>>,
  config: Pick<BrandConfig, 'domains'>,
  findings: Findings,
): DeploymentEnvironment {
  const productionBuild = read(env, 'NODE_ENV') === 'production'
  const optedIn = localOptIn(env, findings)
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
    if (optedIn) {
      findings.warn(
        LOCAL_PRODUCTION_BUILD,
        `is set on ${host}, the brand's ${deployed} domain, and ignored: it is a workstation's or CI's, never a host's`,
      )
    }
    return deployed
  }
  if (!productionBuild) return 'local'
  const loopback = LOOPBACK.test(host)
  if (loopback && optedIn) {
    findings.warn(
      'SITE_URL',
      `is loopback (${host}) and LOCAL_PRODUCTION_BUILD=1: a production build run as local — sandbox keys only, drafts and fixtures allowed (DEPLOYMENT.md §8)`,
    )
    return 'local'
  }
  findings.refuse(
    'SITE_URL',
    loopback
      ? `is loopback (${host}) in a production build, judged as production: a workstation or CI running one sets LOCAL_PRODUCTION_BUILD=1; a host names its own domain (DEPLOYMENT.md §8)`
      : `host "${host}" is none of the brand's domains (domains.production, .staging, .aliases); judged as production until it is`,
  )
  return 'production'
}

/** `LOCAL_PRODUCTION_BUILD`: `"1"` or unset — anything else is refused, and opts in to nothing. */
function localOptIn(env: Readonly<Record<string, string | undefined>>, findings: Findings) {
  const value = read(env, LOCAL_PRODUCTION_BUILD)
  if (value === undefined) return false
  if (value === '1') return true
  findings.refuse(
    LOCAL_PRODUCTION_BUILD,
    `is "${value}"; it is "1" on a workstation or in CI, or unset`,
  )
  return false
}
