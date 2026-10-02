/**
 * Test helpers for the boot-check tests — never imported by shipped code: a complete, valid
 * environment for each deployment environment, its hosts the ones `SITES` commits.
 */
import { createHash } from 'node:crypto'

import { SITES } from '../sites/table'
import type { DeploymentEnvironment } from './findings'

/**
 * A well-formed secret: 32 bytes that look random (a hash of the seed), since a pattern — a
 * step, a run, a block repeated — is refused like a short key.
 */
export const secret = (seed: number) =>
  createHash('sha256').update(`link-key-${seed}`).digest().toString('base64url')

const STRONG = 'x'.repeat(40)

/** Each site's hosts in `environment`: its committed names, canonical first, plus an alias. */
export function hostsEnv(environment: DeploymentEnvironment): Record<string, string> {
  const { gallery, shop } = SITES
  const [galleryHost, shopHost] = [gallery, shop].map((site) => site.hostnames[environment][0])
  const alias = environment === 'local' ? '' : `,www.${galleryHost}`
  return { GALLERY_HOSTS: `${galleryHost}${alias}`, SHOP_HOSTS: `${shopHost}` }
}

/** A complete environment for `environment`. */
export function fullEnv(environment: DeploymentEnvironment): Record<string, string> {
  return {
    NODE_ENV: environment === 'local' ? 'development' : 'production',
    ...hostsEnv(environment),
    DATABASE_URL: 'postgres://app:pw@localhost:5432/indies_test',
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
  }
}
