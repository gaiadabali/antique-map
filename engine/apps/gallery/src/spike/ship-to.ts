/**
 * The ship-to market (ARCHITECTURE.md §9): one `shipTo` cookie — defaulted, in the real thing, from
 * the visitor's country — decides the market and so the currency. The choices are the brand's
 * listed destinations (C1 `money.markets`); `*` is the market for every other one.
 */
import type { BrandConfig, CurrencyCode } from '@engine/config/schema'
import { cookies } from 'next/headers'

export const SHIP_TO_COOKIE = 'shipTo'

export type ShipToOption = { readonly country: string; readonly currency: CurrencyCode }

export function shipToOptions(config: Pick<BrandConfig, 'money'>): ShipToOption[] {
  return config.money.markets.flatMap((market) =>
    market.destinations
      .filter((destination) => destination !== '*')
      .map((country) => ({ country, currency: market.currency })),
  )
}

/** The visitor's choice when it is one of the brand's; else the brand's first listed destination. */
export async function currentShipTo(
  config: Pick<BrandConfig, 'money'>,
): Promise<ShipToOption | null> {
  const options = shipToOptions(config)
  const chosen = (await cookies()).get(SHIP_TO_COOKIE)?.value
  return options.find((option) => option.country === chosen) ?? options[0] ?? null
}
