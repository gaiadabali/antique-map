/**
 * @contract C1 — brand config: the engine's currencies, zod-free · owner: ARC · entry: `@engine/config/constants`
 *
 * The minor-unit exponent of each currency the engine prices in — the ENGINE's, which is ISO
 * 4217's for every currency but IDR: ISO lists two decimals for the rupiah, the engine none,
 * because no coin below Rp 1 circulates and the Indonesian gateways take whole rupiah. A
 * provider that counts IDR in hundredths is converted in its adapter (C5, C7). Never hard-code
 * 100. C5 (`@engine/domain/money`) builds `Money` and `PriceSet` on these and asserts against
 * them, never redeclaring them; `../schema/primitives` builds the zod enum and re-exports them.
 */
export const CURRENCY_EXPONENT = { IDR: 0, USD: 2, SGD: 2, EUR: 2, AUD: 2, GBP: 2 } as const
export type CurrencyCode = keyof typeof CURRENCY_EXPONENT
/** Adding a currency is an additive contract change: an exponent here, then rounding rules. */
export const CURRENCY_CODES = /* @__PURE__ */ Object.keys(CURRENCY_EXPONENT) as [
  CurrencyCode,
  ...CurrencyCode[],
]
