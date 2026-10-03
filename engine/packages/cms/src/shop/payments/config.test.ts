/**
 * Which provider a process may use (COMMERCE.md §6; DEPLOYMENT.md §7; SECURITY.md W7): the
 * simulator never in production — judged from the hosts, as the boot check judges it — sandbox keys
 * never in production, live keys nowhere else; and refusals name the variable, never a key.
 */
import { describe, expect, it } from 'vitest'

import { SIMULATOR_SERVER_KEY, assertSimulatorAllowed, paymentsConfigFromEnv } from './config'
import {
  LIVE_KEYS,
  LOCAL_ENV,
  PRODUCTION_ENV,
  SANDBOX_KEYS,
  SIMULATE,
  STAGING_ENV,
} from './payments.test-support'

describe('the payments config', () => {
  it('runs the simulator locally and on staging, on its fixed key and no credential', () => {
    for (const env of [LOCAL_ENV, STAGING_ENV]) {
      const result = paymentsConfigFromEnv({ ...env, MIDTRANS_MODE: 'simulate' })
      expect(result).toMatchObject({
        ok: true,
        config: { mode: 'simulate', serverKey: SIMULATOR_SERVER_KEY, clientKey: null },
      })
    }
  })

  it('refuses the simulator in production — and where the hosts cannot say', () => {
    const production = paymentsConfigFromEnv({ ...PRODUCTION_ENV, MIDTRANS_MODE: 'simulate' })
    expect(production).toMatchObject({ ok: false, subject: 'MIDTRANS_MODE' })
    // Unknown hosts are judged production (fail closed).
    const unknown = paymentsConfigFromEnv({ MIDTRANS_MODE: 'simulate', NODE_ENV: 'production' })
    expect(unknown.ok).toBe(false)
  })

  it('refuses the simulator at call time, whatever a config object claims', () => {
    expect(() => assertSimulatorAllowed(SIMULATE)).not.toThrow()
    expect(() => assertSimulatorAllowed({ ...SIMULATE, environment: 'production' })).toThrow()
    expect(() => assertSimulatorAllowed({ ...SIMULATE, mode: 'sandbox' })).toThrow()
  })

  it('takes sandbox keys off production, live keys in production, the mode from the key when unset', () => {
    expect(paymentsConfigFromEnv({ ...STAGING_ENV, ...SANDBOX_KEYS })).toMatchObject({
      ok: true,
      config: { mode: 'sandbox', environment: 'staging' },
    })
    expect(
      paymentsConfigFromEnv({ ...LOCAL_ENV, ...SANDBOX_KEYS, MIDTRANS_MODE: 'sandbox' }),
    ).toMatchObject({
      ok: true,
      config: { mode: 'sandbox', clientKey: SANDBOX_KEYS.MIDTRANS_CLIENT_KEY },
    })
    expect(paymentsConfigFromEnv({ ...PRODUCTION_ENV, ...LIVE_KEYS })).toMatchObject({
      ok: true,
      config: { mode: 'production', environment: 'production' },
    })
  })

  it('refuses a sandbox key in production and a live key anywhere else', () => {
    expect(paymentsConfigFromEnv({ ...PRODUCTION_ENV, ...SANDBOX_KEYS })).toMatchObject({
      ok: false,
      subject: 'MIDTRANS_SERVER_KEY',
    })
    for (const env of [LOCAL_ENV, STAGING_ENV]) {
      expect(paymentsConfigFromEnv({ ...env, ...LIVE_KEYS }).ok).toBe(false)
    }
  })

  it('refuses a missing key, a mode its key contradicts, a mixed pair, or an unknown mode', () => {
    const refused = (env: Record<string, string>) => {
      const result = paymentsConfigFromEnv({ ...LOCAL_ENV, ...env })
      if (result.ok) throw new Error(`accepted ${JSON.stringify(Object.keys(env))}`)
      return result
    }
    expect(refused({}).subject).toBe('MIDTRANS_SERVER_KEY')
    expect(refused({ MIDTRANS_SERVER_KEY: SANDBOX_KEYS.MIDTRANS_SERVER_KEY }).subject).toBe(
      'MIDTRANS_CLIENT_KEY',
    )
    expect(refused({ ...SANDBOX_KEYS, MIDTRANS_MODE: 'production' }).subject).toBe(
      'MIDTRANS_SERVER_KEY',
    )
    expect(
      refused({ ...SANDBOX_KEYS, MIDTRANS_CLIENT_KEY: LIVE_KEYS.MIDTRANS_CLIENT_KEY }).subject,
    ).toBe('MIDTRANS_CLIENT_KEY')
    expect(refused({ MIDTRANS_MODE: 'live' }).subject).toBe('MIDTRANS_MODE')
    expect(refused({ MIDTRANS_SERVER_KEY: 'not-a-key', MIDTRANS_CLIENT_KEY: 'x' }).subject).toBe(
      'MIDTRANS_SERVER_KEY',
    )
  })

  it('never puts a key in a refusal', () => {
    const result = paymentsConfigFromEnv({ ...PRODUCTION_ENV, ...SANDBOX_KEYS })
    expect(JSON.stringify(result)).not.toContain(SANDBOX_KEYS.MIDTRANS_SERVER_KEY)
  })
})
