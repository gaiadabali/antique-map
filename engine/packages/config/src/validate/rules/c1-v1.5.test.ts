// The validateBrandConfigs() rules C1 v1.5 adds (TASKS.md 6.5.e) — `buy` only with
// `purchase.checkout`, `call` only with a phone, an invoice's reminder inside its default term —
// and the gallery's refusals (6.5.d: D50, D54), each failing a planted breakage by its field.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { hasSurface } from '../../routes'
import { brandConfigSchema, type Storefront } from '../../schema'
import {
  discoverBrandConfigs,
  formatIssue,
  validateBrandConfig,
  validateBrandConfigs,
} from '../index'
import { C1_STATED_SUPPORTS, REPO_ROOT, testBrandConfig } from '../testing/fixtures'

/* eslint-disable @typescript-eslint/no-explicit-any -- each case reaches into raw JSON */
type Raw = any
const issuesOf = (storefront: Storefront, mutate: (raw: Raw) => void) => {
  const raw: Raw = testBrandConfig(storefront)
  mutate(raw)
  return validateBrandConfig(raw, { supports: C1_STATED_SUPPORTS[storefront] }).issues.map(
    formatIssue,
  )
}

describe('validateBrandConfig() — C1 v1.5 rules', () => {
  it('refuses "buy" while purchase.checkout is off, and takes it once the bag is on', () => {
    const buying = (raw: Raw) =>
      (raw.commerce.purchaseTiers = [{ upTo: null, primary: 'buy', secondary: ['enquire'] }])
    expect(
      issuesOf('emporium', (raw) => {
        buying(raw)
        raw.modules['purchase.checkout'] = false
      }),
    ).toEqual([
      'commerce.purchaseTiers[0].primary: "buy" opens a flow of "purchase.checkout", which is off',
    ])
    expect(issuesOf('emporium', buying)).toEqual([])
  })

  it('refuses no tiers at all for one-of-ones with no bag: an empty list leads with "buy"', () => {
    expect(issuesOf('emporium', (raw) => (raw.modules['purchase.checkout'] = false))).toEqual([
      'commerce.purchaseTiers: is empty, so every unique item would lead with "buy", whose module "purchase.checkout" is off: give a tier the actions it leads with (D50)',
    ])
    // Without one-of-ones there is no unique item's panel to lead.
    expect(
      issuesOf('emporium', (raw) => {
        raw.modules['purchase.checkout'] = false
        raw.modules['catalogue.unique'] = false
      }),
    ).toEqual([])
  })

  it('refuses "call" with no phone to dial', () => {
    expect(issuesOf('gallery', (raw) => (raw.identity.contact.phone = null))).toEqual([
      'commerce.purchaseTiers[0].secondary[0]: "call" needs identity.contact.phone, the number the link dials',
    ])
  })

  it('refuses an invoice reminder at or past its default term, in hours', () => {
    const term = (notice: number) => (raw: Raw) =>
      (raw.commerce.ttl = { invoiceHoldDays: 3, invoiceNoticeHours: notice })
    expect(issuesOf('gallery', term(72))).toEqual([
      "commerce.ttl.invoiceNoticeHours: 72 must be below invoiceHoldDays in hours (72): the reminder goes out before the invoice's term lapses (D45)",
    ])
    expect(issuesOf('gallery', term(71))).toEqual([])
    // The defaults — three days, a day's notice (D45) — leave the term room.
    expect(issuesOf('gallery', (raw) => (raw.commerce.ttl = {}))).toEqual([])
  })
})

describe('the gallery app refuses what D50 and D54 cut', () => {
  const refused = [
    'purchase.checkout',
    'purchase.offers',
    'purchase.holds',
    'accounts.buyers',
    'retention.wishlist',
    'retention.wantList',
    'accounts.retailers',
  ] as const

  it.each(refused)('fails a gallery config with %s on', (module) => {
    expect(issuesOf('gallery', (raw) => (raw.modules[module] = true))).toContain(
      `modules['${module}']: is on, but the gallery app cannot render it (its supports omit it, BRANDS.md §6)`,
    )
  })

  it('fails a gallery config with "buy" in a tier, wherever it stands', () => {
    // Beside prices on request, the commerce schema refuses it (D50).
    expect(
      issuesOf('gallery', (raw) => raw.commerce.purchaseTiers[0].secondary.push('buy')),
    ).toEqual([
      'commerce.purchaseTiers[0].secondary[5]: "buy" has no price to charge while uniquePrices is "on-request" (D50)',
    ])
    // With prices shown, the bag it opens is off — and the gallery can never turn it on.
    expect(
      issuesOf('gallery', (raw) => {
        raw.commerce.uniquePrices = 'shown'
        raw.commerce.purchaseTiers[0].primary = 'buy'
      }),
    ).toEqual([
      'commerce.purchaseTiers[0].primary: "buy" opens a flow of "purchase.checkout", which is off',
    ])
  })

  it('passes the synthetic gallery, which follows the launch config (6.5.a)', () => {
    const raw: Raw = testBrandConfig('gallery')
    expect(raw.commerce.uniquePrices).toBe('on-request')
    expect(raw.commerce.purchaseTiers).toEqual([
      {
        upTo: null,
        primary: 'whatsapp',
        secondary: ['call', 'requestPrice', 'enquire', 'viewing', 'proforma'],
      },
    ])
    expect(issuesOf('gallery', () => {})).toEqual([])
  })
})

describe('every committed brand config (6.5.f)', () => {
  const committed = discoverBrandConfigs(REPO_ROOT).map((place) => {
    const config = brandConfigSchema.parse(JSON.parse(readFileSync(place.file, 'utf8')))
    return { name: place.name, config }
  })
  const on = (storefront: Storefront) =>
    committed.filter(({ config }) => config.storefront === storefront)

  it('passes validateBrandConfigs() against each app’s supports', () => {
    const report = validateBrandConfigs({ repoRoot: REPO_ROOT, supports: C1_STATED_SUPPORTS })
    expect(report.text).not.toContain('✗')
    expect(report.ok).toBe(true)
  })

  it('gives no gallery a cart, a checkout or an account area, and every shop its cart', () => {
    expect(on('gallery').length).toBeGreaterThanOrEqual(2) // a real brand and the synthetic one
    expect(on('emporium').length).toBeGreaterThanOrEqual(2)
    for (const { name, config } of on('gallery')) {
      for (const surface of ['cart', 'checkout', 'account'] as const) {
        expect(hasSurface(config, surface), `${name}: ${surface}`).toBe(false)
      }
      expect(hasSurface(config, 'wishlist'), `${name}: wishlist`).toBe(true)
      expect(hasSurface(config, 'pay'), `${name}: pay`).toBe(true)
    }
    for (const { name, config } of on('emporium')) {
      expect(hasSurface(config, 'cart'), `${name}: cart`).toBe(true)
      expect(hasSurface(config, 'checkout'), `${name}: checkout`).toBe(true)
    }
  })
})
