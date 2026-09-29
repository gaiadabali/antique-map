/**
 * @contract C1 — brand config: the zod-free constants · owner: ARC · entry: `@engine/config/constants`
 *
 * The part of C1 a browser bundle may need — the locale list and the currency exponents — as
 * plain data that imports nothing from outside this folder, so `import { formatMoney } from
 * '@engine/i18n'` costs a Client Component well under 2 KB rather than the schema library's 30
 * (DESIGN-SYSTEM.md §7: 150 KB of first-party JavaScript for a whole page).
 * `@engine/config/schema` re-exports each name, so a server module may import either entry;
 * client code imports this one. Nothing here may import zod, or anything that does
 * (`./constants.test.ts`, `i18n/test/client-safe.test.ts`).
 */
export { CURRENCY_CODES, CURRENCY_EXPONENT, type CurrencyCode } from './currencies'
export { LOCALE_CODES, type LocaleCode } from './locales'
