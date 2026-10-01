import { describe, expect, it } from 'vitest'

import { parseCondition } from '../condition.ts'
import { parsePrice } from '../price.ts'
import { DEFAULT_TABLES, parseTables } from '../tables.ts'

describe('parseCondition — the published scale, notes word for word', () => {
  const store = parseTables({
    conditionBoilerplate: [
      'Study images carefully',
      'Study image carefully',
      'see image',
      'see images',
    ],
  })
  const condition = (text: string | null) => parseCondition(text, store)

  it.each([
    ['VG+', { grade: 'VG+', notes: null }],
    ['vg', { grade: 'VG', notes: null }],
    ['G+ / Study images carefully', { grade: 'G+', notes: null }],
    ['G+ / Study image carefully', { grade: 'G+', notes: null }],
    ['VG / Study images carefully.', { grade: 'VG', notes: null }],
    ['G (see image)', { grade: 'G', notes: null }],
    ['G+ ( some stains )', { grade: 'G+', notes: 'some stains' }],
    ['VG - Spine of album is gone.', { grade: 'VG', notes: 'Spine of album is gone.' }],
    [
      'VG / Some minor spotting, study images carefully.',
      { grade: 'VG', notes: 'Some minor spotting' },
    ],
    ['Fair', { grade: 'Fair', notes: null }],
    ['As-is, sold as found', { grade: 'As-is', notes: 'sold as found' }],
  ])('reads %j', (text, expected) => {
    expect(condition(text)).toMatchObject({ status: 'parsed', value: expected, raw: text })
  })

  it('keeps the stock phrase as a note when the tables do not list it', () => {
    expect(parseCondition('G+ / Study images carefully', DEFAULT_TABLES).value).toEqual({
      grade: 'G+',
      notes: 'Study images carefully',
    })
  })

  it.each([
    ['G-', '"G-" is not a grade'],
    ['G- Study Image Carefully', '"G-" is not a grade'],
    ['VG-', '"VG-" is not a grade'],
    ['Good, some foxing', 'no grade'],
    ['Folds as issued (folds somewhat worn)', 'no grade'],
  ])('sends %j to review rather than rounding it to a neighbour', (text, reason) => {
    const parsed = condition(text)
    expect(parsed).toMatchObject({ status: 'review', value: null })
    expect(parsed.reason).toContain(reason)
  })

  it('reads an alias only when the tables give it', () => {
    const withAlias = parseTables({
      grades: [{ code: 'G', aliases: ['Good'], equivalent: null }],
    })
    expect(parseCondition('Good, some foxing', withAlias).value).toEqual({
      grade: 'G',
      notes: 'some foxing',
    })
  })

  it('leaves an empty condition empty', () => {
    expect(condition('').status).toBe('empty')
  })
})

describe('parsePrice — integer minor units, never a float, never rounded here', () => {
  const price = (text: string | null, onRequestFlag?: boolean | null) =>
    parsePrice({ text, onRequestFlag }, DEFAULT_TABLES)

  it.each([
    ['USD 380', 38000],
    ['USD 1,500', 150000],
    ['USD 38,800', 3880000],
    ['1850.00', 185000],
    ['38800.00', 3880000],
    ['0.10', 10],
    ['19.9', 1990],
  ])('reads %j as %i cents', (text, amount) => {
    expect(price(text, text.startsWith('USD') ? undefined : false).value).toEqual({
      mode: 'fixed',
      base: { amount, currency: 'USD' },
    })
  })

  it('reads "On Request" — as text, or as the flag beside a NULL or zero price', () => {
    const onRequest = { mode: 'on-request', base: null }
    expect(price('On Request').value).toEqual(onRequest)
    expect(price('Price on Request').value).toEqual(onRequest)
    expect(price(null, true).value).toEqual(onRequest)
    expect(price('0.00', true).value).toEqual(onRequest)
  })

  it('leaves "no price shown" empty: a sold item\'s dash, a NULL price with no flag', () => {
    expect(price('-').status).toBe('empty')
    expect(price(null, false).status).toBe('empty')
  })

  it.each([
    [['USD 0', undefined], 'a zero price'],
    [['0.00', false], 'a zero price'],
    [['1850.00', true], 'on-request flag both set'],
    [['12.345', false], 'never rounded'],
    [['EUR 380', undefined], 'do not know (EUR)'],
    [['USD 1.500', undefined], 'never rounded'],
    [['about 400', undefined], 'unrecognised'],
  ] as const)('sends %j to review (%s)', ([text, flag], reason) => {
    const parsed = price(text, flag)
    expect(parsed).toMatchObject({ status: 'review', value: null })
    expect(parsed.reason).toContain(reason)
  })

  it('reads the exponent from the tables, never assuming 100', () => {
    const rupiah = parseTables({ currency: 'IDR', currencyExponents: { IDR: 0 } })
    expect(parsePrice({ text: '95000' }, rupiah).value).toEqual({
      mode: 'fixed',
      base: { amount: 95000, currency: 'IDR' },
    })
    expect(parsePrice({ text: '95000.50' }, rupiah).status).toBe('review')
  })
})
