// The formatters take what the view models carry, as they carry it (C2, C5): a surface hands
// its VM's field straight to the formatter, never a reshaped copy.
import type { DimensionsVM, FuzzyDateVM, PriceVM, SizeVM } from '@engine/view-models'
import { describe, expectTypeOf, it } from 'vitest'

import type { FuzzyDate, MoneyValue, PriceValue, Size } from '../src/index'

describe('@engine/i18n accepts the view models’ shapes', () => {
  it('FuzzyDateVM, SizeVM, a framed size, PriceVM and its Money', () => {
    expectTypeOf<FuzzyDateVM>().toExtend<FuzzyDate>()
    expectTypeOf<SizeVM>().toExtend<Size>()
    expectTypeOf<NonNullable<DimensionsVM['framed']>>().toExtend<Size>()
    expectTypeOf<PriceVM>().toExtend<PriceValue>()
    expectTypeOf<PriceVM['charge']>().toExtend<MoneyValue>()
  })
})
