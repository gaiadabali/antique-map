/**
 * The money rules of `validateBrandConfigs()` (C1's header list): markets partition the world,
 * sellers cover every market, the rupiah rule, a price ladder and an FX buffer for every
 * derived currency, and trade minimums in a currency whichever seller quotes can charge. These
 * are the rules whose breach costs money or breaks the law, so each message says which
 * (COMMERCE.md §2–3, COMPLIANCE.md §1).
 */
import type { BrandConfig, CurrencyCode, SellerConfig } from '../../schema'
import type { Report } from '../issues'

const RUPIAH =
  'the rupiah rule: a delivery in Indonesia is priced and charged in IDR alone (COMPLIANCE.md §1)'

export function checkMoney(config: BrandConfig, report: Report): void {
  checkMarkets(config, report)
  checkRupiah(config, report)
  checkLadders(config, report)
  checkBuffers(config, report)
  checkTradeCurrency(config, report)
}

/** The market currencies whose prices are derived from the base: every one but the base. */
function derivedCurrencies(money: BrandConfig['money']): Set<CurrencyCode> {
  return new Set(
    money.markets.map((market) => market.currency).filter((currency) => currency !== money.base),
  )
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
  // Every seller that can be routed an Indonesian delivery charges rupiah. Routing goes by stock
  // location as well as destination (COMMERCE.md §2), so a "*" seller gets Indonesian orders
  // for its own stock even beside a seller listing "ID" itself (D29: Singapore stock to Jakarta).
  for (const seller of sellers) {
    if (!(serves(seller, 'ID') || serves(seller, '*')) || seller.charge.includes('IDR')) continue
    const why = serves(seller, 'ID') ? 'serves "ID"' : 'serves "*", Indonesia included'
    report(
      ['sellers', sellers.indexOf(seller), 'charge'],
      `must include "IDR": seller "${seller.id}" ${why} (${RUPIAH})`,
    )
  }
}

function checkLadders({ money }: BrandConfig, report: Report): void {
  for (const currency of derivedCurrencies(money)) {
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

// A derived price is the base at the day's rate plus this buffer, then rounded (COMMERCE.md §3).
// A currency left out would be priced at the bare rate — 0 % — with nobody having said so.
function checkBuffers({ money }: BrandConfig, report: Report): void {
  for (const currency of derivedCurrencies(money)) {
    if (money.fx.bufferPct[currency] !== undefined) continue
    report(
      ['money', 'fx', 'bufferPct', currency],
      `needs a buffer: ${currency} prices are derived from ${money.base} at the day's rate plus this percentage — write "0" for none, rather than leave it to a silent 0 % (COMMERCE.md §3)`,
    )
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
