// Shared argument rules for the two phase-9 checks: the required `--base`/`--site`, the optional
// `--origin` (the site's canonical origin — see `to-base.mjs`), and the rate ceiling the ticket sets
// (≤5 a second unless `--i-know` says the operator accepts more load on the shared host).
import { DEFAULT_RATE, MAX_RATE } from './limiter.mjs'

export const SITES = ['gallery', 'shop']

/**
 * An absolute `http(s)://host[:port]` with no path, query or fragment, returned normalised (no
 * trailing slash, default port dropped). Throws a readable Error naming the flag otherwise.
 */
export function parseOrigin(value, flag) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${flag} must be an absolute http(s) URL with no path: ${value}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    throw new Error(`${flag} must be http(s): ${value}`)
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '')
    throw new Error(`${flag} must have no path, query or fragment: ${value}`)
  return parsed.origin
}

/** Validates the common options; returns `{ base, origin, site, rate }` or throws a readable Error. */
export function commonOptions(values) {
  if (!values.base) throw new Error('--base is required')
  if (!SITES.includes(values.site)) throw new Error(`--site must be one of ${SITES.join(', ')}`)
  const base = parseOrigin(values.base, '--base')
  const origin = parseOrigin(values.origin ?? base, '--origin')
  const rate = values.rate === undefined ? DEFAULT_RATE : Number(values.rate)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('--rate must be a positive number')
  if (rate > MAX_RATE && !values['i-know']) {
    throw new Error(`--rate above ${MAX_RATE} needs --i-know (the staging host is shared)`)
  }
  return { base, origin, site: values.site, rate }
}

/** The `parseArgs` option table both CLIs share. */
export const COMMON_OPTIONS = {
  base: { type: 'string' },
  origin: { type: 'string' },
  site: { type: 'string' },
  host: { type: 'string' },
  out: { type: 'string' },
  state: { type: 'string' },
  rate: { type: 'string' },
  'i-know': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
}
