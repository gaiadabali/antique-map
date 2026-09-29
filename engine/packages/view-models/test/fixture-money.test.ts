// Every C2 fixture's money keeps C5 (TASKS.md 2.2.l; senior-be review 2.4, S9 and F3): each
// `Money` is a safe, non-negative integer of minor units, and each `converted` estimate is a
// whole major unit of its currency. The planted fixtures below prove the walk fails on each
// break it is here to catch — €959.50 was S9's, found by hand in a scratch walk.
//
// C5 fixes no currency for `sole-currency`: it names the rupiah rule as the case where an
// Indonesian delivery shows IDR alone, not that every sole-currency price is IDR. So the walk
// records sole-currency charges by currency and asserts nothing about them.
import type { Money, PriceSet } from '@engine/domain/money'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { assertFixtureMoney, walkMoney, type WalkReport } from './money-walk'

const money = (amount: number, currency: Money['currency']): Money => ({ amount, currency })

/** A planted graph: the broken value sits inside an array inside a `Streamed` part. */
const plantedPage = (price: PriceSet) => ({
  surface: 'planted',
  rail: Promise.resolve([{ title: 'Planted', price }]),
})

describe('C2 fixtures keep C5 money', () => {
  let report: WalkReport
  let pendingTimers = 0

  beforeAll(async () => {
    // `pending()` parts resolve after an hour. On fake timers, installed before the fixtures
    // load, their timers fire at once, so the walk sees every resolved value, not a hang.
    vi.useFakeTimers()
    const fixtures = await import('../src/fixtures/index')
    pendingTimers = vi.getTimerCount()
    vi.runAllTimers()
    report = await walkMoney({ ...fixtures }, 'fixtures')
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  // Report evidence (2.2.l): run with `pnpm exec vitest run --reporter=verbose` and read the
  // counts back off `report` in a debugger, or temporarily log them — not committed here, since
  // this package has no ambient `console` under a strict `"types": []` typecheck (CI, TASKS.md
  // 2.2.l's proof step) and the counts belong in the ticket's evidence, not in test output.
  it('walks every exported fixture, streamed and pending parts included', () => {
    expect(pendingTimers).toBeGreaterThan(0)
    expect(report.money).toBeGreaterThan(0)
    expect(report.priceSets).toBeGreaterThan(0)
    expect(report.convertedEstimates).toBeGreaterThan(0)
  })

  it('finds no Money that is not integer minor units, and no estimate that is not whole', () => {
    expect(report.violations).toEqual([])
  })
})

describe('the walk fails on a planted break', () => {
  it('passes a clean converted price: USD 1,100.00 shown as ≈ €960', async () => {
    const clean = plantedPage({
      basis: 'converted',
      charge: money(110000, 'USD'),
      taxIncluded: true,
      estimate: money(96000, 'EUR'),
    })
    await expect(assertFixtureMoney(clean)).resolves.toMatchObject({ money: 2, priceSets: 1 })
  })

  it('fails an estimate of €959.50, which is no whole major unit of EUR (exponent 2)', async () => {
    const planted = plantedPage({
      basis: 'converted',
      charge: money(110000, 'USD'),
      taxIncluded: true,
      estimate: money(95950, 'EUR'),
    })
    await expect(assertFixtureMoney(planted)).rejects.toThrow(
      '$.rail<resolved>[0].price: estimate 959.50 EUR (95950 minor) is not a whole major unit',
    )
  })

  it('fails a Money whose amount is a float, not an integer of minor units', async () => {
    const planted = plantedPage({
      basis: 'market-currency',
      charge: money(1099.5, 'USD'),
      taxIncluded: true,
      estimate: null,
    })
    await expect(assertFixtureMoney(planted)).rejects.toThrow(
      '$.rail<resolved>[0].price.charge: amount 1099.5 USD is not a safe integer of minor units',
    )
  })

  it('fails a negative amount, an unsafe integer and an unknown currency', async () => {
    const planted = {
      refund: money(-500, 'USD'),
      huge: money(Number.MAX_SAFE_INTEGER + 2, 'IDR'),
      foreign: { amount: 100, currency: 'XYZ' },
    }
    const { violations } = await walkMoney(planted)
    expect(violations).toEqual([
      '$.refund: amount -500 USD is negative',
      `$.huge: amount ${Number.MAX_SAFE_INTEGER + 2} IDR is not a safe integer of minor units`,
      '$.foreign: currency XYZ is not a CurrencyCode',
    ])
  })

  it('fails a price set whose estimate contradicts its basis', async () => {
    const planted = {
      sole: {
        basis: 'sole-currency',
        charge: money(95000, 'IDR'),
        taxIncluded: true,
        estimate: money(6, 'USD'),
      },
      converted: {
        basis: 'converted',
        charge: money(95000, 'IDR'),
        taxIncluded: true,
        estimate: null,
      },
    }
    const { violations } = await walkMoney(planted)
    expect(violations).toEqual([
      '$.sole: a sole-currency price carries an estimate',
      '$.converted: a converted price carries no Money estimate',
    ])
  })
})
