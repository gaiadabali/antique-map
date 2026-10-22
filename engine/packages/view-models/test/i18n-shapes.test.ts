// The formatters take what the view models carry, as they carry it: a surface hands its VM's
// field straight to the `@engine/i18n` formatter, never a reshaped copy.
import type { FuzzyDate, MoneyValue, PriceValue, Size } from '@engine/i18n'
import { describe, expectTypeOf, it } from 'vitest'

import type { DimensionsVM, FuzzyDateVM, PriceVM, SizeVM } from '../src/index'

describe('@engine/i18n accepts the view models’ shapes', () => {
  it('FuzzyDateVM, SizeVM, a framed size, PriceVM and its Money', () => {
    expectTypeOf<FuzzyDateVM>().toExtend<FuzzyDate>()
    expectTypeOf<SizeVM>().toExtend<Size>()
    expectTypeOf<NonNullable<DimensionsVM['framed']>>().toExtend<Size>()
    expectTypeOf<PriceVM>().toExtend<PriceValue>()
    expectTypeOf<PriceVM['charge']>().toExtend<MoneyValue>()
  })
})
