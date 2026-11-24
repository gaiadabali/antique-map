import { describe, expect, it } from 'vitest'

import { filterCases, parseList } from './filter'
import type { EvalCase } from './schema'

const c = (id: string, group: string) => ({ id, group }) as unknown as EvalCase
const cases = [c('a-1', 'g1'), c('a-2', 'g1'), c('b-1', 'g2')]

describe('filterCases', () => {
  it('returns everything with no filter', () => {
    expect(filterCases(cases, {})).toHaveLength(3)
  })
  it('filters by id', () => {
    expect(filterCases(cases, { only: ['b-1'] }).map((x) => x.id)).toEqual(['b-1'])
  })
  it('filters by group', () => {
    expect(filterCases(cases, { group: ['g1'] }).map((x) => x.id)).toEqual(['a-1', 'a-2'])
  })
  it('ANDs the two', () => {
    expect(filterCases(cases, { only: ['a-1', 'b-1'], group: ['g2'] }).map((x) => x.id)).toEqual([
      'b-1',
    ])
  })
  it('parses comma lists', () => {
    expect(parseList('x, y,,')).toEqual(['x', 'y'])
    expect(parseList('')).toBeUndefined()
    expect(parseList(undefined)).toBeUndefined()
  })
})
