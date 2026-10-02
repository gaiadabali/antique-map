/**
 * `@engine/i18n` (PLT, TASKS.md 3.1.b): the engine's locales, the message-key joiner — the
 * app's keys, the brand's values — and the formatters every surface shows money, dates and
 * dimensions through. This entry reads no file and queries nothing, so a Client Component may
 * import it; reading a brand's copy files — `loadMessages()`, `readCopyFile()`, `checkCopy()` —
 * is the server's, at `@engine/i18n/copy`.
 */
export {
  DATE_WORDS,
  formatCalendarDate,
  formatDate,
  type CalendarPrecision,
  type DatePrecision,
  type DateWords,
  type FuzzyDate,
} from './dates'
export { formatDimensionParts, formatDimensions, inchesOf, type Size } from './dimensions'
export {
  formattingTag,
  isLocaleCode,
  isSupportedLocale,
  LOCALE_CODES,
  LOCALES,
  localeOfPath,
  localePrefix,
  resolveLocale,
  suggestLocale,
  type LocaleCode,
  type LocaleConfig,
} from './locales'
export {
  createMessages,
  defineMessages,
  pluralCategoriesOf,
  pluralFormOf,
  textOf,
  type CopyValues,
  type MessageParams,
  type Messages,
  type MessageSource,
  type PluralBase,
} from './messages'
export {
  formatMoney,
  formatPrice,
  toDecimal,
  type FormatMoneyOptions,
  type Money,
  type MoneyValue,
  type PriceValue,
} from './money'
