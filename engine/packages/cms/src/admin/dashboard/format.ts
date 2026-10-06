/**
 * How the dashboard writes a number: grouped digits in the admin's language, a delta against the
 * period before as words (never colour alone), rupiah as the integer the order holds.
 */
import type { Compared } from './compare'
import { text } from './copy'

const locale = (language: string | undefined) => (language === 'id' ? 'id-ID' : 'en-US')

export function formatNumber(value: number, language?: string, digits = 0): string {
  return new Intl.NumberFormat(locale(language), { maximumFractionDigits: digits }).format(value)
}

export function formatRupiah(value: number, language?: string): string {
  return `Rp ${formatNumber(value, language)}`
}

export function formatRate(value: number | null, language?: string): string {
  return value === null ? '—' : `${formatNumber(value * 100, language, 1)}%`
}

/** "+4 (+400%) vs previous" · "no change" · "new" when the period before was zero. */
export function deltaText(c: Compared, language?: string, digits = 0): string {
  if (c.change === 0) return text(language, 'noChange')
  const sign = c.change > 0 ? '+' : '−'
  const amount = `${sign}${formatNumber(Math.abs(c.change), language, digits)}`
  if (c.pct === null) return `${amount} (${text(language, 'newInPeriod')})`
  return `${amount} (${c.pct > 0 ? '+' : '−'}${formatNumber(Math.abs(c.pct), language, 1)}%) ${text(language, 'vsPrevious')}`
}
