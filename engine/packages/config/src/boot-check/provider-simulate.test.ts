import { describe, expect, it } from 'vitest'

import { bootCheck, formatBootReport } from './index'
import {
  FULFILMENT_SECRETS,
  PAYMENT_SECRETS,
  SHIPPING_SECRETS,
  SIMULATE,
  secretPrefix,
} from './provider-secrets'
import { deployableConfig, fullEnv } from './testing'

const NOW = new Date('2026-10-01T12:00:00Z')
const config = deployableConfig()
const PROVIDER_VARIABLE = /^(PAYMENT|SHIPPING|FULFILMENT)_/

/** Every provider the config names that needs a credential, as its secret prefix. */
function prefixes(): string[] {
  const out = new Set<string>()
  for (const seller of config.sellers) {
    for (const p of seller.payments)
      if (PAYMENT_SECRETS[p].secrets.length) out.add(secretPrefix('PAYMENT', seller.id, p))
    for (const p of seller.shipping.providers)
      if (SHIPPING_SECRETS[p].secrets.length) out.add(secretPrefix('SHIPPING', seller.id, p))
  }
  for (const p of config.fulfilment.providers)
    if (FULFILMENT_SECRETS[p].secrets.length) out.add(secretPrefix('FULFILMENT', p))
  return [...out]
}

/** `fullEnv` with no provider credential at all, and every provider simulated. */
function simulated(environment: 'staging' | 'local' | 'production') {
  const env: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(fullEnv(config, environment))) {
    if (!PROVIDER_VARIABLE.test(key)) env[key] = value
  }
  for (const prefix of prefixes()) env[`${prefix}_MODE`] = SIMULATE
  return env
}

const run = (env: Record<string, string | undefined>) =>
  bootCheck({ env, config, now: NOW, perStorefront: false })

describe('bootCheck() — a simulated provider (MODE=simulate)', () => {
  it('boots staging and local with every provider simulated and no credential, warning for each', () => {
    for (const environment of ['staging', 'local'] as const) {
      const report = run(simulated(environment))
      expect(report.ok, formatBootReport(report)).toBe(true)
      const warned = report.warnings.map((warning) => warning.subject)
      for (const prefix of prefixes()) expect(warned).toContain(`${prefix}_MODE`)
      expect(report.warnings.find((w) => w.subject.endsWith('_MODE'))?.message).toMatch(
        /is "simulate": .* is simulated — no credential, nothing reaches the provider/,
      )
    }
  })

  it('simulates a provider whose keys carry their own mode (Stripe) as well as a MODE one (DHL)', () => {
    const env = { ...fullEnv(config, 'staging') }
    for (const key of Object.keys(env)) {
      if (key.startsWith('PAYMENT_SG_STRIPE_') || key.startsWith('SHIPPING_SG_DHL_EXPRESS_'))
        delete env[key]
    }
    const report = run({
      ...env,
      PAYMENT_SG_STRIPE_MODE: SIMULATE,
      SHIPPING_SG_DHL_EXPRESS_MODE: SIMULATE,
    })
    expect(report.ok, formatBootReport(report)).toBe(true)
  })

  it('refuses a simulated provider in production', () => {
    const report = run(simulated('production'))
    expect(report.ok).toBe(false)
    const refused = report.problems.filter((problem) => problem.subject.endsWith('_MODE'))
    expect(refused.length).toBe(prefixes().length)
    expect(refused[0]?.message).toBe(
      'is "simulate": production runs on live keys (DEPLOYMENT.md §8)',
    )
  })

  it('still refuses a missing credential when the provider is not simulated', () => {
    const env = simulated('staging')
    const [first] = prefixes()
    delete env[`${first}_MODE`]
    expect(run(env).ok).toBe(false)
  })
})
