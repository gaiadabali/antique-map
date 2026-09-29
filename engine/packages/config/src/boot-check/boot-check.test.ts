import { describe, expect, it } from 'vitest'

import { bootCheck, formatBootReport, type BootReport } from './index'
import { deployableConfig, fullEnv, secret } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
const config = deployableConfig()

function check(
  env: Record<string, string | undefined>,
  options: { perStorefront?: boolean; cfg?: typeof config } = {},
) {
  return bootCheck({
    env,
    config: options.cfg ?? config,
    now: NOW,
    perStorefront: options.perStorefront ?? false,
  })
}
const subjects = (report: BootReport) => report.problems.map((problem) => problem.subject)
const refusal = (report: BootReport, subject: string) => {
  expect(report.ok).toBe(false)
  const found = report.problems.find((problem) => problem.subject === subject)
  expect(found, formatBootReport(report)).toBeDefined()
  return found?.message ?? ''
}

describe('bootCheck() — the environment', () => {
  it('passes a complete environment everywhere it can run', () => {
    for (const environment of ['local', 'staging', 'production'] as const) {
      const report = check(fullEnv(config, environment))
      expect(report.problems, formatBootReport(report)).toEqual([])
      expect(report.environment).toBe(environment)
      expect(report.loadersSource).toBe('payload')
    }
  })

  it('tells staging from production by SITE_URL against the brand’s domains, not NODE_ENV', () => {
    const staging = fullEnv(config, 'staging')
    expect(check(staging).environment).toBe('staging')
    expect(
      check({ ...fullEnv(config, 'production'), SITE_URL: 'https://alias.example.com' })
        .environment,
    ).toBe('production')
    expect(check({ ...fullEnv(config, 'local'), NODE_ENV: 'production' }).environment).toBe('local') // a local production build
  })

  it('fails closed on a production build at a host that is none of the brand’s domains', () => {
    const report = check({
      ...fullEnv(config, 'production'),
      SITE_URL: 'https://unknown.example.net',
    })
    expect(report.environment).toBe('production')
    expect(refusal(report, 'SITE_URL')).toMatch(
      /host "unknown\.example\.net" is none of the brand's domains/,
    )
  })

  it('refuses a dev server or plain http on a deployed domain, and a missing SITE_URL', () => {
    expect(
      refusal(check({ ...fullEnv(config, 'staging'), NODE_ENV: 'development' }), 'NODE_ENV'),
    ).toMatch(/must be "production"/)
    expect(
      refusal(
        check({ ...fullEnv(config, 'staging'), SITE_URL: `http://${config.domains.staging}` }),
        'SITE_URL',
      ),
    ).toMatch(/https/)
    expect(
      refusal(check({ ...fullEnv(config, 'local'), SITE_URL: undefined }), 'SITE_URL'),
    ).toMatch(/is not set/)
  })
})

describe('bootCheck() — missing secrets refuse the start', () => {
  it('refuses a missing database, Payload secret or link-key ring anywhere, a workstation included', () => {
    for (const name of ['DATABASE_URL', 'PAYLOAD_SECRET', 'LINK_TOKEN_KEYS']) {
      expect(refusal(check({ ...fullEnv(config, 'local'), [name]: undefined }), name)).toMatch(
        /is not set/,
      )
    }
  })

  it('refuses a missing per-seller provider secret on a deployed host, and only warns on a workstation', () => {
    const name = 'PAYMENT_SG_STRIPE_SECRET_KEY'
    for (const environment of ['staging', 'production'] as const) {
      const message = refusal(check({ ...fullEnv(config, environment), [name]: undefined }), name)
      expect(message).toBe('is not set: seller "sg" takes payments by stripe (PAYMENTS.md §8)')
    }
    const local = check({ ...fullEnv(config, 'local'), [name]: undefined })
    expect(local.ok).toBe(true)
    expect(local.warnings.map((warning) => warning.subject)).toContain(name)
    // Per seller: the Indonesian seller's Midtrans keys are its own.
    expect(
      refusal(
        check({ ...fullEnv(config, 'production'), PAYMENT_ID_MIDTRANS_SERVER_KEY: '' }),
        'PAYMENT_ID_MIDTRANS_SERVER_KEY',
      ),
    ).toMatch(/seller "id"/)
    expect(
      refusal(
        check({ ...fullEnv(config, 'staging'), SHIPPING_ID_DHL_EXPRESS_MODE: undefined }),
        'SHIPPING_ID_DHL_EXPRESS_MODE',
      ),
    ).toMatch(/"sandbox" or "live"/)
    expect(
      refusal(
        check({ ...fullEnv(config, 'staging'), FULFILMENT_PRODIGI_API_KEY: undefined }),
        'FULFILMENT_PRODIGI_API_KEY',
      ),
    ).toMatch(/fulfils through prodigi/)
  })

  it('refuses the deployed-only secrets on a deployed host, and the sister’s when a sister is set', () => {
    expect(
      refusal(check({ ...fullEnv(config, 'production'), CRON_SECRET: undefined }), 'CRON_SECRET'),
    ).toMatch(/is not set/)
    const cfg = deployableConfig((raw) => {
      raw.sisters = [
        {
          slug: 'sister',
          name: 'Sister',
          role: 'merch-outlet',
          baseUrl: 'https://sister.example.com',
        },
      ]
    })
    const report = check(fullEnv(cfg, 'staging'), { cfg })
    expect(subjects(report)).toEqual(['SISTER_API_KEY', 'SISTER_WEBHOOK_SECRET'])
  })

  it('refuses a malformed LINK_TOKEN_KEYS: no current key or two, a repeated kid, a short or test key, a future day', () => {
    const rings = {
      'has no current key': `old:${secret(1)}:2026-01-01`,
      'has 2 current keys': `a:${secret(1)},b:${secret(2)}`,
      'the kid is used twice': `a:${secret(1)},a:${secret(2)}:2026-01-01`,
      'needs 32 random bytes or more': `a:${Buffer.from(Array.from({ length: 16 }, (_, i) => i)).toString('base64url')}`,
      'one byte repeated': 'test:CwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCws',
      'is in the future': `b:${secret(2)},a:${secret(1)}:2026-10-01`,
    }
    for (const [expected, ring] of Object.entries(rings)) {
      const report = check({ ...fullEnv(config, 'local'), LINK_TOKEN_KEYS: ring })
      expect(refusal(report, 'LINK_TOKEN_KEYS')).toContain(expected)
    }
  })

  it('never writes a secret’s value into the report', () => {
    const env = {
      ...fullEnv(config, 'production'),
      PAYMENT_SG_STRIPE_SECRET_KEY: 'sk_test_LEAKME',
      PAYLOAD_SECRET: 'dev-only-LEAKME',
    }
    const text = formatBootReport(check(env))
    expect(text).toContain('PAYMENT_SG_STRIPE_SECRET_KEY')
    expect(text).not.toContain('LEAKME')
  })
})

describe('bootCheck() — sandbox vs live', () => {
  it('refuses a sandbox key in production', () => {
    const message = refusal(
      check({
        ...fullEnv(config, 'production'),
        PAYMENT_SG_STRIPE_SECRET_KEY: 'sk_test_x',
        PAYMENT_SG_STRIPE_PUBLISHABLE_KEY: 'pk_test_x',
      }),
      'PAYMENT_SG_STRIPE_SECRET_KEY',
    )
    expect(message).toBe(
      'is a sandbox credential, but this is production: production runs on live keys (DEPLOYMENT.md §8)',
    )
    expect(
      refusal(
        check({ ...fullEnv(config, 'production'), PAYMENT_SG_PAYPAL_MODE: 'sandbox' }),
        'PAYMENT_SG_PAYPAL_MODE',
      ),
    ).toMatch(/sandbox credential/)
  })

  it('refuses a live key in staging or on a workstation', () => {
    for (const environment of ['staging', 'local'] as const) {
      const env = {
        ...fullEnv(config, environment),
        PAYMENT_ID_MIDTRANS_SERVER_KEY: 'Mid-server-x',
        PAYMENT_ID_MIDTRANS_CLIENT_KEY: 'Mid-client-x',
      }
      expect(refusal(check(env), 'PAYMENT_ID_MIDTRANS_SERVER_KEY')).toMatch(
        new RegExp(`live credential, but this is ${environment}`),
      )
    }
  })

  it('refuses mixed modes and a key that is not the provider’s', () => {
    expect(
      refusal(
        check({ ...fullEnv(config, 'staging'), PAYMENT_SG_STRIPE_PUBLISHABLE_KEY: 'pk_live_x' }),
        'PAYMENT_SG_STRIPE',
      ),
    ).toMatch(/mixes sandbox and live/)
    expect(
      refusal(
        check({ ...fullEnv(config, 'staging'), PAYMENT_SG_STRIPE_SECRET_KEY: 'xnd_development_x' }),
        'PAYMENT_SG_STRIPE_SECRET_KEY',
      ),
    ).toMatch(/is not a Stripe secret key/)
    expect(
      refusal(
        check({ ...fullEnv(config, 'staging'), PAYMENT_SG_STRIPE_WEBHOOK_SECRET: 'nope' }),
        'PAYMENT_SG_STRIPE_WEBHOOK_SECRET',
      ),
    ).toMatch(/webhook signing secret/)
    expect(
      refusal(
        check({ ...fullEnv(config, 'staging'), PAYMENT_SG_PAYPAL_MODE: 'test' }),
        'PAYMENT_SG_PAYPAL_MODE',
      ),
    ).toMatch(/must be "sandbox" or "live"/)
  })
})

describe('bootCheck() — loader source, placeholders and development defaults', () => {
  it('refuses LOADERS_SOURCE=fixtures in production, warns on staging, allows it locally', () => {
    expect(
      refusal(
        check({ ...fullEnv(config, 'production'), LOADERS_SOURCE: 'fixtures' }),
        'LOADERS_SOURCE',
      ),
    ).toMatch(/production renders the catalogue/)
    const staging = check({ ...fullEnv(config, 'staging'), LOADERS_SOURCE: 'fixtures' })
    expect(staging).toMatchObject({ ok: true, loadersSource: 'fixtures' })
    expect(staging.warnings.map((warning) => warning.subject)).toEqual(['LOADERS_SOURCE'])
    expect(check({ ...fullEnv(config, 'local'), LOADERS_SOURCE: 'fixtures' })).toMatchObject({
      ok: true,
      loadersSource: 'fixtures',
    })
    expect(
      refusal(check({ ...fullEnv(config, 'local'), LOADERS_SOURCE: 'cms' }), 'LOADERS_SOURCE'),
    ).toMatch(/is "cms"/)
  })

  it('refuses a draft brand or a placeholder seller in production, and warns on staging', () => {
    const cfg = deployableConfig((raw) => {
      raw.draft = true
      ;(raw.sellers as { draft: boolean }[])[1]!.draft = true
    })
    expect(subjects(check(fullEnv(cfg, 'production'), { cfg }))).toEqual([
      'draft',
      'sellers[1].draft',
    ])
    const staging = check(fullEnv(cfg, 'staging'), { cfg })
    expect(staging.ok).toBe(true)
    expect(staging.warnings.map((warning) => warning.subject)).toEqual([
      'draft',
      'sellers[1].draft',
    ])
  })

  it('refuses the synthetic brand anywhere but a workstation', () => {
    expect(refusal(check(fullEnv(config, 'staging'), { perStorefront: true }), 'BRAND')).toMatch(
      /never deployed/,
    )
    expect(check(fullEnv(config, 'local'), { perStorefront: true }).ok).toBe(true)
  })

  it('refuses development defaults and short secrets on a deployed host', () => {
    const env = {
      ...fullEnv(config, 'staging'),
      PAYLOAD_SECRET: 'dev-only-not-a-secret',
      CRON_SECRET: 'short',
      S3_ACCESS_KEY_ID: 'minioadmin',
    }
    expect(subjects(check(env))).toEqual(['PAYLOAD_SECRET', 'CRON_SECRET', 'S3_ACCESS_KEY_ID'])
    expect(check({ ...fullEnv(config, 'local'), PAYLOAD_SECRET: 'dev-only-not-a-secret' }).ok).toBe(
      true,
    )
    expect(
      refusal(check({ ...fullEnv(config, 'local'), DATABASE_URL: 'mysql://x' }), 'DATABASE_URL'),
    ).toMatch(/postgres/)
    expect(
      refusal(check({ ...fullEnv(config, 'local'), RUN_MIGRATIONS: 'yes' }), 'RUN_MIGRATIONS'),
    ).toMatch(/"1" in the web process/)
  })
})
