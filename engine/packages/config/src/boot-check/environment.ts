/**
 * Which environment a process runs in (DEPLOYMENT.md §7): judged, never declared, from what it
 * already has — the canonical hosts its allow-list names (`GALLERY_HOSTS`, `SHOP_HOSTS`, the first
 * of each) against the hostnames committed in `SITES`, and `NODE_ENV`. Both sites' production
 * names are production, both staging names staging, both local names (`*.localhost`) local.
 * `NODE_ENV=production` alone cannot say it: staging runs production builds on sandbox keys.
 *
 * It fails closed: a mix, an unknown host or none is refused and judged production, so the
 * strictest rules apply to whatever it is — and so is a production build at local hosts, unless it
 * says it is local. A worktree and CI open the thing on a production build on their own port
 * (CONVENTIONS.md §10), with sandbox or no keys, which production would refuse; they set
 * `LOCAL_PRODUCTION_BUILD=1`, and a host never does: a staging host provisioned from
 * `.env.example`, whose hosts are local, must not boot as a workstation, with the dev secrets and
 * missing keys a workstation may have. With the opt-in, the report still warns.
 */
import { isLocalHostname, readSiteHosts } from '../sites/hosts'
import { SITE_KEYS, SITES } from '../sites/table'
import { read, type DeploymentEnvironment, type Findings } from './findings'

/** The opt-in a workstation's `.env.local` and CI set to run a production build as local. */
export const LOCAL_PRODUCTION_BUILD = 'LOCAL_PRODUCTION_BUILD'

type Env = Readonly<Record<string, string | undefined>>
type Kind = DeploymentEnvironment

/**
 * The environment both canonical hosts name, or `null` for a mix, an unknown host, or none: each
 * site's own committed production or staging hostname, or any local one (`*.localhost`).
 */
function namedEnvironment(env: Env): Kind | null {
  const result = readSiteHosts(env)
  if (!result.ok) return null
  const kinds = SITE_KEYS.map((site): Kind | undefined => {
    const canonical = result.hosts[site][0]
    const { production, staging }: { production: readonly string[]; staging: readonly string[] } =
      SITES[site].hostnames
    if (production.includes(canonical)) return 'production'
    if (staging.includes(canonical)) return 'staging'
    return isLocalHostname(canonical) ? 'local' : undefined
  })
  const [first] = kinds
  return first !== undefined && kinds.every((kind) => kind === first) ? first : null
}

export function deploymentEnvironment(env: Env, findings: Findings): DeploymentEnvironment {
  const productionBuild = read(env, 'NODE_ENV') === 'production'
  const optedIn = localOptIn(env, findings)
  const named = namedEnvironment(env)
  const hosts = SITE_KEYS.map((site) => SITES[site].hostnames)

  if (named === 'production' || named === 'staging') {
    if (!productionBuild) {
      findings.refuse('NODE_ENV', `must be "production" on the ${named} hosts`)
    }
    if (optedIn) {
      findings.warn(
        LOCAL_PRODUCTION_BUILD,
        `is set on the ${named} hosts, and ignored: it is a workstation's or CI's, never a host's`,
      )
    }
    return named
  }
  if (named === 'local') {
    if (!productionBuild) return 'local'
    if (optedIn) {
      findings.warn(
        'GALLERY_HOSTS',
        'names local hosts and LOCAL_PRODUCTION_BUILD=1: a production build run as local — sandbox keys only, fixtures allowed (DEPLOYMENT.md §7)',
      )
      return 'local'
    }
    findings.refuse(
      'GALLERY_HOSTS',
      'names local hosts in a production build, judged as production: a workstation or CI running one sets LOCAL_PRODUCTION_BUILD=1; a host names its own hostnames (DEPLOYMENT.md §7)',
    )
    return 'production'
  }
  // A mix, an unknown host or an unusable allow-list (the last also refused by `checkSiteHosts`).
  findings.refuse(
    'GALLERY_HOSTS',
    `and SHOP_HOSTS must both start with the production hosts (${hosts.map((h) => h.production[0]).join(', ')}), both with the staging hosts (${hosts.map((h) => h.staging[0]).join(', ')}) or both with local ones (${hosts.map((h) => h.local[0]).join(', ')}); judged as production until they do`,
  )
  return 'production'
}

/** `LOCAL_PRODUCTION_BUILD`: `"1"` or unset — anything else is refused, and opts in to nothing. */
function localOptIn(env: Env, findings: Findings) {
  const value = read(env, LOCAL_PRODUCTION_BUILD)
  if (value === undefined) return false
  if (value === '1') return true
  findings.refuse(
    LOCAL_PRODUCTION_BUILD,
    `is "${value}"; it is "1" on a workstation or in CI, or unset`,
  )
  return false
}
