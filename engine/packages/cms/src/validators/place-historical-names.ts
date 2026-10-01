/**
 * A place's historical names (CONTENT-MODEL.md §3 `historicalNames[] { name, language, period }`):
 * Batavia, Iava, Celebes, Moluccas — the discovery edge, since search expands a query through
 * them (ARCHITECTURE.md §8: a collector searching "Celebes" and a tourist searching "Sulawesi"
 * find the same maps). Pure.
 *
 * `language` is a BCP 47 tag (`nl`, `la`, `pt`, `zh-Hant`) — a code, so a page names the
 * language in its own locale (`Intl.DisplayNames`) rather than storing one locale's word for it.
 * `period` is the cataloguer's words ("1619–1942", "VOC era").
 */

export type HistoricalName = {
  readonly name?: string | null
  readonly language?: string | null
  readonly period?: string | null
}

export type RowErrors = Partial<Record<'name' | 'language' | 'period', string>>

/** BCP 47's common shape: a 2–3 letter language, then subtags (`zh-Hant`, `nl-NL`). */
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/

/** One spelling for comparing names: accents, case and spacing ignored. */
export function nameKey(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const blank = (value: string | null | undefined) => !value || value.trim() === ''

/** Errors per row, by index — an empty array (or holes) when nothing is wrong. */
export function historicalNameErrors(
  rows: readonly HistoricalName[] | null | undefined,
): (RowErrors | undefined)[] {
  const errors: (RowErrors | undefined)[] = []
  const seen = new Map<string, number>()
  ;(rows ?? []).forEach((row, index) => {
    const rowErrors: RowErrors = {}
    if (blank(row.name)) {
      rowErrors.name = 'Give the historical name, or remove the row.'
    } else {
      const key = nameKey(row.name!)
      const first = seen.get(key)
      if (first === undefined) seen.set(key, index)
      else rowErrors.name = `"${row.name!.trim()}" is already listed (row ${first + 1}).`
    }
    if (!blank(row.language) && !LANGUAGE_TAG.test(row.language!.trim())) {
      rowErrors.language = 'A language code such as nl (Dutch), la (Latin) or pt (Portuguese).'
    }
    if (Object.keys(rowErrors).length > 0) errors[index] = rowErrors
  })
  return errors
}
