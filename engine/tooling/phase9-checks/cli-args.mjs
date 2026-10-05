// Shared argument rules for the two phase-9 checks: the required `--base`/`--site`, and the rate
// ceiling the ticket sets (≤5 a second unless `--i-know` says the operator accepts more load on the
// shared host).
import { DEFAULT_RATE, MAX_RATE } from './limiter.mjs'

export const SITES = ['gallery', 'shop']

/** Validates the common options; returns `{ base, site, rate }` or throws a readable Error. */
export function commonOptions(values) {
  if (!values.base) throw new Error('--base is required')
  if (!SITES.includes(values.site)) throw new Error(`--site must be one of ${SITES.join(', ')}`)
  const rate = values.rate === undefined ? DEFAULT_RATE : Number(values.rate)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('--rate must be a positive number')
  if (rate > MAX_RATE && !values['i-know']) {
    throw new Error(`--rate above ${MAX_RATE} needs --i-know (the staging host is shared)`)
  }
  return { base: values.base.replace(/\/$/, ''), site: values.site, rate }
}

/** The `parseArgs` option table both CLIs share. */
export const COMMON_OPTIONS = {
  base: { type: 'string' },
  site: { type: 'string' },
  host: { type: 'string' },
  out: { type: 'string' },
  state: { type: 'string' },
  rate: { type: 'string' },
  'i-know': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
}
