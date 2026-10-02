/**
 * Dimensions: stored in millimetres, shown in millimetres with inches beside them for the
 * buyers who think in inches (C2 `SizeVM`: inches are derived here, never typed). Height
 * before width, as dealers list them. Inches are to the nearest eighth, written as a vulgar
 * fraction — 450 mm is 17¾ in — which is how a frame shop reads them.
 */
import type { LocaleCode } from '@engine/config/constants'

import { formattingTag } from './locales'

/** C2's `SizeVM`, with the framed depth where there is one. */
export type Size = {
  readonly heightMm: number
  readonly widthMm: number
  readonly depthMm?: number | null
}

const MM_PER_INCH = 25.4
const EIGHTHS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'] as const
const INCH_UNIT = { en: 'in', id: 'inci', nl: 'inch' } as const satisfies Record<LocaleCode, string>

/** Millimetres as inches to the nearest eighth: `450` → `17¾`; anything above zero is at least ⅛. */
export function inchesOf(mm: number): string {
  if (!Number.isFinite(mm) || mm < 0) throw new RangeError(`${mm} is not a length in millimetres`)
  const eighths = mm === 0 ? 0 : Math.max(1, Math.round((mm / MM_PER_INCH) * 8))
  const whole = Math.floor(eighths / 8)
  const fraction = EIGHTHS[eighths % 8] ?? ''
  return whole === 0 && fraction !== '' ? fraction : `${whole}${fraction}`
}

/** `{ metric: '450 × 600 mm', imperial: '17¾ × 23⅝ in' }` — for an app that sets them apart. */
export function formatDimensionParts(
  size: Size,
  locale: LocaleCode,
): { metric: string; imperial: string } {
  const sides = [size.heightMm, size.widthMm, ...(size.depthMm ? [size.depthMm] : [])]
  const number = new Intl.NumberFormat(formattingTag(locale), {
    maximumFractionDigits: 1,
    useGrouping: false,
  })
  return {
    metric: `${sides.map((side) => number.format(side)).join(' × ')} mm`,
    imperial: `${sides.map(inchesOf).join(' × ')} ${INCH_UNIT[locale]}`,
  }
}

/** `450 × 600 mm (17¾ × 23⅝ in)`. */
export function formatDimensions(size: Size, locale: LocaleCode): string {
  const { metric, imperial } = formatDimensionParts(size, locale)
  return `${metric} (${imperial})`
}
