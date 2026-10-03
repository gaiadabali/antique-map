/**
 * Money in text (AI.md §3.3). Three uses, one set of patterns:
 *
 * - `mentionsMoney()` — the gallery's sentence check: any currency sign or code, a currency word,
 *   or a number tied to a money word ("worth 500", "500k", "2 juta") blocks the sentence.
 * - `redactMoney()` — the gallery's tool results: an amount in a catalogue description (typed by
 *   a person, imported from a spreadsheet) is removed before the text reaches the model, so the
 *   model has no amount to repeat.
 * - `amountsIn()` — the shop's amount check: every rupiah amount in a sentence, as whole rupiah,
 *   to compare with the `priceLabel`s and settings amounts the session has seen.
 */
import 'server-only'

export const AMOUNT_REMOVED = '[amount removed]'

/** "95.000", "95,000", "95 000", "1.250.000", "1,5", "500". */
const NUMBER = String.raw`\d{1,3}(?:[.,\u00a0 ]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`
const SIGNS = String.raw`(?:US\$|S\$|A\$|\$|€|£|¥)`
const CODES = String.raw`(?:\bRp\.?|\bIDR\b|\bSGD\b|\bUSD\b|\bEUR\b|\bAUD\b|\bGBP\b|\bJPY\b)`
const WORDS = String.raw`(?:\brupiah\b|\bdollars?\b|\bdolar\b|\beuros?\b|\bpounds? sterling\b)`
const MAGNITUDE_WORDS = String.raw`(?:k|rb|ribu|jt|juta|mil|million|thousand|grand)`
const MAGNITUDES = String.raw`${MAGNITUDE_WORDS}\b`
const MONEY_WORDS = String.raw`(?:\bprice[sd]?\b|\bpricing\b|\bharga(?:nya)?\b|\bcosts?\b|\bbiaya\b|\bvalued?\b|\bnilai(?:nya)?\b|\bworth\b|\boffers?\b|\btawar(?:an)?\b|\bbudget\b|\bballpark\b|\bkisaran\b)`

/** A currency sign, code or word anywhere — the gallery blocks these even without a number. */
const CURRENCY_ANYWHERE = new RegExp(`${SIGNS}|${CODES}|${WORDS}`, 'i')
/** A currency followed or preceded by an amount: the span to redact. */
const CURRENCY_AMOUNT = new RegExp(
  `(?:${SIGNS}|${CODES})\\s?(?:${NUMBER})(?:\\s?${MAGNITUDES})?|(?:${NUMBER})\\s?(?:${CODES}|${WORDS}|${SIGNS})`,
  'gi',
)
/** A number with a magnitude word: "500k", "2 juta", "1.5 million". */
const MAGNITUDE_AMOUNT = new RegExp(`(?:${NUMBER})\\s?${MAGNITUDES}`, 'gi')
/** A money word, then a number within three words: "worth about 500", "harga 750". */
const WORD_THEN_NUMBER = new RegExp(
  `${MONEY_WORDS}\\W{0,4}(?:[^\\s\\d]+\\s+){0,3}?(?:${NUMBER})`,
  'gi',
)

const once = (pattern: RegExp) => new RegExp(pattern.source, 'i')

export function mentionsMoney(text: string): boolean {
  return (
    CURRENCY_ANYWHERE.test(text) ||
    once(MAGNITUDE_AMOUNT).test(text) ||
    once(WORD_THEN_NUMBER).test(text)
  )
}

/** A bare year next to a money word stays in a description: "the value of this 1726 map". */
function isPlausibleYear(number: string): boolean {
  return /^(?:1[4-9]|20)\d{2}$/.test(number)
}

export function redactMoney(text: string): string {
  return text
    .replace(CURRENCY_AMOUNT, AMOUNT_REMOVED)
    .replace(MAGNITUDE_AMOUNT, AMOUNT_REMOVED)
    .replace(WORD_THEN_NUMBER, (span) =>
      span.replace(new RegExp(NUMBER, 'g'), (n) => (isPlausibleYear(n) ? n : AMOUNT_REMOVED)),
    )
}

const THOUSANDS = new Set(['k', 'rb', 'ribu', 'thousand', 'grand'])
const MILLIONS = new Set(['jt', 'juta', 'mil', 'million'])

/** Whole rupiah from Indonesian or English digit grouping: "95.000", "95,000", "1.250.000". */
function rupiahOf(digits: string, magnitude: string | undefined): number | null {
  const compact = digits.replace(/\s/g, '')
  const unit = (magnitude ?? '').toLowerCase()
  const scale = THOUSANDS.has(unit) ? 1000 : MILLIONS.has(unit) ? 1_000_000 : 1
  // With a magnitude, one separator and one or two digits is a decimal mark ("1,5 juta").
  if (scale > 1 && /^\d+[.,]\d{1,2}$/.test(compact)) {
    return Math.round(Number(compact.replace(',', '.')) * scale)
  }
  if (!/^\d{1,3}(?:[.,]\d{3})*$|^\d+$/.test(compact)) return null
  return Number(compact.replace(/[.,]/g, '')) * scale
}

const AMOUNT = new RegExp(
  `(${SIGNS}|${CODES})\\s?(${NUMBER})(?:\\s?(${MAGNITUDE_WORDS})\\b)?|(${NUMBER})\\s?(?:(${MAGNITUDE_WORDS})\\b|(rupiah|IDR)\\b)`,
  'gi',
)

/** Every money amount in `text` as whole rupiah; a `null` is an amount in another currency. */
export function amountsIn(text: string): Array<number | null> {
  const found: Array<number | null> = []
  for (const match of text.matchAll(AMOUNT)) {
    const [, currency, number, magnitude, bareNumber, bareMagnitude, bareCurrency] = match
    if (currency !== undefined) {
      const rupiah = /^(?:rp\.?|idr)$/i.test(currency.trim())
      found.push(rupiah ? rupiahOf(number ?? '', magnitude) : null)
    } else if (bareNumber !== undefined && (bareMagnitude !== undefined || bareCurrency)) {
      found.push(rupiahOf(bareNumber, bareMagnitude))
    }
  }
  return found
}

/** Any currency but rupiah: the shop blocks a sentence that names one. */
export function mentionsForeignCurrency(text: string): boolean {
  return /US\$|S\$|A\$|\$|€|£|¥|\bSGD\b|\bUSD\b|\bEUR\b|\bAUD\b|\bGBP\b|\bJPY\b|\bdollars?\b|\beuros?\b/i.test(
    text,
  )
}

/** Whole rupiah from a label the server built ("Rp 95.000"), or `null`. */
export function rupiahOfLabel(label: string): number | null {
  const [first] = amountsIn(label)
  return first ?? null
}
