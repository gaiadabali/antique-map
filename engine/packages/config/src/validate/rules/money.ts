/**
 * The money rules of `validateBrandConfigs()` (C1's header list): markets partition the world,
 * sellers cover every market, the rupiah rule, a price ladder for every derived currency, and
 * trade minimums in a currency whichever seller quotes can charge. These are the rules whose
 * breach costs money or breaks the law, so each message says which (COMMERCE.md §2–3,
 * COMPLIANCE.md §1).
 */
import type { BrandConfig, SellerConfig } from '../../schema'
import type { Report } from '../issues'

const RUPIAH =
  'the rupiah rule: a delivery in Indonesia is priced and charged in IDR alone (COMPLIANCE.md §1)'

export function checkMoney(config: BrandConfig, report: Report): void {
  checkMarkets(config, report)
  checkRupiah(config, report)
  checkLadders(config, report)
  checkTradeCurrency(config, report)
}

function serves(seller: SellerConfig, destination: string): boolean {
  return seller.serves.destinations.includes(destination)
}

function checkMarkets({ money, sellers }: BrandConfig, report: Report): void {
  const owner = new Map<string, string>()
  money.markets.forEach((market, i) => {
    market.destinations.forEach((destination, j) => {
      const path = ['money', 'markets', i, 'destinations', j]
      const taken = owner.get(destination)
      if (taken !== undefined) {
        const what = destination === '*' ? 'only one market may catch "*"' : 'markets are disjoint'
        report(path, `"${destination}" is already in market "${taken}": ${what}`)
      } else {
        owner.set(destination, market.id)
      }
      const covered =
        destination === '*'
          ? sellers.some((seller) => serves(seller, '*'))
          : sellers.some((seller) => serves(seller, destination) || serves(seller, '*'))
      if (!covered) {
        report(path, `no seller serves "${destination}", so market "${market.id}" can sell nothing`)
      }
    })
  })
}

function checkRupiah({ money, sellers }: BrandConfig, report: Report): void {
  if (!sellers.some((seller) => serves(seller, 'ID') || serves(seller, '*'))) return
  const at = money.markets.findIndex((market) => market.destinations.includes('ID'))
  const market = money.markets[at]
  if (!market) {
    report(
      ['money', 'markets'],
      `no market lists "ID", though a seller delivers there — add one for ["ID"] priced in IDR (${RUPIAH})`,
    )
  } else if (market.currency !== 'IDR') {
    report(
      ['money', 'markets', at, 'currency'],
      `must be "IDR" for market "${market.id}" (${RUPIAH})`,
    )
  }
  // The seller an Indonesian delivery routes to: one that lists "ID" itself, or failing that,
  // one serving "*" — either way it charges rupiah.
  const explicit = sellers.filter((seller) => serves(seller, 'ID'))
  const routed = explicit.length > 0 ? explicit : sellers.filter((seller) => serves(seller, '*'))
  for (const seller of routed) {
    if (seller.charge.includes('IDR')) continue
    const why = explicit.length > 0 ? 'serves "ID"' : 'serves "*" and no seller serves "ID" itself'
    report(
      ['sellers', sellers.indexOf(seller), 'charge'],
      `must include "IDR": seller "${seller.id}" ${why} (${RUPIAH})`,
    )
  }
}

function checkLadders({ money }: BrandConfig, report: Report): void {
  const derived = new Set(
    money.markets.map((market) => market.currency).filter((currency) => currency !== money.base),
  )
  for (const currency of derived) {
    const ladder = money.rounding[currency]
    if (!ladder) {
      report(
        ['money', 'rounding', currency],
        `needs a price ladder: ${currency} prices are derived from ${money.base} and rounded up to a price point (COMMERCE.md §3)`,
      )
      continue
    }
    ladder.forEach((band, k) => {
      // A band's lower bound is the previous band's upTo; the first band's is its own upTo.
      const lower = k === 0 ? band.upTo : (ladder[k - 1]?.upTo ?? null)
      if (lower !== null && band.step * 10 > lower) {
        report(
          ['money', 'rounding', currency, k, 'step'],
          `${band.step} is more than a tenth of ${lower}, so rounding up could add more than 10 % to a price`,
        )
      }
    })
  }
}

function checkTradeCurrency({ commerce, sellers }: BrandConfig, report: Report): void {
  commerce.trade?.tiers.forEach((tier, i) => {
    if (tier.minimum.kind !== 'amount') return
    const { currency } = tier.minimum.amount
    for (const seller of sellers) {
      if (seller.charge.includes(currency)) continue
      report(
        ['commerce', 'trade', 'tiers', i, 'minimum', 'amount', 'currency'],
        `is ${currency}, which seller "${seller.id}" does not charge: the seller serving a partner's destination quotes it, and may be any seller`,
      )
    }
  })
}
