import { describe, expect, it } from 'vitest'

import { formatRupiah } from './format-rupiah'

describe('formatRupiah', () => {
  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })

  it('formats a small amount without separators', () => {
    expect(formatRupiah(95000)).toBe('Rp 95.000')
  })

  it('formats a large amount with grouping', () => {
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000')
  })

  it('throws on a non-integer', () => {
    expect(() => formatRupiah(1250.5)).toThrow('rupiah amount must be an integer')
  })

  it('throws on a negative amount', () => {
    expect(() => formatRupiah(-1)).toThrow('rupiah amount must be non-negative')
  })

  it('throws on NaN', () => {
    expect(() => formatRupiah(NaN)).toThrow('rupiah amount must be an integer')
  })
})
