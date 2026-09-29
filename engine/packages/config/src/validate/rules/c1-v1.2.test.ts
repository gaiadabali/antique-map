// The validateBrandConfigs() rules C1 v1.2 adds (TASKS.md 3.4.b; 3.1 senior-be #2, #9), each
// failing a planted breakage with a message naming its field — beside `../rules.test.ts`, which
// holds the rules 3.1 wrote.
import { describe, expect, it } from 'vitest'

import { formatIssue, validateBrandConfig } from '../index'
import { C1_STATED_SUPPORTS, testBrandConfig } from '../testing/fixtures'

/* eslint-disable @typescript-eslint/no-explicit-any -- each case reaches into raw JSON */
type Raw = any
const issuesOf = (storefront: 'gallery' | 'emporium', mutate: (raw: Raw) => void) => {
  const raw: Raw = testBrandConfig(storefront)
  mutate(raw)
  return validateBrandConfig(raw, { supports: C1_STATED_SUPPORTS[storefront] }).issues.map(
    formatIssue,
  )
}

describe('validateBrandConfig() — C1 v1.2 rules', () => {
  it('refuses sister.links with no sister to link to', () => {
    for (const storefront of ['gallery', 'emporium'] as const) {
      expect(issuesOf(storefront, (raw) => (raw.sisters = []))).toEqual([
        'modules[\'sister.links\']: needs a sister in "sisters": its cross-links and work sync are with that brand (BRANDS.md §5)',
      ])
    }
    // Off, the brand needs none.
    expect(
      issuesOf('gallery', (raw) => {
        raw.sisters = []
        raw.modules['sister.links'] = false
      }),
    ).toEqual([])
  })

  it('refuses a derived currency with no FX buffer, and takes "0" as a buffer', () => {
    expect(issuesOf('gallery', (raw) => delete raw.money.fx.bufferPct.GBP)).toEqual([
      'money.fx.bufferPct.GBP: needs a buffer: GBP prices are derived from USD at the day\'s rate plus this percentage — write "0" for none, rather than leave it to a silent 0 % (COMMERCE.md §3)',
    ])
    expect(issuesOf('emporium', (raw) => delete raw.money.fx.bufferPct.USD)).toEqual([
      expect.stringMatching(
        /^money\.fx\.bufferPct\.USD: needs a buffer: USD prices are derived from IDR/,
      ),
    ])
    expect(issuesOf('gallery', (raw) => (raw.money.fx.bufferPct.GBP = '0'))).toEqual([])
    // The base currency is never derived, so it needs none: the gallery's USD has no buffer.
    expect((testBrandConfig('gallery') as Raw).money).toMatchObject({ base: 'USD' })
    expect((testBrandConfig('gallery') as Raw).money.fx.bufferPct.USD).toBeUndefined()
    expect(issuesOf('gallery', () => {})).toEqual([])
  })

  it('refuses a seller courier the brand does not list', () => {
    expect(
      issuesOf('gallery', (raw) => {
        raw.shipping.providers = ['dhl-express', 'quote', 'collect']
        raw.sellers[0].shipping = { providers: ['dhl-express', 'biteship'] }
      }),
    ).toEqual([
      'sellers[0].shipping.providers[1]: "biteship" is not one of the brand\'s shipping.providers (dhl-express, quote, collect): a seller ships with some of the couriers the brand lists',
    ])
  })

  it('refuses a courier listed twice in a seller’s own list, and reports the brand’s once', () => {
    expect(
      issuesOf('gallery', (raw) => (raw.sellers[1].shipping = { providers: ['quote', 'quote'] })),
    ).toEqual(['sellers[1].shipping.providers[1]: "quote" is listed twice'])
    // Both sellers inherit the brand's list: its repeat is the brand's field, reported once.
    expect(
      issuesOf('gallery', (raw) => (raw.shipping.providers = ['quote', 'collect', 'quote'])),
    ).toEqual(['shipping.providers[2]: "quote" is listed twice'])
  })

  it('refuses a menu link to the account area when neither account module is on (be #5)', () => {
    const linked = (raw: Raw) =>
      raw.identity.navigation.footer.push({ surface: 'account', label: { en: 'Account' } })
    expect(issuesOf('gallery', linked)).toEqual([])
    expect(
      issuesOf('gallery', (raw) => {
        linked(raw)
        raw.modules['accounts.buyers'] = false
        // Nothing that needs an account stays on.
        raw.modules['retention.wishlist'] = false
        raw.modules['retention.wantList'] = false
      }),
    ).toEqual([
      'identity.navigation.footer[2].surface: links to "account", whose modules "accounts.buyers" and "accounts.retailers" are all off, so the link would lead nowhere',
    ])
  })

  it('passes a seller naming some of the brand’s couriers', () => {
    expect(
      issuesOf('gallery', (raw) => {
        raw.sellers[0].shipping = { providers: ['dhl-express', 'quote', 'collect'] }
        raw.sellers[1].shipping = { providers: ['biteship', 'flat', 'collect'] }
      }),
    ).toEqual([])
  })
})
