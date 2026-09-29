import { describe, expect, it } from 'vitest'

import { formatIssue, validateBrandConfig } from './index'
import { C1_STATED_SUPPORTS, testBrandConfig } from './testing/fixtures'

/* eslint-disable @typescript-eslint/no-explicit-any -- each case reaches into raw JSON */
type Raw = any
type Case = [
  name: string,
  storefront: 'gallery' | 'emporium',
  mutate: (c: Raw) => void,
  expected: string,
]

const cases: Case[] = [
  // Modules (C1: modules ⊆ supports, D35, D39, D32)
  [
    'a module the app cannot render',
    'gallery',
    (c) => (c.modules['accounts.retailers'] = true),
    "modules['accounts.retailers']: is on, but the gallery app cannot render it",
  ],
  [
    'wantList without accounts.buyers',
    'gallery',
    (c) => (c.modules['accounts.buyers'] = false),
    'modules[\'retention.wantList\']: needs "accounts.buyers" on as well: its lists are a buyer account’s (D39)',
  ],
  [
    'wantList without emailWantList',
    'gallery',
    (c) => (c.modules['retention.emailWantList'] = false),
    'modules[\'retention.wantList\']: needs "retention.emailWantList" on as well',
  ],
  [
    'wishlist beside deviceWishlist',
    'gallery',
    (c) => (c.modules['retention.deviceWishlist'] = true),
    'modules[\'retention.deviceWishlist\']: cannot be on beside "retention.wishlist"',
  ],
  [
    'retailers without trade terms',
    'emporium',
    (c) => (c.commerce.trade = null),
    'commerce.trade: must be set while "accounts.retailers" is on',
  ],
  [
    'a tier action whose module is off',
    'gallery',
    (c) => (c.modules['purchase.offers'] = false),
    'commerce.purchaseTiers[1].secondary[1]: "offer" opens a flow of "purchase.offers", which is off',
  ],
  [
    'a WhatsApp action with no number',
    'gallery',
    (c) => (c.identity.contact.whatsapp = null),
    'commerce.purchaseTiers[0].secondary[1]: "whatsapp" needs identity.contact.whatsapp',
  ],
  // Routes and text
  [
    'a supported locale with no segment map',
    'gallery',
    (c) => delete c.routes.nl,
    'routes.nl: is missing: "nl" is a supported locale',
  ],
  [
    'a module that is on with no segment',
    'gallery',
    (c) => delete c.routes.id.story,
    'routes.id.story: needs a segment: its module "content.journal" is on',
  ],
  [
    'a form kind that is on with no segment',
    'emporium',
    (c) => delete c.routes.en.forms.hold,
    'routes.en.forms.hold: needs a segment: its module "purchase.holds" is on',
  ],
  [
    'a menu entry with no default-locale text',
    'emporium',
    (c) => delete c.identity.navigation.header[0].label.id,
    "identity.navigation.header[0].label.id: needs the default locale's text",
  ],
  [
    'an announcement with no default-locale text',
    'gallery',
    (c) => (c.identity.announcement = { id: 'Halo' }),
    "identity.announcement.en: needs the default locale's text",
  ],
  [
    'a menu link to a surface whose module is off',
    'gallery',
    (c) => (c.modules['content.journal'] = false),
    'identity.navigation.header[2].surface: links to "story", whose module "content.journal" is off',
  ],
  [
    'a page link without a slug',
    'gallery',
    (c) => delete c.identity.navigation.footer[1].slug,
    'identity.navigation.footer[1].slug: a "page" link needs the slug of its CMS page',
  ],
  [
    'a named facet with no vocabulary in a locale',
    'gallery',
    (c) => delete c.routes.facets.vocabularies.objectType.nl,
    'routes.facets.vocabularies.objectType.nl: is missing',
  ],
  [
    'a display face not declared',
    'gallery',
    (c) => (c.tokens['--font-display'] = '"Fixture Serif", serif'),
    'tokens[\'--font-display\']: starts with "Fixture Serif", which assets.fonts does not declare',
  ],
  // Money (COMMERCE.md §2–3, COMPLIANCE.md §1)
  [
    'a destination in two markets',
    'gallery',
    (c) => c.money.markets[2].destinations.push('SG'),
    'money.markets[2].destinations[4]: "SG" is already in market "sg": markets are disjoint',
  ],
  [
    'two markets catching the rest of the world',
    'gallery',
    (c) => c.money.markets[2].destinations.push('*'),
    'money.markets[5].destinations[0]: "*" is already in market "eu": only one market may catch "*"',
  ],
  [
    'a market no seller serves',
    'gallery',
    (c) => (c.sellers[0].serves.destinations = ['SG', 'AU', 'GB']),
    'money.markets[2].destinations[0]: no seller serves "NL", so market "eu" can sell nothing',
  ],
  [
    'no rupiah market though a seller delivers to Indonesia',
    'emporium',
    (c) => c.money.markets.splice(0, 1),
    'money.markets: no market lists "ID", though a seller delivers there',
  ],
  [
    'an Indonesian market priced in dollars',
    'gallery',
    (c) => (c.money.markets[0].currency = 'USD'),
    'money.markets[0].currency: must be "IDR" for market "id" (the rupiah rule',
  ],
  [
    'a seller serving ID that cannot charge IDR',
    'gallery',
    (c) => (c.sellers[1].charge = ['USD']),
    'sellers[1].charge: must include "IDR": seller "id" serves "ID"',
  ],
  [
    'the catch-all seller that cannot charge IDR',
    'emporium',
    (c) => (c.sellers[0].charge = ['USD']),
    'sellers[0].charge: must include "IDR": seller "id" serves "*", Indonesia included',
  ],
  [
    // Routing is by stock location too: Singapore stock to Jakarta is the "*" seller's (D29).
    'a "*" seller beside an "ID" seller that cannot charge IDR',
    'gallery',
    (c) => (c.sellers[0].charge = ['USD', 'EUR', 'SGD', 'AUD', 'GBP']),
    'sellers[0].charge: must include "IDR": seller "sg" serves "*", Indonesia included',
  ],
  [
    'a derived currency with no ladder',
    'gallery',
    (c) => delete c.money.rounding.GBP,
    'money.rounding.GBP: needs a price ladder: GBP prices are derived from USD',
  ],
  [
    'a ladder step over a tenth of its band',
    'gallery',
    (c) => (c.money.rounding.IDR[1].step = 50000),
    'money.rounding.IDR[1].step: 50000 is more than a tenth of 100000',
  ],
  [
    'a trade minimum some seller cannot charge',
    'emporium',
    (c) => (c.sellers[1].charge = ['USD', 'EUR']),
    'commerce.trade.tiers[0].minimum.amount.currency: is IDR, which seller "sg" does not charge',
  ],
  // Commerce
  [
    'a hold notice after the hold ends',
    'gallery',
    (c) => (c.commerce.ttl = { holdNoticeHours: 48 }),
    'commerce.ttl.holdNoticeHours: 48 must be below holdDefaultHours (48)',
  ],
  [
    'a default hold past the maximum',
    'gallery',
    (c) => (c.commerce.ttl = { holdDefaultHours: 96 }),
    'commerce.ttl.holdDefaultHours: 96 must not pass holdMaxHours (72)',
  ],
  [
    'a checkout lock past its ceiling',
    'gallery',
    (c) => (c.commerce.ttl = { checkoutLockMinutes: 240 }),
    'commerce.ttl.checkoutLockMinutes: 240 must fit within checkoutLockMaxHours (3 h)',
  ],
  [
    'two sellers sharing a document prefix',
    'gallery',
    (c) => (c.sellers[1].documentPrefix = 'TSG'),
    'sellers[1].documentPrefix: "TSG" is seller "sg"\'s too',
  ],
  [
    'a provider listed twice in one seller',
    'gallery',
    (c) => c.sellers[0].payments.push('stripe'),
    'sellers[0].payments[4]: "stripe" is listed twice',
  ],
]

describe('validateBrandConfig() — the rules C1 leaves to it, each naming its field', () => {
  it.each(cases)('%s', (_name, storefront, mutate, expected) => {
    const config = testBrandConfig(storefront)
    mutate(config)
    const result = validateBrandConfig(config, { supports: C1_STATED_SUPPORTS[storefront] })
    expect(result.ok).toBe(false)
    const messages = result.issues.map(formatIssue)
    expect(
      messages.some((message) => message.startsWith(expected)),
      messages.join('\n'),
    ).toBe(true)
  })

  it('passes both committed synthetic configs untouched', () => {
    for (const storefront of ['gallery', 'emporium'] as const) {
      const result = validateBrandConfig(testBrandConfig(storefront), {
        supports: C1_STATED_SUPPORTS[storefront],
        expect: { slug: 'test', storefront },
      })
      expect(result.issues.map(formatIssue)).toEqual([])
    }
  })

  it('reports a schema failure by path, before any rule runs', () => {
    const config = testBrandConfig('gallery')
    config.modules['retention.wantlist'] = true // misspelt: a type error, never a feature off
    const result = validateBrandConfig(config)
    expect(result.config).toBeNull()
    expect(result.issues.map(formatIssue).join('\n')).toMatch(/^modules/)
  })
})
