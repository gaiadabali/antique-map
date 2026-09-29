/**
 * The sister a brand syncs with (C12, BRANDS.md §5): its secrets, and which of its sites this
 * process talks to (3.4 senior-be #6). A committed config names one origin, `sisters[].baseUrl`,
 * and one origin cannot serve both environments, so it is the sister's **staging** site, and each
 * host names the one it really uses in `SISTER_BASE_URL`:
 * - production requires it — the sister's production site, never the committed staging one, so a
 *   live brand never syncs with its sister's rehearsal data;
 * - staging may leave it unset (the committed origin), or name another https origin;
 * - a workstation may leave it unset, or point it at a local sister — over plain http on loopback
 *   only, C12's one case of an http sister (`AbsoluteUrl`, "only in development").
 * `sisterBaseUrl()` is what the sister client (SIS, TASKS.md 27.1) calls; it never guesses.
 */
import { httpsOriginSchema, type BrandConfig } from '../schema'
import { read, type DeploymentEnvironment, type Findings } from './findings'

type Env = Readonly<Record<string, string | undefined>>

export const SISTER_BASE_URL = 'SISTER_BASE_URL'
const SISTER_SECRETS = ['SISTER_API_KEY', 'SISTER_WEBHOOK_SECRET'] as const
const LOOPBACK_HTTP = /^http:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?$/

/** The sister origin this process talks to: `SISTER_BASE_URL`, else the committed one; `null` with no sister. */
export function sisterBaseUrl(env: Env, config: Pick<BrandConfig, 'sisters'>): string | null {
  const [sister] = config.sisters
  if (!sister) return null
  return read(env, SISTER_BASE_URL) ?? sister.baseUrl
}

export function checkSister(
  env: Env,
  config: Pick<BrandConfig, 'sisters'>,
  environment: DeploymentEnvironment,
  findings: Findings,
): void {
  const [sister] = config.sisters
  if (!sister) {
    if (read(env, SISTER_BASE_URL) !== undefined) {
      findings.warn(
        SISTER_BASE_URL,
        'is set, but the brand has no sister (sisters is empty): ignored',
      )
    }
    return
  }
  for (const name of SISTER_SECRETS) {
    if (read(env, name) === undefined) {
      const message = `is not set: the brand syncs with its sister "${sister.slug}" (C12)`
      findings.require(name, message, environment)
    }
  }
  const value = read(env, SISTER_BASE_URL)
  const staging = `"${sister.baseUrl}" (sisters[0].baseUrl) is its staging site`
  if (value === undefined) {
    if (environment === 'production') {
      findings.refuse(
        SISTER_BASE_URL,
        `is not set: production syncs with its sister's production site, and ${staging} (DEPLOYMENT.md §8)`,
      )
    }
    return
  }
  if (environment === 'local' && LOOPBACK_HTTP.test(value)) return
  if (!httpsOriginSchema.safeParse(value).success) {
    findings.refuse(
      SISTER_BASE_URL,
      environment === 'local'
        ? 'is not an https origin on a public name, nor an http origin on loopback (a local sister)'
        : 'is not an https origin on a public name, such as https://shop.example.com (no path, no trailing "/")',
    )
    return
  }
  if (environment === 'production' && value === sister.baseUrl) {
    findings.refuse(
      SISTER_BASE_URL,
      `names the committed origin, and ${staging}: production syncs with the production one`,
    )
  }
}
