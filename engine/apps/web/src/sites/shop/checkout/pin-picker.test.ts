/**
 * `parseCoordinate` (6-followup): a typed lat/lng field counts only when its trimmed text is
 * non-empty and parses to a finite number — `Number('')` is `0`, which used to read as a pin
 * near (0, 0) while a field was still empty.
 */
import { describe, expect, it } from 'vitest'

import { parseCoordinate } from './pin-picker'

describe('parseCoordinate', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['-', null],
    ['abc', null],
    ['-8.6705', -8.6705],
    ['115.2126', 115.2126],
    ['1e400', null],
  ])('parseCoordinate(%j) -> %j', (input, expected) => {
    expect(parseCoordinate(input)).toBe(expected)
  })
})
