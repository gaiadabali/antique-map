import { describe, expect, it } from 'vitest'

import { dimensionErrors, MAX_DIMENSION_MM, sizeErrors } from './work-dimensions'

describe('a work’s dimensions (8.2.b): positive, in mm, the image on its sheet', () => {
  it('accepts sizes in mm to the tenth, and none at all', () => {
    expect(
      dimensionErrors({
        image: { height: 280, width: 360.5 },
        sheet: { height: 310, width: 400 },
        framed: { height: 520, width: 610, depth: 30 },
      }),
    ).toEqual({})
    expect(dimensionErrors({})).toEqual({})
    expect(dimensionErrors(null)).toEqual({})
  })

  it('refuses a measure that is not positive, too fine or too large', () => {
    expect(sizeErrors({ height: 0, width: 10 })).toEqual({
      height: expect.stringMatching(/positive/),
    })
    expect(sizeErrors({ height: -4, width: 10 })).toEqual({
      height: expect.stringMatching(/positive/),
    })
    expect(sizeErrors({ height: 10.25, width: 10 })).toEqual({
      height: expect.stringMatching(/tenth/),
    })
    expect(sizeErrors({ height: MAX_DIMENSION_MM + 1, width: 10 })).toEqual({
      height: expect.stringMatching(/millimetres, not tenths/),
    })
    expect(sizeErrors({ height: Number.NaN, width: 10 })).toEqual({
      height: expect.stringMatching(/positive/),
    })
  })

  it('wants a height and a width together, and a depth only with them', () => {
    expect(sizeErrors({ height: 100 })).toEqual({
      width: 'Give the height and the width together.',
    })
    expect(sizeErrors({ width: 100 })).toEqual({
      height: 'Give the height and the width together.',
    })
    expect(sizeErrors({ depth: 30 }, true)).toEqual({
      depth: expect.stringMatching(/with its depth/),
    })
  })

  it('refuses an image larger than its sheet, in either direction', () => {
    expect(
      dimensionErrors({ image: { height: 320, width: 360 }, sheet: { height: 310, width: 400 } }),
    ).toEqual({ 'image.height': expect.stringMatching(/taller than the sheet/) })
    expect(
      dimensionErrors({ image: { height: 300, width: 401 }, sheet: { height: 310, width: 400 } }),
    ).toEqual({ 'image.width': expect.stringMatching(/wider than the sheet/) })
    // Equal is allowed: a print trimmed to its image.
    expect(
      dimensionErrors({ image: { height: 310, width: 400 }, sheet: { height: 310, width: 400 } }),
    ).toEqual({})
  })

  it('reports a bad measure once, not again as a comparison', () => {
    expect(
      dimensionErrors({ image: { height: -1, width: 10 }, sheet: { height: 310, width: 400 } }),
    ).toEqual({ 'image.height': expect.stringMatching(/positive/) })
  })
})
