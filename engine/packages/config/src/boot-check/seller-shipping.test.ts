// A seller's courier secrets follow its own couriers (C1 v1.2 `sellers[].shipping`, 3.1 senior-be
// #2): the committed gallery brand's Singapore seller ships its own stock abroad and holds no
// account with an Indonesian courier, so it names its couriers (a draft value, D1) and boots
// without Biteship's (TASKS.md 3.4.e).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { brandConfigSchema, SHIPPING_PROVIDERS, type BrandConfig } from '../schema'
import { formatIssue, validateBrandConfig } from '../validate'
import { C1_STATED_SUPPORTS } from '../validate/testing/fixtures'
import {
  bootCheck,
  formatBootReport,
  secretPrefix,
  SHIPPING_SECRETS,
  type BootReport,
} from './index'
import { fullEnv, REPO_ROOT } from './testing'

const NOW = new Date('2026-09-29T12:00:00Z')
/* eslint-disable @typescript-eslint/no-explicit-any -- the case reaches into raw JSON */
type Raw = any

/** The committed single-config brand on the gallery app — found, never named (CONVENTIONS.md §1). */
function committedGalleryBrand(): { folder: string; raw: Raw } {
  const tracked = execFileSync(
    'git',
    ['ls-files', '--cached', '-z', '--', '*/site/brand.config.json'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    },
  )
    .split('\0')
    .filter((path) => path !== '')
  const galleries = tracked
    .map((path) => ({
      folder: path.split('/')[0] ?? '',
      raw: JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8')) as Raw,
    }))
    .filter(({ raw }) => raw.storefront === 'gallery')
  expect(galleries).toHaveLength(1)
  return galleries[0]!
}

const brand = committedGalleryBrand()
const singaporeIndex = (raw: Raw): number =>
  raw.sellers.findIndex((seller: Raw) => seller.entity.country === 'SG')

/** The brand on its staging host, every secret it needs present but the ones `drop` names. */
function stagingReport(config: BrandConfig, drop: (name: string) => boolean): BootReport {
  const env: Record<string, string | undefined> = {
    ...fullEnv(config, 'staging'),
    SITE_URL: `https://${config.domains.staging}`,
  }
  for (const name of Object.keys(env)) if (drop(name)) env[name] = undefined
  return bootCheck({ env, config, now: NOW })
}
const mentions = (report: BootReport, prefix: string) =>
  [...report.problems, ...report.warnings].filter((finding) => finding.subject.startsWith(prefix))

describe('bootCheck() — per-seller courier secrets follow sellers[].shipping', () => {
  it('the committed gallery brand has a Singapore seller serving the world, and an Indonesian one', () => {
    const at = singaporeIndex(brand.raw)
    expect(at).toBeGreaterThanOrEqual(0)
    expect(brand.raw.sellers[at].id).toBe('sg')
    expect(brand.raw.sellers[at].serves.destinations).toContain('*')
    expect(brand.raw.sellers.some((seller: Raw) => seller.entity.country === 'ID')).toBe(true)
    expect(brand.raw.shipping.providers).toContain('biteship')
  })

  it('a seller that names no couriers needs every courier of the brand’s', () => {
    const raw = structuredClone(brand.raw)
    delete raw.sellers[singaporeIndex(raw)].shipping
    const config = brandConfigSchema.parse(raw)
    const sg = config.sellers[singaporeIndex(raw)]!
    expect(sg.shipping.providers).toEqual(config.shipping.providers)
    const report = stagingReport(config, (name) => name.startsWith('SHIPPING_SG_BITESHIP_'))
    expect(report.problems.map((problem) => problem.subject)).toEqual([
      'SHIPPING_SG_BITESHIP_API_KEY',
      'SHIPPING_SG_BITESHIP_WEBHOOK_SECRET',
      'SHIPPING_SG_BITESHIP_MODE',
    ])
    expect(report.problems[0]?.message).toBe(
      'is not set: seller "sg" ships by biteship (DEPLOYMENT.md §8)',
    )
  })

  it('the committed Singapore seller boots without Biteship secrets, as the file stands', () => {
    // The file, untouched: CI's own validation, then the boot on the brand's staging host.
    const valid = validateBrandConfig(structuredClone(brand.raw), {
      supports: C1_STATED_SUPPORTS.gallery,
      expect: { slug: brand.folder, storefront: null },
    })
    expect(valid.issues.map(formatIssue)).toEqual([])
    const config = brandConfigSchema.parse(structuredClone(brand.raw))
    const sg = config.sellers[singaporeIndex(brand.raw)]!
    expect(brand.raw.sellers[singaporeIndex(brand.raw)].shipping).toEqual({
      providers: ['dhl-express', 'quote', 'collect'],
    })
    expect(sg.shipping.providers).not.toContain('biteship')

    // No SHIPPING_SG_BITESHIP_* in the environment at all, and no finding asks for one.
    const report = stagingReport(config, (name) => name.startsWith('SHIPPING_SG_BITESHIP_'))
    expect(report.problems, formatBootReport(report)).toEqual([])
    expect(report.ok).toBe(true)
    expect(mentions(report, 'SHIPPING_SG_BITESHIP')).toEqual([])

    // With every SHIPPING_SG_* gone, it is asked for its own couriers' secrets and no other:
    // DHL Express's (quote and collect have none) — never Biteship's.
    const bare = stagingReport(config, (name) => name.startsWith('SHIPPING_SG_'))
    expect(bare.problems.map((problem) => problem.subject)).toEqual([
      'SHIPPING_SG_DHL_EXPRESS_API_KEY',
      'SHIPPING_SG_DHL_EXPRESS_API_SECRET',
      'SHIPPING_SG_DHL_EXPRESS_ACCOUNT_NUMBER',
      'SHIPPING_SG_DHL_EXPRESS_MODE',
    ])
    expect(bare.problems[0]?.message).toBe(
      'is not set: seller "sg" ships by dhl-express (DEPLOYMENT.md §8)',
    )
    const asked = SHIPPING_PROVIDERS.filter((provider) =>
      bare.problems.some((problem) =>
        problem.subject.startsWith(`${secretPrefix('SHIPPING', 'sg', provider)}_`),
      ),
    )
    const own = sg.shipping.providers.filter((each) => SHIPPING_SECRETS[each].secrets.length > 0)
    expect(asked).toEqual(own)

    // The Indonesian seller names none, so it ships with all the brand's couriers, Biteship's too.
    expect(
      stagingReport(config, (name) => name.startsWith('SHIPPING_ID_BITESHIP_')).problems.map(
        (problem) => problem.subject,
      ),
    ).toEqual([
      'SHIPPING_ID_BITESHIP_API_KEY',
      'SHIPPING_ID_BITESHIP_WEBHOOK_SECRET',
      'SHIPPING_ID_BITESHIP_MODE',
    ])
  })
})
