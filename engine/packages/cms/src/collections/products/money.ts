/**
 * Money and counts as the shop stores them (CONVENTIONS.md §5; COMMERCE.md §2): whole rupiah —
 * the minor unit is one rupiah, `95000` is Rp 95.000 — and whole units, never a float. Payload
 * keeps a number field in a `numeric` column, which would take `95000.5` as readily as `95000`,
 * so every such field carries one of these validators, and the database carries the same rule as
 * a CHECK (`trunc(x) = x`, declared beside each collection).
 */
import type { PayloadRequest, Validate } from 'payload'

/** A message in both admin languages; `pickLanguage` chooses the one `req.i18n` is set to. */
export type Bilingual = { readonly en: string; readonly id: string }

/** The admin's current language (`req.i18n.language`), 'en' when there is none to read. */
export const adminLanguage = (req: Pick<PayloadRequest, 'i18n'> | undefined): 'en' | 'id' =>
  req?.i18n?.language === 'id' ? 'id' : 'en'

/** `message` in `req`'s admin language; a plain string is already decided, in either. */
export const pickLanguage = (
  req: Pick<PayloadRequest, 'i18n'> | undefined,
  message: Bilingual | string,
): string => (typeof message === 'string' ? message : message[adminLanguage(req)])

export type WholeOptions = {
  /** The smallest value allowed: 1 for a price, 0 for a count or a fee. */
  readonly min: number
  /** What the number is, for the message: "The price" / "Harga", "The quantity" / "Jumlah". */
  readonly what: Bilingual | string
  /** Rupiah (the default) or plain units. */
  readonly unit?: 'rupiah' | 'units'
}

/** Whether `value` is a safe whole number of at least `min`. */
export function isWhole(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min
}

/** A whole number of rupiah (or units) of at least `min`; blank only where the field is optional. */
export function wholeNumber(options: WholeOptions): Validate<number | null | undefined> {
  const { min, what, unit = 'rupiah' } = options
  return (value, { required, req }) => {
    const language = adminLanguage(req)
    const phrase = pickLanguage(req, what)
    // A custom `validate` replaces Payload's own, `required` check included: it is made here.
    if (value === null || value === undefined) {
      if (!required) return true
      return language === 'id' ? `${phrase} wajib diisi.` : `${phrase} is required.`
    }
    if (isWhole(value, min)) return true
    if (unit === 'rupiah') {
      if (min > 0) {
        return language === 'id'
          ? `${phrase} adalah bilangan bulat rupiah di atas nol, misalnya 95000 untuk Rp 95.000.`
          : `${phrase} is a whole number of rupiah above zero, such as 95000 for Rp 95.000.`
      }
      return language === 'id'
        ? `${phrase} adalah bilangan bulat rupiah, nol atau lebih.`
        : `${phrase} is a whole number of rupiah, zero or more.`
    }
    return language === 'id'
      ? `${phrase} adalah bilangan bulat, ${min} atau lebih.`
      : `${phrase} is a whole number, ${min} or more.`
  }
}

/** The CHECK expression for a column holding a whole number of at least `min` (or NULL). */
export function wholeCheck(column: string, min: number, options: { nullable?: boolean } = {}) {
  const rule = `${column} >= ${min} AND ${column} = trunc(${column})`
  return options.nullable === false
    ? `${column} IS NOT NULL AND ${rule}`
    : `${column} IS NULL OR (${rule})`
}
