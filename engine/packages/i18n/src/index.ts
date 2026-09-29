/**
 * `@engine/i18n` (PLT, TASKS.md 3.1.b): the engine's locales, the message-key loader — the
 * app's keys, the brand's values — and the formatters every surface shows money, dates and
 * dimensions through. Nothing here queries anything; the only file it reads is a brand's copy.
 */
export {
  checkCopy,
  CopyFileError,
  placeholdersOf,
  readCopyFile,
  type CopyIssue,
  type CopyValues,
} from './copy'
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
  loadMessages,
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
  type MoneyValue,
  type PriceValue,
} from './money'
