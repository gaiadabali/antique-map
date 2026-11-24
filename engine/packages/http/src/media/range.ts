/**
 * One HTTP byte range (RFC 9110 §14), as a video player asks for one: `bytes=0-`, `bytes=500-999`
 * or the last N bytes, `bytes=-500`. Several ranges in one header, or any other unit, are answered
 * whole — the RFC lets a server ignore a Range it does not support. A range that starts past the
 * end is unsatisfiable (416).
 */
export type RangeAnswer =
  | { readonly type: 'full' }
  | { readonly type: 'partial'; readonly start: number; readonly end: number }
  | { readonly type: 'unsatisfiable' }

const SINGLE = /^bytes=(\d*)-(\d*)$/

export function rangeOf(header: string | null, size: number): RangeAnswer {
  if (header === null) return { type: 'full' }
  const match = SINGLE.exec(header.trim())
  if (!match) return { type: 'full' }
  const [, first = '', last = ''] = match
  if (first === '' && last === '') return { type: 'full' }
  if (first === '') {
    const suffix = Number(last)
    if (!Number.isSafeInteger(suffix) || suffix < 1) return { type: 'unsatisfiable' }
    return { type: 'partial', start: Math.max(0, size - suffix), end: size - 1 }
  }
  const start = Number(first)
  const end = last === '' ? size - 1 : Math.min(Number(last), size - 1)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return { type: 'unsatisfiable' }
  if (start >= size || end < start) return { type: 'unsatisfiable' }
  return { type: 'partial', start, end }
}
