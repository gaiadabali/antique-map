/**
 * The filter builder's statements (5.1.a): every `$n` a WHERE names has exactly one value, and no
 * value is left without its `$n` — Postgres refuses a statement either way, and a period filter
 * once sent parameters no clause named.
 */
import { describe, expect, it } from 'vitest'

import { filterParts, whereOf } from './db'
import { EMPTY_STATE, type FacetState } from './state'

const ctx = { placeIds: (id: number) => [id, id + 1] }

const placeholders = (sql: string): number[] =>
  [...new Set([...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b)

describe('the gallery filter builder', () => {
  const states: FacetState[] = [
    EMPTY_STATE,
    { ...EMPTY_STATE, yearFrom: 1700, yearTo: 1800 },
    { ...EMPTY_STATE, century: 18, objectType: ['map'], maker: [3], place: 5, subject: [7] },
    { ...EMPTY_STATE, includeSold: true, yearTo: 1650 },
  ]

  it('names each parameter once, numbered from $1, for every facet left out in turn', () => {
    for (const state of states) {
      for (const without of [undefined, 'availability', 'date', 'place', 'maker'] as const) {
        const parts = filterParts(state, ctx, without)
        const used = placeholders(whereOf(parts))
        expect(used).toEqual(parts.values.map((_, index) => index + 1))
      }
    }
  })

  it('binds the period years as values, never as statement text', () => {
    const parts = filterParts({ ...EMPTY_STATE, yearFrom: 1700, yearTo: 1800 }, ctx)
    expect(parts.values).toContain(1700)
    expect(parts.values).toContain(1800)
    expect(whereOf(parts)).not.toMatch(/\b1[78]00\b/)
  })
})
