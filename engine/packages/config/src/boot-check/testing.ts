/**
 * Test helpers for the boot-check tests — never imported by shipped code: a config that can
 * run anywhere (the synthetic brand's, given domains and no drafts) and a complete, valid
 * environment for each deployment environment.
 */
import { createHash } from 'node:crypto'

import { brandConfigSchema, type BrandConfig } from '../schema'
import { REPO_ROOT, testBrandConfig } from '../validate/testing/fixtures'
import type { DeploymentEnvironment } from './findings'
import {
  FULFILMENT_SECRETS,
  PAYMENT_SECRETS,
  secretPrefix,
  SHIPPING_SECRETS,
} from './provider-secrets'

export { REPO_ROOT }

export const DOMAINS = { production: 'shop.example.com', staging: 'staging.example.com' }

/** The synthetic gallery config, deployable: real-looking domains, no drafts. */
export function deployableConfig(
  change: (raw: ReturnType<typeof testBrandConfig>) => void = () => {},
): BrandConfig {
  const raw = testBrandConfig('gallery')
  raw.domains = { ...DOMAINS, aliases: ['alias.example.com'] }
  ;(raw.sellers as { draft: boolean }[]).forEach((seller) => (seller.draft = false))
  change(raw)
  return brandConfigSchema.parse(raw)
}

/**
 * A well-formed secret: 32 bytes that look random (a hash of the seed), since a pattern — a
 * step, a run, a block repeated — is refused like a short key.
 */
export const secret = (seed: number) =>
  createHash('sha256').update(`link-key-${seed}`).digest().toString('base64url')

const SAMPLE: Record<string, { sandbox: string; live: string }> = {
  SECRET_KEY: { sandbox: 'sk_test_51Fixture', live: 'sk_live_51Fixture' },
  PUBLISHABLE_KEY: { sandbox: 'pk_test_51Fixture', live: 'pk_live_51Fixture' },
  WEBHOOK_SECRET: { sandbox: 'whsec_fixture', live: 'whsec_fixture' },
  SERVER_KEY: { sandbox: 'SB-Mid-server-fixture', live: 'Mid-server-fixture' },
  CLIENT_KEY: { sandbox: 'SB-Mid-client-fixture', live: 'Mid-client-fixture' },
}
const XENDIT = { sandbox: 'xnd_development_fixture', live: 'xnd_production_fixture' }

/** Every provider secret the config needs, valid for `mode`. */
export function providerEnv(config: BrandConfig, mode: 'sandbox' | 'live'): Record<string, string> {
  const env: Record<string, string> = {}
  const fill = (
    prefix: string,
    spec: (typeof PAYMENT_SECRETS)[keyof typeof PAYMENT_SECRETS],
    provider: string,
  ) => {
    for (const { name } of spec.secrets) {
      const sample = provider === 'xendit' && name === 'SECRET_KEY' ? XENDIT : SAMPLE[name]
      env[`${prefix}_${name}`] = sample?.[mode] ?? `fixture-${name.toLowerCase()}`
    }
    if (spec.modeVariable) env[`${prefix}_MODE`] = mode
  }
  for (const seller of config.sellers) {
    for (const p of seller.payments)
      fill(secretPrefix('PAYMENT', seller.id, p), PAYMENT_SECRETS[p], p)
    for (const p of seller.shipping.providers)
      fill(secretPrefix('SHIPPING', seller.id, p), SHIPPING_SECRETS[p], p)
  }
  for (const p of config.fulfilment.providers)
    fill(secretPrefix('FULFILMENT', p), FULFILMENT_SECRETS[p], p)
  return env
}

const STRONG = 'x'.repeat(40)

/** A complete environment for `environment`, provider secrets included. */
export function fullEnv(
  config: BrandConfig,
  environment: DeploymentEnvironment,
): Record<string, string> {
  const site =
    environment === 'local'
      ? 'http://localhost:4166'
      : `https://${environment === 'staging' ? DOMAINS.staging : DOMAINS.production}`
  return {
    NODE_ENV: environment === 'local' ? 'development' : 'production',
    BRAND: 'test',
    BRAND_ROOT: '/srv/site/test',
    SITE_URL: site,
    DATABASE_URL: 'postgres://app:pw@localhost:5432/test_gallery',
    PAYLOAD_SECRET: `payload-${STRONG}`,
    REVALIDATE_SECRET: `revalidate-${STRONG}`,
    CRON_SECRET: `cron-${STRONG}`,
    S3_ENDPOINT: 'https://storage.example.com',
    S3_BUCKET: 'media',
    S3_ACCESS_KEY_ID: 'AKFIXTURE',
    S3_SECRET_ACCESS_KEY: `s3-${STRONG}`,
    MEDIA_PUBLIC_URL: 'https://media.example.com',
    MASTERS_BUCKET: 'archive-masters',
    MASTERS_ACCESS_KEY_ID: 'AKFIXTUREM',
    MASTERS_SECRET_ACCESS_KEY: `masters-${STRONG}`,
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_FROM_ADDRESS: 'desk@example.com',
    LINK_TOKEN_KEYS: `k2:${secret(2)},k1:${secret(1)}:2026-01-01`,
    ...(config.sisters.length > 0
      ? { SISTER_API_KEY: `sister-${STRONG}`, SISTER_WEBHOOK_SECRET: `sister-hook-${STRONG}` }
      : {}),
    // Production syncs with its sister's production site, never the committed staging one.
    ...(config.sisters.length > 0 && environment === 'production'
      ? { SISTER_BASE_URL: 'https://sister-production.example.com' }
      : {}),
    ...providerEnv(config, environment === 'production' ? 'live' : 'sandbox'),
  }
}
