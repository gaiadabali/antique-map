/**
 * The CSV layer and cell readers, without a database (DATA.md §3): a file is refused whole —
 * never half-read in a guessed encoding — the delimiter is sniffed from the header, a quoted cell
 * keeps its commas and newlines, every data row carries its file line number for the report, and
 * the cell readers trim, keep whole numbers whole, and never clear a field on an empty cell.
 */
import { describe, expect, it } from 'vitest'

import { cleanControl, headerErrorFor, ImportError, MAX_BYTES, parseCsv } from './csv'
import { grouped, list, shown, text, wholeNumber, yesNo } from './cells'
import { template } from './kinds'
import { fold, nearest } from './vocabulary'

const bytes = (text: string) => new TextEncoder().encode(text)

const parse = (text: string, kind: 'stores' | 'stock' = 'stores') =>
  parseCsv('test.csv', bytes(text), kind, template(kind))

const STORE_HEADER = template('stores').join(',')

describe('parseCsv', () => {
  it('splits records on the delimiter it sniffs from the header', () => {
    const comma = parse(`${STORE_HEADER}\nUBD-01,Ubud,Address,,"-8.5","115.0",,,,"yes","yes"`)
    expect(comma.header).toEqual(template('stores'))
    expect(comma.rows).toEqual([
      {
        row: 2,
        cells: ['UBD-01', 'Ubud', 'Address', '', '-8.5', '115.0', '', '', '', 'yes', 'yes'],
      },
    ])

    const headerSemi = template('stores').join(';')
    const semi = parse(`${headerSemi}\nUBD-01;Ubud;Address;-8.5;115.0`)
    expect(semi.rows[0]!.cells[1]).toBe('Ubud')
  })

  it('lets a quoted cell carry the delimiter, doubled quotes and newlines', () => {
    const sheet = parse(
      `${STORE_HEADER}\nUBD-01,"Ubud ""gates"" store","line one\nline two",-8.5,115.0`,
    )
    expect(sheet.rows[0]!.cells[1]).toBe('Ubud "gates" store')
    expect(sheet.rows[0]!.cells[2]).toBe('line one\nline two')
  })

  it('numbers rows by file line, counting newlines inside quoted cells', () => {
    const sheet = parse(`${STORE_HEADER}\nUBD-01,One,Addr,-8.5,115.0\nSNR-01,Two,Addr,-8.6,115.1`)
    expect(sheet.rows.map((row) => row.row)).toEqual([2, 3])
    const quoted = parse(
      `${STORE_HEADER}\nUBD-01,"Two\nlines",Addr,,"-8.5","115.0",,,,"yes","yes"\nSNR-01,Two,Addr,,"-8.6","115.1",,,,"yes","yes"`,
    )
    expect(quoted.rows.map((row) => row.row)).toEqual([2, 3])
  })

  it('accepts a byte-order mark and drops blank rows', () => {
    const bom = parse(`\uFEFF${STORE_HEADER}\nUBD-01,One,Addr,-8.5,115.0\n,,,,,,,`)
    expect(bom.header[0]).toBe(template('stores')[0])
    expect(bom.rows).toHaveLength(1)
  })

  it('refuses the file whole: not UTF-8, NUL bytes, wrong header, over the limits', () => {
    expect(() =>
      parseCsv('test.csv', new Uint8Array([0xff, 0xfe, 0x41]), 'stores', template('stores')),
    ).toThrow(ImportError)
    expect(() => parseCsv('test.csv', bytes('a\0b'), 'stores', template('stores'))).toThrow(/NUL/)
    expect(() => parse('stock_number\nM.01')).toThrow(/not the stores template/)
    expect(() => parse(`${STORE_HEADER}\n${'x'.repeat(MAX_BYTES)}`)).toThrow(/10 MB/)
    expect(() =>
      parseCsv(
        'test.csv',
        bytes(`${STORE_HEADER}\n${'\n'.repeat(MAX_BYTES + 1)}`),
        'stores',
        template('stores'),
      ),
    ).toThrow(/over the/)
  })

  it('refuses a quoted cell that never closes', () => {
    expect(() => parse(`${STORE_HEADER}\nUBD-01,"never closes,Addr`)).toThrow(/never closes/)
  })
})

describe('headerErrorFor', () => {
  it('names the first missing column, and an unknown one', () => {
    const header = template('stores').filter((name) => name !== 'name')
    expect(headerErrorFor(header, 'stores', template('stores'))).toMatch(/name is missing/)
    expect(headerErrorFor([...template('stores'), 'colour'], 'stores', template('stores'))).toMatch(
      /colour/,
    )
  })
})

describe('cell readers', () => {
  it('trims, and answers undefined for an empty cell — it never clears a field', () => {
    expect(text('  Ubud ', 'name', 100)).toEqual({ value: 'Ubud' })
    expect(text('   ', 'name', 100)).toEqual({ value: undefined as never })
    expect(text('x'.repeat(101), 'name', 100)).toMatchObject({
      error: expect.stringMatching(/101 characters/),
    })
  })

  it('reads whole numbers with three-digit groupings, and refuses anything else', () => {
    expect(wholeNumber('185000', 'price', { min: 1, what: 'A price' })).toEqual({ value: 185000 })
    expect(wholeNumber('185.000', 'price', { min: 1, what: 'A price' })).toEqual({ value: 185000 })
    expect(wholeNumber('185,000', 'price', { min: 1, what: 'A price' })).toEqual({ value: 185000 })
    expect(wholeNumber('0', 'price', { min: 1, what: 'A price' })).toMatchObject({
      error: expect.stringMatching(/1 or more/),
    })
    expect(wholeNumber('185.5', 'price', { min: 1, what: 'A price' })).toMatchObject({
      error: expect.stringMatching(/whole digits/),
    })
    expect(wholeNumber('abc', 'price', { min: 1, what: 'A price' })).toMatchObject({
      error: expect.stringMatching(/whole digits/),
    })
    expect(wholeNumber('', 'price', { min: 1, what: 'A price' })).toEqual({
      value: undefined as never,
    })
  })

  it('reads a flag as yes or no only', () => {
    expect(yesNo('Yes', 'active')).toEqual({ value: true })
    expect(yesNo('no', 'active')).toEqual({ value: false })
    expect(yesNo('', 'active')).toEqual({})
    expect(yesNo('maybe', 'active')).toMatchObject({ error: expect.stringMatching(/yes or no/) })
  })

  it('splits a list on semicolons and drops empty members', () => {
    expect(list('a; b ;;c')).toEqual(['a', 'b', 'c'])
    expect(list('')).toBeUndefined()
  })
})

describe('report helpers', () => {
  it('groups a whole number with dots and shows blanks as (blank)', () => {
    expect(grouped(185000)).toBe('185.000')
    expect(shown(undefined)).toBe('(blank)')
    expect(shown(true)).toBe('yes')
    expect(shown('Ubud')).toBe('Ubud')
  })
})

describe('vocabulary folding', () => {
  it('folds accents, case and whitespace', () => {
    expect(fold('Batavia  CITY')).toBe('batavia city')
    expect(fold('Âmsterdam')).toBe('amsterdam')
  })

  it('suggests the nearest names when nothing matches exactly', () => {
    const suggestions = nearest('Batafia', ['Batavia', 'Surabaya', 'Amsterdam'])
    expect(suggestions[0]).toBe('Batavia')
    expect(suggestions.length).toBeGreaterThan(0)
    expect(nearest('Ubud Town', ['Ubud', 'Ubud City', 'Denpasar']).length).toBeGreaterThan(0)
  })
})

describe('cleanControl', () => {
  it('strips control characters but keeps tab and newline', () => {
    expect(cleanControl('a\u0001b\u007fc')).toBe('abc')
    expect(cleanControl('a\tb\nc')).toBe('a\tb\nc')
  })
})
