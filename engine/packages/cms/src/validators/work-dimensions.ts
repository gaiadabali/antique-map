/**
 * A work's dimensions (TASKS.md 8.2.b; CONTENT-MODEL.md §1, §9): the image (the printed area, to
 * the plate mark or neat line), the sheet and, if framed, the frame — in **millimetres**, height
 * before width; inches are derived by the formatter, never typed (C2 `DimensionsVM`).
 *
 * Every save, drafts included: each measure is positive, at most to the tenth of a millimetre and
 * no larger than a wall; a size gives its height and its width together; and the image lies on the
 * sheet — no taller and no wider than it. Pure.
 */

export type Size = {
  readonly height?: number | null
  readonly width?: number | null
  readonly depth?: number | null
}
export type WorkDimensions = {
  readonly image?: Size | null
  readonly sheet?: Size | null
  readonly framed?: Size | null
}

/** Ten metres: larger is a typo (a value in tenths of a millimetre, or in the wrong unit). */
export const MAX_DIMENSION_MM = 10_000

const present = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined

function measureError(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return 'A measurement is a positive number of mm.'
  if (value > MAX_DIMENSION_MM) {
    return `At most ${MAX_DIMENSION_MM} mm: measurements are in millimetres, not tenths.`
  }
  if (Math.abs(Math.round(value * 10) - value * 10) > 1e-6) {
    return 'Measure to the tenth of a millimetre at most, such as 412.5.'
  }
  return null
}

/** One size's errors, keyed by its part (`height`, `width`, `depth`). */
export function sizeErrors(
  size: Size | null | undefined,
  withDepth = false,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const parts = withDepth ? (['height', 'width', 'depth'] as const) : (['height', 'width'] as const)
  for (const part of parts) {
    const value = size?.[part]
    const error = present(value) ? measureError(value) : null
    if (error) errors[part] = error
  }
  const height = size?.height
  const width = size?.width
  if (present(height) !== present(width)) {
    errors[present(height) ? 'width' : 'height'] ??= 'Give the height and the width together.'
  }
  if (present(size?.depth) && !present(height) && !present(width)) {
    errors.depth ??= 'Give the frame’s height and width with its depth.'
  }
  return errors
}

/** Every part's error, keyed `<size>.<part>` (`image.height`, `sheet.width` …). */
export function dimensionErrors(
  dimensions: WorkDimensions | null | undefined,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [name, withDepth] of [
    ['image', false],
    ['sheet', false],
    ['framed', true],
  ] as const) {
    for (const [part, message] of Object.entries(sizeErrors(dimensions?.[name], withDepth))) {
      errors[`${name}.${part}`] = message
    }
  }
  const image = dimensions?.image
  const sheet = dimensions?.sheet
  for (const part of ['height', 'width'] as const) {
    const inner = image?.[part]
    const outer = sheet?.[part]
    if (!present(inner) || !present(outer) || errors[`image.${part}`] || errors[`sheet.${part}`]) {
      continue
    }
    if (inner > outer) {
      errors[`image.${part}`] =
        part === 'height'
          ? 'The image is taller than the sheet it is printed on: check the two heights.'
          : 'The image is wider than the sheet it is printed on: check the two widths.'
    }
  }
  return errors
}
