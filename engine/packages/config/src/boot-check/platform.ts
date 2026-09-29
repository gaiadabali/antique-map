/**
 * The process's own environment (DEPLOYMENT.md §8) and what the config may not be where it
 * runs: the database and Payload secrets, storage, mail, the cron and revalidation secrets,
 * the link-key ring, the sister's secrets, the loader source, and no placeholder anywhere a
 * buyer can pay. A development default such as `dev-only-not-a-secret` (`.env.example`) or
 * MinIO's `minioadmin` is refused on a deployed host.
 */
import { isAbsolute } from 'node:path'

import type { BrandConfig } from '../schema'
import { read, type DeploymentEnvironment, type Findings } from './findings'
import { parseLinkTokenKeys } from './link-keys'

type Env = Readonly<Record<string, string | undefined>>

export const LOADERS_SOURCES = ['payload', 'fixtures'] as const
export type LoadersSource = (typeof LOADERS_SOURCES)[number]

/** Needed wherever the process runs: without them it cannot serve a page or derive a link. */
const ALWAYS = ['DATABASE_URL', 'PAYLOAD_SECRET'] as const
/** Needed on a deployed host; a workstation may run without (media, mail, jobs degrade). */
const DEPLOYED = [
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'MEDIA_PUBLIC_URL',
  'MASTERS_BUCKET',
  'MASTERS_ACCESS_KEY_ID',
  'MASTERS_SECRET_ACCESS_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_FROM_ADDRESS',
  'REVALIDATE_SECRET',
  'CRON_SECRET',
] as const
/** Shared secrets that must be long and not a development default once deployed. */
const STRONG = [
  'PAYLOAD_SECRET',
  'REVALIDATE_SECRET',
  'CRON_SECRET',
  'SISTER_API_KEY',
  'SISTER_WEBHOOK_SECRET',
] as const
const DEV_DEFAULTS = /dev-only|not-a-secret|^minioadmin$|^changeme$|^secret$/i
const MIN_SECRET_LENGTH = 32

export function checkPlatform(
  env: Env,
  config: BrandConfig,
  environment: DeploymentEnvironment,
  findings: Findings,
  now: Date,
): LoadersSource {
  for (const name of ALWAYS) {
    if (read(env, name) === undefined) findings.refuse(name, 'is not set (DEPLOYMENT.md §8)')
  }
  const brandRoot = read(env, 'BRAND_ROOT')
  if (environment !== 'local' && (brandRoot === undefined || !isAbsolute(brandRoot))) {
    // Unset or relative, the loader searches upwards from the working directory, as far as the
    // filesystem root: fine on a workstation, never on a host, which names the folder it ships.
    findings.refuse(
      'BRAND_ROOT',
      brandRoot === undefined
        ? 'is not set: a deployed process names the brand folder its artifact ships (DEPLOYMENT.md §8)'
        : 'must be an absolute path on a deployed host, never one searched for',
    )
  }
  for (const name of DEPLOYED) {
    if (read(env, name) === undefined)
      findings.require(name, 'is not set (DEPLOYMENT.md §8)', environment)
  }
  const database = read(env, 'DATABASE_URL')
  if (database !== undefined && !/^postgres(?:ql)?:\/\//.test(database)) {
    findings.refuse('DATABASE_URL', 'is not a postgres:// connection string')
  }
  const migrations = read(env, 'RUN_MIGRATIONS')
  if (migrations !== undefined && migrations !== '1') {
    findings.refuse(
      'RUN_MIGRATIONS',
      'is "1" in the web process and unset everywhere else (DEPLOYMENT.md §2)',
    )
  } else if (migrations === '1' && read(env, 'NODE_ENV') !== 'production') {
    // Payload applies its bundled migrations on boot only in a production build: said here, so a
    // dev server given the web process's variables never looks migrated when it is not.
    findings.warn(
      'RUN_MIGRATIONS',
      'is "1", but this is not a production build: Payload migrates on boot only when NODE_ENV=production — migrate with pnpm --filter @engine/cms migrate (DEPLOYMENT.md §4)',
    )
  }

  if (environment !== 'local') {
    for (const name of STRONG) {
      const value = read(env, name)
      if (value === undefined) continue
      if (DEV_DEFAULTS.test(value) || value.length < MIN_SECRET_LENGTH) {
        findings.refuse(
          name,
          `must be a real secret of ${MIN_SECRET_LENGTH} characters or more, never a development default`,
        )
      }
    }
    for (const name of [
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'MASTERS_ACCESS_KEY_ID',
      'MASTERS_SECRET_ACCESS_KEY',
    ]) {
      const value = read(env, name)
      if (value !== undefined && DEV_DEFAULTS.test(value)) {
        findings.refuse(
          name,
          "is a development default (MinIO's root user): a deployed host has its own scoped key",
        )
      }
    }
  }

  const ring = parseLinkTokenKeys(read(env, 'LINK_TOKEN_KEYS'), now)
  for (const problem of ring.problems) findings.refuse('LINK_TOKEN_KEYS', problem)
  for (const warning of ring.warnings) findings.warn('LINK_TOKEN_KEYS', warning)

  if (config.sisters.length > 0) {
    const [sister] = config.sisters
    for (const name of ['SISTER_API_KEY', 'SISTER_WEBHOOK_SECRET']) {
      if (read(env, name) === undefined) {
        findings.require(
          name,
          `is not set: the brand syncs with its sister "${sister?.slug}" (C12)`,
          environment,
        )
      }
    }
  }
  checkPlaceholders(config, environment, findings)
  return loadersSource(env, environment, findings)
}

function checkPlaceholders(
  config: BrandConfig,
  environment: DeploymentEnvironment,
  findings: Findings,
): void {
  const drafts = [
    ...(config.draft ? [{ subject: 'draft', what: 'the brand config is a draft' }] : []),
    ...config.sellers.flatMap((seller, i) =>
      seller.draft
        ? [
            {
              subject: `sellers[${i}].draft`,
              what: `seller "${seller.id}" is a placeholder legal entity (D1–D3)`,
            },
          ]
        : [],
    ),
  ]
  for (const { subject, what } of drafts) {
    if (environment === 'production')
      findings.refuse(subject, `${what}: production sells under real entities only`)
    else if (environment === 'staging') findings.warn(subject, `${what}; staging shows it as it is`)
  }
}

function loadersSource(
  env: Env,
  environment: DeploymentEnvironment,
  findings: Findings,
): LoadersSource {
  const value = read(env, 'LOADERS_SOURCE') ?? 'payload'
  const source = LOADERS_SOURCES.find((each) => each === value)
  if (!source) {
    findings.refuse('LOADERS_SOURCE', `is "${value}"; it is "payload" (the default) or "fixtures"`)
    return 'payload'
  }
  if (source === 'fixtures' && environment === 'production') {
    findings.refuse(
      'LOADERS_SOURCE',
      'is "fixtures": production renders the catalogue, never the fixtures (DESIGN-SYSTEM.md §3)',
    )
  } else if (source === 'fixtures' && environment === 'staging') {
    findings.warn(
      'LOADERS_SOURCE',
      'is "fixtures": staging is rendering fixtures, not its database',
    )
  }
  return source
}
